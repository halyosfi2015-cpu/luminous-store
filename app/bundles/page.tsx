import type { Metadata } from "next";
import BundlesClient from "./BundlesClient";
import { createPublicSupabaseClient } from "@/src/lib/supabase-server";
import type { Bundle } from "@/src/types/bundle";
import type { GiftOption } from "@/src/data/bundles-admin";

export const metadata: Metadata = {
  title: "باقات وهدايا - Luminous Derma",
  description:
    "باقات مختارة بعناية لكل مناسبة — خطوبة، زفاف، أعياد وصيف. وفّري حتى 25% مع باقات Luminous Derma، أو صممي باقتك الخاصة.",
  alternates: { canonical: "https://luminousderma.com/bundles" },
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
    return ((bundlesRes.data ?? []) as unknown as DbBundle[]).map((b) => {
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
  } catch {
    return [];
  }
}

export default async function BundlesPage() {
  const serverBundles = await getServerBundles();
  return <BundlesClient serverBundles={serverBundles} />;
}
