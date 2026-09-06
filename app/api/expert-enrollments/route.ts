import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/src/lib/supabase-server";

/**
 * Public expert enrollment submission.
 * Form → validation → Supabase (RLS insert-only) → canonical application record.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(v: unknown, max = 1500): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: { code: "invalid_request", message: "طلب غير صالح" } }, { status: 400 });
  }

  const types = Array.isArray(body.consultationTypes)
    ? [...new Set(body.consultationTypes.filter((t): t is string => t === "online" || t === "in-person"))]
    : [];

  const payload = {
    name: clean(body.name, 120),
    name_ar: clean(body.nameAr, 120),
    email: clean(body.email, 150),
    phone: clean(body.phone, 30),
    specialty: clean(body.specialty, 120),
    specialty_ar: clean(body.specialtyAr, 120),
    bio: clean(body.bio, 1500),
    bio_ar: clean(body.bioAr, 1500),
    city: clean(body.city, 80),
    city_ar: clean(body.cityAr, 80),
    consultation_types: types,
  };

  if (!payload.name || !payload.name_ar || !payload.email || !payload.phone || !payload.specialty ||
      !payload.specialty_ar || !payload.bio || !payload.bio_ar || !payload.city || !payload.city_ar || types.length === 0) {
    return NextResponse.json({ error: { code: "invalid_request", message: "البيانات المطلوبة غير مكتملة" } }, { status: 422 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    return NextResponse.json({ error: { code: "invalid_request", message: "البريد الإلكتروني غير صالح" } }, { status: 422 });
  }
  if (!/^[0-9+\-\s()]{7,15}$/.test(payload.phone)) {
    return NextResponse.json({ error: { code: "invalid_request", message: "رقم الهاتف غير صالح" } }, { status: 422 });
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("expert_enrollments").insert(payload as never);
  if (error) {
    return NextResponse.json({ error: { code: "service_unavailable", message: "الخدمة غير متاحة حاليًا، حاولي لاحقًا" } }, { status: 503 });
  }

  return NextResponse.json({ success: true, persistedToCanonical: true });
}
