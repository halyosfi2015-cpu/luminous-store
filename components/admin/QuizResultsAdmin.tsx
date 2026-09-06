"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Search,
  Phone,
  MessageCircle,
  CalendarDays,
  User,
  Droplets,
  RefreshCw,
  ChevronLeft,
  Trash2,
  Archive,
  ArchiveRestore,
  Download,
  Stethoscope,
  FileText,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { useAdminGuard } from "@/src/admin/useAdminGuard";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import {
  listQuizResults,
  updateQuizResult,
  deleteQuizResult,
  archiveQuizResult,
  unarchiveQuizResult,
  downloadQuizResultsCSV,
  type QuizResultRecord,
  type QuizLeadStatus,
} from "@/src/data/quiz-results";
import { skinTypeLabels, skinConcernLabels } from "@/src/data/quiz";
import { publishedProductSummaries as products } from "@/src/data/product-summaries";
import { experts } from "@/src/data/experts";

const STATUS_LABELS: Record<QuizLeadStatus, { label: string; variant: "primary" | "success" | "warning" | "error" | "accent" | "neutral" }> = {
  new: { label: "جديد", variant: "warning" },
  awaiting_review: { label: "بانتظار المراجعة", variant: "warning" },
  contacted: { label: "تم التواصل", variant: "primary" },
  confirmed: { label: "مؤكد", variant: "success" },
  closed: { label: "مغلق", variant: "neutral" },
  no_answer: { label: "لا رد", variant: "error" },
};

function statusOptions(): QuizLeadStatus[] {
  return ["new", "awaiting_review", "contacted", "confirmed", "no_answer", "closed"];
}

export default function QuizResultsAdmin() {
  const guard = useAdminGuard("quiz_results");
  const { toast } = useAdminToast();
  const [rows, setRows] = useState<QuizResultRecord[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    setRows(listQuizResults());
  }, [reloadKey]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (showArchived ? !r.archived : r.archived) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      const skin = r.result.skinTypes.map((t) => skinTypeLabels[t]?.ar ?? t).join(" ");
      const concerns = r.result.skinConcerns.map((c) => skinConcernLabels[c]?.ar ?? c).join(" ");
      return [r.id, r.name, r.phone, skin, concerns].filter(Boolean).join(" ").toLowerCase().includes(q);
    });
  }, [rows, query, statusFilter, showArchived]);

  const stats = useMemo(() => {
    const active = rows.filter((r) => !r.archived);
    return {
      total: active.length,
      new: active.filter((r) => r.status === "new").length,
      contacted: active.filter((r) => r.status === "contacted").length,
      confirmed: active.filter((r) => r.status === "confirmed").length,
      archived: rows.filter((r) => r.archived).length,
    };
  }, [rows]);

  if (!guard.allowed) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-error">لا تملك صلاحية</h1>
        <p className="mt-2 text-muted">دورك الحالي لا يملك صلاحية الوصول إلى نتائج التشخيص.</p>
      </div>
    );
  }

  const setStatus = (id: string, status: QuizLeadStatus) => {
    updateQuizResult(id, { status, lastContact: new Date().toISOString() });
    setRows(listQuizResults());
    toast("تم تحديث حالة العميل", "success");
  };

  const handleDelete = (id: string) => {
    deleteQuizResult(id);
    setRows(listQuizResults());
    setConfirmDelete(null);
    toast("تم حذف النتيجة", "success");
  };

  const handleArchive = (id: string) => {
    archiveQuizResult(id);
    setRows(listQuizResults());
    toast("تم أرشفة النتيجة", "success");
  };

  const handleUnarchive = (id: string) => {
    unarchiveQuizResult(id);
    setRows(listQuizResults());
    toast("تم إلغاء الأرشفة", "success");
  };

  const handleExport = () => {
    const dataToExport = rows.filter((r) => (showArchived ? r.archived : !r.archived));
    downloadQuizResultsCSV(dataToExport);
    toast("تم تصدير الملف", "success");
  };

  const productName = (pid: string) => products.find((p) => p.id === pid)?.name.ar ?? pid;
  const expertName = (eid?: string) => {
    if (!eid) return null;
    return experts.find((e) => e.id === eid)?.nameAr ?? null;
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "الإجمالي", value: stats.total, color: "text-foreground" },
          { label: "جديد", value: stats.new, color: "text-yellow-600" },
          { label: "تم التواصل", value: stats.contacted, color: "text-primary" },
          { label: "مؤكد", value: stats.confirmed, color: "text-success" },
          { label: "مؤرشف", value: stats.archived, color: "text-muted" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-3 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      <Card padding="sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-bold text-foreground">
              <Droplets size={18} className="text-primary" />
              نتائج تشخيص البشرة
            </h1>
            <p className="mt-1 text-sm text-muted">
              {showArchived ? "النتائج المؤرشفة" : "العملاء المتوقعون من اختبار تشخيص البشرة"} — {filtered.length} نتيجة
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث بالاسم، الهاتف، أو النتيجة..."
                className="w-full rounded-xl border border-border bg-white pe-3 ps-9 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-72"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
            >
              <option value="all">كل الحالات</option>
              {statusOptions().map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s].label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowArchived(!showArchived)}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                showArchived
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border bg-white text-muted hover:border-primary/30 hover:text-primary"
              }`}
            >
              <Archive size={14} />
              {showArchived ? "النتائج النشطة" : "الأرشيف"}
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium text-muted transition hover:border-primary/30 hover:text-primary"
            >
              <Download className="h-4 w-4" />
              تصدير CSV
            </button>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium text-muted transition hover:border-primary/30 hover:text-primary"
            >
              <RefreshCw className="h-4 w-4" />
              تحديث
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-14 text-center">
            <MessageCircle className="mx-auto mb-3 h-10 w-10 text-muted/30" />
            <p className="text-sm text-muted">
              {rows.length === 0
                ? "لا توجد نتائج تشخيص بعد. عند إكمال الزبائن للاختبار ستظهر النتائج هنا."
                : "لا توجد نتائج مطابقة لبحثك."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-start text-xs text-muted">
                  <th className="whitespace-nowrap px-3 py-3 text-start font-semibold">المعرّف</th>
                  <th className="whitespace-nowrap px-3 py-3 text-start font-semibold">العميل</th>
                  <th className="whitespace-nowrap px-3 py-3 text-start font-semibold">تاريخ الاختبار</th>
                  <th className="whitespace-nowrap px-3 py-3 text-start font-semibold">النتيجة</th>
                  <th className="whitespace-nowrap px-3 py-3 text-start font-semibold">الحالة</th>
                  <th className="whitespace-nowrap px-3 py-3 text-start font-semibold">الخبير</th>
                  <th className="whitespace-nowrap px-3 py-3 text-start font-semibold">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const st = STATUS_LABELS[r.status] ?? STATUS_LABELS.new;
                  const skin = r.result.skinTypes.map((t) => skinTypeLabels[t]?.ar ?? t).join("، ");
                  const concerns = r.result.skinConcerns.map((c) => skinConcernLabels[c]?.ar ?? c).join("، ");
                  const isOpen = expanded === r.id;
                  const expert = expertName(r.recommendedExpertId);
                  return (
                    <FragmentRow
                      key={r.id}
                      record={r}
                      skin={skin}
                      concerns={concerns}
                      statusMeta={st}
                      isOpen={isOpen}
                      expertName={expert}
                      onToggle={() => setExpanded(isOpen ? null : r.id)}
                      onStatus={setStatus}
                      onDelete={handleDelete}
                      onArchive={handleArchive}
                      onUnarchive={handleUnarchive}
                      confirmDelete={confirmDelete}
                      setConfirmDelete={setConfirmDelete}
                      productName={productName}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function FragmentRow({
  record: r,
  skin,
  concerns,
  statusMeta,
  isOpen,
  expertName,
  onToggle,
  onStatus,
  onDelete,
  onArchive,
  onUnarchive,
  confirmDelete,
  setConfirmDelete,
  productName,
}: {
  record: QuizResultRecord;
  skin: string;
  concerns: string;
  statusMeta: { label: string; variant: "primary" | "success" | "warning" | "error" | "accent" | "neutral" };
  isOpen: boolean;
  expertName: string | null;
  onToggle: () => void;
  onStatus: (id: string, status: QuizLeadStatus) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  confirmDelete: string | null;
  setConfirmDelete: (id: string | null) => void;
  productName: (id: string) => string;
}) {
  return (
    <>
      <tr className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted-bg/50">
        <td className="whitespace-nowrap px-3 py-3 align-middle">
          <span dir="ltr" className="font-semibold text-foreground">{r.id}</span>
        </td>
        <td className="whitespace-nowrap px-3 py-3 align-middle">
          <div className="font-medium text-foreground">
            {r.name || <span className="text-muted">عميل مجهول</span>}
          </div>
          {r.phone && (
            <div dir="ltr" className="flex items-center gap-1 text-xs text-muted">
              <Phone className="h-3 w-3" />
              {r.phone}
            </div>
          )}
        </td>
        <td className="whitespace-nowrap px-3 py-3 align-middle text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            {new Date(r.date).toLocaleDateString("ar-YE")}
          </span>
        </td>
        <td className="max-w-[220px] px-3 py-3 align-middle">
          <div className="text-xs font-semibold text-primary">{skin || "—"}</div>
          {concerns && <div className="truncate text-[11px] text-muted">{concerns}</div>}
        </td>
        <td className="whitespace-nowrap px-3 py-3 align-middle">
          <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
        </td>
        <td className="whitespace-nowrap px-3 py-3 align-middle text-xs text-muted">
          {expertName ? (
            <span className="inline-flex items-center gap-1">
              <Stethoscope className="h-3 w-3" />
              {expertName}
            </span>
          ) : "—"}
        </td>
        <td className="whitespace-nowrap px-3 py-3 align-middle">
          <div className="flex items-center gap-1">
            <select
              value={r.status}
              onChange={(e) => onStatus(r.id, e.target.value as QuizLeadStatus)}
              className="rounded-lg border border-border bg-white px-2 py-1 text-xs text-foreground outline-none focus:border-primary"
            >
              {statusOptions().map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s].label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={onToggle}
              className="flex items-center gap-1 text-xs font-medium text-primary transition hover:text-primary-700"
            >
              <ChevronLeft className={`h-3.5 w-3.5 transition-transform ${isOpen ? "-rotate-90" : ""}`} />
              التفاصيل
            </button>
            {r.archived ? (
              <button
                type="button"
                onClick={() => onUnarchive(r.id)}
                className="text-xs text-primary transition hover:text-primary-700"
                title="إلغاء الأرشفة"
              >
                <ArchiveRestore className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onArchive(r.id)}
                className="text-xs text-muted transition hover:text-foreground"
                title="أرشفة"
              >
                <Archive className="h-3.5 w-3.5" />
              </button>
            )}
            {confirmDelete === r.id ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onDelete(r.id)}
                  className="rounded bg-error px-2 py-0.5 text-[10px] font-bold text-white"
                >
                  حذف
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(null)}
                  className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                >
                  إلغاء
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(r.id)}
                className="text-xs text-muted transition hover:text-error"
                title="حذف"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </td>
      </tr>
      {isOpen && (
        <tr className="border-b border-border/40 bg-muted-bg/30">
          <td colSpan={7} className="px-3 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-3.5">
                <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <User className="h-3.5 w-3.5 text-primary" />
                  بيانات العميل
                </h4>
                <dl className="space-y-1 text-xs">
                  <div className="flex justify-between"><dt className="text-muted">الاسم</dt><dd className="font-medium">{r.name || "—"}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">الهاتف</dt><dd dir="ltr" className="font-medium">{r.phone || "—"}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">المصدر</dt><dd>اختبار تشخيص البشرة</dd></div>
                </dl>
              </div>
              <div className="rounded-xl border border-border bg-card p-3.5">
                <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <Droplets className="h-3.5 w-3.5 text-primary" />
                  نتيجة الاختبار
                </h4>
                <dl className="space-y-1 text-xs">
                  <div className="flex justify-between"><dt className="text-muted">نوع البشرة</dt><dd className="font-medium">{skin || "—"}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">الاهتمامات</dt><dd className="max-w-[55%] text-end">{concerns || "—"}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">الدرجة</dt><dd className="font-medium">{r.score}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">واتساب</dt><dd>{r.whatsappSent ? "تم الإرسال" : "لم يُرسل"}</dd></div>
                </dl>
              </div>
              {expertName && (
                <div className="rounded-xl border border-border bg-card p-3.5">
                  <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <Stethoscope className="h-3.5 w-3.5 text-primary" />
                    الخبير المقترح
                  </h4>
                  <p className="text-xs font-medium">{expertName}</p>
                </div>
              )}
              <div className="rounded-xl border border-border bg-card p-3.5 sm:col-span-2">
                <h4 className="mb-2 text-xs font-bold text-foreground">المنتجات المقترحة</h4>
                {r.recommendedProducts.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {r.recommendedProducts.map((pid) => (
                      <span key={pid} className="rounded-pill bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                        {productName(pid)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted">لا توجد منتجات مقترحة محفوظة.</p>
                )}
              </div>
              {r.notes && (
                <div className="rounded-xl border border-border bg-card p-3.5 sm:col-span-2">
                  <h4 className="mb-1 flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    ملاحظات
                  </h4>
                  <p className="text-xs text-muted">{r.notes}</p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
