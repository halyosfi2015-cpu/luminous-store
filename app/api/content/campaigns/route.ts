import { NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const now = new Date().toISOString();

    const { data: campaigns } = await supabase
      .from("campaigns")
      .select("id, slug, name, description, type, status, starts_at, ends_at")
      .eq("is_active", true)
      .in("status", ["running", "scheduled"])
      .order("created_at", { ascending: false });

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({ campaigns: [] });
    }

    // Filter to currently active campaigns
    const active = campaigns.filter((c: any) => {
      const startsOk = !c.starts_at || c.starts_at <= now;
      const endsOk = !c.ends_at || c.ends_at >= now;
      return startsOk && endsOk;
    });

    const result = active.map((c: any) => ({
      id: c.id,
      slug: c.slug,
      name: typeof c.name === 'object' ? (c.name.en ?? c.name.ar ?? '') : (c.name ?? ''),
      nameAr: typeof c.name === 'object' ? (c.name.ar ?? c.name.en ?? '') : '',
      description: typeof c.description === 'object' ? (c.description.en ?? c.description.ar ?? '') : (c.description ?? ''),
      descriptionAr: typeof c.description === 'object' ? (c.description.ar ?? c.description.en ?? '') : '',
      type: c.type ?? "promotion",
      image: null,
      badge: null,
      badgeAr: null,
    }));

    return NextResponse.json(
      { campaigns: result },
      { headers: { "Cache-Control": "public, max-age=120" } }
    );
  } catch (err) {
    console.error("campaigns content error:", err);
    return NextResponse.json({ campaigns: [] });
  }
}
