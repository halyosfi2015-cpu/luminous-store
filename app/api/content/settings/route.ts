import { NextRequest, NextResponse } from "next/server";
import { getSetting } from "@/src/lib/site-settings";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  try {
    const bundleDiscountPercent = await getSetting<number>("bundle_discount_percent", 20);
    return NextResponse.json({ bundleDiscountPercent });
  } catch {
    return NextResponse.json({ bundleDiscountPercent: 20 });
  }
}
