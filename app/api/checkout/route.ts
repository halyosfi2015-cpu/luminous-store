import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/src/lib/supabase-server";
import { createAdminClient } from "@/src/lib/supabase";
import { DEFAULT_GOVERNORATES } from "@/src/data/shipping";
import { DEFAULT_GIFT_OPTIONS } from "@/src/data/bundles-admin";
import { randomBytes } from "crypto";

/**
 * SERVER-AUTHORITATIVE CHECKOUT (B1)
 * ----------------------------------
 * No commercial value sent by the browser is trusted. Prices, subtotal,
 * shipping and total are re-derived on the server from Supabase canonical
 * data and approved config constants. Stock is decremented atomically via
 * the checkout_decrement_product_stock RPC (row locks + all-or-nothing).
 */

const MAX_ITEMS = 50;
const MAX_QTY_PER_LINE = 99;
const MAX_TOTAL_QTY = 250;

type IncomingItem = {
  productId?: string;
  slug?: string;
  nameAr?: string;
  quantity?: number;
  kind?: string;
  inStock?: boolean;
  bundle?: {
    bundleId?: string;
    addons?: { id?: string }[];
    items?: { productId?: string; quantity?: number }[];
  };
};

type CheckoutPayload = {
  items?: IncomingItem[];
  address?: {
    fullName?: string;
    phone?: string;
    city?: string;
    district?: string;
    street?: string;
    building?: string;
    notes?: string;
  };
  source?: string;
};

type PricedLine = {
  productId: string | null;
  productName: string;
  productImage: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};


function fail(status: number, code: string, messageAr: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: { code, message: messageAr, ...extra } }, { status });
}

// ── Fallback stock decrement (no-RPC path) ─────────────────────────────
// Used ONLY when the atomic RPC is unavailable (e.g. missing EXECUTE grant
// in the database). Each row is guarded (stock_quantity >= qty) so a single
// row can never go negative; rows already decremented are compensated on any
// failure to preserve all-or-nothing behavior.
type AdminDb = ReturnType<typeof createAdminClient>;
async function compensateStock(db: AdminDb, done: Array<{ id: string; qty: number }>) {
  for (const { id, qty } of done) {
    try {
      const { data: row } = await (db as any).from("products").select("stock_quantity").eq("id", id).maybeSingle();
      const current = Number((row as { stock_quantity?: unknown } | null)?.stock_quantity);
      if (!Number.isFinite(current)) continue;
      await (db as any).from("products")
        .update({ stock_quantity: current + qty, updated_at: new Date().toISOString() })
        .eq("id", id);
    } catch { /* best-effort compensation */ }
  }
}
async function decrementStockDirect(
  db: AdminDb,
  deltas: Map<string, number>
): Promise<{ ok: true } | { ok: false; error: "insufficient" | "product_not_found" | "unavailable" }> {
  const done: Array<{ id: string; qty: number }> = [];
  for (const [id, qty] of deltas) {
    let row: { stock_quantity?: unknown; is_active?: unknown } | null = null;
    try {
      const res = await (db as any).from("products").select("stock_quantity, is_active").eq("id", id).maybeSingle();
      if (res.error || !res.data) { await compensateStock(db, done); return { ok: false, error: "product_not_found" }; }
      row = res.data;
    } catch { await compensateStock(db, done); return { ok: false, error: "unavailable" }; }
    const stock = Number(row?.stock_quantity);
    if (row?.is_active !== true || !Number.isFinite(stock) || stock < qty) {
      await compensateStock(db, done);
      return { ok: false, error: "insufficient" };
    }
    try {
      const upd = await (db as any).from("products")
        .update({ stock_quantity: stock - qty, updated_at: new Date().toISOString() })
        .eq("id", id)
        .gte("stock_quantity", qty)
        .select("id");
      if (upd.error || !Array.isArray(upd.data) || upd.data.length === 0) {
        await compensateStock(db, done);
        return { ok: false, error: "insufficient" };
      }
    } catch { await compensateStock(db, done); return { ok: false, error: "unavailable" }; }
    done.push({ id, qty });
  }
  return { ok: true };
}

export async function POST(request: Request) {
  try {
    const raw: CheckoutPayload = await request.json().catch(() => ({}));

    // â”€â”€ Shape validation only (values are NOT trusted) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (!Array.isArray(raw.items) || raw.items.length === 0 || raw.items.length > MAX_ITEMS) {
      return fail(400, "invalid_request", "السلة فارغة أو تحتوي عددًا غير مسموح من العناصر");
    }
    const addr = raw.address;
    if (!addr?.fullName?.trim() || !addr?.phone?.trim() || !addr?.city?.trim()) {
      return fail(400, "invalid_request", "بيانات التوصيل غير مكتملة");
    }

    // Normalize quantities: positive integers within cap; merge duplicate lines later.
    const normalized: Array<{ item: IncomingItem; qty: number }> = [];
    let totalQuantity = 0;
    for (const it of raw.items) {
      const qty = Math.floor(Number(it.quantity));
      if (!Number.isFinite(qty) || qty <= 0 || qty > MAX_QTY_PER_LINE) {
        return fail(422, "invalid_quantity", `كمية غير صالحة لعنصر: ${it.nameAr ?? it.slug ?? it.productId ?? "غير معروف"}`);
      }
      totalQuantity += qty;
      if (totalQuantity > MAX_TOTAL_QTY) {
        return fail(422, "quantity_limit_exceeded", "إجمالي كمية الطلب يتجاوز الحد المسموح");
      }
      normalized.push({ item: it, qty });
    }

    // ── Authentication — guest allowed (was blocking checkout for guests) ─────
    const supabase = await createServerSupabaseClient();
    let customerId: string | null = null;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: customer } = await supabase
          .from("customers")
          .select("id")
          .eq("auth_id", session.user.id)
          .maybeSingle();
        if (customer) customerId = (customer as { id: string }).id;
      }
    } catch {
      // guest checkout — customerId stays null
    }

    // â”€â”€ Server-side pricing from canonical sources â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    // Canonical catalog reads + stock RPC use the service-role client (server
    // only): the authenticated role currently lacks SELECT grants on catalog
    // tables (see db/fix_authenticated_grants.sql). All values are still
    // server-derived; the browser is never trusted.
    const db = createAdminClient();
    const idempotencyKey = request.headers.get("Idempotency-Key")?.trim() || null;
    if (idempotencyKey && (idempotencyKey.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(idempotencyKey))) {
      return fail(400, "invalid_idempotency_key", "Invalid idempotency key");
    }
    if (idempotencyKey) {
      let q = db
        .from("orders")
        .select("id, order_number, subtotal, shipping_fee, discount_total, total")
        .eq("idempotency_key", idempotencyKey) as any;
      q = customerId ? q.eq("customer_id", customerId) : q.is("customer_id", null);
      const { data: existing, error: existingError } = await q.maybeSingle();
      if (existingError) return fail(500, "order_lookup_failed", "Unable to verify previous order");
      if (existing) {
        const replay = existing as { id: string; order_number: string; subtotal: number; shipping_fee: number; discount_total: number; total: number };
        return NextResponse.json({
          success: true,
          orderId: replay.order_number,
          dbOrderId: replay.id,
          totals: { subtotal: replay.subtotal, shipping: replay.shipping_fee, discount: replay.discount_total, total: replay.total, currency: "YER" },
          serverDerived: true,
          idempotentReplay: true,
        });
      }
    }

    const productKeyOf = (it: IncomingItem): string | null => {
      const k = (it.productId ?? "").trim();
      return k.startsWith("ROUTINE-") || k.startsWith("BUNDLE-") ? null : k || null;
    };

    // Collect every product identifier that needs a canonical price/stock row:
    // direct product lines + routine step products.
    const wantedProductIds = new Set<string>();
    for (const { item } of normalized) {
      const kind = item.kind ?? "product";
      if (kind === "product") {
        const key = productKeyOf(item);
        if (!key) return fail(422, "unverifiable_item", "عنصر في السلة لا يمكن التحقق منه");
        wantedProductIds.add(key);
      } else if (kind === "routine") {
        for (const step of item.bundle?.items ?? []) {
          const pid = (step.productId ?? "").trim();
          if (!pid) return fail(422, "unverifiable_item", "خطوة روتين بدون منتج قابل للتحقق");
          wantedProductIds.add(pid);
        }
        if (!(item.bundle?.items?.length)) {
          return fail(422, "unverifiable_item", "روتين بدون خطوات منتجات");
        }
      }
    }

    // One pass over products matching either legacy_id or UUID id.
    type ProductRow = { id: string; legacy_id: string | null; slug: string; name: { ar?: string } | null; gallery: unknown; images: unknown; pricing: { price?: number } | null; stock_quantity: number; is_active: boolean };
    const productRows = new Map<string, ProductRow>();
    if (wantedProductIds.size > 0) {
      const keys = [...wantedProductIds];
      const uuidKeys = keys.filter((k) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(k));
      const textKeys = keys.filter((k) => !uuidKeys.includes(k));
      const orFilter = [
        ...(textKeys.length ? [`legacy_id.in.(${textKeys.join(",")})`] : []),
        ...(uuidKeys.length ? [`id.in.(${uuidKeys.join(",")})`] : []),
      ].join(",");
      const { data, error } = await db
        .from("products")
        .select("id, legacy_id, slug, name, gallery, images, pricing, stock_quantity, is_active")
        .or(orFilter);
      if (error) return fail(500, "catalog_unavailable", "تعذر التحقق من الكتالوج، حاول لاحقًا");
      for (const row of (data ?? []) as unknown as ProductRow[]) {
        if (row.legacy_id) productRows.set(row.legacy_id, row);
        productRows.set(row.id, row);
        productRows.set(row.slug, row);
      }
    }

    // Bundle rows (by slug) for bundle lines.
    type BundleRow = { slug: string; name_ar: string | null; image: string | null; bundle_price: number; is_active: boolean };
    const bundleSlugs = new Set<string>();
    for (const { item } of normalized) {
      if ((item.kind ?? "") === "bundle") bundleSlugs.add((item.slug ?? "").trim());
    }
    const bundleRows = new Map<string, BundleRow>();
    if (bundleSlugs.size > 0) {
      const { data, error } = await db
        .from("bundles")
        .select("slug, name_ar, image, bundle_price, is_active")
        .in("slug", [...bundleSlugs]);
      if (error) return fail(500, "catalog_unavailable", "تعذر التحقق من الباقات، حاول لاحقًا");
      for (const row of (data ?? []) as unknown as BundleRow[]) bundleRows.set(row.slug, row);
    }

    // Routine rows (by slug) for routine lines.
    type RoutineRow = { slug: string; name_ar: string | null; savings_percent: number; is_active: boolean };
    const routineSlugs = new Set<string>();
    for (const { item } of normalized) {
      if ((item.kind ?? "") === "routine") routineSlugs.add((item.bundle?.bundleId ?? "").trim());
    }
    const routineRows = new Map<string, RoutineRow>();
    if (routineSlugs.size > 0) {
      const { data, error } = await db
        .from("routines")
        .select("slug, name_ar, savings_percent, is_active")
        .in("slug", [...routineSlugs]);
      if (error) return fail(500, "catalog_unavailable", "تعذر التحقق من الروتينات، حاول لاحقًا");
      for (const row of (data ?? []) as unknown as RoutineRow[]) routineRows.set(row.slug, row);
    }

    // Approved-config addon prices (never client-supplied): static defaults
    // PLUS live DB gift_options (storefront shows DB options with UUID ids —
    // validating static-only rejected every real addon with unknown_addon).
    const addonPrices = new Map<string, number>(DEFAULT_GIFT_OPTIONS.map((g) => [g.id, g.price]));
    try {
      const { data: giftRows } = await db.from("gift_options").select("id, price, is_active").eq("is_active", true);
      for (const g of ((giftRows ?? []) as unknown as { id?: unknown; price?: unknown }[])) {
        const gid = typeof g?.id === "string" ? g.id.trim() : "";
        const gp = Number(g?.price);
        if (gid && Number.isFinite(gp) && gp >= 0) addonPrices.set(gid, gp);
      }
    } catch { /* static fallback stands */ }

    // ── Build server-derived lines ────────────────────────────────────────
    const lines: PricedLine[] = [];
    const stockDeltas = new Map<string, number>();
    const primaryImage = (p: ProductRow): string | null => {
      const gal = Array.isArray(p.gallery) ? (p.gallery as string[]) : [];
      const imgs = Array.isArray(p.images) ? (p.images as string[]) : [];
      return gal[0] ?? imgs[0] ?? null;
    };

    for (const { item, qty } of normalized) {
      const kind = item.kind ?? "product";

      if (kind === "product") {
        const row = productRows.get(productKeyOf(item)!);
        if (!row) return fail(422, "product_not_found", `المنتج غير موجود في قاعدة البيانات: ${item.nameAr ?? item.productId}`);
        if (!row.is_active) return fail(409, "product_inactive", `المنتج غير متاح للبيع حاليًا: ${row.name?.ar ?? row.slug}`);
        const price = Number(row.pricing?.price);
        if (!Number.isFinite(price) || price <= 0) {
          return fail(500, "price_unavailable", `سعر المنتج غير موثوق في قاعدة البيانات: ${row.name?.ar ?? row.slug}`);
        }
        if (row.stock_quantity < qty) {
          return fail(409, "insufficient_stock", `الكمية المطلوبة غير متوفرة من: ${row.name?.ar ?? row.slug}`, { available: Math.max(0, row.stock_quantity) });
        }
        lines.push({
          productId: row.id,
          productName: row.name?.ar ?? row.slug,
          productImage: primaryImage(row),
          quantity: qty,
          unitPrice: price,
          totalPrice: price * qty,
        });
        stockDeltas.set(row.id, (stockDeltas.get(row.id) ?? 0) + qty);

      } else if (kind === "bundle") {
        const row = bundleRows.get((item.slug ?? "").trim());
        if (!row) return fail(422, "bundle_not_found", `الباقة غير موجودة في قاعدة البيانات: ${item.nameAr ?? item.slug}`);
        if (!row.is_active) return fail(409, "bundle_inactive", `الباقة غير متاحة للبيع حاليًا: ${row.name_ar ?? row.slug}`);
        let unit = Number(row.bundle_price);
        if (!Number.isFinite(unit) || unit <= 0) {
          return fail(500, "price_unavailable", `سعر الباقة غير موثوق في قاعدة البيانات: ${row.name_ar ?? row.slug}`);
        }
        for (const addon of item.bundle?.addons ?? []) {
          const addonId = (addon.id ?? "").trim();
          const addonPrice = addonPrices.get(addonId);
          if (!Number.isFinite(addonPrice)) {
            return fail(422, "unknown_addon", `خيار إضافة غير معروف: ${addonId}`);
          }
          unit += addonPrice!;
        }
        lines.push({
          productId: null,
          productName: `[باقة] ${row.name_ar ?? row.slug}`,
          productImage: row.image,
          quantity: qty,
          unitPrice: unit,
          totalPrice: unit * qty,
        });

      } else if (kind === "routine") {
        const row = routineRows.get((item.bundle?.bundleId ?? "").trim());
        if (!row || !row.is_active) {
          return fail(422, "routine_not_found", `الروتين غير متاح للشراء حاليًا: ${item.nameAr ?? item.bundle?.bundleId}`);
        }
        let sum = 0;
        for (const step of item.bundle!.items!) {
          const pid = (step.productId ?? "").trim();
          const prow = productRows.get(pid);
          if (!prow || !prow.is_active) return fail(422, "routine_product_unavailable", `أحد منتجات الروتين غير متاح: ${pid}`);
          const price = Number(prow.pricing?.price);
          if (!Number.isFinite(price) || price <= 0) {
            return fail(500, "price_unavailable", `سعر أحد منتجات الروتين غير موثوق: ${prow.name?.ar ?? pid}`);
          }
          const stepQty = Math.max(1, Math.min(MAX_QTY_PER_LINE, Math.floor(Number(step.quantity)) || 1));
          sum += price * stepQty;
          stockDeltas.set(prow.id, (stockDeltas.get(prow.id) ?? 0) + stepQty * qty);
        }
        const unit = Math.round(sum * (1 - (Number(row.savings_percent) || 0) / 100));
        lines.push({
          productId: null,
          productName: `[روتين] ${row.name_ar ?? row.slug}`,
          productImage: null,
          quantity: qty,
          unitPrice: unit,
          totalPrice: unit * qty,
        });

      } else {
        return fail(422, "unsupported_item_kind", `نوع عنصر غير مدعوم: ${kind}`);
      }
    }

    // ── Server-computed totals ─────────────────────────────────────────────
    const subtotal = lines.reduce((s, l) => s + l.totalPrice, 0);

    const governorate = DEFAULT_GOVERNORATES.find((g) => g.name === addr.city && g.enabled)
      ?? DEFAULT_GOVERNORATES.find((g) => g.nameEn === addr.city && g.enabled);
    if (!governorate) {
      return fail(422, "unknown_governorate", "المحافظة غير معروفØ© أو التوصيل غير مُفعّل لها");
    }
    const shipping = governorate.fee;
    const total = subtotal + shipping;

    // â”€â”€ Persist order â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const orderNumber = `ORD-${Date.now()}-${randomBytes(4).toString("hex")}`;
    const { data: order, error: orderError } = await db
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_id: customerId,
        status: "pending",
        subtotal,
        shipping_fee: shipping,
        discount_total: 0,
        total,
        shipping_address: {
          fullName: addr.fullName.trim(),
          phone: addr.phone.trim(),
          city: governorate.name,
          district: addr.district?.trim() ?? "",
          street: addr.street?.trim() ?? "",
          building: addr.building?.trim() ?? "",
          notes: addr.notes?.trim() || undefined,
        },
        payment_method: "cod",
        notes: addr.notes?.trim() || null,
        idempotency_key: idempotencyKey,
      } as never)
      .select("id")
      .single();

    if (orderError || !order) {
      return fail(500, "order_failed", "تعذر إنشاء الطلب، لم يخصم أي مخزون");
    }
    const orderId = (order as { id: string }).id;

    const orderItems = lines.map((l) => ({
      order_id: orderId,
      product_id: l.productId,
      product_name: l.productName,
      product_name_ar: l.productName,
      product_image: l.productImage,
      quantity: l.quantity,
      unit_price: l.unitPrice,
      total_price: l.totalPrice,
    }));

    const { error: itemsError } = await db.from("order_items").insert(orderItems as never);
    if (itemsError) {
      await db.from("orders").delete().eq("id", orderId);
      return fail(500, "order_failed", "تعذر حفظ عناصر الطلب، لم يخصم أي مخزون");
    }

    // â”€â”€ Atomic stock decrement (all-or-nothing RPC) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const p_items = [...stockDeltas.entries()].map(([id, q]) => ({ id, qty: q }));
    const { data: decData, error: decError } = await db.rpc("checkout_decrement_product_stock", { p_items } as never);
    if (decError) {
      const rollbackOrder = async () => {
        await db.from("order_items").delete().eq("order_id", orderId);
        await db.from("orders").delete().eq("id", orderId);
      };
      const msg = String((decError as { message?: unknown })?.message ?? "");
      const code = String((decError as { code?: unknown })?.code ?? "");
      const isPermissionIssue = code === "42501" || /permission denied/i.test(msg);
      if (!isPermissionIssue) {
        // Any failure rolls back ALL decrements inside the RPC transaction;
        // here we also remove the order so no paid-but-unfulfillable record stays.
        await rollbackOrder();
        if (msg.includes("STOCK_INSUFFICIENT")) {
          return fail(409, "insufficient_stock", "الكمية المطلوبة نفدت أثناء إتمام الطلب — لم يتم أي خصم");
        }
        return fail(500, "stock_update_failed", "تعذر تحديث المخزون، تم إلغاء الطلب بالكامل");
      }
      // Fallback: RPC unavailable (missing EXECUTE grant) — guarded direct
      // decrement with compensation. Keeps checkout working until the grant
      // below is applied in the database (see db/migration_checkout_stock_atomicity.sql).
      const direct = await decrementStockDirect(db, stockDeltas);
      if (!direct.ok) {
        await rollbackOrder();
        if (direct.error === "insufficient") {
          return fail(409, "insufficient_stock", "الكمية المطلوبة نفدت أثناء إتمام الطلب — لم يتم أي خصم");
        }
        if (direct.error === "product_not_found") {
          return fail(409, "product_not_found", "أحد المنتجات غير موجود");
        }
        return fail(500, "stock_update_failed", "تعذر تحديث المخزون، تم إلغاء الطلب بالكامل");
      }
      return NextResponse.json({
        success: true,
        orderId: orderNumber,
        dbOrderId: orderId,
        totals: { subtotal, shipping, total, currency: "YER" },
        serverDerived: true,
      });
    }
    const dec = decData as { ok?: boolean; error?: string } | null;
    if (!dec?.ok) {
      await db.from("order_items").delete().eq("order_id", orderId);
      await db.from("orders").delete().eq("id", orderId);
      return fail(409, dec?.error === "product_not_found" ? "product_not_found" : "stock_update_failed",
        dec?.error === "product_not_found" ? "أحد المنتجات غير موجود" : "تعذر تحديث المخزون، تم إلغاء الطلب بالكامل");
    }

    return NextResponse.json({
      success: true,
      orderId: orderNumber,
      dbOrderId: orderId,
      totals: { subtotal, shipping, total, currency: "YER" },
      serverDerived: true,
    });
  } catch {
    return fail(500, "internal_error", "خطأ داخلي في الخادم");
  }
}
