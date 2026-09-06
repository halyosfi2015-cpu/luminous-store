/**
 * SEMANTIC LUMINOUS PRODUCT STAGE
 * ===============================
 * One intelligent system that derives the cinematic product grounding
 * (atmosphere + floor + glow + reflection + shadow depth) from the MEANING
 * of each slide — not from a fixed decorative podium.
 *
 * Design system stays constant: container, margins, typography, CTA,
 * navigation, hierarchy. Only the mood of the scene changes.
 */

export interface StageMoodProfile {
  key: string;
  labelAr: string;
  labelEn: string;
  /** Floor light tint strength 0..1 */
  floorGlow: number;
  /** Reflection band opacity 0..1 */
  reflection: number;
  /** Atmospheric blur near the floor in px */
  atmosphereBlur: number;
  /** Ambient haze opacity near the floor 0..1 */
  haze: number;
  /** Contact shadow strength multiplier 0..1 */
  shadow: number;
  /** Curved horizon rise (how high the soft surface lifts at the back) */
  horizonLift: number;
}

const MOODS: Record<string, StageMoodProfile> = {
  "aqua-clean": {
    key: "aqua-clean", labelAr: "نقاء مائي", labelEn: "Clean / Fluid",
    floorGlow: 0.16, reflection: 0.10, atmosphereBlur: 26, haze: 0.06, shadow: 0.7, horizonLift: 14,
  },
  "clinical-lavender": {
    key: "clinical-lavender", labelAr: "فخامة سريرية", labelEn: "Clinical Luxury",
    floorGlow: 0.13, reflection: 0.08, atmosphereBlur: 32, haze: 0.07, shadow: 0.6, horizonLift: 18,
  },
  "radiant-peach": {
    key: "radiant-peach", labelAr: "إشراق دافئ", labelEn: "Radiant / Energetic",
    floorGlow: 0.20, reflection: 0.12, atmosphereBlur: 22, haze: 0.05, shadow: 0.75, horizonLift: 12,
  },
  "silk-water": {
    key: "silk-water", labelAr: "حرير مائي", labelEn: "Silk / Reflective",
    floorGlow: 0.14, reflection: 0.16, atmosphereBlur: 28, haze: 0.08, shadow: 0.55, horizonLift: 20,
  },
  "gloss-flow": {
    key: "gloss-flow", labelAr: "لمعان انسيابي", labelEn: "Gloss / Polished",
    floorGlow: 0.15, reflection: 0.13, atmosphereBlur: 24, haze: 0.05, shadow: 0.65, horizonLift: 14,
  },
  champagne: {
    key: "champagne", labelAr: "احتفال فاخر", labelEn: "Celebration Premium",
    floorGlow: 0.18, reflection: 0.11, atmosphereBlur: 30, haze: 0.06, shadow: 0.6, horizonLift: 16,
  },
  "layered-ritual": {
    key: "layered-ritual", labelAr: "طقس متكامل", labelEn: "Layered Ritual",
    floorGlow: 0.14, reflection: 0.09, atmosphereBlur: 30, haze: 0.07, shadow: 0.6, horizonLift: 22,
  },
  default: {
    key: "default", labelAr: "كلاسيكي", labelEn: "Signature",
    floorGlow: 0.15, reflection: 0.10, atmosphereBlur: 26, haze: 0.06, shadow: 0.65, horizonLift: 16,
  },
};

/** Kind → default semantic mood mapping. */
const KIND_MOOD: Record<string, string> = {
  routine: "layered-ritual",
  "best-sellers": "champagne",
  brand: "clinical-lavender",
  collection: "silk-water",
  offer: "radiant-peach",
  custom: "default",
};

/** Keyword hints from slide ids/labels → mood. */
const KEYWORD_MOOD: Array<[RegExp, string]> = [
  [/eye|aqua|عين|عيون/i, "aqua-clean"],
  [/dermo|lavender|purple|تجميل|بنفسج/i, "clinical-lavender"],
  [/vitamin|peach|c\b|فيتامين|خوخي/i, "radiant-peach"],
  [/hydrat|water|silk|ترطيب|ماء/i, "silk-water"],
  [/hair|shampoo|شعر/i, "gloss-flow"],
  [/gift|champagne|هدية|هدايا/i, "champagne"],
  [/routine|routin|روتين/i, "layered-ritual"],
];

/** Perceptual color temperature of a hex accent → warm or cool family. */
function accentFamily(hex: string): "warm" | "cool" | "neutral" {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return "neutral";
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  if (Math.abs(r - b) < 24 && Math.abs(g - b) < 24) return "neutral";
  return r > b ? "warm" : "cool";
}

/**
 * Resolve the semantic mood for a slide. Priority:
 * explicit stageMood → kind mapping → keyword hints → accent temperature fallback.
 */
export function resolveStageMood(slide: {
  stageMood?: string;
  kind?: string;
  id?: string;
  headlineEn?: string;
  eyebrowEn?: string;
  accent?: string;
}): StageMoodProfile {
  if (slide.stageMood && MOODS[slide.stageMood]) return MOODS[slide.stageMood];
  if (slide.kind && KIND_MOOD[slide.kind]) return MOODS[KIND_MOOD[slide.kind]];
  const text = `${slide.id ?? ""} ${slide.headlineEn ?? ""} ${slide.eyebrowEn ?? ""}`;
  for (const [re, mood] of KEYWORD_MOOD) {
    if (re.test(text)) return MOODS[mood];
  }
  const fam = accentFamily(slide.accent ?? "");
  if (fam === "cool") return MOODS["aqua-clean"];
  if (fam === "warm") return MOODS["radiant-peach"];
  return MOODS.default;
}

export const STAGE_MOOD_OPTIONS = Object.values(MOODS);
