import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/src/lib/supabase-server";

/**
 * Public consultation request submission.
 * Form → validation → Supabase (RLS insert-only) → canonical lead record.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(v: unknown, max = 1000): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: { code: "invalid_request", message: "طلب غير صالح" } }, { status: 400 });
  }

  const type = clean(body.consultationType, 20);
  const payload = {
    expert_id: clean(body.expertId, 120),
    expert_name: clean(body.expertName, 150),
    client_name: clean(body.clientName, 120),
    client_phone: clean(body.clientPhone, 30),
    client_email: clean(body.clientEmail, 150) || null,
    consultation_type: type === "in-person" ? "in-person" : "online",
    preferred_day: clean(body.preferredDay, 40),
    preferred_time: clean(body.preferredTime, 20),
    concern: clean(body.concern, 80),
    concern_details: clean(body.concernDetails, 1000) || null,
    referral_source: clean(body.referralSource, 80) || null,
    referral_expert_id: clean(body.referralExpertId, 120) || null,
  };

  if (!payload.expert_id || !payload.expert_name || !payload.client_name || !payload.client_phone ||
      !payload.preferred_day || !payload.preferred_time || !payload.concern) {
    return NextResponse.json({ error: { code: "invalid_request", message: "البيانات المطلوبة غير مكتملة" } }, { status: 422 });
  }
  if (payload.client_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.client_email)) {
    return NextResponse.json({ error: { code: "invalid_request", message: "البريد الإلكتروني غير صالح" } }, { status: 422 });
  }
  if (!/^[0-9+\-\s()]{7,15}$/.test(payload.client_phone)) {
    return NextResponse.json({ error: { code: "invalid_request", message: "رقم الهاتف غير صالح" } }, { status: 422 });
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("consultation_requests").insert(payload as never);
  if (error) {
    return NextResponse.json({ error: { code: "service_unavailable", message: "الخدمة غير متاحة حاليًا، حاولي لاحقًا" } }, { status: 503 });
  }

  return NextResponse.json({ success: true, persistedToCanonical: true });
}
