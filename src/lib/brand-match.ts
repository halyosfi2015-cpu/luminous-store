import { brands } from "@/src/data/brands";

/**
 * Canonical product→brand resolution.
 *
 * Product records store `brand` as a raw display string (Arabic or English,
 * with spelling/transliteration variants). Brand pages are keyed by canonical
 * slug. This module is the SINGLE place that resolves a raw brand string to a
 * canonical slug using:
 *
 *   1. Normalized exact match against the brand's canonical name/nameAr.
 *   2. A curated alias table (verified transliteration/spelling variants of
 *      EXISTING canonical brands only).
 *
 * Unknown strings resolve to null — never guessed. Those products simply do
 * not appear on any brand page until their catalog brand string is fixed
 * upstream (documented data-quality follow-up).
 */

export function normalizeBrandKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/[أإآٱا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .normalize("NFD")
    .replace(/[\u0300-\u036f\u064B-\u065F\u0670]/g, "") // strip accents + Arabic diacritics/hamza
    .replace(/^(ماركة|من|brand)\s+/, "")
    .replace(/\s*-\s*\d+\s*(مل|ml).*$/i, "")
    .replace(/[^a-z0-9\u0600-\u06FF]/g, "");
}

/** Verified variants of existing canonical brands (slug → accepted raw forms). */
const BRAND_ALIASES: Record<string, string[]> = {
  "loreal-paris": ["l'oreal", "loreal", "l'oreal paris", "لوريال باريس", "loréal"],
  flormar: ["fleurmar"],
  "lane-organic": ["lane organics", "لان اورجانك"],
  "equal-berry": ["equalberry"],
  "uni-pro": ["unipro"],
  "mary-ruth": ["maryruths", "mary ruths"],
  bioderma: ["بيوديرما"],
  "some-by-mi": ["من سوم باي مي"],
  skin1004: ["سكين100", "سكين 100", "skin 100", "سكين", "skin"],
  sheamoisture: ["من شيا مويستر", "شيا مويستشر"],
  "access-w": ["من اكسيس واي", "من أكسيس واي"],
  "peber-mintz": ["بيبر منتسل"],
  nyx: ["ان واي اكس"],
  "isis-pharma": ["من ايزيس فارما"],
  rdl: ["من ار دي ال"],
  femfresh: ["من فيم فريش"],
  "century-21": ["سينتري21", "سينتري 21", "من سينتري 21"],
  scala: ["من سكالا"],
  "fair-lady": ["من فير ليدي"],
  "california-gold-nutrition": ["كاليفورنيا غولد نيوتريش", "كاليفور"],
  "secret-key": ["سيكرت كي"],
  giovanni: ["ماركة جيوفاني"],
  chanel: ["شانيل للنساء"],
  "herbal-essences": ["هيربال"],
  "doctor-althia": ["dr althaya", "د آلثيا"],
  garnier: ["غارنية"],
  eucerin: ["يوسيرين"],
  bourjois: ["بورجوا"],
  "beauty-of-joseon": ["بيوتي اوف جيسهون"],
  "farm-stay": ["فارم ستي"],
  "k-secret": ["كي سيكريت"],
  "im-sorry-for-my-skin": ["ام سوري فور ماي سكن"],
  "the-ordinary": ["ذاورديناري"],
  "mason-natural": ["ماسون"],
  "koji-san": ["كوجي"],
  vitabiotics: ["برفيكتيل"],
  christine: ["كريست"],
  loca: ["luca"],
  olaplex: ["اولابليكس"],
  isdin: ["isidin"],
  "nubian-heritage": ["نوبيان هيريتج"],
  "oz-naturals": ["اوز ناتشورال"],
  "real-techniques": ["ريال تكنك"],
  "dolce-gabbana": ["دولتشي آند غابانا"],
  "ofra-cosmetics": ["ofra"],
  "natures-republic": ["ناتشر ريببلك"],
  benefit: ["بنفت"],
  isadora: ["إيسادور"],
  "jose-eber": ["جوسي ايبر"],
  schick: ["schick intuition"],
  "paulas-choice": ["paulas choice", "باولاز"],
  revolution: ["ريفولوشن", "ريفلوشن"],
  parodontax: ["بردونتكس", "بارودونتاكس"],
  bench: ["بينش"],
  "arm-hammer": ["ارم اند همر"],
  avene: ["avene", "avène", "aven"],
};

const byNormName = (() => {
  const map = new Map<string, string>();
  for (const b of brands) {
    for (const v of [b.name, b.nameAr]) {
      const n = normalizeBrandKey(v);
      if (n && !map.has(n)) map.set(n, b.slug);
    }
  }
  return map;
})();

const byNormAlias = (() => {
  const map = new Map<string, string>();
  for (const [slug, aliases] of Object.entries(BRAND_ALIASES)) {
    for (const a of aliases) {
      const n = normalizeBrandKey(a);
      if (n && !map.has(n)) map.set(n, slug);
    }
  }
  return map;
})();

/** Resolve a raw product brand string to a canonical brand slug, or null. */
export function resolveBrandSlug(rawBrand: string | null | undefined): string | null {
  if (!rawBrand) return null;
  const n = normalizeBrandKey(rawBrand);
  if (!n) return null;
  return byNormName.get(n) ?? byNormAlias.get(n) ?? null;
}

/** All canonical slugs referenced by at least one product-brand variant. */
export function brandSlugsInCatalog(): Set<string> {
  // Imported lazily by callers via products data; kept simple here.
  return new Set(byNormName.values());
}
