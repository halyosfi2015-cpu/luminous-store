/**
 * PART 2 / P5 — Real source loader (server-only).
 * Loads product/routine/bundle/offer sources from the existing data layer
 * (Supabase-first via product-dal + direct Supabase for routines/bundles/
 * offers) and builds a VerifiedFacts manifest. Never invents: missing data
 * is reported in manifest.missing and blocks gated templates.
 */
import { createAdminClient } from "@/src/lib/supabase";
import { getAllProducts } from "@/src/lib/product-dal";
import type { VisualSourceType } from "./templates";
import type { FactsManifest } from "./verified-facts";
import { buildProductFacts, buildRoutineFacts, buildBundleFacts, buildOfferFacts } from "./verified-facts";

type Raw = Record<string, unknown>;

function indexProducts(list: Raw[]): Map<string, Raw> {
  const map = new Map<string, Raw>();
  for (const p of list) {
    for (const k of [p.id, p.legacy_id, p.slug, p.sku]) {
      if (typeof k === "string" && k) map.set(k, p);
    }
  }
  return map;
}

function pickName(row: Raw): { ar: string; en: string } {
  const n = row.name as unknown;
  if (n && typeof n === "object") {
    const o = n as Record<string, unknown>;
    const ar = typeof o.ar === "string" ? o.ar : "";
    const en = typeof o.en === "string" ? o.en : "";
    return { ar: ar || en, en: en || ar };
  }
  const s = typeof n === "string" ? n : "";
  const ar = typeof row.nameAr === "string" && row.nameAr ? (row.nameAr as string) : s;
  return { ar, en: s || ar };
}

async function loadRoutineRaw(id: string): Promise<Raw | null> {
  try {
    const supabase = createAdminClient() as unknown as {
      from: (t: string) => {
        select: (c: string) => {
          or: (f: string) => { limit: (n: number) => Promise<{ data: Raw[] | null }> };
          eq: (c: string, v: string) => {
            order?: (c: string, o?: unknown) => Promise<{ data: Raw[] | null }>;
          } & { order: (c: string, o?: unknown) => Promise<{ data: Raw[] | null }> } & Promise<{ data: Raw[] | null }>;
        };
      };
    };
    const { data } = await supabase.from("routines").select("*").or(`id.eq.${id},slug.eq.${id}`).limit(1);
    const row = data?.[0];
    if (!row) return null;
    const rid = String(row.id);
    const stepsRes = await (supabase.from("routine_steps").select("*") as unknown as {
      eq: (c: string, v: string) => { order: (c: string) => Promise<{ data: Raw[] | null }> };
    }).eq("routine_id", rid).order("step_number");
    const prodRes = await (supabase.from("routine_products").select("product_id") as unknown as {
      eq: (c: string, v: string) => Promise<{ data: Raw[] | null }>;
    }).eq("routine_id", rid);
    const steps = (stepsRes.data ?? []).map((s) => ({
      titleAr: String(s.title_ar ?? s.titleAr ?? ""),
      titleEn: String(s.title_en ?? s.titleEn ?? ""),
      productId: String(s.product_id ?? s.productId ?? ""),
      time: String(s.time_of_day ?? ""),
    }));
    const name = pickName(row);
    return {
      id: rid, slug: String(row.slug ?? rid),
      name: { ar: name.ar || String(row.name_ar ?? ""), en: name.en },
      description: { ar: String(row.description ?? ""), en: "" },
      image: (row.image as string) ?? (row.hero_image as string) ?? null,
      savingsPercent: Number(row.savings_percent ?? 0) || null,
      steps,
      productIds: (prodRes.data ?? []).map((p) => String(p.product_id)),
    };
  } catch { return null; }
}

async function loadBundleRaw(id: string): Promise<Raw | null> {
  try {
    const supabase = createAdminClient() as unknown as {
      from: (t: string) => {
        select: (c: string) => {
          or: (f: string) => { limit: (n: number) => Promise<{ data: Raw[] | null }> };
          eq: (c: string, v: string) => Promise<{ data: Raw[] | null }>;
        };
      };
    };
    const { data } = await supabase.from("bundles").select("*").or(`id.eq.${id},slug.eq.${id}`).limit(1);
    const row = data?.[0];
    if (!row) return null;
    const bid = String(row.id);
    const prodRes = await supabase.from("bundle_products").select("product_id,quantity").eq("bundle_id", bid);
    const name = pickName({ name: { ar: String(row.name_ar ?? ""), en: String(row.name_en ?? "") } });
    return {
      id: bid, slug: String(row.slug ?? bid),
      name: { ar: name.ar, en: name.en },
      productIds: (prodRes.data ?? []).map((p) => String(p.product_id)),
      bundlePrice: Number(row.bundle_price ?? 0) || null,
      originalPrice: Number(row.original_price ?? 0) || null,
      savingsPercent: Number(row.savings_percent ?? 0) || null,
      image: (row.image as string) ?? null,
    };
  } catch { return null; }
}

async function loadOfferRaw(id: string): Promise<Raw | null> {
  try {
    const supabase = createAdminClient() as unknown as {
      from: (t: string) => {
        select: (c: string) => {
          or: (f: string) => { limit: (n: number) => Promise<{ data: Raw[] | null }> };
        };
      };
    };
    const { data } = await supabase.from("offers").select("*").or(`id.eq.${id}`).limit(1);
    const row = data?.[0];
    if (!row) return null;
    const productsRaw = Array.isArray(row.products) ? row.products : [];
    const title = row.title as Record<string, unknown> | undefined;
    const discounts = productsRaw
      .map((p) => Number((p as Raw).discount ?? 0))
      .filter((n) => Number.isFinite(n) && n > 0);
    return {
      id: String(row.id),
      titleAr: String(title?.ar ?? title?.en ?? "عرض خاص"),
      products: productsRaw,
      discount: discounts.length > 0 ? Math.max(...discounts) : null,
      startsAt: String(row.start_date ?? ""),
      endsAt: String(row.end_date ?? ""),
    };
  } catch { return null; }
}

export interface LoadedSource {
  manifest: FactsManifest;
  /** Resolved display info for the UI (names, images). */
  display: { nameAr: string; image: string | null; productCount: number };
}

export async function loadSourceManifest(
  sourceType: VisualSourceType,
  sourceId: string,
): Promise<LoadedSource | { error: string }> {
  const all = (await getAllProducts().catch(() => [])) as unknown as Raw[];
  const byKey = indexProducts(all);
  const resolveProduct = (id: string): Raw | null => byKey.get(id) ?? null;

  if (sourceType === "product" || sourceType === "education") {
    const raw = resolveProduct(sourceId);
    if (!raw) return { error: `المنتج ${sourceId} غير موجود في الكتالوج` };
    const manifest = buildProductFacts(raw);
    const f = manifest.facts as unknown as { nameAr: string; image: string | null };
    return { manifest, display: { nameAr: f.nameAr, image: f.image, productCount: 1 } };
  }
  if (sourceType === "routine") {
    const raw = await loadRoutineRaw(sourceId);
    if (!raw) return { error: `الروتين ${sourceId} غير موجود في قاعدة البيانات` };
    const manifest = buildRoutineFacts(raw, resolveProduct);
    const f = manifest.facts as unknown as { nameAr: string; image: string | null; products: unknown[] };
    return { manifest, display: { nameAr: f.nameAr, image: f.image, productCount: f.products.length } };
  }
  if (sourceType === "bundle") {
    const raw = await loadBundleRaw(sourceId);
    if (!raw) return { error: `الباقة ${sourceId} غير موجودة في قاعدة البيانات` };
    const manifest = buildBundleFacts(raw, resolveProduct);
    const f = manifest.facts as unknown as { nameAr: string; image: string | null; products: unknown[] };
    return { manifest, display: { nameAr: f.nameAr, image: f.image, productCount: f.products.length } };
  }
  if (sourceType === "offer" || sourceType === "campaign") {
    // Offer by campaign id, or a discounted product acting as its own offer.
    const raw = await loadOfferRaw(sourceId);
    if (raw) {
      const manifest = buildOfferFacts(raw, resolveProduct);
      const f = manifest.facts as unknown as { titleAr: string; products: { image: string | null }[] };
      return {
        manifest,
        display: { nameAr: f.titleAr, image: f.products[0]?.image ?? null, productCount: f.products.length },
      };
    }
    const prod = resolveProduct(sourceId);
    if (prod) {
      const pm = buildProductFacts(prod);
      const pf = pm.facts as unknown as { discount: number | null; originalPrice: number | null; price: number | null };
      const hasOffer = !!pf.discount || ((pf.originalPrice ?? 0) > (pf.price ?? 0));
      if (!hasOffer) return { error: `لا يوجد عرض حقيقي على ${sourceId} ولا حملة بهذا المعرّف` };
      const manifest = buildOfferFacts(
        { id: sourceId, titleAr: "عرض خاص", products: [{ productId: sourceId }], discount: pf.discount },
        resolveProduct,
      );
      const f = pm.facts as unknown as { nameAr: string; image: string | null };
      return { manifest, display: { nameAr: `عرض: ${f.nameAr}`, image: f.image, productCount: 1 } };
    }
    return { error: `العرض/الحملة ${sourceId} غير موجود` };
  }
  return { error: `نوع مصدر غير مدعوم: ${sourceType}` };
}
