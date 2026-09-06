import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/src/lib/supabase";
import RoutineDetailClient from "./RoutineDetailClient";
import type { Routine, RoutineLevel } from "@/types/product";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
function asNumber(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

async function fetchRoutineFromDB(slugOrId: string): Promise<Routine | null> {
  try {
    const supabase = createAdminClient() as any;

    const [routinesRes, rpRes, rsRes] = await Promise.all([
      supabase.from("routines").select("*"),
      supabase.from("routine_products").select("routine_id, product_id, products(legacy_id)"),
      supabase.from("routine_steps").select("*").order("step_number", { ascending: true }),
    ]);

    if (routinesRes.error) throw routinesRes.error;

    const rows = (routinesRes.data ?? []) as Row[];

    // Try to find by id first, then by slug
    const row = rows.find((r) => asString(r.id) === slugOrId) ||
                rows.find((r) => asString(r.slug) === slugOrId);
    if (!row) return null;

    const rid = asString(row.id);

    // Build UUID→legacy map
    const uuidToLegacy = new Map<string, string>();
    for (const rp of ((rpRes.data ?? []) as Row[])) {
      const rId = typeof rp.routine_id === "string" ? rp.routine_id : "";
      const legacy = rp.products && typeof rp.products === "object"
        ? asString((rp.products as { legacy_id?: unknown }).legacy_id)
        : "";
      if (rId && legacy) uuidToLegacy.set(`${rId}:${asString(rp.product_id)}`, legacy);
    }

    // Map product UUIDs to legacy IDs
    const productLegacyIds: string[] = [];
    for (const [key, legacy] of uuidToLegacy) {
      if (key.startsWith(`${rid}:`)) productLegacyIds.push(legacy);
    }

    // Map steps
    const stepsRaw = (rsRes.data ?? []) as Row[];
    const steps = stepsRaw
      .filter((s) => asString(s.routine_id) === rid)
      .sort((a, b) => asNumber(a.step_number, 0) - asNumber(b.step_number, 0))
      .map((s) => {
        const productId = asString(s.product_id);
        const legacyProductId = uuidToLegacy.get(`${rid}:${productId}`) ?? productId;
        return {
          productId: legacyProductId,
          time: (asString(s.time_of_day, "both") || "both") as Routine["steps"][number]["time"],
          titleAr: asString(s.title_ar),
          titleEn: asString(s.title_en),
          descriptionAr: asString(s.description_ar),
          descriptionEn: asString(s.description_en),
        };
      });

    return {
      id: rid,
      slug: asString(row.slug) || undefined,
      name: asString(row.name),
      nameAr: asString(row.name_ar),
      description: asString(row.description),
      descriptionAr: asString(row.description_ar),
      products: productLegacyIds,
      image: asString(row.image) || undefined,
      type: asString(row.routine_type, "daily"),
      typeAr: asString(row.routine_type_ar, "روتين يومي"),
      level: asString(row.routine_level, "standard") as RoutineLevel,
      active: row.is_active !== false,
      displayOrder: asNumber(row.display_order, 0),
      savingsPercent: asNumber(row.savings_percent, 0),
      duration: asString(row.duration, ""),
      durationEn: asString(row.duration_en, ""),
      forWhom: Array.isArray(row.for_whom) ? (row.for_whom as string[]) : [],
      forWhomEn: Array.isArray(row.for_whom_en) ? (row.for_whom_en as string[]) : [],
      expectedResults: Array.isArray(row.expected_results) ? (row.expected_results as string[]) : [],
      expectedResultsEn: Array.isArray(row.expected_results_en) ? (row.expected_results_en as string[]) : [],
      rating: asNumber(row.rating, 0),
      reviewCount: asNumber(row.review_count, 0),
      buyersCount: asNumber(row.buyers_count, 0),
      heroImage: asString(row.hero_image) || undefined,
      steps,
      whyChoseIt: asString(row.why_chose_it),
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const routine = await fetchRoutineFromDB(id);
  if (!routine) return {};
  return {
    title: `${routine.nameAr} - Luminous Derma`,
    description: routine.descriptionAr,
  };
}

export default async function RoutineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const routine = await fetchRoutineFromDB(id);
  if (!routine) notFound();

  return <RoutineDetailClient routine={routine} />;
}
