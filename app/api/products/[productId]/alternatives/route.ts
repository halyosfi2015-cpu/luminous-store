/**
 * Public storefront API for product alternatives.
 *
 * GET /api/products/[productId]/alternatives
 *
 * Returns copy_price + family product (resolved from canonical data).
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase";

type AltProduct = {
  id: string;
  slug: string;
  name: { ar: string; en: string };
  brand: string;
  gallery: string[];
  price: number;
  currency: string;
};

/** Resolve a text product ID (legacy_id like "yq-754") to a UUID. */
async function resolveProductId(supabase: any, textId: string): Promise<string | null> {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(textId)) {
    return textId;
  }
  const { data } = await supabase
    .from("products")
    .select("id")
    .eq("legacy_id", textId)
    .single();
  return data?.id ?? null;
}

/** Resolve a product UUID to full product data with brand name. */
async function resolveProduct(supabase: any, productUuid: string): Promise<AltProduct | null> {
  const { data: prod } = await supabase
    .from("products")
    .select("id, slug, name, brand_id, gallery, pricing, is_active")
    .eq("id", productUuid)
    .single();

  if (!prod || !prod.is_active) return null;

  // Resolve brand name from brands table
  let brandName = "";
  if (prod.brand_id) {
    const { data: brand } = await supabase
      .from("brands")
      .select("name")
      .eq("id", prod.brand_id)
      .single();
    brandName = brand?.name ?? "";
  }

  return {
    id: prod.id,
    slug: prod.slug,
    name: prod.name,
    brand: brandName,
    gallery: prod.gallery,
    price: prod.pricing.price,
    currency: prod.pricing.currency,
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  const { productId } = await params;
  if (!productId) {
    return NextResponse.json({ error: "productId is required" }, { status: 400 });
  }

  const supabase = createAdminClient() as any;

  // Resolve source product text ID → UUID
  const sourceUuid = await resolveProductId(supabase, productId);
  if (!sourceUuid) {
    return NextResponse.json({ copyPrice: null, family: null });
  }

  const { data: rel } = await supabase
    .from("product_alternatives")
    .select("copy_price, family_alternative_id")
    .eq("source_product_id", sourceUuid)
    .single();

  if (!rel) {
    return NextResponse.json({ copyPrice: null, family: null });
  }

  const family = rel.family_alternative_id
    ? await resolveProduct(supabase, rel.family_alternative_id)
    : null;

  return NextResponse.json({
    copyPrice: rel.copy_price ?? null,
    family,
  });
}
