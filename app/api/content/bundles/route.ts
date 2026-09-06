import { NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase";

export const runtime = "nodejs";

const DEFAULT_DISCOUNT_PERCENT = 20;

type DbBundle = {
  id: string;
  slug: string;
  name_en?: string | null;
  name_ar?: string | null;
  description?: string | null;
  description_ar?: string | null;
  occasions?: unknown;
  image?: string | null;
  badge?: string | null;
  badge_ar?: string | null;
  gift_wrap?: boolean | null;
  gift_wrap_price?: number | null;
  gift_card?: boolean | null;
  service_price?: number | null;
  is_active?: boolean | null;
  discount_enabled?: boolean | null;
  discount_percent?: number | null;
  display_order?: number | null;
};

type DbBundleProduct = {
  bundle_id: string;
  product_id: string;
};

type DbGiftOption = {
  id: string;
  name: { ar?: string; en?: string } | null;
  price: number | null;
  is_active: boolean | null;
};

export async function GET() {
  const supabase = createAdminClient();
  const [bundlesRes, giftsRes, bundleProductsRes] = await Promise.all([
    supabase.from("bundles").select("*").eq("is_active", true).order("display_order", { ascending: true }),
    supabase.from("gift_options").select("*").eq("is_active", true),
    supabase.from("bundle_products").select("bundle_id, product_id"),
  ]);

  const bpRows = (bundleProductsRes.data ?? []) as unknown as DbBundleProduct[];
  const productIdsByBundle = new Map<string, string[]>();
  for (const row of bpRows) {
    const list = productIdsByBundle.get(row.bundle_id) ?? [];
    list.push(row.product_id);
    productIdsByBundle.set(row.bundle_id, list);
  }

  const allUuids = [...new Set(bpRows.map((r) => r.product_id))];
  const priceByUuid = new Map<string, number>();
  const legacyById = new Map<string, string>();
  if (allUuids.length > 0) {
    const { data: prodRows } = await supabase
      .from("products")
      .select("id, legacy_id, pricing")
      .in("id", allUuids);
    for (const p of (prodRows ?? []) as { id: string; legacy_id: string | null; pricing?: { price?: number } }[]) {
      if (p.legacy_id) legacyById.set(p.id, p.legacy_id);
      if (p.pricing?.price) priceByUuid.set(p.id, p.pricing.price);
    }
  }

  const resolvedPidsBy = new Map<string, string[]>();
  for (const [bundleId, uuids] of productIdsByBundle) {
    resolvedPidsBy.set(bundleId, uuids.map((uuid) => legacyById.get(uuid) ?? uuid));
  }

  const bundles = ((bundlesRes.data ?? []) as unknown as DbBundle[]).map((b) => {
    const occasions = Array.isArray(b.occasions) ? (b.occasions as string[]) : [];
    const uuids = productIdsByBundle.get(b.id) ?? [];
    const productIds = resolvedPidsBy.get(b.id) ?? [];

    const originalPrice = uuids.reduce((sum, uuid) => sum + (priceByUuid.get(uuid) ?? 0), 0);
    const discountEnabled = b.discount_enabled !== false;
    const discountPercent = discountEnabled
      ? (typeof b.discount_percent === "number" && b.discount_percent > 0 ? b.discount_percent : DEFAULT_DISCOUNT_PERCENT)
      : 0;
    const bundlePrice = discountEnabled
      ? Math.round(originalPrice * (1 - discountPercent / 100))
      : originalPrice;

    return {
      id: b.slug ?? b.id,
      slug: b.slug,
      name: b.name_en ?? "",
      nameAr: b.name_ar ?? "",
      nameEn: b.name_en ?? "",
      description: b.description ?? undefined,
      descriptionAr: b.description_ar ?? undefined,
      descriptionEn: b.description ?? undefined,
      image: b.image ?? undefined,
      badge: b.badge_ar ?? b.badge ?? undefined,
      badgeAr: b.badge_ar ?? b.badge ?? undefined,
      occasion: occasions,
      productIds,
      originalPrice,
      bundlePrice,
      discountPercent,
      savingsPercent: discountPercent,
      giftWrap: b.gift_wrap ?? false,
      giftWrapPrice: b.gift_wrap_price ?? 0,
      giftCard: b.gift_card ?? false,
      servicePrice: b.service_price ?? 0,
      active: b.is_active !== false,
      displayOrder: (b as Record<string, unknown>).display_order ?? 0,
    };
  });

  const giftOptions = ((giftsRes.data ?? []) as unknown as DbGiftOption[]).map((g) => ({
    id: g.id,
    labelAr: g.name?.ar ?? "",
    labelEn: g.name?.en ?? "",
    price: g.price ?? 0,
    enabled: g.is_active !== false,
  }));

  return NextResponse.json(
    { bundles, giftOptions },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate", "Pragma": "no-cache" } }
  );
}
