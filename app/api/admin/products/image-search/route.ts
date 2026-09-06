import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ImageResult = {
  url: string;
  thumbnail?: string;
  source: string;
  title?: string;
};

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

async function searchBingImages(query: string): Promise<ImageResult[]> {
  // Use Bing image search scraping — no API key required, best-effort
  const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&first=1`;
  const res = await fetch(searchUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Bing search failed: ${res.status}`);
  const html = await res.text();

  const results: ImageResult[] = [];
  // Bing embeds image data in `murl` fields inside JSON blobs
  const murlRegex = /"murl":"([^"]+)"/g;
  let match: RegExpExecArray | null;
  const seen = new Set<string>();
  while ((match = murlRegex.exec(html)) !== null && results.length < 12) {
    let url = match[1];
    try {
      url = JSON.parse(`"${url}"`); // unescape
    } catch {}
    if (!url || !url.startsWith("http") || seen.has(url)) continue;
    seen.add(url);
    // Try to find purl (page URL) near this murl for source
    const purlMatch = html.slice(Math.max(0, match.index - 2000), match.index + 500).match(/"purl":"([^"]+)"/);
    let source = "bing.com";
    if (purlMatch) {
      try {
        const purl = JSON.parse(`"${purlMatch[1]}"`);
        source = extractDomain(purl);
      } catch {}
    }
    // Skip obviously non-product domains if needed, but keep all for now
    results.push({ url, source, title: query });
  }

  return results;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId")?.trim() ?? "";
  const productName = searchParams.get("productName")?.trim() ?? "";
  const brand = searchParams.get("brand")?.trim() ?? "";
  const queryParam = searchParams.get("q")?.trim() ?? "";

  const query = queryParam || [productName, brand].filter(Boolean).join(" ").trim();

  if (!query) {
    return NextResponse.json({ error: { message: "حقل البحث مطلوب" } }, { status: 400 });
  }

  if (!productId) {
    return NextResponse.json({ error: { message: "productId مطلوب" } }, { status: 400 });
  }

  try {
    const results = await searchBingImages(query);

    if (results.length === 0) {
      return NextResponse.json({
        query,
        results: [],
        message: "لم يتم العثور على صور — جرب تعديل اسم المنتج أو الماركة",
      });
    }

    return NextResponse.json({ query, results });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "خطأ غير معروف";
    return NextResponse.json(
      { error: { message: `فشل البحث عن الصور: ${msg}` }, query, results: [] },
      { status: 500 }
    );
  }
}
