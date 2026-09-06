"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { FileText, Save, FolderDown, AlertCircle, CheckCircle2, X, Upload, Download } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import { useAdminGuard } from "@/src/admin/useAdminGuard";

/* ------------------------------------------------------------------ */
/* CSV helpers (RFC-4180-ish, UTF-8 BOM safe for Excel/Arabic)          */
/* ------------------------------------------------------------------ */

const IMPORT_FIELDS = [
  "id", "sku", "slug", "nameAr", "nameEn", "descriptionAr", "descriptionEn",
  "brand", "category", "price", "originalPrice", "discount", "stock",
  "status", "gallery", "tags", "isFeatured", "isNew", "availability",
] as const;

function csvEscape(v: unknown): string {
  const s = String(v ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

function toCsv(rows: Record<string, string>[], fields: readonly string[]): string {
  return [
    fields.join(","),
    ...rows.map((row) => fields.map((f) => csvEscape(row[f] ?? "")).join(",")),
  ].join("\r\n");
}

function downloadCsv(rows: Record<string, string>[], fields: readonly string[], filename: string) {
  // UTF-8 BOM so Excel renders Arabic correctly
  const blob = new Blob(["\uFEFF" + toCsv(rows, fields)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Minimal RFC-4180 parser: handles quoted fields, escaped quotes, CRLF. */
function parseCsv(content: string): { headers: string[]; rows: Record<string, string>[] } {
  const text = content.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      if (field.length === 0) inQuotes = true;
      else field += ch;
    } else if (ch === ",") {
      record.push(field); field = "";
    } else if (ch === "\n") {
      record.push(field); records.push(record); record = []; field = "";
    } else field += ch;
  }
  if (field.length > 0 || record.length > 0) { record.push(field); records.push(record); }

  const nonEmpty = records.filter((r) => r.some((c) => c.trim() !== ""));
  if (nonEmpty.length === 0) return { headers: [], rows: [] };
  const headers = nonEmpty[0].map((h) => h.trim());
  const rows = nonEmpty.slice(1).map((cells) => {
    const row: Record<string, string> = {};
    headers.forEach((h, j) => { row[h] = (cells[j] ?? "").trim(); });
    return row;
  });
  return { headers, rows };
}

function validateUpload(file: File): string | null {
  const name = file.name.toLowerCase();
  if (!name.endsWith(".csv")) return "صيغة الملف غير مدعومة — المسموح فقط CSV";
  if (file.size === 0) return "الملف فارغ";
  if (file.size > 10 * 1024 * 1024) return "حجم الملف يتجاوز 10MB";
  return null;
}

/* ------------------------------------------------------------------ */
/* Preview plan types (mirror server response)                          */
/* ------------------------------------------------------------------ */

type FieldError = { field: string; value?: string; reason: string };
type PlanChange = { field: string; from: string; to: string };

type PlanRow =
  | { row: number; op: "new" | "update" | "skip"; sku: string; productId?: string; changes?: PlanChange[]; errors?: never }
  | { row: number; op: "error"; sku: string; errors: FieldError[] };

type ValidateResponse = {
  summary: { total: number; new: number; update: number; skip: number; errors: number };
  blocked: boolean;
  plans: PlanRow[];
};

type ExecuteResponse = {
  added: number; updated: number; skipped: number; failed: number;
  details: { row: number; sku: string; productId?: string; operation: string; error: string }[];
};

const OP_META: Record<PlanRow["op"], { label: string; variant: "success" | "primary" | "neutral" | "error" }> = {
  new: { label: "جديد", variant: "success" },
  update: { label: "تحديث", variant: "primary" },
  skip: { label: "تخطي", variant: "neutral" },
  error: { label: "خطأ", variant: "error" },
};

/* ------------------------------------------------------------------ */
/* Main component                                                       */
/* ------------------------------------------------------------------ */

export default function BulkImportExportAdmin() {
  const { toast } = useAdminToast();
  const { allowed, canEdit } = useAdminGuard("import_export");

  /* import state machine: idle → parsing → validating → preview → importing → result */
  const [phase, setPhase] = useState<"idle" | "parsing" | "validating" | "preview" | "importing" | "result">("idle");
  const [validation, setValidation] = useState<ValidateResponse | null>(null);
  const [pendingRows, setPendingRows] = useState<Record<string, string>[]>([]);
  const [result, setResult] = useState<ExecuteResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* export state */
  const [exportRows, setExportRows] = useState<Record<string, string>[]>([]);
  const [exportLoading, setExportLoading] = useState(true);
  const [exportFilter, setExportFilter] = useState({ category: "", brand: "", status: "" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/products/bulk", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setExportRows(data.rows ?? []);
      } catch {
        if (!cancelled) toast("فشل تحميل بيانات التصدير", "error");
      } finally {
        if (!cancelled) setExportLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = useMemo(() => [...new Set(exportRows.map((p) => p.category).filter(Boolean))].sort(), [exportRows]);
  const brands = useMemo(() => [...new Set(exportRows.map((p) => p.brand).filter(Boolean))].sort(), [exportRows]);
  const statuses = useMemo(() => [...new Set(exportRows.map((p) => p.status).filter(Boolean))].sort(), [exportRows]);

  const filteredExportData = useMemo(
    () =>
      exportRows.filter((p) => {
        if (exportFilter.category && p.category !== exportFilter.category) return false;
        if (exportFilter.brand && p.brand !== exportFilter.brand) return false;
        if (exportFilter.status && p.status !== exportFilter.status) return false;
        return true;
      }),
    [exportRows, exportFilter],
  );

  const hasActiveFilters = exportFilter.category || exportFilter.brand || exportFilter.status;

  if (!allowed) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-error">لا تملك صلاحية</h1>
        <p className="text-muted">دورك الحالي لا يملك صلاحية الوصول إلى مركز الاستيراد/التصدير.</p>
      </div>
    );
  }

  /* ---------------- template ---------------- */
  const handleTemplate = () => {
    const template: Record<string, string>[] = [
      Object.fromEntries(IMPORT_FIELDS.map((f) => [f, ""])),
    ];
    downloadCsv(template, IMPORT_FIELDS, "products-import-template.csv");
  };

  /* ---------------- upload + parse + validate ---------------- */
  const handleFile = async (file: File) => {
    const err = validateUpload(file);
    if (err) { toast(err, "error"); return; }

    setPhase("parsing");
    try {
      const content = await file.text();
      const { headers, rows } = parseCsv(content);

      const requiredHeaders = ["sku"];
      const missing = requiredHeaders.filter((h) => !headers.includes(h));
      if (missing.length > 0) {
        throw new Error(`ترويسة الملف غير صحيحة — الأعمدة المطلوبة مفقودة: ${missing.join(", ")}`);
      }
      const knownCount = headers.filter((h) => (IMPORT_FIELDS as readonly string[]).includes(h)).length;
      if (knownCount === 0) {
        throw new Error("لا يحتوي الملف على أي عمود معروف — استخدم قالب الاستيراد");
      }
      if (rows.length === 0) throw new Error("الملف لا يحتوي على صفوف بيانات");

      setPendingRows(rows);
      setPhase("validating");
      const res = await fetch("/api/admin/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "validate", rows }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      }
      const data: ValidateResponse = await res.json();
      setValidation(data);
      setPhase("preview");
    } catch (e) {
      toast((e as Error).message, "error");
      resetImport();
    }
  };

  const resetImport = () => {
    setPhase("idle");
    setValidation(null);
    setPendingRows([]);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ---------------- execute ---------------- */
  const handleConfirm = async () => {
    if (!validation || validation.blocked || phase !== "preview") return;
    setPhase("importing");
    try {
      const res = await fetch("/api/admin/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "execute", rows: pendingRows }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      }
      const data: ExecuteResponse = await res.json();
      setResult(data);
      setPhase("result");
      toast(
        `تم الاستيراد: أُضيف ${data.added}، حُدّث ${data.updated}، تخطي ${data.skipped}${data.failed ? `، فشل ${data.failed}` : ""}`,
        data.failed > 0 ? "warning" : "success",
      );
    } catch (e) {
      toast((e as Error).message, "error");
      setPhase("preview");
    }
  };

  const busy = phase === "parsing" || phase === "validating" || phase === "importing";
  const PHASE_LABEL: Record<typeof phase, string> = {
    idle: "", parsing: "جارٍ قراءة الملف...", validating: "جارٍ التحقق من البيانات...",
    preview: "", importing: "جارٍ تنفيذ الاستيراد... لا تغلق الصفحة", result: "",
  };

  return (
    <main dir="rtl" className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-bold text-foreground">
          <FileText className="text-primary" size={20} /> الاستيراد والتصدير الكمي
        </h1>
        <p className="mt-1 text-sm text-muted">
          استيراد المنتجات من CSV مع مطابقة SKU ومنع التكرار — تصدير كامل القائمة النشطة
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* ================= Import ================= */}
        <Card padding="md">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
            <Upload className="h-4 w-4 text-primary" /> استيراد منتجات (CSV)
          </h2>
          <p className="mb-3 text-xs text-muted">
            SKU هو المعرف الأساسي للمطابقة. الحقول الفارغة أثناء التحديث لا تمسح القيم الموجودة.
          </p>

          <div className="mb-4 flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleTemplate}>
              <Download className="h-4 w-4" /> تحميل قالب الاستيراد
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={busy}>
              <FileText className="h-4 w-4" /> اختيار ملف CSV
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
          </div>
          <details className="mb-4 text-xs text-muted">
            <summary className="cursor-pointer font-medium">الأعمدة المدعومة</summary>
            <ul className="mt-2 list-inside list-disc space-y-0.5">
              <li><code className="text-primary">sku</code> — مطلوب (مفتاح المطابقة)</li>
              <li><code className="text-primary">nameAr / nameEn</code> — مطلوبان للمنتجات الجديدة</li>
              <li><code className="text-primary">brand / category</code> — مطلوبان للجديد (slug أو اسم)</li>
              <li><code className="text-primary">price</code> — مطلوب للجديد</li>
              <li><code className="text-primary">id, slug, descriptionAr, descriptionEn, originalPrice, discount, stock, status, gallery, tags, isFeatured, isNew</code></li>
              <li><code className="text-primary">availability</code> — hidden / available / out_of_stock (فارغ = لا تغيير عند التحديث، hidden للجديد)</li>
              <li><code className="text-primary">gallery</code> — روابط مفصولة بـ «|» ، <code className="text-primary">tags</code> مفصولة بـ «,»</li>
            </ul>
          </details>

          {busy && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted-bg/40 p-3 text-sm text-muted">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              {PHASE_LABEL[phase]}
            </div>
          )}

          {/* -------- preview -------- */}
          {phase === "preview" && validation && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="font-semibold text-foreground">{validation.summary.total} صف</span>
                <Badge variant="success">جديد: {validation.summary.new}</Badge>
                <Badge variant="primary">تحديث: {validation.summary.update}</Badge>
                <Badge variant="neutral">تخطي: {validation.summary.skip}</Badge>
                <Badge variant="error">أخطاء: {validation.summary.errors}</Badge>
              </div>

              {validation.blocked && (
                <div className="rounded-lg border border-error/20 bg-error/5 p-2 text-xs text-error">
                  ⛔ الملف يحتوي أخطاء حرجة — لن يُنفَّذ أي استيراد حتى إصلاحها.
                </div>
              )}

              <div className="max-h-72 overflow-auto rounded-lg border border-border">
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0 border-b border-border bg-surface-50">
                    <tr>
                      <th className="px-2 py-1.5 text-right font-medium text-muted">#</th>
                      <th className="px-2 py-1.5 text-right font-medium text-muted">SKU</th>
                      <th className="px-2 py-1.5 text-right font-medium text-muted">العملية</th>
                      <th className="px-2 py-1.5 text-right font-medium text-muted">التفاصيل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {validation.plans.slice(0, 100).map((plan) => (
                      <tr key={plan.row} className={plan.op === "error" ? "bg-error/5" : ""}>
                        <td className="px-2 py-1 text-muted">{plan.row}</td>
                        <td className="px-2 py-1 text-muted" dir="ltr">{plan.sku || "—"}</td>
                        <td className="px-2 py-1"><Badge variant={OP_META[plan.op].variant}>{OP_META[plan.op].label}</Badge></td>
                        <td className="px-2 py-1 text-foreground">
                          {plan.op === "update" && plan.changes && (
                            <div className="space-y-0.5">
                              {plan.changes.slice(0, 4).map((c, i) => (
                                <div key={i} className="truncate">
                                  <span className="font-medium">{c.field}:</span>{" "}
                                  <span className="text-muted line-through">{c.from || "(فارغ)"}</span>
                                  {" → "}
                                  <span className="text-primary">{c.to || "(فارغ)"}</span>
                                </div>
                              ))}
                              {plan.changes.length > 4 && (
                                <div className="text-muted">+ {plan.changes.length - 4} تغييرات أخرى</div>
                              )}
                            </div>
                          )}
                          {plan.op === "new" && <span className="text-green-600">سيتم إنشاء منتج جديد</span>}
                          {plan.op === "skip" && <span className="text-muted">لا تغييرات — سيتم التخطي</span>}
                          {plan.op === "error" && (
                            <div className="space-y-0.5">
                              {plan.errors.map((e, i) => (
                                <div key={i} className="text-error">
                                  <span className="font-medium">{e.field}</span>
                                  {e.value ? <span dir="ltr"> ({e.value})</span> : null}
                                  : {e.reason}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {validation.plans.length > 100 && (
                  <p className="py-2 text-center text-[10px] text-muted">+ {validation.plans.length - 100} صف إضافي</p>
                )}
              </div>

              {!canEdit && (
                <div className="rounded-lg bg-warning/10 p-2 text-xs text-yellow-700">
                  دورك يسمح بالعرض فقط — لا تملك صلاحية التنفيذ.
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="primary"
                  onClick={handleConfirm}
                  disabled={busy || validation.blocked || !canEdit}
                >
                  <Save className="h-4 w-4" />
                  {busy ? "جارٍ التنفيذ..." : `تأكيد الاستيراد (${validation.summary.new + validation.summary.update} عملية)`}
                </Button>
                <Button variant="outline" onClick={resetImport}>إلغاء</Button>
              </div>
            </div>
          )}

          {/* -------- result report -------- */}
          {phase === "result" && result && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-muted-bg/30 p-3">
                <p className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
                  <CheckCircle2 className={`h-4 w-4 ${result.failed ? "text-yellow-600" : "text-green-600"}`} />
                  {result.failed ? "اكتمل جزئيًا" : "تم الاستيراد بنجاح"}
                </p>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div><div className="text-lg font-bold text-green-600">{result.added}</div>أُضيف</div>
                  <div><div className="text-lg font-bold text-primary">{result.updated}</div>حُدّث</div>
                  <div><div className="text-lg font-bold text-muted">{result.skipped}</div>تخطي</div>
                  <div><div className="text-lg font-bold text-error">{result.failed}</div>فشل</div>
                </div>
              </div>
              {result.details.length > 0 && (
                <div className="max-h-40 overflow-auto rounded-lg border border-error/20 bg-error/5 p-2 text-[11px]">
                  {result.details.slice(0, 20).map((d, i) => (
                    <p key={i} className="text-error/90">
                      صف {d.row} ({d.sku || "—"}): {d.error}
                    </p>
                  ))}
                  {result.details.length > 20 && <p className="mt-1 text-muted">+ {result.details.length - 20} أخطاء أخرى</p>}
                </div>
              )}
              <p className="text-[10px] text-muted">
                ملاحظة: الكتابة تتم صفًا بصف (atomic لكل صف) — راجع التقرير لأي فشل جزئي. قائمة المنتجات ستظهر محدثة تلقائيًا عند العودة إليها.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => window.location.assign("/admin/products")}>
                  العودة إلى قائمة المنتجات
                </Button>
                <Button variant="ghost" onClick={resetImport}>استيراد ملف آخر</Button>
              </div>
            </div>
          )}
        </Card>

        {/* ================= Export ================= */}
        <Card padding="md">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
            <FolderDown className="h-4 w-4 text-primary" /> تصدير منتجات (CSV)
          </h2>
          <p className="mb-3 text-xs text-muted">
            النطاق: جميع المنتجات النشطة في قاعدة البيانات ({exportLoading ? "..." : exportRows.length}) — وليس صفحة العرض فقط.
          </p>

          <div className="mb-4 flex flex-wrap gap-2">
            <select
              value={exportFilter.category}
              onChange={(e) => setExportFilter((f) => ({ ...f, category: e.target.value }))}
              aria-label="فلتر الفئة"
              className="rounded-lg border border-border bg-surface px-2 py-1 text-[11px] text-foreground"
            >
              <option value="">كل الفئات</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={exportFilter.brand}
              onChange={(e) => setExportFilter((f) => ({ ...f, brand: e.target.value }))}
              aria-label="فلتر العلامة"
              className="rounded-lg border border-border bg-surface px-2 py-1 text-[11px] text-foreground"
            >
              <option value="">كل العلامات</option>
              {brands.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <select
              value={exportFilter.status}
              onChange={(e) => setExportFilter((f) => ({ ...f, status: e.target.value }))}
              aria-label="فلتر الحالة"
              className="rounded-lg border border-border bg-surface px-2 py-1 text-[11px] text-foreground"
            >
              <option value="">كل الحالات</option>
              {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={() => setExportFilter({ category: "", brand: "", status: "" })}>
                <X className="h-3 w-3" /> مسح الفلاتر
              </Button>
            )}
          </div>

          {exportLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              جارٍ تحميل بيانات التصدير...
            </div>
          ) : filteredExportData.length > 0 ? (
            <>
              <p className="mb-3 text-[11px] text-muted">
                {filteredExportData.length} منتج جاهز للتصدير{hasActiveFilters && ` (من أصل ${exportRows.length})`}
              </p>
              <Button
                variant="primary"
                onClick={() => downloadCsv(filteredExportData, IMPORT_FIELDS, `products-export-${filteredExportData.length}.csv`)}
              >
                <FolderDown className="h-4 w-4" /> تصدير CSV
              </Button>
            </>
          ) : (
            <p className="text-[11px] text-muted"><AlertCircle className="inline h-3 w-3" /> لا توجد بيانات مطابقة للتصدير</p>
          )}
        </Card>
      </div>
    </main>
  );
}
