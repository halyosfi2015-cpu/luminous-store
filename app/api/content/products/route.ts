import { NextRequest, NextResponse } from "next/server";
import { createPublicSupabaseClient } from "@/src/lib/supabase-server";

export const dynamic = "force-dynamic";

type DbProduct = {
  id: string;
  legacy_id: string | null;
  slug: string;
  name: { ar?: string; en?: string } | null;
  brand_id: string | null;
  category_id: string | null;
  pricing: { price?: number; currency?: string } | null;
  gallery: string[] | null;
  hero_image: string | null;
  images?: string[] | null;
  skin_types: string[] | null;
  suitable_for: string[] | null;
  skin_concerns: string[] | null;
  stock: number | null;
  stock_quantity: number | null;
  in_stock: boolean | null;
  rating: number | null;
  review_count: number | null;
  is_featured: boolean | null;
  is_new: boolean | null;
  is_best_seller: boolean | null;
  is_doctor_recommended: boolean | null;
  tags: string[] | null;
  status: string | null;
  discount: number | null;
};

const SUBCATEGORY_TO_PARENT: Record<string, string> = {
  cleansers: "skincare", toners: "skincare", serums: "skincare", moisturizers: "skincare",
  sunscreen: "skincare", "eye-care": "skincare", "lip-care": "skincare", masks: "skincare",
  exfoliators: "skincare",
  shampoo: "haircare", "hair-oils": "haircare", "hair-creams": "haircare", conditioner: "haircare",
  "body-wash": "bodycare", "body-lotion": "bodycare", "body-oils": "bodycare",
  "face-makeup": "makeup", "eye-makeup": "makeup", "lip-makeup": "makeup",
  "perfume-women": "perfume", "perfume-men": "perfume", "perfume-musk": "perfume",
  "baby-care": "mother-baby", "teeth-cleansing": "oral-care", mouthwash: "oral-care",
  deodorants: "personal-care", shaving: "personal-care",
};

const CATEGORY_MAP: Record<string, { name: string; nameAr: string; slug: string }> = {
  skincare: { name: "Skincare", nameAr: "العناية بالبشرة", slug: "skincare" },
  haircare: { name: "Haircare", nameAr: "العناية بالشعر", slug: "haircare" },
  bodycare: { name: "Bodycare", nameAr: "العناية بالجسم", slug: "bodycare" },
  makeup: { name: "Makeup", nameAr: "المكياج", slug: "makeup" },
  perfume: { name: "Fragrances", nameAr: "العطور", slug: "perfume" },
  "oral-care": { name: "Oral Care", nameAr: "العناية بالفم والأسنان", slug: "oral-care" },
  "personal-care": { name: "Personal Care", nameAr: "العناية الشخصية", slug: "personal-care" },
  "contact-lenses": { name: "Contact Lenses", nameAr: "العدسات", slug: "contact-lenses" },
  "mother-baby": { name: "Mother & Baby", nameAr: "الأم والطفل", slug: "mother-baby" },
  "health-wellness": { name: "Health & Wellness", nameAr: "الصحة والعافية", slug: "health-wellness" },
  "appliances-tools": { name: "Appliances & Tools", nameAr: "الأجهزة والأدوات", slug: "appliances-tools" },
  "home-fragrance": { name: "Home Fragrance", nameAr: "عطور المنزل", slug: "home-fragrance" },
  accessories: { name: "Accessories", nameAr: "الإكسسوارات", slug: "accessories" },
};

function parseNonNegativeInt(value: string | null, fallback: number, maximum: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.min(parsed, maximum);
}

function resolveCategory(tags: string[]): { category: string; categoryAr: string; categorySlug: string } {
  for (const tag of tags) {
    const parent = SUBCATEGORY_TO_PARENT[tag];
    if (parent) {
      const mapped = CATEGORY_MAP[parent];
      if (mapped) return { category: mapped.name, categoryAr: mapped.nameAr, categorySlug: mapped.slug };
    }
    const mapped = CATEGORY_MAP[tag];
    if (mapped) return { category: mapped.name, categoryAr: mapped.nameAr, categorySlug: mapped.slug };
  }
  return { category: "Other", categoryAr: "أخرى", categorySlug: "other" };
}

export async function GET(request: NextRequest) {
  let supabase: ReturnType<typeof createPublicSupabaseClient>;
  try {
    supabase = createPublicSupabaseClient();
  } catch {
    return NextResponse.json(
      { products: [], brands: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  const status = request.nextUrl.searchParams.get("status") || "active";
  const clientLimit = parseNonNegativeInt(request.nextUrl.searchParams.get("limit"), 1000, 1000) || 1000;
  const clientOffset = parseNonNegativeInt(request.nextUrl.searchParams.get("offset"), 0, 100000);

  // If client requests specific pagination, use it; otherwise fetch all
  const useClientPagination = request.nextUrl.searchParams.has("limit") || request.nextUrl.searchParams.has("offset");
  const PAGE_SIZE = useClientPagination ? clientLimit : 1000;
  let allProducts: DbProduct[] = [];
  let offset = useClientPagination ? clientOffset : 0;
  let hasMore = true;

  while (hasMore) {
    const { data: batch, error } = await supabase
      .from("products")
      .select("id, legacy_id, slug, name, brand_id, category_id, pricing, gallery, hero_image, images, skin_types, suitable_for, skin_concerns, stock, stock_quantity, in_stock, rating, review_count, is_featured, is_new, is_best_seller, is_doctor_recommended, tags, status, discount, display_order, created_at")
      .eq("status", status)
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error || !batch || batch.length === 0) {
      hasMore = false;
    } else {
      allProducts = allProducts.concat(batch as DbProduct[]);
      hasMore = batch.length === PAGE_SIZE;
      offset += PAGE_SIZE;
      // If client pagination requested, only fetch one page
      if (useClientPagination) hasMore = false;
    }
  }

  if (allProducts.length === 0) {
    return NextResponse.json({ products: [], brands: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  const brandIds = [...new Set(allProducts.map((p) => p.brand_id).filter(Boolean))] as string[];
  const brandMap = new Map<string, { name: string; nameAr: string; slug: string }>();
  if (brandIds.length > 0) {
    const { data: brands } = await supabase.from("brands").select("id, slug, name, name_ar").in("id", brandIds);
    for (const b of (brands ?? []) as { id: string; slug: string; name: string; name_ar: string | null }[]) {
      brandMap.set(b.id, { name: b.name, nameAr: b.name_ar ?? b.name, slug: b.slug });
    }
  }

  const summaries = allProducts.map((p) => {
    const brand = p.brand_id ? brandMap.get(p.brand_id) : undefined;
    const tags = p.tags ?? [];
    const { category, categoryAr, categorySlug } = resolveCategory(tags);
    const price = p.pricing?.price ?? 0;
    const originalPrice = p.discount && p.discount > 0 ? Math.round(price / (1 - p.discount / 100)) : undefined;
    const gallery = (p.gallery?.length ? p.gallery : p.images?.length ? p.images : []).filter(Boolean);
    const heroImage = p.hero_image ?? gallery[0] ?? undefined;

    return {
      id: p.legacy_id ?? p.id,
      slug: p.slug,
      name: { ar: p.name?.ar ?? "", en: p.name?.en ?? "" },
      brand: brand?.name ?? "",
      brandAr: brand?.nameAr ?? "",
      category,
      categoryAr,
      categorySlug,
      pricing: { price, currency: p.pricing?.currency ?? "YER", ...(originalPrice ? { originalPrice } : {}) },
      gallery,
      heroImage,
      skinTypes: p.skin_types ?? [],
      suitableFor: p.suitable_for ?? p.skin_types ?? [],
      skinConcerns: p.skin_concerns ?? [],
      stock: p.stock ?? p.stock_quantity ?? 0,
      inStock: p.in_stock ?? (p.stock ?? 0) > 0,
      rating: p.rating ?? 0,
      reviewCount: p.review_count ?? 0,
      featured: p.is_featured ?? false,
      isFeatured: p.is_featured ?? false,
      new: p.is_new ?? false,
      isNew: p.is_new ?? false,
      isBestSeller: p.is_best_seller ?? false,
      isDoctorRecommended: p.is_doctor_recommended ?? false,
      tags,
      status: (p.status === "active" ? "published" : p.status) as string,
    };
  });

  const brands = [...brandMap.values()].map((b) => ({
    slug: b.slug,
    name: b.name,
    nameAr: b.nameAr,
  }));

  return NextResponse.json(
    { products: summaries, brands },
    { headers: { "Cache-Control": "no-store, must-revalidate" } }
  );
}
