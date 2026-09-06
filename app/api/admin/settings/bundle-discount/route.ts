import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/admin-auth";
import { setSetting, getSetting } from "@/src/lib/site-settings";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getSetting("bundle_discount_percent", null);
  return NextResponse.json({
    discountPercent: typeof data === "number" ? data : 20,
  });
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;

  try {
    const body = await request.json();
    const pct = Number(body.discountPercent);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      return NextResponse.json(
        { error: "Discount must be a number between 0 and 100" },
        { status: 400 }
      );
    }
    await setSetting("bundle_discount_percent", pct);
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, discountPercent: pct });
  } catch (error) {
    console.error("bundle-discount save error:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
