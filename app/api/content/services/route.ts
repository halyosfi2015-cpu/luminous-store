import { NextRequest, NextResponse } from "next/server";
import { readServicesOverrides } from "@/src/lib/content-store";

/** Public: admin-managed beauty services for storefront rendering. */
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  const data = readServicesOverrides();
  return NextResponse.json(
    { items: data.items ?? [] },
    { headers: { "Cache-Control": "no-store, must-revalidate" } }
  );
}
