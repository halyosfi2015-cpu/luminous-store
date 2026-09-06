import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/admin-auth";
import { can } from "@/src/admin/permissions";
import { createAdminClient } from "@/src/lib/supabase";

/**
 * Admin management for consultation requests & expert enrollments.
 * GET    ?type=consultations|enrollments&status=...&q=...&ctype=online|in-person&from=YYYY-MM-DD&to=YYYY-MM-DD
 * PATCH  { type, id, status, adminNotes }
 * DELETE ?type=consultations|enrollments&id=...  — permanent removal from canonical storage
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONSULTATION_STATUSES = new Set(["pending", "approved", "rejected", "completed"]);
const ENROLLMENT_STATUSES = new Set(["pending", "approved", "rejected"]);
const CONSULTATION_TYPES = new Set(["online", "in-person"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;
  if (!can(admin.role, "customers", "view")) {
    return NextResponse.json({ error: { code: "forbidden", message: "Permission denied" } }, { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const type = sp.get("type") === "enrollments" ? "enrollments" : "consultations";
  const status = sp.get("status") ?? "";
  const q = (sp.get("q") ?? "").trim().slice(0, 80);
  const ctype = (sp.get("ctype") ?? "").trim();
  const from = (sp.get("from") ?? "").trim();
  const to = (sp.get("to") ?? "").trim();

  const supabase = createAdminClient();
  let query;
  if (type === "enrollments") {
    query = supabase.from("expert_enrollments").select("*").order("created_at", { ascending: false }).limit(200);
  } else {
    query = supabase.from("consultation_requests").select("*").order("created_at", { ascending: false }).limit(200);
    // Server-side consultation-type filter (real canonical values only)
    if (ctype && CONSULTATION_TYPES.has(ctype)) query = query.eq("consultation_type", ctype);
    // Server-side date range on the real request timestamp
    if (from && DATE_RE.test(from)) query = query.gte("created_at", `${from}T00:00:00`);
    if (to && DATE_RE.test(to)) query = query.lte("created_at", `${to}T23:59:59.999`);
  }
  if (status && status !== "all") query = query.eq("status", status);
  if (q) {
    query = type === "enrollments"
      ? query.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
      : query.or(`client_name.ilike.%${q}%,client_phone.ilike.%${q}%,expert_name.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: { code: "service_unavailable", message: "تعذر جلب البيانات" } }, { status: 503 });
  }
  return NextResponse.json({ success: true, items: data ?? [] });
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;
  if (!can(admin.role, "customers", "edit")) {
    return NextResponse.json({ error: { code: "forbidden", message: "Permission denied" } }, { status: 403 });
  }

  let body: { type?: string; id?: string; status?: string; adminNotes?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: { code: "invalid_request", message: "طلب غير صالح" } }, { status: 400 });
  }

  const { type, id, status, adminNotes } = body;
  if (!id || !status) {
    return NextResponse.json({ error: { code: "invalid_request", message: "id و status مطلوبان" } }, { status: 422 });
  }

  const table = type === "enrollments" ? "expert_enrollments" : "consultation_requests";
  const allowed = type === "enrollments" ? ENROLLMENT_STATUSES : CONSULTATION_STATUSES;
  if (!allowed.has(status)) {
    return NextResponse.json({ error: { code: "invalid_request", message: "حالة غير صالحة" } }, { status: 422 });
  }

  const supabase = createAdminClient();
  const patch: Record<string, unknown> = { status };
  if (typeof adminNotes === "string") patch.admin_notes = adminNotes.trim().slice(0, 1000);
  if (table === "consultation_requests") patch.updated_at = new Date().toISOString();

  const { error } = type === "enrollments"
    ? await supabase.from("expert_enrollments").update(patch as never).eq("id" as never, id)
    : await supabase.from("consultation_requests").update(patch as never).eq("id" as never, id);

  if (error) {
    return NextResponse.json({ error: { code: "service_unavailable", message: "تعذر تحديث الحالة" } }, { status: 503 });
  }
  return NextResponse.json({ success: true, persistedToCanonical: true });
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;
  if (!can(admin.role, "customers", "edit")) {
    return NextResponse.json({ error: { code: "forbidden", message: "Permission denied" } }, { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const type = sp.get("type") === "enrollments" ? "enrollments" : "consultations";
  const id = (sp.get("id") ?? "").trim();
  if (!id || !/^[0-9a-fA-F-]{10,40}$/.test(id)) {
    return NextResponse.json({ error: { code: "invalid_request", message: "معرّف غير صالح" } }, { status: 422 });
  }

  // Permanent deletion from canonical storage — scoped to the exact id only.
  const supabase = createAdminClient();
  const { error, count } = type === "enrollments"
    ? await supabase.from("expert_enrollments").delete({ count: "exact" }).eq("id", id)
    : await supabase.from("consultation_requests").delete({ count: "exact" }).eq("id", id);

  if (error) {
    return NextResponse.json({ error: { code: "service_unavailable", message: "تعذر الحذف" } }, { status: 503 });
  }
  if (!count) {
    return NextResponse.json({ error: { code: "not_found", message: "السجل غير موجود" } }, { status: 404 });
  }
  return NextResponse.json({ success: true, deletedFromCanonical: true });
}
