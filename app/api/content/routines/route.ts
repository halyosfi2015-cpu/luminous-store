import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase";
import type { Routine, RoutineLevel } from "@/types/product";

/** Public read-only: routines for storefront rendering — same source as /api/admin/routines. */
export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asNumber(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function mapRow(
  r: Row,
  productLegacyIds: string[],
  steps: Routine["steps"]
): Routine | null {
  const id = asString(r.id);
  if (!id) return null;
  return {
    id,
    slug: asString(r.slug) || undefined,
    name: asString(r.name),
    nameAr: asString(r.name_ar),
    description: asString(r.description),
    descriptionAr: asString(r.description_ar),
    products: productLegacyIds,
    image: asString(r.image) || undefined,
    type: asString(r.routine_type, "daily"),
    typeAr: asString(r.routine_type_ar, "روتين يومي"),
    level: asString(r.routine_level, "standard") as RoutineLevel,
    active: r.is_active !== false,
    displayOrder: asNumber(r.display_order, 0),
    savingsPercent: asNumber(r.savings_percent, 0),
    duration: asString(r.duration, ""),
    durationEn: asString(r.duration_en, ""),
    forWhom: Array.isArray(r.for_whom) ? (r.for_whom as string[]) : [],
    forWhomEn: Array.isArray(r.for_whom_en) ? (r.for_whom_en as string[]) : [],
    expectedResults: Array.isArray(r.expected_results) ? (r.expected_results as string[]) : [],
    expectedResultsEn: Array.isArray(r.expected_results_en) ? (r.expected_results_en as string[]) : [],
    rating: asNumber(r.rating, 0),
    reviewCount: asNumber(r.review_count, 0),
    buyersCount: asNumber(r.buyers_count, 0),
    heroImage: asString(r.hero_image) || undefined,
    steps,
    whyChoseIt: asString(r.why_chose_it),
  };
}

export async function GET(_request: NextRequest) {
  try {
    const supabase = createAdminClient() as any;
    const [routinesRes, rpRes, rsRes] = await Promise.all([
      supabase.from("routines").select("*").order("display_order", { ascending: true }),
      supabase.from("routine_products").select("routine_id, product_id, products(legacy_id)"),
      supabase.from("routine_steps").select("*").order("step_number", { ascending: true }),
    ]);
    if (routinesRes.error) throw routinesRes.error;

    // DB product UUID -> legacy id ("yq-*") used by storefront resolvers.
    const uuidToLegacy = new Map<string, string>();
    for (const rp of ((rpRes.data ?? []) as Row[])) {
      const rid = typeof rp.routine_id === "string" ? rp.routine_id : "";
      const legacy =
        rp.products && typeof rp.products === "object"
          ? asString((rp.products as { legacy_id?: unknown }).legacy_id)
          : "";
      if (rid && legacy) uuidToLegacy.set(`${rid}:${asString(rp.product_id)}`, legacy);
    }

    const stepsByRoutine = new Map<string, Routine["steps"]>();
    for (const s of ((rsRes.data ?? []) as Row[])) {
      const rid = asString(s.routine_id);
      const productId = asString(s.product_id);
      if (!rid || !productId) continue;
      const arr = stepsByRoutine.get(rid) ?? [];
      arr.push({
        productId,
        time: (asString(s.time_of_day, "both") || "both") as Routine["steps"][number]["time"],
        titleAr: asString(s.title_ar),
        titleEn: asString(s.title_en),
        descriptionAr: asString(s.description_ar),
        descriptionEn: asString(s.description_en),
      });
      stepsByRoutine.set(rid, arr);
    }

    const routines = ((routinesRes.data ?? []) as Row[])
      .map((r) => {
        const rid = asString(r.id);
        const legacyIds: string[] = [];
        for (const [key, legacy] of uuidToLegacy) {
          if (key.startsWith(`${rid}:`)) legacyIds.push(legacy);
        }
        // Steps: convert product UUID -> legacy id so storefront resolvers match.
        const steps = (stepsByRoutine.get(rid) ?? []).map((s) => ({
          ...s,
          productId: uuidToLegacy.get(`${rid}:${s.productId}`) ?? s.productId,
        }));
        return mapRow(r, legacyIds, steps);
      })
      .filter((r): r is Routine => r !== null && r.active)
      .sort((a, b) => a.displayOrder - b.displayOrder);
    return NextResponse.json({ routines }, {
      headers: { "Cache-Control": "no-store, must-revalidate" },
    });
  } catch (err) {
    console.error("routines content fetch error:", err);
    return NextResponse.json({ routines: [] }, {
      headers: { "Cache-Control": "no-store, must-revalidate" },
    });
  }
}
