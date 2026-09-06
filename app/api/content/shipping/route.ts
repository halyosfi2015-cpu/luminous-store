import { NextRequest, NextResponse } from "next/server";
import { createPublicSupabaseClient } from "@/src/lib/supabase-server";
import type { Governorate } from "@/src/data/shipping";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("governorates")
      .select("*")
      .order("name");
    if (!error && Array.isArray(data) && data.length > 0) {
      const governorates: Governorate[] = data.map((r: Record<string, unknown>) => ({
        id: String(r.id ?? ""),
        name: String(r.name ?? ""),
        nameEn: String(r.nameEn ?? r.name_en ?? ""),
        fee: Number(r.fee ?? 0),
        enabled: r.enabled !== false,
      }));
      return NextResponse.json({ governorates });
    }
    const { DEFAULT_GOVERNORATES } = await import("@/src/data/shipping");
    return NextResponse.json({ governorates: DEFAULT_GOVERNORATES });
  } catch {
    const { DEFAULT_GOVERNORATES } = await import("@/src/data/shipping");
    return NextResponse.json({ governorates: DEFAULT_GOVERNORATES });
  }
}
