import type { ProductSummary } from "@/src/types/product";

/**
 * Problem → product matching (louz-style concern navigation).
 *
 * Louz principle: every section shows ONLY products with a direct,
 * name-evident link to that problem — no generic category flooding,
 * no padding to look full, no repeats without independent justification.
 * Small sections (vitiligo, stretch marks, sensitive scalp…) stay small.
 *
 * Tiers: 2 = relevant (direct tag + type check, fallback tag in a
 * treatment category, or treatment keyword), 0 = irrelevant.
 * Homing: each product is shown in at most TWO sections (its best fits).
 */

/** All haircare leaf categories (keyword gate for hair problems). */
export const HAIR_CATEGORIES = [
  "shampoo",
  "conditioner",
  "hair-oils",
  "hair-masks",
  "hair-creams",
  "hair-treatments",
  "hair-dyes",
  "hair-styling",
  "hair-scalp",
];

/** Fallback skin-concern tags per problem (treatment categories only). */
export const PROBLEM_TAG_FALLBACK: Record<string, string[]> = {
  rosacea: ["sensitivity", "redness"],
  eczema: ["sensitivity", "dryness"],
};

/** Categories allowed for fallback-tag matches (creams/treatments, never cleansers). */
export const PROBLEM_FALLBACK_GATE: Record<string, string[]> = {
  rosacea: ["moisturizers", "serums", "body-lotion", "body-oils", "oils", "lip-care", "sunscreen"],
  eczema: ["moisturizers", "serums", "body-lotion", "body-oils", "oils", "lip-care", "sunscreen"],
};

/** Category matches treated as strong (sun protection prevents spots). */
export const PROBLEM_CATEGORY_MATCH: Record<string, string[]> = {
  pigmentation: ["sunscreen", "sunscreen-body"],
};

/** Extra tag hints per hair problem (matched against product tags). */
export const HAIR_PROBLEM_TAGS: Record<string, string[]> = {
  dandruff: ["anti-dandruff", "dandruff"],
  hair_loss: ["hair-loss", "anti-hair-loss", "growth"],
};

/** Category gate per problem — keywords only count inside these categories. */
export const PROBLEM_KEYWORD_GATE: Record<string, string[]> = {
  acne: ["cleansers", "serums", "moisturizers", "masks", "toners", "exfoliators", "sunscreen", "oils", "lip-care"],
  pigmentation: ["serums", "moisturizers", "masks", "sunscreen", "toners", "cleansers", "exfoliators", "oils"],
  aging: ["serums", "moisturizers", "eye-care", "oils", "masks", "sunscreen", "cleansers", "toners"],
  stretch_marks: ["body-oils", "body-lotion", "body-care", "body-wash", "women-care"],
  rosacea: ["moisturizers", "serums", "cleansers", "toners", "sunscreen", "body-lotion", "oils", "lip-care"],
  eczema: ["moisturizers", "cleansers", "body-lotion", "serums", "oils", "shampoo"],
  tired_skin: ["serums", "moisturizers", "eye-care", "masks", "sunscreen", "toners", "cleansers", "lip-care"],
  dandruff: [...HAIR_CATEGORIES, "vitamins"],
  hair_loss: [...HAIR_CATEGORIES, "vitamins"],
  dry_hair: HAIR_CATEGORIES,
  split_ends: HAIR_CATEGORIES,
  frizzy_hair: HAIR_CATEGORIES,
  dyed_hair: HAIR_CATEGORIES,
  curly_hair: HAIR_CATEGORIES,
  oily_scalp: HAIR_CATEGORIES,
  sensitive_scalp: HAIR_CATEGORIES,
  dull_hair: HAIR_CATEGORIES,
};

/**
 * Curated keyword patterns per problem (name-evident treatment link).
 * Matched against name.ar + name.en + tags.
 */
export const PROBLEM_KEYWORDS: Record<string, RegExp> = {
  acne: /salicylic|ساليسيليك|benzoyl|بنزويل|niacinamide|نياسيناميد|retinol|ريتينول|tea tree|شجرة الشاي|acne|حب الشباب|bha\b|aha\b|adapalene|azelaic|أزيلايك|sulfur|كبريت|clay|طين|charcoal|فحم|blemish|clarif|purif|منقي|sebium|سيبيوم|effaclar|إيفاكلار|normaderm|نورماديرم|keracnyl/i,
  pigmentation: /تفتيح|whiten|white|brighten|lightening|مضيء|إشراق|glow|radiance|niacinamide|نياسيناميد|vitamin[\s-]?c|فيتامين سي|arbutin|أربوتين|kojic|كوجيك|tranexamic|pigment|تصبغ|كلف|melasma|spot|بقع|licorice|عرقسوس/i,
  aging: /retinol|ريتينول|peptide|ببتيد|collagen|كولاجين|vitamin[\s-]?c|فيتامين سي|niacinamide|matrixyl|argireline|bakuchiol|باكوتشيول|hyaluronic|هيالورونيك|wrinkle|تجاعيد|تجعد|firm|شد|lifting|elasticity|مرونة|night|ليلي|anti.?aging/i,
  stretch_marks: /تمدد|stretch|bio[\s-]?oil|بيو[\s-]?أ?ويل|مرونة|شد الجلد/i,
  eczema: /أكزيما|اكزيما|eczema|atoderm|اتوديرم|dermatitis|التهاب الجلد|panthenol|بانثينول|bisabolol|madecassoside|colloidal/i,
  tired_skin: /فيتامين سي|vitamin[\s-]?c|مضيء|إشراق|انتعاش|نضار|glow|radiance|brighten|صفاء|توهج/i,
  dandruff: /قشرة|dandruff|ketoconazole|كيتوكونازول|piroctone|بيروكتون|زنك|zinc|سلينيوم|selenium|dercos|ديركوس|نيزورال|nizoral/i,
  hair_loss: /تساقط|hair.?loss|minoxidil|مينوكسيديل|رو ?gain|كيركس|kirkland|تراكساميد|tricide|نيوكسين|nioxin|fall|forte|تقوية/i,
  dry_hair: /جفاف|ترطيب|مرطب|hydrat|nourish|مغذ|كيراتين|keratin|argan|ارغان|أرغان/i,
  split_ends: /تقصف|split|أطراف|مرمم|repair/i,
  frizzy_hair: /نفشة|frizz|كيراتين|keratin|انسياب|smooth|سموت/i,
  dyed_hair: /صبغ|لللون|color|بلون|shield/i,
  curly_hair: /كيرلي|curl|defin|تموج|co[\s-]?wash|كوش|نيسبون|n.?spoon|provoc|بروفو?ك/i,
  oily_scalp: /دهني|oily|purif|detox|sebium|سيبوم|توازن|مقشر|exfoliat/i,
  sensitive_scalp: /حساس|sensitive|مهدئ|sooth|tollend|hypo|للاطفال|baby|gentle/i,
  dull_hair: /باهت|لمعان|shine|clarif|gloss|extreme|لمعة/i,
  rosacea: /rosacea|وردية|anti.?redness|cica|سيكا|centella|سنتيلا|azelaic|أزيلايك|panthenol|بانثينول|bisabolol|madecassoside/i,
};

/** Treatment keywords proving an acne/pigmentation link (used by exclusions). */
const TX_ACNE =
  /salicylic|ساليسيليك|benzoyl|بنزويل|niacinamide|نياسيناميد|retinol|ريتينول|tea tree|شجرة الشاي|acne|حب الشباب|bha\b|aha\b|adapalene|azelaic|أزيلايك|sulfur|كبريت|clay|طين|charcoal|فحم|blemish|clarif|purif|منقي|sebium|سيبيوم|effaclar|إيفاكلار|normaderm|نورماديرم|keracnyl/i;
const TX_PIGMENTATION =
  /تفتيح|whiten|brighten|مضيء|إشراق|glow|radiance|niacinamide|نياسيناميد|vitamin[\s-]?c|فيتامين سي|arbutin|أربوتين|kojic|كوجيك|tranexamic|pigment|تصبغ|كلف|melasma|spot|بقع/i;

/**
 * Keyword sets used for MATCHING (tier-2). Narrow on purpose: acne /
 * pigmentation / aging keywords are arbitration-only (below) — otherwise
 * every niacinamide/hyaluronic product floods those sections.
 */
const MATCH_KEYWORDS: Record<string, RegExp> = (() => {
  const { acne: _a, pigmentation: _p, aging: _g, ...rest } = PROBLEM_KEYWORDS;
  return rest;
})();

/** Micellar/makeup-remover waters — only skin-type sections (+ acne-line formulas). */
const MICELLAR_RE = /micellar|ميسيلار|مزيل مكياج|makeup remover|مزيل المكياج/i;
/** Plain-hydration serums with no treatment link. */
const HYDR_RE = /hyaluronic|هيالورون|hydra/i;

type MatchableProduct = Pick<ProductSummary, "id"> &
  Partial<
    Pick<
      ProductSummary,
      "skinConcerns" | "categorySlug" | "tags" | "gallery" | "name"
    >
  >;

function productHaystack(p: MatchableProduct): string {
  const name = p.name;
  return `${name?.ar ?? ""} ${name?.en ?? ""} ${(p.tags ?? []).join(" ")}`;
}

function hasKeywordHit(
  p: MatchableProduct,
  concern: string,
  sets: Record<string, RegExp> = PROBLEM_KEYWORDS
): boolean {
  const kw = sets[concern];
  if (kw) {
    const gate = PROBLEM_KEYWORD_GATE[concern] ?? [];
    const cat = (p.categorySlug ?? "") as string;
    if (gate.includes(cat) && kw.test(productHaystack(p))) return true;
  }
  const tagHints = HAIR_PROBLEM_TAGS[concern];
  if (tagHints) {
    const ptags = (p.tags ?? []) as string[];
    if (ptags.some((t) => tagHints.some((h) => t.toLowerCase().includes(h)))) return true;
  }
  return false;
}

/** How a product links to a problem: keyword (name-evident) > direct tag > fallback/category. */
type MatchKind = 0 | 1 | 2 | 3;
function matchKind(p: MatchableProduct, concern: string): MatchKind {
  const hay = productHaystack(p);
  // — Exclusions: types with no treatment link to this problem —
  if (MICELLAR_RE.test(hay)) {
    if (concern === "acne") {
      if (!TX_ACNE.test(hay)) return 0;
    } else if (concern !== "sensitivity" && concern !== "oiliness") {
      return 0;
    }
  }
  if (concern === "acne" || concern === "pigmentation") {
    if (HYDR_RE.test(hay)) {
      const tx = concern === "acne" ? TX_ACNE : TX_PIGMENTATION;
      if (!tx.test(hay)) return 0;
    }
  }
  // — Direct concern tag —
  const direct = (p.skinConcerns ?? []) as string[];
  if (direct.includes(concern)) return 2;
  // — Fallback tags, only inside treatment categories —
  const fallbackTags = PROBLEM_TAG_FALLBACK[concern];
  if (fallbackTags && direct.some((t) => fallbackTags.includes(t))) {
    const gate = PROBLEM_FALLBACK_GATE[concern];
    const cat = (p.categorySlug ?? "") as string;
    if (!gate || gate.includes(cat)) return 3;
    return 0;
  }
  // — Treatment keywords (narrow matching set) —
  if (hasKeywordHit(p, concern, MATCH_KEYWORDS)) return 1;
  // — Category matches (vitiligo sun protection) —
  const cat = (p.categorySlug ?? "") as string;
  const cats = PROBLEM_CATEGORY_MATCH[concern];
  if (cats && cat && cats.includes(cat)) return 3;
  return 0;
}

/** Relevance tier for a product/problem pair: 0 irrelevant, 2 relevant. */
export function productProblemTier(p: MatchableProduct, concern: string): 0 | 2 {
  return matchKind(p, concern) === 0 ? 0 : 2;
}

/** True when the product is relevant for the problem. */
export function productMatchesProblem<T extends MatchableProduct>(
  p: T,
  concern: string
): boolean {
  return productProblemTier(p, concern) > 0;
}

function hasGallery(p: MatchableProduct): boolean {
  return Array.isArray(p.gallery) && (p.gallery as unknown[]).length > 0;
}

/** Every problem section evaluated by the matcher. */
const ALL_CONCERNS = [
  "acne",
  "dryness",
  "aging",
  "pigmentation",
  "sensitivity",
  "oiliness",
  "large_pores",
  "redness",
  "uneven_texture",
  "dark_circles",
  "rosacea",
  "eczema",
  "tired_skin",
  "stretch_marks",
  "hair_loss",
  "dandruff",
  "dry_hair",
  "split_ends",
  "frizzy_hair",
  "dyed_hair",
  "curly_hair",
  "oily_scalp",
  "sensitive_scalp",
  "dull_hair",
];

/**
 * Louz-style homing: each product lives in at most TWO problem sections —
 * its best fits (keyword-evident matches first, then rarest/smallest
 * sections). Kills the same-card-in-6-sections effect while keeping
 * genuinely dual-purpose products (e.g. sensitive dandruff shampoo)
 * in both of their sections.
 */
const homesCache = new WeakMap<object, Map<string, string[]>>();

function getHomes<T extends MatchableProduct>(products: T[]): Map<string, string[]> {
  const cached = homesCache.get(products);
  if (cached) return cached;
  const withGallery = products.filter(hasGallery);
  // Pass 1: tier-2 matches + section sizes. kind: 1 keyword, 2 direct, 3 fallback/category.
  const matches = new Map<string, { concern: string; kw: MatchKind }[]>();
  const sizes = new Map<string, number>();
  for (const p of withGallery) {
    const list: { concern: string; kw: MatchKind }[] = [];
    for (const concern of ALL_CONCERNS) {
      const kind = matchKind(p, concern);
      if (kind === 0) continue;
      // arbitration counts keyword hits over the full (broad) keyword sets
      const kw = hasKeywordHit(p, concern) ? 1 : kind;
      list.push({ concern, kw: kw as MatchKind });
      sizes.set(concern, (sizes.get(concern) ?? 0) + 1);
    }
    matches.set(p.id, list);
  }
  // Pass 2: at most two homes — keyword-evident first, then direct tags
  // (rarest sections first), fallback/category last.
  const homes = new Map<string, string[]>();
  for (const p of withGallery) {
    const list = matches.get(p.id) ?? [];
    list.sort((a, b) => {
      if (a.kw !== b.kw) return a.kw - b.kw;
      const sa = sizes.get(a.concern) ?? 0;
      const sb = sizes.get(b.concern) ?? 0;
      if (sa !== sb) return sa - sb;
      return a.concern < b.concern ? -1 : 1;
    });
    homes.set(
      p.id,
      list.slice(0, 2).map((m) => m.concern)
    );
  }
  homesCache.set(products, homes);
  return homes;
}

function byPrimaryThenBestSeller<T extends MatchableProduct>(concern: string, homes: Map<string, string[]>) {
  return (a: T, b: T): number => {
    const ap = homes.get(a.id)?.[0] === concern ? 0 : 1;
    const bp = homes.get(b.id)?.[0] === concern ? 0 : 1;
    if (ap !== bp) return ap - bp;
    const ab = (a as { isBestSeller?: boolean }).isBestSeller ? 1 : 0;
    const bb = (b as { isBestSeller?: boolean }).isBestSeller ? 1 : 0;
    return bb - ab;
  };
}

/**
 * Products homed in the problem section: best fits first, then
 * best-sellers. Small pools stay small (louz-style).
 */
export function matchProblemProducts<T extends MatchableProduct & { gallery?: unknown }>(
  products: T[],
  concern: string
): T[] {
  const homes = getHomes(products);
  return products
    .filter((p) => hasGallery(p) && (homes.get(p.id) ?? []).includes(concern))
    .sort(byPrimaryThenBestSeller<T>(concern, homes));
}

/** Count label helper (mirrors matchProblemProducts without sorting). */
export function countProblemProducts<T extends MatchableProduct & { gallery?: unknown }>(
  products: T[],
  concern: string
): number {
  const homes = getHomes(products);
  let n = 0;
  for (const p of products) {
    if (hasGallery(p) && (homes.get(p.id) ?? []).includes(concern)) n += 1;
  }
  return n;
}
