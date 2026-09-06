import { skinTypeLabels, skinConcernLabels } from "@/src/data/quiz";
import type { QuizResultRecord } from "@/src/data/quiz-results";
import type { ProductSummary } from "@/src/types/product";
import { WHATSAPP_NUMBER } from "@/src/data/siteConfig";

export const QUIZ_WHATSAPP_NUMBER = WHATSAPP_NUMBER;

type QuizMessageInput = {
  record: Pick<QuizResultRecord, "id" | "name">;
  result: QuizResultRecord["result"];
  recommendedProducts: ProductSummary[];
  recommendedRoutines: { nameAr: string }[];
};

export function buildQuizWhatsAppMessage(input: QuizMessageInput): string {
  const { record, result, recommendedProducts, recommendedRoutines } = input;
  const lines: string[] = [];

  const name = record.name?.trim();
  if (name) lines.push(`مرحبًا، اسمي ${name} 🌸`);
  else lines.push("مرحبًا Luminous Derma 🌸");

  lines.push("أكملت اختبار تشخيص البشرة وأرغب بمعرفة نتيجتي والتوصيات المناسبة لي.");

  const skin = result.skinTypes
    .map((t) => skinTypeLabels[t]?.ar ?? t)
    .filter(Boolean)
    .join("، ");
  const concerns = result.skinConcerns
    .map((c) => skinConcernLabels[c]?.ar ?? c)
    .filter(Boolean)
    .join("، ");

  lines.push("");
  lines.push(`معرّف النتيجة: ${record.id}`);
  lines.push(`• نوع البشرة: ${skin || "—"}`);
  lines.push(`• الاهتمامات: ${concerns || "—"}`);

  if (recommendedRoutines.length > 0) {
    lines.push("");
    lines.push("الروتينات المقترحة:");
    recommendedRoutines.forEach((r) => lines.push(`▪ ${r.nameAr}`));
  }
  if (recommendedProducts.length > 0) {
    lines.push("");
    lines.push("المنتجات المقترحة:");
    recommendedProducts.slice(0, 5).forEach((p) => lines.push(`▪ ${p.name.ar}`));
  }

  lines.push("");
  lines.push("تحبين ترشّحين لي روتينًا مناسبًا حسب نتيجتي وميزانيتي؟ 🌸");
  lines.push("شكرًا لكم 🤍");

  return encodeURIComponent(lines.join("\n"));
}
