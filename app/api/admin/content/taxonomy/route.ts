import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/admin-auth";
import {
  readTaxonomyOverrides,
  writeTaxonomyOverrides,
  type TaxonomyOverrides,
} from "@/src/lib/content-store";
import { setSetting } from "@/src/lib/site-settings";
import { mergeTaxonomyOverrides as applyOverrides } from "@/src/lib/taxonomy-merge";
import { BASE_TAXONOMY } from "@/src/data/taxonomy";
import { revalidatePath } from "next/cache";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;
  const overrides = readTaxonomyOverrides();
  const merged = applyOverrides(BASE_TAXONOMY, overrides);
  return NextResponse.json({ overrides, base: BASE_TAXONOMY, merged });
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;
  try {
    const body = (await request.json()) as Partial<TaxonomyOverrides>;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const current = readTaxonomyOverrides();
    const merged: TaxonomyOverrides = {
      nodes: Array.isArray(body.nodes) ? body.nodes : current.nodes,
      hiddenSlugs: Array.isArray(body.hiddenSlugs) ? body.hiddenSlugs : current.hiddenSlugs,
      categoryProducts:
        body.categoryProducts && typeof body.categoryProducts === "object"
          ? body.categoryProducts
          : current.categoryProducts,
    };

    writeTaxonomyOverrides(merged);

    await setSetting("taxonomy_overrides", merged);

    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("taxonomy-content save error:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
