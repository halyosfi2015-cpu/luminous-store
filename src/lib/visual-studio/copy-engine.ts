/**
 * PART 2 / P3 — Arabic-first copy engine + AI template recommendation.
 * Pure module. Deterministic offline core (self-engine equivalent) that uses
 * ONLY verified facts; an OpenAI enhancement may rewrite style server-side
 * but can never add facts (enforced by claim-filter rescan).
 */
import type { VisualPlatform, VisualSourceType, VisualTemplateDef } from "./templates";
import { TEMPLATE_CATALOG } from "./templates";
import type { FactsManifest, VerifiedProductFacts } from "./verified-facts";
import { checkBlockers, scanTextForForbiddenClaims } from "./claim-filter";

export interface CopyCheck {
  label: string;
}
export interface CopyFaq {
  q: string;
  a: string;
}
export interface CopyBranch {
  label: string;
  target: string;
}

export interface GeneratedCopy {
  hook: string;
  headline: string;
  subheadline: string;
  body: string | null;
  benefits: string[];
  cta: string;
  caption: string;
  hashtags: string[];
  engine: "self" | "openai";
  warningsAr: string[];
  /** Derived ONLY from verified facts (benefits/usage/concern) — never invented. */
  checks: string[];
  faqs: CopyFaq[];
  branches: CopyBranch[];
  /** True when checks/faqs/branches fell back to generic (data absent). */
  degradedMode: boolean;
  /** Path B only: structure chosen by the freeform concept. */
  freeformStructure?: string;
  /** Path B only: the AI-authored idea + full layout spec (validated server-side). */
  angleAr?: string;
  freeformSpec?: import("./freeform-spec").FreeformSpec | null;
}

export interface Recommendation {
  templateId: string;
  reasonAr: string;
  score: number;
}

function firstProduct(manifest: FactsManifest): VerifiedProductFacts | null {
  const f = manifest.facts as unknown as Record<string, unknown>;
  if ((manifest.facts as { kind: string }).kind === "product") {
    return manifest.facts as unknown as VerifiedProductFacts;
  }
  const products = f.products as VerifiedProductFacts[] | undefined;
  return products && products.length > 0 ? products[0] : null;
}

function displayName(manifest: FactsManifest): string {
  const f = manifest.facts as unknown as Record<string, unknown>;
  return String(f.nameAr ?? f.titleAr ?? "منتج لومينوس");
}

const INTENT_LINES: Record<string, { hook: string[]; sub: string[]; body: string[] }> = {
  hydration: {
    hook: ["ترطيب يدوم طوال اليوم؟", "بشرتك عطشانة؟", "جفاف البشرة؟ الحل أبسط مما تظنين"],
    sub: ["ترطيب عميق بملمس خفيف", "يحافظ على رطوبة بشرتك طوال اليوم", "لبشرة ناعمة ومريحة"],
    body: ["صُمم ليمنح بشرتك ترطيباً يومياً بملمس خفيف سريع الامتصاص."],
  },
  hair: {
    hook: ["شعر أقوى يبدأ من العناية الصحيحة", "تقصف وهيشان؟", "سر الشعر الصحي بخطوة واحدة"],
    sub: ["عناية مركزة لشعر أقوى", "يمنح شعرك مظهراً صحياً وحيوية", "لشعر ناعم سهل التصفيف"],
    body: ["تركيبة مخصصة للعناية بالشعر تمنحه مظهراً صحياً وحيوية يومية."],
  },
  protection: {
    hook: ["الحماية اليومية ليست رفاهية", "شمس كل يوم = حماية كل يوم", "خط الدفاع الأول لبشرتك"],
    sub: ["حماية يومية خفيفة", "رفيقك اليومي ضد أشعة الشمس", "لبشرة محمية ومشرقة"],
    body: ["حماية يومية بملمس خفيف تناسب روتينك الصباحي."],
  },
  fragrance: {
    hook: ["حضور لا يُنسى", "عطر يحكي عنك", "بصمتك العطرية الخاصة"],
    sub: ["تجربة عطرية مميزة", "لإطلالة تترك أثراً", "فخامة تليق بك"],
    body: ["تجربة عطرية مختارة بعناية لتمنحك حضوراً مميزاً."],
  },
  makeup: {
    hook: ["إطلالة تليق بك", "جمال يبرز ملامحك", "لمستك الأخيرة للكمال"],
    sub: ["لإطلالة مشرقة وثابتة", "يبرز جمالك الطبيعي", "ثبات ولون غني"],
    body: ["صُمم ليمنحك إطلالة مشرقة تدوم معك طوال اليوم."],
  },
  treatment: {
    hook: ["عناية مركزة لبشرتك", "خطوة واحدة تصنع الفرق", "سر البشرة المشرقة"],
    sub: ["تركيبة مركزة للعناية اليومية", "لبشرة تبدو أكثر إشراقاً", "ضمن روتينك اليومي"],
    body: ["تركيبة مركزة تُستخدم ضمن روتينك اليومي لبشرة تبدو أكثر إشراقاً."],
  },
  cleansing: {
    hook: ["نظافة تبدأ منها كل عناية", "بشرة نظيفة = بشرة سعيدة", "أول خطوة وأهم خطوة"],
    sub: ["تنظيف لطيف وفعال", "يزيل الشوائب بلطف", "لبشرة منتعشة ونظيفة"],
    body: ["تنظيف لطيف يزيل الشوائب اليومية دون أن يجرد بشرتك."],
  },
  routine: {
    hook: ["روتينك الكامل في مكان واحد", "الاستمرارية سر النتيجة", "خطوات مرتبة لنتيجة أوضح"],
    sub: ["خطوات مرتبة لعناية متكاملة", "كل خطوة تكمل الأخرى", "روتين مصمم لاحتياجك"],
    body: ["روتين متكامل بخطوات مرتبة: كل منتج يكمل الآخر لنتيجة أوضح مع الاستمرار."],
  },
  offer: {
    hook: ["قيمة حقيقية تستحقها بشرتك", "عرض يستحق التجربة", "وفّري مع باقة مختارة"],
    sub: ["قيمة حقيقية بسعر أوفر", "مجموعة مختارة بعناية", "كل ما تحتاجينه معاً"],
    body: ["مجموعة مختارة بعناية بسعر أوفر من شراء القطع منفردة."],
  },
  care: {
    hook: ["عناية تستحقها بشرتك", "اختيار موثوق لروتينك", "جودة تشعرين بها"],
    sub: ["مختار بعناية لروتينك", "جودة تستحق التجربة", "ضمن تشكيلة لومينوس الموثوقة"],
    body: ["منتج مختار بعناية ضمن تشكيلة لومينوس ديرما."],
  },
};

function pick<T>(list: T[], seed: number): T {
  return list[Math.abs(seed) % list.length];
}

function truncateWords(text: string, max: number): string {
  const words = text.split(/\s+/).filter(Boolean);
  return words.length <= max ? text : words.slice(0, max).join(" ");
}

/**
 * Deterministic copy from verified facts only.
 * `seed` rotates phrasing so consecutive generations vary (with anti-repeat).
 */
export function generateCopy(
  manifest: FactsManifest,
  template: VisualTemplateDef,
  opts: { seed?: number; platform?: VisualPlatform } = {},
): GeneratedCopy {
  const seed = opts.seed ?? 0;
  const lines = INTENT_LINES[manifest.intent] ?? INTENT_LINES.care;
  const name = displayName(manifest);
  const product = firstProduct(manifest);
  const warningsAr: string[] = [];
  for (const m of manifest.missing) {
    if (m === "benefits") warningsAr.push("لا توجد فوائد موثقة — تجنبنا اختلاقها");
    if (m === "price") warningsAr.push("لا يوجد سعر موثق — أخفينا السعر");
    if (m === "rating") warningsAr.push("لا يوجد تقييم موثق — تجنبنا ادعاءه");
    if (m === "ingredients") warningsAr.push("لا توجد مكونات موثقة");
  }

  const hook = template.id === "T04" || template.id === "T12"
    ? pick(lines.hook, seed + 1)
    : pick(lines.hook, seed);
  // Headline leads with the differentiating line (never the long product
  // name — truncation would erase template identity). Name lives in the
  // subheadline/caption and in the visual's dedicated name slot.
  let headline = pick(lines.sub, seed);
  if (template.id === "T21" && product?.discount) headline = `خصم ${product.discount}% لفترة محدودة`;
  if (template.id === "T06" && product?.isBestSeller) headline = `الأكثر طلباً هذا الأسبوع`;
  if (template.id === "T31" && product && product.ingredients.length > 0) {
    headline = `بقوة ${product.ingredients[0]}`;
  }
  if (template.id === "T12") headline = `هل تحتاجين هذا فعلاً؟`;
  if (template.id === "T04") headline = `اكتشاف جديد يستحق التجربة`;
  headline = truncateWords(headline, template.maxHeadlineWords);

  const subPool = product && product.benefits.length > 0 ? product.benefits : lines.sub;
  const subheadline = truncateWords(
    template.id === "T03" || template.id === "T26"
      ? `${name} — ${pick(subPool, seed)}`
      : `${name} — ${pick(lines.sub, seed + 2)}`,
    Math.max(template.maxSubWords, 12),
  );

  const needsBody = template.requiredSlots?.includes("body") ?? false;
  const body = needsBody
    ? (product && product.usageAr
      ? `طريقة الاستخدام: ${product.usageAr}`
      : pick(lines.body, seed))
    : null;

  const benefits = (product?.benefits ?? []).slice(0, 3);
  const ctaPool = template.ctaOptions.length > 0 ? template.ctaOptions : ["اكتشفيه الآن"];
  const cta = pick(ctaPool, seed);

  const priceLine = product?.price ? `السعر: ${product.price} ر.ي` : null;
  const captionParts = [headline, name, subheadline, body, priceLine, `${cta} عبر لومينوس ديرما`].filter(Boolean);
  const caption = captionParts.join("\n");
  const hashtags = manifest.intent === "offer"
    ? ["#لومينوس_ديرما", "#عروض_الجمال", "#العناية_بالبشرة"]
    : ["#لومينوس_ديرما", "#العناية_بالبشرة", "#جمالك"];

  // Derived interactive content — verified data only, generic fallback flagged.
  const benefits3 = (product?.benefits ?? []).slice(0, 3);
  const checks = benefits3.length > 0
    ? benefits3.map((b) => `أحتاج: ${b}`)
    : ["بشرتك تحتاج عناية يومية", "تبحثين عن حل بسيط", "تريدين نتيجة واضحة"];
  const faqs: CopyFaq[] = [];
  if (product?.usageAr) faqs.push({ q: "كيف أستخدمه؟", a: product.usageAr });
  if (benefits3.length > 0) faqs.push({ q: "ما فوائده؟", a: benefits3.join("، ") });
  faqs.push({ q: "هل يناسبني؟", a: "اختاري حسب نوع بشرتك واحتياجك — واستشيري فريق لومينوس عند الحاجة" });
  const concernWord = manifest.intent === "hair" ? "شعرك" : manifest.intent === "protection" ? "حمايتك اليومية" : "بشرتك";
  const branches: CopyBranch[] = [
    { label: `تحتاجين عناية مركزة لـ${concernWord}؟`, target: name },
    { label: "تبدئين روتيناً جديداً؟", target: `ابدئي بـ${name} ثم أكملي روتينك` },
    { label: "غير متأكدة؟", target: "استشيري فريق لومينوس قبل الاختيار" },
  ];
  const degradedMode = benefits3.length === 0 && !product?.usageAr;

  const out: GeneratedCopy = { hook, headline, subheadline, body, benefits, cta, caption, hashtags, engine: "self", warningsAr, checks, faqs: faqs.slice(0, 3), branches, degradedMode };
  // Final safety net: rescan everything we produced.
  const scan = scanTextForForbiddenClaims([hook, headline, subheadline, body ?? "", caption].join(" "));
  if (scan.blocked) {
    out.warningsAr.push(`تم رصد صياغة محظورة وإيقافها: ${scan.reasonAr}`);
    out.headline = name;
    out.hook = pick(lines.hook, seed);
  }
  return out;
}

export interface RecommendContext {
  sourceType: VisualSourceType;
  objective: string;
  platform: VisualPlatform;
  productCount: number;
  penalties?: Record<string, number>; // templateId → anti-repeat penalty
}

/* ------------------------------------------------------------------ */
/* PATH B — freeform caps only. Idea + layout are authored by the LLM   */
/* (see freeform-spec.ts); the self engine never simulates creativity. */
/* ------------------------------------------------------------------ */

/** Internal copy caps for freeform (NOT part of the 35-template catalog). */
export const FREEFORM_DEF = {
  id: "FREEFORM",
  maxHeadlineWords: 8,
  maxSubWords: 14,
  requiredSlots: [] as string[],
  ctaOptions: ["اكتشفيه الآن", "تسوّقي الآن", "شاهدي التفاصيل", "اختاري ما يناسبك"],
} as const;

/** Top-3 template recommendations with reasons grounded in real data. */
export function recommendTemplates(
  manifest: FactsManifest,
  templatePool: VisualTemplateDef[],
  ctx: RecommendContext,
): Recommendation[] {
  const f = manifest.facts as unknown as Record<string, unknown>;
  const scored = templatePool
    .filter((t) => t.sourceTypes.includes(ctx.sourceType) && t.platforms.includes(ctx.platform))
    .filter((t) => ctx.productCount >= t.productCount.min && ctx.productCount <= t.productCount.max)
    .map((t) => {
      let score = 50;
      const reasons: string[] = [];
      if (t.objective === ctx.objective) { score += 25; reasons.push("يطابق الهدف التسويقي المطلوب"); }
      const gate = checkBlockers(t.blockers, manifest);
      if (gate.blocked) { score -= 60; reasons.push(`غير متاح حالياً: ${gate.reasonAr}`); }
      else if (t.blockers && t.blockers.length > 0) { score += 10; reasons.push("البيانات الداعمة متوفرة"); }
      // Data-grounded boosts with real-data reasons.
      if (manifest.sourceType === "product") {
        const p = manifest.facts as unknown as VerifiedProductFacts;
        if (t.id === "T03" && p.benefits.length >= 2) { score += 12; reasons.push(`يوجد ${p.benefits.length} فوائد موثقة للشرائح`); }
        if (t.id === "T31" && p.ingredients.length > 0) { score += 12; reasons.push(`يوجد ${p.ingredients.length} مكونات موثقة`); }
        if (t.id === "T06" && p.isBestSeller) { score += 15; reasons.push("المنتج مصنف الأكثر مبيعاً فعلاً"); }
        if (t.id === "T06" && p.rating) { score += 10; reasons.push(`تقييم موثق ${p.rating} من ${p.reviewCount} مراجعة`); }
        if (t.id === "T05" && p.isNew) { score += 15; reasons.push("المنتج جديد فعلاً في البيانات"); }
        if ((t.id === "T21" || t.id === "T26" || t.id === "T27") && (p.discount || (p.originalPrice ?? 0) > (p.price ?? 0))) { score += 15; reasons.push("يوجد عرض سعري حقيقي في البيانات"); }
        if (t.id === "T01") { score += 5; reasons.push("خيار آمن: يعمل بأي منتج له صورة"); }
      }
      if (manifest.sourceType === "routine" && ["T14", "T15", "T16", "T17", "T19"].includes(t.id)) {
        const steps = ((f.steps as unknown[]) ?? []).length;
        score += 12; reasons.push(`الروتين يحتوي ${steps} خطوات حقيقية`);
      }
      if (manifest.sourceType === "bundle" && ["T22", "T23"].includes(t.id)) {
        score += 15; reasons.push("الباقة بمحتويات وأسعار حقيقية");
      }
      const penalty = ctx.penalties?.[t.id] ?? 0;
      if (penalty > 0) { score -= penalty; reasons.push(`تم استخدامه مؤخراً (خصم ${penalty})`); }
      if (reasons.length === 0) reasons.push("متوافق مع المصدر والمنصة");
      return { templateId: t.id, reasonAr: reasons.join("؛ "), score };
    })
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, 3);
}
