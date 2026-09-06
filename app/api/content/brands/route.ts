import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/src/lib/supabase-server";

export const dynamic = "force-dynamic";

type BrandRow = {
  id: string;
  slug: string;
  name: string;
  name_ar?: string | null;
  logo?: string | null;
  cover_image?: string | null;
  description?: string | null;
  description_ar?: string | null;
  origin?: string | null;
  origin_ar?: string | null;
  is_verified?: boolean | null;
  featured?: boolean | null;
  product_count?: number | null;
  seo_metadata?: unknown;
  is_active?: boolean | null;
};

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("brands")
      .select("*")
      .eq("is_active", true)
      .order("name");
    if (error) throw error;

    const brands = ((data ?? []) as BrandRow[]).map((row) => {
      let name = row.name;
      let nameAr = row.name_ar ?? row.name;
      if (typeof name === "string" && name.trim().startsWith("{")) {
        try {
          const parsed = JSON.parse(name) as { ar?: string; en?: string };
          if (parsed.en) name = parsed.en;
          if (parsed.ar) nameAr = parsed.ar;
        } catch {}
      }
      return {
        id: row.id,
        slug: row.slug,
        name,
        nameAr,
        logo: row.logo ?? "",
        coverImage: row.cover_image ?? "",
        description: row.description ?? "",
        descriptionAr: row.description_ar ?? "",
        origin: row.origin ?? "",
        originAr: row.origin_ar ?? "",
        isVerified: row.is_verified ?? false,
        featured: row.featured ?? false,
        productCount: row.product_count ?? 0,
        seoMetadata: (row.seo_metadata as { title?: { ar: string; en: string }; description?: { ar: string; en: string }; keywords?: string[] }) ?? {
          title: { ar: "", en: "" },
          description: { ar: "", en: "" },
          keywords: [],
        },
      };
    });

    return NextResponse.json(brands, {
      headers: { "Cache-Control": "no-store, must-revalidate" },
    });
  } catch {
    return NextResponse.json([], {
      headers: { "Cache-Control": "no-store, must-revalidate" },
    });
  }
}
