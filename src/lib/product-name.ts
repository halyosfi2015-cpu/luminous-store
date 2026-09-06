/**
 * PART 4 — PRODUCT NAME RECONSTRUCTION
 * ====================================
 *
 * Reconstruct Luminous product names independently from VERIFIED PRODUCT
 * FACTS. Yaqoot is allowed as a factual source but MUST NOT be the writing
 * template.
 *
 * Model used:
 *   VERIFIED SOURCES
 *     → VERIFIED PRODUCT FACTS
 *       → PRODUCT IDENTITY COMPONENTS
 *         → LUMINOUS NAME STRUCTURE
 *           → IDENTITY VALIDATION
 *             → ORIGINALITY VALIDATION
 *               → FINAL NAME
 *
 * NOT used:
 *   YAQOOT TITLE → PARAPHRASE → LUMINOUS TITLE
 *
 * Key separation: a legitimate product name may naturally resemble Yaqoot's
 * because the real manufacturer/product identity is the same (allowed). We
 * detect *editorial copying* (marketing wording reuse, exact copy,
 * +Luminous append, punctuation-only, word-order-only, synonym swaps,
 * mechanical translation) separately from *identity overlap*.
 *
 * This module runs in DRY-RUN / AUDIT mode. It NEVER overwrites the catalog.
 */

import type { Product } from "@/src/types/product";
import { products } from "@/src/data/products";
import { onlyPublished } from "@/src/lib/publication";
import {
  SOURCE_HIERARCHY,
  FIELD_AUTHORITY_POLICY,
  resolveSourceConflict,
  verifyProductIdentity,
  detectSourceAgreement,
} from "@/src/lib/source-hierarchy";
import categoryMapAr from "@/src/lib/category-ar.json";
import categoryMapEn from "@/src/lib/category-en.json";

/* ------------------------------------------------------------------------ */
/* NORMALIZATION                                                             */
/* ------------------------------------------------------------------------ */

/** Normalize Arabic for deterministic comparison. Does NOT hide copied wording. */
export function normalizeName(text: string): string {
  return String(text || "")
    .toLowerCase()
    // Remove Arabic diacritics / tatweel / superscript alef
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "")
    // Normalize alef/hamza forms
    .replace(/[\u0623\u0625\u0622]/g, "\u0627")
    // Normalize teh marbuta → heh, alef maqsura → yeh
    .replace(/[\u0629]/g, "\u0647")
    .replace(/[\u0649]/g, "\u064A")
    // Normalize numerals to Latin
    .replace(/[\u0660-\u0669]/g, (d) => String(Number(d)))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(Number(d)))
    // Protect decimal points and thousands separators INSIDE numbers so that
    // "6.0", "0.05", "5,000" and "5،000" never collapse into "6 0" / "5 000".
    .replace(/(?<=\d)[.,\u060C](?=\d)/g, (m) => (m === "." ? "\uE000" : "\uE001"))
    // Protect the percent sign (a meaningful concentration marker) so that
    // "10%" is not collapsed to "10" and the "٠٪" glyph normalizes to "%".
    .replace(/[%٪]/g, "\uE002")
    // Collapse all whitespace/punctuation to single space
    .replace(/[\s\p{P}]+/gu, " ")
    .replace(/\uE000/g, ".")
    .replace(/\uE001/g, ",")
    .replace(/\uE002/g, "%")
    .trim();
}

/** Remove punctuation + whitespace only (for punctuation-only checks). */
export function stripPunctWhitespace(text: string): string {
  return String(text || "")
    .toLowerCase()
    .replace(/[\s\p{P}\u064B-\u0652\u0670\u0640]/gu, "");
}

/** Tokenize a normalized string into word tokens. */
export function tokenize(text: string): string[] {
  return String(text || "")
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

/** Jaccard similarity between two token arrays (0..1). */
export function jaccardTokens(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  let inter = 0;
  for (const t of setA) if (setB.has(t)) inter++;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 1 : inter / union;
}

/* ------------------------------------------------------------------------ */
/* MARKETING / PUFFERY WORDS (editorial, not identity)                       */
/* ------------------------------------------------------------------------ */

const MARKETING_AR = new Set([
  "ممتاز", "الأفضل", "أفضل", "قوي", "الأقوى", "فعال", "مضمون", "مبهرة",
  "نتائج", "باهر", "سحري", "معجزة", "رخيص", "الأصلي", "الأصلية", "مثالي",
  "مثالية", "سريع", "سريعة", "ملحوظ", "ملحوظة", "واسع", "عميق", "عالي",
  "عالية", "كبير", "كبيرة", "فاخر", "فاخرة", "استثنائي", "استثنائية",
  "لجميع", "جميع", "الكل", "كل", "مجرب", "مضمونة", "ضمان",
]);

const MARKETING_EN = new Set([
  "best", "amazing", "wow", "miracle", "magic", "cheap", "premium", "luxury",
  "ultimate", "perfect", "pro", "genuine", "original", "top", "super", "great",
  "special", "exclusive", "guaranteed", "powerful", "strong", "all",
]);

/** Product-type synonym words (Arabic) — used to avoid adding redundant type + detect copies. */
const TYPE_SYNONYMS_AR = new Set([
  "غسول", "منظف", "تونر", "سيروم", "مرطب", "كريم", "واقي", "لوشن", "زيت",
  "ماسك", "مقشر", "شامبو", "بلسم", "مزيل", "ميك اب", "مكياج", "عطر", "بخور",
  "أدوات", "فرشاة",
]);

/** Identity-type tokens per categorySlug (Arabic + English). */
const TYPE_TOKENS_BY_SLUG: Record<string, string[]> = {
  cleansers: ["غسول", "منظف", "cleanser", "wash"],
  toners: ["تونر", "toner"],
  serums: ["سيروم", "serum"],
  moisturizers: ["مرطب", "كريم", "moisturizer", "cream"],
  sunscreen: ["واقي", "sunscreen", "spf"],
  "eye-care": ["عين", "eye"],
  "lip-care": ["شفا", "شفاه", "lip"],
  masks: ["ماسك", "mask"],
  exfoliators: ["مقشر", "exfoliator"],
  shampoo: ["شامبو", "shampoo"],
  conditioner: ["بلسم", "conditioner"],
  "hair-oils": ["زيت شعر", "hair oil"],
  "body-wash": ["غسول جسم", "body wash"],
  "body-lotion": ["لوشن", "body lotion"],
  "body-oils": ["زيت جسم", "body oil"],
  tools: ["أدوات", "فرشاة", "لصقات", "tools", "brush"],
  "bakhoor-premium": ["بخور", "عود", "bakhoor", "oud"],
  vitamins: ["فيتامين", "فيتامينات", "مكمل", "vitamin", "multivitamin"],
  deodorants: ["مزيل عرق", "مزيل", "deodorant"],
  "body-care": ["جسم", "body"],
};

/** Size units → physical volume/weight. */
const SIZE_UNITS = /(مل|ml|غرام|غ|جم|جرام|gram|لتر|ليتر|litre|liter|سم|متر|meter|cm|oz|اونص|اونصه|فل اونص)/i;
/** Count units → number of doses/items (vitamins, pads, blades…). */
const COUNT_UNITS = /(كبسولة|كبسولات|قرص|قرصا|قرصان|اقراص|أقراص|حبة|حبه|حبات|قطعة|قطعه|قطع|زوج|ازواج|أزواج|وحدة|وحدات|tablet|capsule|softgel|gummies|pcs)/i;

/** Brand placeholders that must NOT be prepended (not real identity). */
const PLACEHOLDER_BRANDS = new Set([
  "unknown", "غير معروف", "ماركه غير محدده", "ماركة غير محددة", "غير محدد",
  "غير محدده", "غير محددة", "بدون", "لا يوجد", "n/a", "na", "none", "بدون علامه", "بدون علامة",
]);

/**
 * Editorial phrases (on NORMALIZED Arabic) that are audience / purpose / area
 * marketing wording — NOT product identity. Removed so the reconstructed name
 * is built from identity facts, not a paraphrase of Yaqoot's editorial copy.
 */
const EDITORIAL_PHRASES_AR: string[] = [
  "يحتوي علي", "تحتوي علي", "يساعد علي", "يعمل علي", "يساعد في", "يعمل في",
  "للحصول علي", "حتي للبشره", "مناسب للبشره", "مثالي للبشره",
  "لجميع انواع البشره", "جميع انواع البشره", "كل انواع البشره", "جميع انواع",
  "للعنايه بالبشره", "العنايه بالبشره", "تنظيف عميق", "للتنظيف العميق",
  "لازاله المكياج", "ازاله المكياج", "توحيد لون البشره", "لتوحيد لون البشره",
  "لون البشره", "منطقه العين", "لمنطقه العين", "الاستخدام اليومي",
  "الاستخدام اليومى", "الاستخدام المتكرر", "مناسب للاستخدام",
  "مخصص للبشره", "للبشره الحساسه والجافه", "للبشره الجافه والحساسه",
  "لكل انواع البشره", "لكل انواع", "لكل نوع", "من كل نوع", "لكل نوع بشره",
  "بجوده الصالون", "بجوده عاليه", "حجم صغير", "حجم كبير", "حجم وسط",
];

/** Standalone editorial tokens (on NORMALIZED Arabic). */
const EDITORIAL_TOKENS_AR = new Set([
  "جدا", "للبشره", "البشره",
  "للوجه", "الوجه", "للعين", "العين", "للعيون", "العيون",
  "للشفاه", "الشفاه", "للشفتين", "الشفتين", "لليدين", "اليدين",
  "للجسم", "الجسم", "للرقبه", "الرقبه",
  "لتنظيف", "لتفتيح", "لترطيب", "لمحاربه", "لمنع", "لازاله",
  "لحمايه", "لتهدئه", "لتغذيه", "لتجديد", "للتقليل", "لتوحيد",
  "لتحسين", "للحصول", "يحتوي", "تحتوي", "يساعد", "يعمل",
  "عميق", "العميق", "حتي", "النقي", "مناسب", "مثالي", "للاستخدام",
  "اليومي", "اليومى", "الحساسه", "الدهنيه", "الجافه", "العاديه",
  "المختلطه", "المعرضه", "للحبوب", "الناضجه", "الشابه", "الباهته",
  "والجافه", "والدهنيه", "والحساسه", "والعاديه", "والمختلطه",
  "والناعمه", "والمرنه", "والعميق", "والباهته", "والناضجه", "والشابه",
  "وتفتيح", "وتجديد", "وترطيب", "وتنظيف", "ومحاربه", "ومنع",
  "وتهدئه", "وتغذيه", "وتوحيد", "وتحسين", "والتفتيح", "والتجديد",
  "والعنايه", "واليومي", "وعميق",
  "للشعر", "الشعر", "تفتيح", "للعنايه",
]);

/* ------------------------------------------------------------------------ */
/* VERIFIED FACT EXTRACTION                                                  */
/* ------------------------------------------------------------------------ */

export interface NameIdentityFacts {
  brand: string | undefined;
  brandAr: string | undefined;
  productType: string | undefined; // categorySlug
  productTypeAr: string | undefined;
  productTypeEn: string | undefined;
  size: string | undefined; // e.g. "100 مل"
  volumeMl: number | undefined;
  spf: string | undefined; // e.g. "SPF50"
  concentration: string | undefined; // e.g. "7%"
  count: string | undefined; // e.g. "2 قطعة"
  shade: string | undefined; // only real shade patterns
  variant: string | undefined;
  productLine: string | undefined; // distinctive descriptor preserved as identity
  coreDescriptorAr: string;
  sourceRank: number;
  sourceLabel: string;
  sourceVerified: boolean;
  sourceAgreement: "high" | "medium" | "low";
}

const SIZE_RE = /(\d+(?:[.,،]\d+)*)\s*(وحدة دولية|وحدة دوليه|مل|ml|غرام|غ|جم|جرام|gram|وحدة|unit|قطعة|قطع|كبسولة|قرص|حبة|حبه|زوج)/i;
const SPF_RE = /spf\s*(\d+)/i;
const SPF_AR_RE = /(عامل\s*حماية|حماية)\s*(\d+)(?!\s*(?:ساعه|ساعة|hours|h\b))/i;
const CONC_RE = /(\d+(?:[.,،]\d+)*)\s*([%٪])/;
const COUNT_RE = /(\d+(?:[.,،]\d+)*)\s*(قطعة|قطعه|قطع|حبة|حبه|كبسولة|قرص|قرصا|اقراص|أقراص|زوج|ازواج|أزواج|وحدات|وحدة|pcs|count)/i;
const SHADE_RE = /(?:shade|درجة|ظل|لون)\s*(\d+)/i;
const SHADE_CODE_RE = /(\d+)(?:N|C|W)\b/i;

export function extractNameFacts(product: Product): NameIdentityFacts {
  const nameAr = product.name?.ar ?? "";
  const nameEn = product.name?.en ?? "";
  const searchText = nameAr + " " + nameEn;

  let brand = product.brand || undefined;
  let brandAr = product.brandAr || brand;
  if (brand && PLACEHOLDER_BRANDS.has(normalizeName(brand))) brand = undefined;
  if (brandAr && PLACEHOLDER_BRANDS.has(normalizeName(brandAr))) brandAr = undefined;

  const productType = product.categorySlug || undefined;
  const productTypeAr = productType ? (categoryMapAr[productType as keyof typeof categoryMapAr] as string | undefined) : undefined;
  const productTypeEn = productType ? (categoryMapEn[productType as keyof typeof categoryMapEn] as string | undefined) : undefined;

  // Size / count: prefer structured sizeLabel, cleaned to "N unit" form.
  let size: string | undefined;
  let volumeMl: number | undefined;
  let count: string | undefined;
  const sizeLabel = product.sizeLabel;
  if (sizeLabel && sizeLabel.trim()) {
    const clean = cleanSizeLabel(sizeLabel);
    if (clean) {
      if (COUNT_UNITS.test(clean)) {
        count = clean;
        const ml = clean.match(/(\d+(?:\.\d+)?)/);
        if (ml && SIZE_UNITS.test(clean)) volumeMl = parseFloat(ml[1]);
      } else {
        size = clean;
        const ml = clean.match(/(\d+(?:\.\d+)?)/);
        if (ml) volumeMl = parseFloat(ml[1]);
      }
    }
  }
  if (!size) {
    const sizeMatch = searchText.match(SIZE_RE);
    if (sizeMatch) {
      size = sizeMatch[0].trim();
      volumeMl = parseFloat(sizeMatch[1]);
    }
  }
  if (!count) {
    const countMatch = searchText.match(COUNT_RE);
    if (countMatch) count = `${countMatch[1]} ${countMatch[2]}`;
  }

  // SPF (English SPF or Arabic عامل حماية) — "حماية N ساعة" is NOT SPF
  let spf: string | undefined;
  const spfMatch = searchText.match(SPF_RE);
  const spfArMatch = searchText.match(SPF_AR_RE);
  const spfPlus = /\d+\s*\+/.test(searchText);
  if (spfMatch) spf = `SPF${spfMatch[1]}${spfPlus ? "+" : ""}`;
  else if (spfArMatch) spf = `SPF${spfArMatch[2]}${spfPlus ? "+" : ""}`;

  // Concentration (e.g. 7%)
  const concMatch = searchText.match(CONC_RE);
  const concentration = concMatch ? `${concMatch[1]}%` : undefined;

  // Shade — ONLY explicit shade markers, never arbitrary digits
  let shade: string | undefined;
  const shadeMatch = searchText.match(SHADE_RE);
  const shadeCode = searchText.match(SHADE_CODE_RE);
  if (shadeMatch) shade = shadeMatch[1];
  else if (shadeCode) shade = shadeCode[1];

  // Variant: distinct from size — e.g. "3 ب1", "مع بومبة", "بدون لون"
  let variant: string | undefined;
  const setPattern = searchText.match(/(\d+\s*[ب]1|3\s*[ب]1|set\s*\d+|بومبة|pump|بدون\s*لون|no\s*color)/i);
  if (setPattern) variant = setPattern[0].trim();

  // Core descriptor = name minus brand tokens, minus size/spf/concentration tokens, minus marketing
  const coreDescriptorAr = extractCoreDescriptor(nameAr, brand, size, spf, concentration, count);

  // Product line: a shorter distinctive descriptor (first meaningful phrase)
  const productLine = coreDescriptorAr.slice(0, 40) || undefined;

  // Source info from canonical hierarchy
  const sourceRank = resolveSourceRank(product);
  const sourceLabel = SOURCE_HIERARCHY.find((s) => s.rank === sourceRank)?.label ?? "Other";
  const sourceVerified = !!product.source?.verified;

  return {
    brand,
    brandAr,
    productType,
    productTypeAr,
    productTypeEn,
    size,
    volumeMl,
    spf,
    concentration,
    count,
    shade,
    variant,
    productLine,
    coreDescriptorAr,
    sourceRank,
    sourceLabel,
    sourceVerified,
    sourceAgreement: sourceVerified ? "high" : "low",
  };
}

/** Turn a sizeLabel like "الحجم : 30 مل" / "90 كبسولة" / "قطعتين شامبو 325 مل *2" into "N unit". */
function cleanSizeLabel(label: string): string | undefined {
  const cleaned = label.replace(/الحجم\s*[:؛]?\s*/i, "").trim();
  const matches = [...cleaned.matchAll(/(\d+(?:[.,،]\d+)?)\s*([^\s\d]+)/g)];
  if (matches.length === 0) return undefined;
  const unit = matches.filter((m) => /[a-zA-Z\u0621-\u064A]/.test(m[2])).pop() ?? matches[matches.length - 1];
  const u = unit[2].replace(/[^\p{L}\d]/gu, "");
  if (!SIZE_UNITS.test(u) && !COUNT_UNITS.test(u)) return undefined;
  return `${unit[1].replace(/[.,،]/g, "")} ${u}`;
}

/** Resolve the canonical source rank for a product (1 = manufacturer … 8 = other). */
function resolveSourceRank(product: Product): number {
  const provider = product.source?.provider?.toLowerCase() ?? "";
  if (provider) {
    for (const layer of SOURCE_HIERARCHY) {
      if (layer.key === provider || (layer.key === "yaqoot" && provider.includes("yaqoot"))) return layer.rank;
    }
  }
  // Default: Yaqoot (rank 7) is the common factual source
  return 7;
}

/** Strip brand, attribute tokens, editorial phrases and marketing words from the Arabic name. */
function extractCoreDescriptor(nameAr: string, brand?: string, size?: string, spf?: string, concentration?: string, count?: string): string {
  const normOut = normalizeName(nameAr);

  // 1) Remove multi-word editorial phrases (audience / purpose / area wording)
  let cleaned = " " + normOut + " ";
  for (const phrase of EDITORIAL_PHRASES_AR) {
    cleaned = cleaned.split(` ${phrase} `).join(" ");
  }
  const tokens = tokenize(cleaned);

  // 2) Strip brand, verified attributes, editorial tokens and marketing words.
  //    Concentration is NOT stripped: a percentage always originates in the name
  //    itself, so keeping it in place preserves the active-ingredient
  //    association (e.g. "نياسيناميد 10% + ريتينول 0.05%") instead of relocating
  //    it to the end of the reconstructed name.
  const stripSet = new Set<string>();
  if (brand) {
    const b = normalizeName(brand);
    b.split(/\s+/).forEach((t) => t && stripSet.add(t));
  }
  [size, spf, count].forEach((attr) => {
    if (attr) normalizeName(attr).split(/\s+/).forEach((t) => t && stripSet.add(t));
  });
  if (spf) stripSet.add("spf");
  if (spf) stripSet.add("pa");

  const kept = tokens.filter(
    (t) => !stripSet.has(t) && t !== "و" && t !== "علي" && !EDITORIAL_TOKENS_AR.has(t) && !MARKETING_AR.has(t)
  );
  return kept.join(" ");
}

/* ------------------------------------------------------------------------ */
/* NAME RECONSTRUCTION                                                       */
/* ------------------------------------------------------------------------ */

export interface ReconstructedName {
  ar: string;
  en: string;
}

export function reconstructName(product: Product, facts: NameIdentityFacts): ReconstructedName {
  const brand = facts.brandAr || facts.brand || "";

  // Arabic name: [Brand] [core descriptor / product line] [type if missing] [size] [spf] [concentration]
  const arParts: string[] = [];
  if (brand) arParts.push(brand);

  const core = facts.coreDescriptorAr.trim();
  if (core && core !== brand) arParts.push(core);

  // Add canonical type only if a type synonym is not already present
  if (facts.productTypeAr) {
    const alreadyHasType = tokenize(normalizeName(arParts.join(" "))).some((t) =>
      (TYPE_TOKENS_BY_SLUG[facts.productType ?? ""] ?? []).some((syn) => tokenize(normalizeName(syn)).includes(t))
    );
    if (!alreadyHasType) arParts.push(facts.productTypeAr);
  }

  if (facts.size && !normalizeName(arParts.join(" ")).includes(normalizeName(facts.size))) arParts.push(facts.size);
  if (facts.count && !normalizeName(arParts.join(" ")).includes(normalizeName(facts.count))) arParts.push(facts.count);
  const hasConcentrationToken = /\d+\s*[%٪]/i.test(normalizeName(arParts.join(" ")));
  if (facts.concentration && !hasConcentrationToken) arParts.push(facts.concentration);
  const hasSpfAr = /(?:spf\s*\d+|عامل\s*حمايه|حمايه\s*\d+)/i.test(normalizeName(arParts.join(" ")));
  if (facts.spf && !hasSpfAr) arParts.push(facts.spf);

  const arName = arParts.filter(Boolean).join(" ");

  // English name: [Brand] [Latin core descriptor if any] [type if missing] [size] [spf]
  const enParts: string[] = [];
  const brandEn = facts.brand || "";
  if (brandEn) enParts.push(brandEn);
  const enCore = facts.coreDescriptorAr.trim();
  if (enCore && enCore !== brandEn && /[a-zA-Z]/.test(enCore)) enParts.push(enCore);
  if (facts.productTypeEn) {
    const alreadyHasType = enParts.join(" ").toLowerCase().includes(facts.productTypeEn.toLowerCase());
    if (!alreadyHasType) enParts.push(facts.productTypeEn);
  }
  if (facts.size && !enParts.join(" ").toLowerCase().includes(facts.size.toLowerCase())) enParts.push(facts.size);
  if (facts.count && !enParts.join(" ").toLowerCase().includes(facts.count.toLowerCase())) enParts.push(facts.count);
  const hasSpfEn = /(?:spf\s*\d+|عامل\s*حمايه|حمايه\s*\d+)/i.test(enParts.join(" "));
  if (facts.spf && !hasSpfEn) enParts.push(facts.spf);

  const enName = enParts.filter(Boolean).join(" ");

  return { ar: arName, en: enName };
}

/* ------------------------------------------------------------------------ */
/* ORIGINALITY VALIDATION                                                    */
/* ------------------------------------------------------------------------ */

export interface OriginalityResult {
  status: "APPROVED" | "REVIEW_REQUIRED" | "REJECTED";
  identityOverlap: number; // 0..1 similarity on identity tokens
  editorialOverlap: number; // 0..1 similarity on editorial/marketing tokens
  normalizedSimilarity: number; // 0..1 full normalized similarity
  editorialScore: number; // 0..100 higher = more editorial copying concern
  reasons: string[];
}

/**
 * Deterministic originality check. Distinguishes identity overlap
 * (allowed) from editorial copying (rejected).
 */
export function validateOriginality(
  newNameAr: string,
  originalNameAr: string,
  newNameEn: string,
  originalNameEn: string,
  facts: NameIdentityFacts
): OriginalityResult {
  const reasons: string[] = [];

  const nAr = normalizeName(newNameAr);
  const oAr = normalizeName(originalNameAr);
  const nEn = normalizeName(newNameEn);
  const oEn = normalizeName(originalNameEn);

  // Identity tokens (brand, type, size, spf, concentration) — allowed to overlap
  const identitySet = new Set<string>();
  [facts.brand, facts.brandAr, facts.productTypeAr, facts.productTypeEn, facts.size, facts.spf, facts.concentration, facts.count]
    .forEach((v) => v && normalizeName(v).split(/\s+/).forEach((t) => t && identitySet.add(t)));

  const nTokens = tokenize(nAr);
  const oTokens = tokenize(oAr);

  const nEditorial = nTokens.filter((t) => MARKETING_AR.has(t));
  const oEditorial = oTokens.filter((t) => MARKETING_AR.has(t));

  const nIdentity = nTokens.filter((t) => identitySet.has(t));
  const oIdentity = oTokens.filter((t) => identitySet.has(t));

  const identityOverlap = jaccardTokens(nIdentity, oIdentity);
  const editorialOverlap = nEditorial.length + oEditorial.length === 0 ? 0 : jaccardTokens(nEditorial, oEditorial);
  const normalizedSimilarity = jaccardTokens(nTokens, oTokens);

  // editorialScore 0-100
  let editorialScore = Math.round(editorialOverlap * 100);
  if (editorialScore === 0 && nEditorial.length > 0) editorialScore = Math.min(60, nEditorial.length * 15);

  let status: OriginalityResult["status"] = "APPROVED";

  // 1. Exact Yaqoot title (normalized equal)
  if (nAr === oAr && nAr !== "") {
    if (oEditorial.length === 0 && nEditorial.length === 0) {
      reasons.push("identical official product name (identity overlap, no editorial wording)");
    } else {
      status = "REJECTED";
      reasons.push("exact Yaqoot title copied");
    }
  }

  // 2. Yaqoot title + "Luminous"/"لومينوس"
  const luminousSuffixAr = normalizeName(oAr + " لومينوس");
  const luminousSuffixEn = normalizeName(oAr + " luminous");
  if (status !== "REJECTED" && (nAr === luminousSuffixAr || nAr === luminousSuffixEn)) {
    status = "REJECTED";
    reasons.push("Yaqoot title + Luminous (superficial brand append)");
  }

  // 3. Punctuation-only / whitespace-only modification
  if (status !== "REJECTED" && stripPunctWhitespace(newNameAr) === stripPunctWhitespace(originalNameAr) && newNameAr !== originalNameAr) {
    status = "REJECTED";
    reasons.push("punctuation/whitespace-only modification");
  }

  // 4. Trivial word-order-only modification (same token multiset, different order)
  if (status !== "REJECTED") {
    const sortedN = [...nTokens].sort();
    const sortedO = [...oTokens].sort();
    if (sortedN.length === sortedO.length && sortedN.every((t, i) => t === sortedO[i]) && nAr !== oAr) {
      status = "REJECTED";
      reasons.push("trivial word-order modification");
    }
  }

  // 5. Editorial (marketing wording) reuse
  if (status !== "REJECTED" && nEditorial.length > 0 && oEditorial.length > 0 && editorialOverlap >= 0.5) {
    status = "REJECTED";
    reasons.push("editorial copying: marketing wording reused");
  }

  // 6. Mechanical translation: EN new name === AR original (or vice versa)
  //    Only meaningful when the compared strings are in DIFFERENT scripts.
  const hasArabic = (s: string) => /[\u0600-\u06FF]/.test(s);
  if (status !== "REJECTED" && ((nEn !== "" && !hasArabic(nEn) && nEn === oAr) || (nAr !== "" && !hasArabic(nAr) && nAr === oEn))) {
    status = "REJECTED";
    reasons.push("mechanical translation detected");
  }

  // 7. High full normalized similarity but not exact → ambiguity, but ONLY when
  //    there is editorial/marketing wording in play. A source name that is pure
  //    identity (brand + type + variant + size) legitimately yields a highly
  //    similar canonical reconstruction — that is identity preservation, not
  //    editorial copying, so it stays APPROVED.
  if (status === "APPROVED" && normalizedSimilarity >= 0.9 && normalizedSimilarity < 1) {
    if (nEditorial.length > 0 && oEditorial.length > 0) {
      status = "REVIEW_REQUIRED";
      reasons.push(`high normalized similarity (${Math.round(normalizedSimilarity * 100)}%) — verify editorial independence`);
    }
  } else if (status === "APPROVED" && editorialScore >= 50) {
    status = "REVIEW_REQUIRED";
    reasons.push(`editorial overlap concern (score ${editorialScore})`);
  }

  if (status === "APPROVED" && reasons.length === 0) {
    reasons.push("independently reconstructed from verified facts");
  }

  return { status, identityOverlap, editorialOverlap, normalizedSimilarity, editorialScore, reasons };
}

/* ------------------------------------------------------------------------ */
/* IDENTITY VALIDATION                                                       */
/* ------------------------------------------------------------------------ */

export interface IdentityValidation {
  status: "PASS" | "REVIEW" | "FAIL";
  preserved: string[];
  missing: string[];
  conflicts: string[];
}

/** Ensure the reconstructed name preserves all verified identity facts. */
export function validateIdentity(nameAr: string, nameEn: string, facts: NameIdentityFacts): IdentityValidation {
  const preserved: string[] = [];
  const missing: string[] = [];
  const conflicts: string[] = [];

  const normName = normalizeName(nameAr + " " + nameEn);

  if (facts.brand) {
    if (normName.includes(normalizeName(facts.brand))) preserved.push("brand");
    else missing.push("brand");
  }
  if (facts.productTypeAr) {
    const typeTokens = TYPE_TOKENS_BY_SLUG[facts.productType ?? ""] ?? [];
    const present = typeTokens.some((syn) => normName.includes(normalizeName(syn)));
    if (present) preserved.push("productType");
    else if (facts.productTypeAr && normName.includes(normalizeName(facts.productTypeAr))) preserved.push("productType");
    else missing.push("productType");
  }
  if (facts.size) {
    if (normName.includes(normalizeName(facts.size))) preserved.push("size");
    else missing.push("size");
  }
  if (facts.spf) {
    if (/(?:spf\s*\d+|عامل\s*حمايه|حمايه\s*\d+)/i.test(normName)) preserved.push("spf");
    else missing.push("spf");
  }
  if (facts.concentration) {
    if (/\d+\s*[%٪]/i.test(normName)) preserved.push("concentration");
    else missing.push("concentration");
  }
  if (facts.count) {
    if (normName.includes(normalizeName(facts.count))) preserved.push("count");
    else missing.push("count");
  }
  if (facts.shade) {
    if (normName.includes(normalizeName(facts.shade))) preserved.push("shade");
    else missing.push("shade");
  }
  if (facts.variant) {
    if (normName.includes(normalizeName(facts.variant))) preserved.push("variant");
    else conflicts.push("variant");
  }

  const status: IdentityValidation["status"] = missing.length === 0 && conflicts.length === 0 ? "PASS" : missing.length > 1 ? "FAIL" : "REVIEW";
  return { status, preserved, missing, conflicts };
}

/* ------------------------------------------------------------------------ */
/* QUALITY VALIDATION                                                        */
/* ------------------------------------------------------------------------ */

export interface QualityValidation {
  valid: boolean;
  issues: string[];
}

const MOJIBAKE_RE = /[ØüÛÚÙÖÜßÇçİığşȘØ]/;

export function validateQuality(nameAr: string, nameEn: string, facts: NameIdentityFacts): QualityValidation {
  const issues: string[] = [];
  const normAr = normalizeName(nameAr);
  const nameTokens = tokenize(normAr);

  const normBrand = facts.brand ? normalizeName(facts.brand).trim() : "";
  const brandTokens = normBrand ? normBrand.split(/\s+/) : [];
  let brandOccurrences = 0;
  if (brandTokens.length > 0) {
    for (let i = 0; i <= nameTokens.length - brandTokens.length; i++) {
      if (brandTokens.every((t, j) => nameTokens[i + j] === t)) {
        brandOccurrences++;
        i += brandTokens.length - 1;
      }
    }
  }
  if (brandOccurrences > 1) issues.push("duplicated brand");

  if (facts.size) {
    const sizeTokens = tokenize(normalizeName(facts.size));
    if (sizeTokens.length > 0) {
      let sizeOccurrences = 0;
      for (let i = 0; i <= nameTokens.length - sizeTokens.length; i++) {
        if (sizeTokens.every((t, j) => nameTokens[i + j] === t)) {
          sizeOccurrences++;
          i += sizeTokens.length - 1;
        }
      }
      if (sizeOccurrences > 1) issues.push("duplicated size");
    }
  }

  if (MOJIBAKE_RE.test(nameAr) || MOJIBAKE_RE.test(nameEn)) issues.push("broken encoding / mojibake");
  if (nameAr.length > 120) issues.push("excessive length (AR)");
  if (nameEn.length > 140) issues.push("excessive length (EN)");

  // Unsupported marketing claims still present in the reconstructed name
  // (tokens that are part of the canonical type label are allowed — e.g. "بخور فاخر")
  const typeTokens = new Set<string>();
  [facts.productTypeAr, facts.productTypeEn].forEach((v) => v && normalizeName(v).split(/\s+/).forEach((t) => t && typeTokens.add(t)));
  const claims = nameTokens.filter((t) => MARKETING_AR.has(t) && !typeTokens.has(t));
  if (claims.length > 0) issues.push(`unsupported marketing claim: ${claims.join(", ")}`);

  // Missing verified attributes
  if (facts.spf && !/(?:spf\s*\d+|عامل\s*حمايه|حمايه\s*\d+)/i.test(normAr)) issues.push("missing verified SPF");
  if (facts.size && !normAr.includes(normalizeName(facts.size))) issues.push("missing verified size");
  if (facts.count && !normAr.includes(normalizeName(facts.count))) issues.push("missing verified count");
  if (facts.concentration && !/\d+\s*[%٪]/i.test(normAr)) issues.push("missing verified concentration");

  return { valid: issues.length === 0, issues };
}

/* ------------------------------------------------------------------------ */
/* CONFIDENCE + FINAL STATUS                                                 */
/* ------------------------------------------------------------------------ */

export interface NameDecision {
  confidence: number; // 0..100
  status: "APPROVED" | "REVIEW_REQUIRED" | "REJECTED";
  reasons: string[];
  identityStatus: IdentityValidation["status"];
  originalityStatus: OriginalityResult["status"];
  qualityValid: boolean;
}

export function computeNameDecision(
  facts: NameIdentityFacts,
  name: ReconstructedName,
  originalName: { ar: string; en: string }
): NameDecision {
  const originality = validateOriginality(name.ar, originalName.ar, name.en, originalName.en, facts);
  const identity = validateIdentity(name.ar, name.en, facts);
  const quality = validateQuality(name.ar, name.en, facts);

  let confidence = 100;

  // Identity confidence
  const preservedCount = identity.preserved.length;
  const totalIdentityFacts =
    [facts.brand, facts.productTypeAr, facts.size, facts.spf, facts.concentration, facts.count, facts.shade].filter(Boolean).length;
  if (totalIdentityFacts > 0) confidence -= Math.round(((totalIdentityFacts - preservedCount) / totalIdentityFacts) * 25);

  // Source authority
  if (facts.sourceRank > 5) confidence -= 10;
  if (!facts.sourceVerified) confidence -= 5;

  // Source agreement
  if (facts.sourceAgreement === "low") confidence -= 5;

  // Variant / size confidence
  if (!facts.size && !facts.variant) confidence -= 5;

  // Originality result
  if (originality.status === "REJECTED") confidence -= 35;
  else if (originality.status === "REVIEW_REQUIRED") confidence -= 20;

  confidence = Math.max(0, Math.min(100, confidence));

  let status: NameDecision["status"] = "APPROVED";
  const reasons: string[] = [...originality.reasons];

  if (originality.status === "REJECTED") {
    status = "REJECTED";
  } else if (identity.status === "FAIL") {
    status = "REJECTED";
    reasons.push("unsupported/missing identity facts");
  } else if (!quality.valid) {
    status = "REJECTED";
    reasons.push(...quality.issues.slice(0, 2));
  } else if (originality.status === "REVIEW_REQUIRED" || identity.status === "REVIEW") {
    status = "REVIEW_REQUIRED";
  }

  if (status === "APPROVED") reasons.push(`confidence ${confidence}/100 — identity verified, no meaningful copying concern`);

  return { confidence, status, reasons, identityStatus: identity.status, originalityStatus: originality.status, qualityValid: quality.valid };
}

/* ------------------------------------------------------------------------ */
/* PART 4 AUDIT (DRY-RUN — never writes to catalog)                          */
/* ------------------------------------------------------------------------ */

export interface Part4Audit {
  products: {
    total: number;
    evaluated: number;
  };
  names: {
    alreadyValid: number;
    reconstructed: number;
    unchanged: number;
    reviewRequired: number;
    rejected: number;
    approved: number;
    independentlyReconstructed: number;
  };
  violations: {
    unsupportedIdentityFacts: number;
    identityConflicts: number;
    qualityFailures: number;
    exactYaqootCopies: number;
    yaqootPlusLuminousCopies: number;
    trivialModifications: number;
    mechanicalTranslations: number;
    editorialSimilarityFailures: number;
  };
  identityPreserved: number;
}

export function runPart4Audit(catalog?: Product[]): Part4Audit {
  const all = onlyPublished(catalog ?? products);
  const audit: Part4Audit = {
    products: { total: all.length, evaluated: 0 },
    names: { alreadyValid: 0, reconstructed: 0, unchanged: 0, reviewRequired: 0, rejected: 0, approved: 0, independentlyReconstructed: 0 },
    violations: {
      unsupportedIdentityFacts: 0,
      identityConflicts: 0,
      qualityFailures: 0,
      exactYaqootCopies: 0,
      yaqootPlusLuminousCopies: 0,
      trivialModifications: 0,
      mechanicalTranslations: 0,
      editorialSimilarityFailures: 0,
    },
    identityPreserved: 0,
  };

  for (const product of all) {
    audit.products.evaluated++;
    const facts = extractNameFacts(product);
    const name = reconstructName(product, facts);
    const decision = computeNameDecision(facts, name, product.name);
    const identity = validateIdentity(name.ar, name.en, facts);

    // Categorize
    const normalizedNew = normalizeName(name.ar);
    const normalizedOld = normalizeName(product.name.ar);

    if (identity.status === "PASS") audit.identityPreserved++;

    if (decision.status === "REJECTED") {
      audit.names.rejected++;
      audit.names.reconstructed++;
      if (decision.originalityStatus === "REJECTED") {
        const reasonsJoined = decision.reasons.join(" ");
        if (reasonsJoined.includes("exact Yaqoot")) audit.violations.exactYaqootCopies++;
        if (reasonsJoined.includes("Luminous")) audit.violations.yaqootPlusLuminousCopies++;
        if (reasonsJoined.includes("word-order") || reasonsJoined.includes("punctuation")) audit.violations.trivialModifications++;
        if (reasonsJoined.includes("mechanical translation")) audit.violations.mechanicalTranslations++;
        if (reasonsJoined.includes("editorial copying")) audit.violations.editorialSimilarityFailures++;
      } else {
        if (identity.status === "FAIL") audit.violations.unsupportedIdentityFacts++;
        else audit.violations.qualityFailures++;
      }
    } else if (decision.status === "REVIEW_REQUIRED") {
      audit.names.reviewRequired++;
      audit.names.reconstructed++;
      if (identity.conflicts.length > 0) audit.violations.identityConflicts++;
      if (decision.originalityStatus === "REVIEW_REQUIRED") audit.violations.editorialSimilarityFailures++;
    } else {
      audit.names.approved++;
      if (normalizedNew === normalizedOld) {
        audit.names.alreadyValid++;
        audit.names.unchanged++;
      } else {
        audit.names.reconstructed++;
        audit.names.independentlyReconstructed++;
      }
    }
  }

  return audit;
}

/* ------------------------------------------------------------------------ */
/* REAL BEFORE / AFTER EXAMPLES                                              */
/* ------------------------------------------------------------------------ */

export interface NameBeforeAfterExample {
  productId: string;
  brand: string;
  originalName: { ar: string; en: string };
  verifiedIdentityFacts: NameIdentityFacts;
  reconstructedName: { ar: string; en: string };
  sourceEvidence: {
    sourceLabel: string;
    sourceRank: number;
    verified: boolean;
    agreement: string;
  };
  identityStatus: IdentityValidation["status"];
  originalityStatus: OriginalityResult["status"];
  similarityScore: number;
  confidence: number;
  finalDecision: string;
  reasons: string[];
}

export function produceNameExamples(limit = 12, catalog?: Product[]): NameBeforeAfterExample[] {
  const all = onlyPublished(catalog ?? products);
  const sampleIds = ["yq-754", "yq-960", "yq-1680", "yq-2137", "yq-1051", "yq-2682", "yq-629", "yq-710", "yq-2051", "yq-129", "yq-460", "yq-1660"];
  const samples = all.filter((p) => sampleIds.includes(p.id)).slice(0, limit);

  return samples.map((product) => {
    const facts = extractNameFacts(product);
    const name = reconstructName(product, facts);
    const decision = computeNameDecision(facts, name, product.name);
    const originality = validateOriginality(name.ar, product.name.ar, name.en, product.name.en, facts);
    const identity = validateIdentity(name.ar, name.en, facts);

    return {
      productId: product.id,
      brand: product.brand,
      originalName: product.name,
      verifiedIdentityFacts: facts,
      reconstructedName: name,
      sourceEvidence: {
        sourceLabel: facts.sourceLabel,
        sourceRank: facts.sourceRank,
        verified: facts.sourceVerified,
        agreement: facts.sourceAgreement,
      },
      identityStatus: identity.status,
      originalityStatus: originality.status,
      similarityScore: originality.normalizedSimilarity,
      confidence: decision.confidence,
      finalDecision: decision.status,
      reasons: decision.reasons,
    };
  });
}

export { SOURCE_HIERARCHY, FIELD_AUTHORITY_POLICY, resolveSourceConflict, verifyProductIdentity, detectSourceAgreement };
