import { NextRequest, NextResponse } from "next/server";
import { readProblemSolutionsOverrides } from "@/src/lib/content-store";

/** Public: problem-solution entities for storefront rendering. */
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  const data = readProblemSolutionsOverrides();
  return NextResponse.json({
    items: data.items ?? [],
    productOverrides: data.productOverrides ?? {},
  });
}