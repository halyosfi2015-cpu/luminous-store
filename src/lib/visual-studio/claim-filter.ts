/**
 * PART 2 / P1 — Claim safety filter. Pure module.
 * Blocks unsupported claims BEFORE copy reaches preview/publish.
 */
import type { TemplateBlocker } from "./templates";
import type { FactsManifest } from "./verified-facts";

export interface ClaimFinding {
  blocked: boolean;
  reasonAr: string | null;
}

/** Forbidden claim patterns (Arabic + English) — never generatable. */
const FORBIDDEN_PATTERNS: { re: RegExp; reasonAr: string }[] = [
  { re: /يعالج|تشفي|شفاء|cure|heals|treats acne|يقضي على (الحبوب|الأكزيما)/, reasonAr: "ادعاء علاجي محظور" },
  { re: /مضمون(ة)? 100%|نتيجة مضمونة|guaranteed results?/, reasonAr: "ضمان نتائج محظور" },
  { re: /الأول في اليمن|الأفضل في اليمن|#1|best in yemen/i, reasonAr: "ادعاء تفوق غير موثق" },
  { re: /طبيب (يوصي|ينصح)|موصى من (الأطباء|الخبراء)|doctor recommended|expert recommended/i, reasonAr: "توصية طبية غير موثقة" },
  { re: /آخر فرصة|فرصة أخيرة|last chance/i, reasonAr: "استعجال مفتعل" },
  { re: /قال(ت)? عميل|تجربة عميلة|مراجعة عميل/i, reasonAr: "شهادة عميل تحتاج مراجعة موثقة" },
];

export function scanTextForForbiddenClaims(text: string): ClaimFinding {
  for (const p of FORBIDDEN_PATTERNS) {
    if (p.re.test(text)) return { blocked: true, reasonAr: p.reasonAr };
  }
  return { blocked: false, reasonAr: null };
}

/** Template data-gates: refuse generation without supporting evidence. */
export function checkBlockers(blockers: TemplateBlocker[] | undefined, manifest: FactsManifest): ClaimFinding {
  if (!blockers || blockers.length === 0) return { blocked: false, reasonAr: null };
  const f = manifest.facts as unknown as Record<string, unknown>;
  for (const b of blockers) {
    switch (b.requires) {
      case "live-offer": {
        const hasOffer =
          (typeof f.discount === "number" && (f.discount as number) > 0) ||
          (typeof f.savingsPercent === "number" && (f.savingsPercent as number) > 0) ||
          ((f.originalPrice as number) > (f.price as number) && typeof f.price === "number");
        if (!hasOffer) return { blocked: true, reasonAr: b.messageAr };
        break;
      }
      case "real-deadline": {
        const hasDeadline = !!(f.endsAt || (typeof f.stock === "number" && (f.stock as number) <= 10 && (f.stock as number) >= 0));
        if (!hasDeadline) return { blocked: true, reasonAr: b.messageAr };
        break;
      }
      case "verified-rating": {
        if (!(typeof f.rating === "number" && (f.reviewCount as number) > 0) && !f.isBestSeller) {
          return { blocked: true, reasonAr: b.messageAr };
        }
        break;
      }
      case "verified-review": {
        if (manifest.missing.includes("rating")) return { blocked: true, reasonAr: b.messageAr };
        break;
      }
      case "is-new": {
        if (!f.isNew) return { blocked: true, reasonAr: b.messageAr };
        break;
      }
      case "routine-steps": {
        if (!Array.isArray(f.steps) || (f.steps as unknown[]).length === 0) {
          return { blocked: true, reasonAr: b.messageAr };
        }
        break;
      }
      case "bundle-contents": {
        if (!Array.isArray(f.products) || (f.products as unknown[]).length === 0) {
          return { blocked: true, reasonAr: b.messageAr };
        }
        break;
      }
      case "two-products": {
        if (!Array.isArray(f.products) || (f.products as unknown[]).length < 2) {
          const ids = f.productIds as unknown;
          if (!Array.isArray(ids) || ids.length < 2) return { blocked: true, reasonAr: b.messageAr };
        }
        break;
      }
      case "ingredient-list": {
        if (!Array.isArray(f.ingredients) || (f.ingredients as unknown[]).length === 0) {
          return { blocked: true, reasonAr: b.messageAr };
        }
        break;
      }
    }
  }
  return { blocked: false, reasonAr: null };
}
