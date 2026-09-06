import TopBar from "@/components/layout/TopBar";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HomeSections from "@/components/home/HomeSections";
import { createPublicSupabaseClient } from "@/src/lib/supabase-server";
import { readHomepageOverrides } from "@/src/lib/content-store";
import { getServerProducts } from "@/src/lib/server-products";
import type { Bundle } from "@/src/types/bundle";
import type { ProductSummary } from "@/src/types/product";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Luminous Derma — العناية الفاخرة بالبشرة",
  description: "منتجات العناية بالبشرة الأصلية من أفضل الماركات العالمية. تسوقي سيروم، مرطبات، واقي شمس وأكثر مع Luminous Derma — وجهتك الأولى للعناية بالبشرة في اليمن.",
  keywords: ["عناية بالبشرة", "منتجات تجميل", "سيروم", "مرطب", "واقي شمس", "Luminous Derma", "لومينوس ديرما", "skincare Yemen"],
  alternates: { canonical: "https://luminousderma.com/" },
};

const DEFAULT_BUNDLE_DISCOUNT = 20;

type DbBundle = {
  id: string; slug: string; name_en?: string | null; name_ar?: string | null;
  description?: string | null; description_ar?: string | null; occasions?: unknown;
  image?: string | null; badge?: string | null; badge_ar?: string | null;
  gift_wrap?: boolean | null; gift_wrap_price?: number | null;
  gift_card?: boolean | null; service_price?: number | null;
  is_active?: boolean | null; discount_enabled?: boolean | null;
  discount_percent?: number | null;
};

async function getServerBundles(): Promise<Bundle[]> {
  try {
    const supabase = createPublicSupabaseClient();
    const [bundlesRes, bpRes] = await Promise.all([
      supabase.from("bundles").select("*").eq("is_active", true),
      supabase.from("bundle_products").select("bundle_id, product_id"),
    ]);
    const bpRows = (bpRes.data ?? []) as { bundle_id: string; product_id: string }[];
    const pidsBy = new Map<string, string[]>();
    for (const r of bpRows) {
      const list = pidsBy.get(r.bundle_id) ?? [];
      list.push(r.product_id);
      pidsBy.set(r.bundle_id, list);
    }
    const allUuids = [...new Set(bpRows.map((r) => r.product_id))];
    const legacyById = new Map<string, string>();
    const priceByUuid = new Map<string, number>();
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
    for (const [bundleId, uuids] of pidsBy) {
      resolvedPidsBy.set(bundleId, uuids.map((uuid) => legacyById.get(uuid) ?? uuid));
    }
    const dbBundles = ((bundlesRes.data ?? []) as unknown as DbBundle[]).map((b) => {
      const occasions = Array.isArray(b.occasions) ? (b.occasions as string[]) : [];
      const uuids = pidsBy.get(b.id) ?? [];
      const originalPrice = uuids.reduce((sum, uuid) => sum + (priceByUuid.get(uuid) ?? 0), 0);
      const discountEnabled = b.discount_enabled !== false;
      const discountPercent = discountEnabled
        ? (typeof b.discount_percent === "number" && b.discount_percent > 0 ? b.discount_percent : DEFAULT_BUNDLE_DISCOUNT)
        : 0;
      const bundlePrice = discountEnabled
        ? Math.round(originalPrice * (1 - discountPercent / 100))
        : originalPrice;
      return {
        id: b.slug ?? b.id, slug: b.slug,
        nameAr: b.name_ar ?? "", nameEn: b.name_en ?? "",
        descriptionAr: b.description_ar ?? "", descriptionEn: b.description ?? "",
        occasion: occasions as Bundle["occasion"],
        image: b.image ?? "", badge: b.badge ?? undefined, badgeAr: b.badge_ar ?? undefined,
        productIds: resolvedPidsBy.get(b.id) ?? [],
        originalPrice, bundlePrice,
        savingsPercent: discountPercent, giftWrap: b.gift_wrap ?? false,
        giftWrapPrice: b.gift_wrap_price ?? 0, giftCard: b.gift_card ?? false,
        servicePrice: b.service_price ?? 0, active: b.is_active !== false,
        discountEnabled, discountPercent,
      };
    });
    if (dbBundles.length > 0) return dbBundles;
  } catch { /* fall through to static fallback */ }
  try {
    const { bundles: staticBundles } = await import("@/src/data/bundles");
    return (staticBundles as unknown as Bundle[]).filter((b) => b.active !== false);
  } catch {
    return [];
  }
}

export default async function Home() {
  const [serverBundles, serverProductsData] = await Promise.all([
    getServerBundles(),
    getServerProducts(),
  ]);
  // Canonical saved section order (undefined when the admin never saved one —
  // in that case HomeSections keeps the built-in default composition).
  let savedOrder;
  try {
    savedOrder = readHomepageOverrides().order;
  } catch {
    savedOrder = undefined;
  }
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Luminous Derma",
            url: "https://luminousderma.com",
            description: "منتجات العناية بالبشرة الأصلية من أفضل الماركات العالمية",
            potentialAction: {
              "@type": "SearchAction",
              target: "https://luminousderma.com/search?q={search_term_string}",
              "query-input": "required name=search_term_string",
            },
          }),
        }}
      />
      <TopBar />
      <div className="sticky top-0 z-50 bg-background">
        <Header />
      </div>
      <main id="main-content">
        <HomeSections
          serverBundles={serverBundles}
          serverProducts={serverProductsData.products}
          serverBrands={serverProductsData.brands}
          order={savedOrder}
        />
      </main>
      <Footer />
    </>
  );
}