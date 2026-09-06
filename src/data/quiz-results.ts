import type { SkinType, SkinConcern } from "@/src/types/product";

export type QuizLeadStatus =
  | "new"
  | "awaiting_review"
  | "contacted"
  | "confirmed"
  | "closed"
  | "no_answer";

export type QuizResultRecord = {
  id: string;
  date: string;
  name?: string;
  phone: string;
  answers: Record<string, string[]>;
  result: { skinTypes: SkinType[]; skinConcerns: SkinConcern[] };
  score: number;
  recommendedProducts: string[];
  recommendedRoutines: string[];
  recommendedExpertId?: string;
  source: string;
  status: QuizLeadStatus;
  lastContact?: string;
  notes?: string;
  archived?: boolean;
  whatsappSent?: boolean;
};

export const QUIZ_RESULTS_STORAGE_KEY = "luminous-quiz-results";
export const QUIZ_SEQ_KEY = "luminous-quiz-seq";

export function generateQuizId(date = new Date()): string {
  const year = date.getFullYear();
  let seq = 1;
  if (typeof window !== "undefined") {
    try {
      seq = Number(window.localStorage.getItem(QUIZ_SEQ_KEY) || "1");
      window.localStorage.setItem(QUIZ_SEQ_KEY, String(seq + 1));
    } catch {}
  }
  return `QUIZ-${year}-${String(seq).padStart(6, "0")}`;
}

export function listQuizResults(): QuizResultRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(QUIZ_RESULTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as QuizResultRecord[];
    }
  } catch {}
  return [];
}

export function listActiveQuizResults(): QuizResultRecord[] {
  return listQuizResults().filter((r) => !r.archived);
}

export function listArchivedQuizResults(): QuizResultRecord[] {
  return listQuizResults().filter((r) => r.archived);
}

export function saveQuizResult(record: QuizResultRecord) {
  try {
    const all = listQuizResults();
    const idx = all.findIndex((r) => r.id === record.id);
    if (idx >= 0) all[idx] = record;
    else all.unshift(record);
    window.localStorage.setItem(QUIZ_RESULTS_STORAGE_KEY, JSON.stringify(all));
  } catch {}
}

export function updateQuizResult(id: string, patch: Partial<QuizResultRecord>) {
  const all = listQuizResults();
  const idx = all.findIndex((r) => r.id === id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...patch };
    try {
      window.localStorage.setItem(QUIZ_RESULTS_STORAGE_KEY, JSON.stringify(all));
    } catch {}
  }
}

export function deleteQuizResult(id: string) {
  const all = listQuizResults().filter((r) => r.id !== id);
  try {
    window.localStorage.setItem(QUIZ_RESULTS_STORAGE_KEY, JSON.stringify(all));
  } catch {}
}

export function archiveQuizResult(id: string) {
  updateQuizResult(id, { archived: true });
}

export function unarchiveQuizResult(id: string) {
  updateQuizResult(id, { archived: false });
}

export function exportQuizResultsCSV(records: QuizResultRecord[]): string {
  const headers = [
    "المعرّف", "التاريخ", "الاسم", "الهاتف", "نوع البشرة", "الاهتمامات",
    "الدرجة", "الحالة", "م Архив", "ملاحظات",
  ];
  const rows = records.map((r) => [
    r.id,
    new Date(r.date).toLocaleDateString("ar-YE"),
    r.name || "",
    r.phone,
    r.result.skinTypes.join(", "),
    r.result.skinConcerns.join(", "),
    String(r.score),
    r.status,
    r.archived ? "نعم" : "لا",
    r.notes || "",
  ]);
  const bom = "\uFEFF";
  return bom + [headers.join(","), ...rows.map((row) => row.map((c) => `"${c}"`).join(","))].join("\n");
}

export function downloadQuizResultsCSV(records: QuizResultRecord[]) {
  const csv = exportQuizResultsCSV(records);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `skin-analysis-results-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
