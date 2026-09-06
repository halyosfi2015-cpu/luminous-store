import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/src/lib/supabase-server";
import { createAdminClient } from "@/src/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: { message: "Not authenticated" } }, { status: 401 });
    }

    const body = await request.json().catch(() => ({})) as { name?: string; phone?: string; email?: string };
    const authId = session.user.id;
    const email = body.email ?? session.user.email ?? "";
    const phone = body.phone ?? (session.user.user_metadata as Record<string, unknown>)?.phone as string ?? "";
    const name = body.name ?? (session.user.user_metadata as Record<string, unknown>)?.name as string ?? email.split("@")[0] ?? "Customer";

    const admin = createAdminClient() as unknown as {
      from: (table: string) => {
        select: (cols: string) => { eq: (col: string, val: string) => { single: () => Promise<{ data: unknown; error: unknown }> } };
        insert: (data: unknown) => Promise<{ error: unknown }>;
      };
    };

    // Check existing
    const { data: existing } = await (admin.from("customers") as unknown as { select: (s: string) => { eq: (c: string, v: string) => { single: () => Promise<{ data: { id: string } | null }> } } }).select("id").eq("auth_id", authId).single();
    if (existing) {
      return NextResponse.json({ success: true, customerId: (existing as { id: string }).id, existed: true });
    }

    const { error: insertErr } = await admin.from("customers").insert({ auth_id: authId, name, email, phone } as never);
    if (insertErr) {
      const msg = (insertErr as { message?: string })?.message ?? "Insert failed";
      // If it's a duplicate due to race, try fetching again
      if (msg.includes("duplicate") || msg.includes("Unique")) {
        const { data: retry } = await (admin.from("customers") as unknown as { select: (s: string) => { eq: (c: string, v: string) => { single: () => Promise<{ data: { id: string } | null }> } } }).select("id").eq("auth_id", authId).single();
        if (retry) return NextResponse.json({ success: true, customerId: (retry as { id: string }).id, existed: true });
      }
      return NextResponse.json({ error: { message: msg } }, { status: 500 });
    }

    const { data: created } = await (admin.from("customers") as unknown as { select: (s: string) => { eq: (c: string, v: string) => { single: () => Promise<{ data: { id: string } | null }> } } }).select("id").eq("auth_id", authId).single();
    return NextResponse.json({ success: true, customerId: (created as { id: string } | null)?.id ?? null });

  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: { message: msg } }, { status: 500 });
  }
}
