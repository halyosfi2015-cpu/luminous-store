import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/src/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("banners")
      .select("*")
      .eq("active", true)
      .order("sort_order");
    if (error) throw error;
    return NextResponse.json(data ?? [], {
      headers: { "Cache-Control": "no-store, must-revalidate" },
    });
  } catch {
    return NextResponse.json([], {
      headers: { "Cache-Control": "no-store, must-revalidate" },
    });
  }
}
