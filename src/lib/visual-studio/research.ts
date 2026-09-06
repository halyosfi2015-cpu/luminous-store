/**
 * Internet research — REAL fetch integration (pure helpers + server action).
 * Rules (hard):
 * 1. Only explicitly supplied admin URLs are fetched — never random scraping.
 * 2. SSRF-guarded: http(s) only, no local/metadata/credentialed URLs.
 * 3. Results are INSPIRATION/CONTEXT only — they can NEVER override verified
 *    Luminous facts (enforced in the prompt + post-AI claim gates).
 * 4. Every entry carries its source URL + fetch date (traceability).
 * 5. No fake `applied:true`: empty/failed fetches are reported as rejected.
 */

export interface ResearchEntry {
  url: string;
  domain: string;
  title: string;
  statements: string[];
  fetchedAt: string;
}

export interface ResearchRejection {
  url: string;
  reasonAr: string;
}

/** SSRF + sanity guard for operator-supplied research URLs. */
export function isAllowedResearchUrl(raw: string): { ok: boolean; reasonAr: string | null } {
  const url = raw.trim();
  if (url.length === 0 || url.length > 500) return { ok: false, reasonAr: "رابط فارغ أو طويل جداً" };
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { ok: false, reasonAr: "رابط غير صالح" };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return { ok: false, reasonAr: "يسمح بـ http/https فقط" };
  }
  if (u.username || u.password) return { ok: false, reasonAr: "روابط ببيانات اعتماد مرفوضة" };
  const host = u.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".internal") ||
    host.endsWith(".local") ||
    host === "metadata.google.internal" ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host === "169.254.169.254" ||
    host === "[::1]"
  ) {
    return { ok: false, reasonAr: "العناوين الداخلية محظورة" };
  }
  return { ok: true, reasonAr: null };
}

function stripTags(s: string): string {
  return s
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract readable editorial content from HTML. Pure + testable.
 * Returns title + short statements (headings + lead paragraphs).
 */
export function extractReadable(html: string, url: string, fetchedAt?: string): ResearchEntry {
  const domain = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  })();
  const titleMatch = html.match(/<title[^>]*>([\s\S]{1,200})<\/title>/i);
  const metaMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{1,400})["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']{1,400})["'][^>]+name=["']description["']/i);
  const title = titleMatch ? stripTags(titleMatch[1]).slice(0, 120) : domain;
  const statements: string[] = [];
  if (metaMatch?.[1]) {
    const d = stripTags(metaMatch[1]);
    if (d.length >= 20) statements.push(d.slice(0, 300));
  }
  const heads = [...html.matchAll(/<h[12][^>]*>([\s\S]{1,200}?)<\/h[12]>/gi)]
    .map((m) => stripTags(m[1]))
    .filter((t) => t.length >= 10 && t.length <= 160);
  for (const h of heads.slice(0, 4)) statements.push(h);
  const paras = [...html.matchAll(/<p[^>]*>([\s\S]{1,600}?)<\/p>/gi)]
    .map((m) => stripTags(m[1]))
    .filter((t) => t.length >= 40 && t.length <= 400);
  for (const p of paras.slice(0, 5)) {
    if (!statements.includes(p)) statements.push(p);
    if (statements.length >= 8) break;
  }
  return { url, domain, title, statements: statements.slice(0, 8), fetchedAt: fetchedAt ?? new Date().toISOString() };
}

/** Prompt block: inspiration clearly separated from verified facts. */
export function researchPromptBlock(entries: { source: string; statements: string[] }[]): string {
  if (entries.length === 0) return "";
  const lines = entries.map(
    (e, i) => `Source ${i + 1} (${e.source}): ${e.statements.slice(0, 4).join(" | ").slice(0, 600)}`,
  );
  return [
    "Supplementary web inspiration (INSPIRATION ONLY — it NEVER overrides the verified facts above; never present it as product truth):",
    ...lines,
  ].join("\n");
}
