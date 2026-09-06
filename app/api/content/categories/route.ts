import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/src/lib/supabase-server";

export const dynamic = "force-dynamic";

type CategoryRow = {
  id: string;
  slug: string;
  name: { ar?: string; en?: string } | null;
  description: { ar?: string; en?: string } | null;
  image?: string | null;
  cover_image?: string | null;
  icon?: string | null;
  parent_category_id?: string | null;
  product_count?: number | null;
  sort_order?: number | null;
  is_active?: boolean | null;
};

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    if (error) throw error;

    const rows = ((data ?? []) as CategoryRow[]).filter(
      (row) => row.parent_category_id != null
    );

    const categories = rows.map((row) => ({
      slug: row.slug,
      name: row.name?.en ?? row.slug,
      nameAr: row.name?.ar ?? row.slug,
      description: row.description?.en ?? "",
      descriptionAr: row.description?.ar ?? "",
      image: row.image ?? undefined,
      coverImage: row.cover_image ?? undefined,
      icon: row.icon ?? undefined,
      productCount: row.product_count ?? 0,
    }));

    return NextResponse.json(categories, {
      headers: { "Cache-Control": "no-store, must-revalidate" },
    });
  } catch {
    return NextResponse.json([], {
      headers: { "Cache-Control": "no-store, must-revalidate" },
    });
  }
}
