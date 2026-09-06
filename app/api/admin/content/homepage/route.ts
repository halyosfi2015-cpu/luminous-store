import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/admin-auth";
import { readHomepageOverrides, writeHomepageOverrides } from "@/src/lib/content-store";
import { setSetting } from "@/src/lib/site-settings";
import { revalidatePath } from "next/cache";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;
  const overrides = readHomepageOverrides();
  return NextResponse.json({ sections: overrides.sections, order: overrides.order, products: overrides.products });
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;
  try {
    const body = (await request.json());
    if (!body || (!body.sections && !body.order && !body.products)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const merged = {
      sections: body.sections ?? {},
      order: Array.isArray(body.order) ? body.order : undefined,
      products: body.products ?? undefined,
    };
    // Dual-write: local file + Supabase site_settings
    writeHomepageOverrides(merged);
    await setSetting("homepage_overrides", merged);
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, sections: merged.sections, order: merged.order, products: merged.products });
  } catch (error) {
    console.error("homepage-content save error:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}