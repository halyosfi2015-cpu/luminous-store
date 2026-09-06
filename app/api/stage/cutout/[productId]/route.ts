import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { ensureCutout, readCachedCutout } from "@/src/lib/stage-cutout";
import { publishedProductSummaries } from "@/src/data/product-summaries";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(productId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const cached = await readCachedCutout(productId);
  if (cached) {
    return new NextResponse(new Uint8Array(cached), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=60",
      },
    });
  }

  const product = publishedProductSummaries.find((p) => p.id === productId);
  const src = product?.gallery?.[0] ?? `/images/products/${productId}.png`;

  try {
    await ensureCutout(productId, src);
    const fresh = await readCachedCutout(productId);
    if (fresh) {
      return new NextResponse(new Uint8Array(fresh), {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=60",
        },
      });
    }
  } catch {}

  const originalPath = path.join(process.cwd(), "public", `images/products/${productId}.png`);
  try {
    const original = await import("fs").then((f) => f.promises.readFile(originalPath));
    return new NextResponse(new Uint8Array(original), {
      headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
    });
  } catch {}

  return NextResponse.json({ error: "not found" }, { status: 404 });
}
