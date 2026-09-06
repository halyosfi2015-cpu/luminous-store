import { NextRequest, NextResponse } from "next/server";
import { readHomepageOverrides } from "@/src/lib/content-store";
import { getSetting } from "@/src/lib/site-settings";

/** Public read-only: section content, order, and product overrides for storefront rendering. */
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  // Try Supabase first (durable), fall back to local file
  const supabaseData = await getSetting<{ sections?: Record<string, unknown>; order?: string[]; products?: Record<string, unknown> } | null>("homepage_overrides", null);
  if (supabaseData?.sections && Object.keys(supabaseData.sections).length > 0) {
    return NextResponse.json(supabaseData);
  }
  const overrides = readHomepageOverrides();
  return NextResponse.json({ sections: overrides.sections, order: overrides.order, products: overrides.products });
}
