"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle,
  XCircle,
  User,
  Phone,
  Mail,
  Calendar,
  MessageCircle,
  Filter,
  ChevronDown,
  Trash2,
  Video,
  MapPin,
  Stethoscope,
  FileText,
} from "lucide-react";
import type { ConsultationRequest, ExpertEnrollment } from "@/src/types/expert";
import { useLang } from "@/lib/use-lang";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-50 text-amber-600 border-amber-200",
  approved: "bg-success/10 text-success border-success/30",
  rejected: "bg-red-50 text-red-600 border-red-200",
  completed: "bg-primary/10 text-primary border-primary/30",
};

const STATUS_LABELS_AR: Record<string, string> = {
  pending: "قيد المراجعة",
  approved: "تمت الموافقة",
  rejected: "مرفوض",
  completed: "مكتمل",
};

/** Real storefront concern options from ConsultationForm (canonical values). */
const CONCERN_LABELS_AR: Record<string, string> = {
  "skin-analysis": "تحليل البشرة",
  "product-recommendation": "توصيات المنتجات",
  "routine-planning": "وضع روتين",
  "acne-treatment": "علاج حب الشباب",
  "anti-aging": "مكافحة الشيخوخة",
  hyperpigmentation: "البقع الداكنة",
  other: "أخرى",
};

/** Real storefront entry points that submit consultation requests. */
const SOURCE_LABELS_AR: Record<string, string> = {
  "expert-profile": "صفحة الخبير",
};

const NO_PREFERENCE = "بدون تفضيل";

function formatDateTime(iso?: string): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("ar", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function ConsultationsAdmin() {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const [consultations, setConsultations] = useState<ConsultationRequest[]>([]);
  const [enrollments, setEnrollments] = useState<ExpertEnrollment[]>([]);
  const [activeTab, setActiveTab] = useState<"consultations" | "enrollments">("consultations");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [dateMode, setDateMode] = useState<"all" | "custom">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({ type: activeTab });
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (search.trim()) params.set("q", search.trim());
      if (activeTab === "consultations") {
        if (filterType !== "all") params.set("ctype", filterType);
        if (dateMode === "custom" && dateFrom) params.set("from", dateFrom);
        if (dateMode === "custom" && dateTo) params.set("to", dateTo);
      }
      const res = await fetch(`/api/admin/consultations?${params.toString()}`);
      if (!res.ok) {
        setLoadError("تعذر جلب البيانات");
        return;
      }
      const body = (await res.json()) as { items?: Array<Record<string, unknown>> };
      if (activeTab === "enrollments") {
        setEnrollments(((body.items ?? []) as unknown[]) as ExpertEnrollment[]);
      } else {
        setConsultations(
          ((body.items ?? []) as Array<Record<string, unknown>>).map((r) => ({
            id: r.id as string,
            expertId: r.expert_id as string,
            expertName: r.expert_name as string,
            clientName: r.client_name as string,
            clientPhone: r.client_phone as string,
            clientEmail: (r.client_email as string) ?? undefined,
            consultationType: r.consultation_type as ConsultationRequest["consultationType"],
            preferredDay: r.preferred_day as string,
            preferredTime: r.preferred_time as string,
            concern: r.concern as string,
            concernDetails: (r.concern_details as string) ?? undefined,
            referralSource: (r.referral_source as string) ?? undefined,
            status: r.status as ConsultationRequest["status"],
            adminNotes: (r.admin_notes as string) ?? undefined,
            createdAt: r.created_at as string,
            updatedAt: r.updated_at as string,
          })),
        );
      }
    } catch {
      setLoadError("تعذر جلب البيانات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, filterStatus, filterType]);

  // Reload when a complete custom range is set; clear results while incomplete.
  useEffect(() => {
    if (dateMode !== "custom") {
      void load();
      return;
    }
    if (dateFrom && dateTo) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateMode, dateFrom, dateTo]);

  const patchStatus = async (type: "consultations" | "enrollments", id: string, status: string) => {
    setActionError(null);
    try {
      const res = await fetch("/api/admin/consultations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id, status }),
      });
      if (!res.ok) {
        setActionError("تعذر تحديث الحالة");
        return;
      }
      await load();
    } catch {
      setActionError("تعذر تحديث الحالة");
    }
  };

  const handleConsultationStatus = (id: string, status: ConsultationRequest["status"]) => {
    void patchStatus("consultations", id, status);
  };

  const handleEnrollmentStatus = (id: string, status: ExpertEnrollment["status"]) => {
    void patchStatus("enrollments", id, status);
  };

  const performDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionError(null);
    try {
      const res = await fetch(
        `/api/admin/consultations?type=${activeTab}&id=${encodeURIComponent(deleteTarget.id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setActionError(body?.error?.message ?? "تعذر الحذف");
        return;
      }
      if (expandedId === deleteTarget.id) setExpandedId(null);
      setDeleteTarget(null);
      await load();
    } catch {
      setActionError("تعذر الحذف");
    } finally {
      setDeleting(false);
    }
  };

  const selectCls =
    "rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 transition-all focus:border-primary focus:outline-none";

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5">
      <h2 className="mb-4 text-lg font-bold text-gray-900">{t("إدارة الاستشارات", "Consultation Management")}</h2>

      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setActiveTab("consultations")}
          className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "consultations" ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {t("الاستشارات", "Consultations")} ({consultations.length})
        </button>
        <button
          onClick={() => setActiveTab("enrollments")}
          className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "enrollments" ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {t("طلبات التسجيل", "Enrollments")} ({enrollments.length})
        </button>
      </div>

      {/* Filters — same row/position/styling as before.
          1st select: consultation TYPE (consultations tab) / kept as-is for enrollments.
          2nd select: STATUS — original values & behavior preserved.
          Search input: unchanged.
          ONE date control: تاريخ مخصص → من/إلى appear ONLY when selected. */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Filter size={14} className="text-gray-400" />
        {activeTab === "consultations" && (
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            aria-label={t("نوع الاستشارة", "Consultation type")}
            className={selectCls}
          >
            <option value="all">{t("كل الأنواع", "All types")}</option>
            <option value="online">{t("استشارة أونلاين", "Online consultation")}</option>
            <option value="in-person">{t("استشارة حضورية", "In-person consultation")}</option>
          </select>
        )}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          aria-label={t("الحالة", "Status")}
          className={selectCls}
        >
          <option value="all">{t("الكل", "All")}</option>
          <option value="pending">{t("قيد المراجعة", "Pending")}</option>
          <option value="approved">{t("تمت الموافقة", "Approved")}</option>
          <option value="rejected">{t("مرفوض", "Rejected")}</option>
          {activeTab === "consultations" && <option value="completed">{t("مكتمل", "Completed")}</option>}
        </select>
        {activeTab === "consultations" && (
          <>
            <select
              value={dateMode}
              onChange={(e) => {
                const mode = e.target.value as "all" | "custom";
                setDateMode(mode);
                if (mode === "all") { setDateFrom(""); setDateTo(""); }
              }}
              aria-label={t("التاريخ", "Date")}
              className={selectCls}
            >
              <option value="all">{t("التاريخ: الكل", "Date: All")}</option>
              <option value="custom">{t("تاريخ مخصص", "Custom date range")}</option>
            </select>
            {dateMode === "custom" && (
              <>
                <label className="flex items-center gap-1 text-[11px] font-semibold text-gray-500">
                  {t("من", "From")}
                  <input
                    type="date"
                    value={dateFrom}
                    max={dateTo || undefined}
                    onChange={(e) => setDateFrom(e.target.value)}
                    aria-label={t("من تاريخ", "From date")}
                    className="rounded-xl border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-700 focus:border-primary focus:outline-none"
                  />
                </label>
                <label className="flex items-center gap-1 text-[11px] font-semibold text-gray-500">
                  {t("إلى", "To")}
                  <input
                    type="date"
                    value={dateTo}
                    min={dateFrom || undefined}
                    onChange={(e) => setDateTo(e.target.value)}
                    aria-label={t("إلى تاريخ", "To date")}
                    className="rounded-xl border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-700 focus:border-primary focus:outline-none"
                  />
                </label>
              </>
            )}
          </>
        )}
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void load(); }}
          placeholder={activeTab === "enrollments" ? t("بحث بالاسم/البريد/الهاتف", "Search name/email/phone") : t("بحث بالاسم/الهاتف/الخبير", "Search name/phone/expert")}
          className="min-w-[160px] flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 focus:border-primary focus:outline-none"
        />
        <button
          onClick={() => void load()}
          className="rounded-xl bg-primary/10 px-3 py-2 text-[11px] font-bold text-primary hover:bg-primary/20"
        >
          {t("تحديث", "Refresh")}
        </button>
      </div>

      {(loadError || actionError) && (
        <p className="mb-3 rounded-xl border border-error/30 bg-error/5 px-3 py-2 text-xs font-semibold text-error">{loadError ?? actionError}</p>
      )}
      {loading && <p className="py-4 text-center text-xs text-gray-400">{t("جارٍ التحميل...", "Loading...")}</p>}

      {/* Consultations — expandable operational cards */}
      {activeTab === "consultations" && !loading && (
        <div className="space-y-3">
          {consultations.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">{t("لا توجد استشارات مطابقة", "No matching consultations")}</p>
          ) : (
            consultations.map((c) => {
              const expanded = expandedId === c.id;
              const noPreference = c.expertName === NO_PREFERENCE || c.expertId === "any";
              const concernTitle = CONCERN_LABELS_AR[c.concern] ?? c.concern;
              const sourceLabel = (c.referralSource && SOURCE_LABELS_AR[c.referralSource]) || c.referralSource || "—";
              return (
                <div key={c.id} className="overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                  {/* Summary row (collapsed) */}
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : c.id)}
                    aria-expanded={expanded}
                    aria-controls={`consultation-details-${c.id}`}
                    className="flex w-full items-center gap-3 p-4 text-start transition-colors hover:bg-gray-100/70 focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        c.consultationType === "online" ? "bg-primary/10 text-primary" : "bg-secondary/15 text-secondary"
                      }`}
                      title={c.consultationType === "online" ? t("أونلاين", "Online") : t("حضوري", "In-person")}
                    >
                      {c.consultationType === "online" ? <Video size={16} /> : <MapPin size={16} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold text-gray-900">
                        {t("استشارة", "Consultation")} · {concernTitle}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-500">
                        <span className="inline-flex items-center gap-1"><User size={10} />{c.clientName}</span>
                        <span className="inline-flex items-center gap-1"><Stethoscope size={10} />{noPreference ? NO_PREFERENCE : c.expertName}</span>
                        <span className="inline-flex items-center gap-1"><Calendar size={10} />{formatDateTime(c.createdAt)}</span>
                      </span>
                    </span>
                    <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${STATUS_COLORS[c.status]}`}>
                      {STATUS_LABELS_AR[c.status]}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`shrink-0 text-gray-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
                    />
                  </button>

                  {/* Expanded canonical details */}
                  {expanded && (
                    <div id={`consultation-details-${c.id}`} className="border-t border-gray-100 px-4 pb-4 pt-3">
                      <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-xs text-gray-600 sm:grid-cols-2">
                        <p className="flex items-center gap-1.5"><User size={12} /> {t("العميلة", "Customer")}: <b className="font-bold text-gray-800">{c.clientName}</b></p>
                        <p className="flex items-center gap-1.5"><Phone size={12} /> {t("الهاتف", "Phone")}: <span dir="ltr">{c.clientPhone}</span></p>
                        {c.clientEmail && <p className="flex items-center gap-1.5"><Mail size={12} /> {t("البريد", "Email")}: <span dir="ltr">{c.clientEmail}</span></p>}
                        <p className="flex items-center gap-1.5">
                          {c.consultationType === "online" ? <Video size={12} /> : <MapPin size={12} />}
                          {t("نوع الاستشارة", "Type")}: {c.consultationType === "online" ? t("أونلاين", "Online") : t("حضوري", "In-person")}
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Stethoscope size={12} />
                          {t("الطبيب المختار", "Selected doctor")}:{" "}
                          <b className="font-bold text-gray-800">{noPreference ? NO_PREFERENCE : c.expertName}</b>
                        </p>
                        <p className="flex items-center gap-1.5"><FileText size={12} /> {t("القسم/المصدر", "Section/source")}: {sourceLabel}</p>
                        <p className="flex items-center gap-1.5"><MessageCircle size={12} /> {t("سبب الاستشارة", "Concern")}: {concernTitle}</p>
                        <p className="flex items-center gap-1.5"><Calendar size={12} /> {t("الموعد المفضل", "Preferred slot")}: {c.preferredDay} — {c.preferredTime}</p>
                        <p className="flex items-center gap-1.5"><Calendar size={12} /> {t("تاريخ الطلب", "Requested at")}: {formatDateTime(c.createdAt)}</p>
                      </div>

                      {/* شرح المريض / تفاصيل الاستشارة — verbatim customer text */}
                      {c.concernDetails && (
                        <div className="mt-3 rounded-xl border border-gray-100 bg-white p-3">
                          <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold text-gray-700">
                            <FileText size={12} className="text-primary" />
                            {t("شرح المريض / تفاصيل الاستشارة", "Patient description / consultation details")}
                          </p>
                          <p className="whitespace-pre-wrap text-xs leading-relaxed text-gray-700">{c.concernDetails}</p>
                        </div>
                      )}

                      {c.adminNotes && (
                        <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                          {t("ملاحظات إدارية", "Admin notes")}: {c.adminNotes}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2">
                        {c.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleConsultationStatus(c.id, "approved")}
                              className="flex items-center gap-1 rounded-full bg-success/10 px-3 py-1.5 text-[10px] font-bold text-success transition-all hover:bg-success/20"
                            >
                              <CheckCircle size={12} /> {t("قبول", "Approve")}
                            </button>
                            <button
                              onClick={() => handleConsultationStatus(c.id, "rejected")}
                              className="flex items-center gap-1 rounded-full bg-red-50 px-3 py-1.5 text-[10px] font-bold text-red-600 transition-all hover:bg-red-100"
                            >
                              <XCircle size={12} /> {t("رفض", "Reject")}
                            </button>
                          </>
                        )}
                        {c.status === "approved" && (
                          <button
                            onClick={() => handleConsultationStatus(c.id, "completed")}
                            className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-[10px] font-bold text-primary transition-all hover:bg-primary/20"
                          >
                            <CheckCircle size={12} /> {t("تمت الاستشارة", "Mark Complete")}
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteTarget({ id: c.id, label: `${concernTitle} — ${c.clientName}` })}
                          className="ms-auto flex items-center gap-1 rounded-full border border-red-200 bg-white px-3 py-1.5 text-[10px] font-bold text-red-600 transition-all hover:bg-red-50"
                        >
                          <Trash2 size={12} /> {t("حذف", "Delete")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Enrollments — unchanged workflow */}
      {activeTab === "enrollments" && !loading && (
        <div className="space-y-3">
          {enrollments.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">{t("لا توجد طلبات تسجيل", "No enrollment requests")}</p>
          ) : (
            enrollments.map((e) => (
              <div key={e.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900">{e.nameAr}</span>
                  <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${STATUS_COLORS[e.status]}`}>
                    {STATUS_LABELS_AR[e.status]}
                  </span>
                </div>
                <div className="space-y-1 text-xs text-gray-600">
                  <p className="flex items-center gap-1.5"><User size={12} /> {e.name}</p>
                  <p className="flex items-center gap-1.5"><Mail size={12} /> {e.email}</p>
                  <p className="flex items-center gap-1.5"><Phone size={12} /> {e.phone}</p>
                  <p className="flex items-center gap-1.5">{e.specialtyAr} - {e.cityAr}</p>
                  <p className="text-gray-500">{e.bioAr}</p>
                </div>
                {e.status === "pending" && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleEnrollmentStatus(e.id, "approved")}
                      className="flex items-center gap-1 rounded-full bg-success/10 px-3 py-1.5 text-[10px] font-bold text-success transition-all hover:bg-success/20"
                    >
                      <CheckCircle size={12} /> {t("موافقة", "Approve")}
                    </button>
                    <button
                      onClick={() => handleEnrollmentStatus(e.id, "rejected")}
                      className="flex items-center gap-1 rounded-full bg-red-50 px-3 py-1.5 text-[10px] font-bold text-red-600 transition-all hover:bg-red-100"
                    >
                      <XCircle size={12} /> {t("رفض", "Reject")}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title={t("تأكيد الحذف النهائي", "Confirm permanent deletion")}
        message={
          deleteTarget
            ? t(
                `سيتم حذف طلب «${deleteTarget.label}» نهائيًا من قاعدة البيانات. لا يمكن التراجع عن هذا الإجراء.`,
                `Request "${deleteTarget.label}" will be permanently deleted. This cannot be undone.`
              )
            : ""
        }
        confirmLabel={deleting ? t("جارٍ الحذف…", "Deleting…") : t("حذف نهائي", "Delete permanently")}
        tone="danger"
        onConfirm={() => void performDelete()}
        onCancel={() => { if (!deleting) setDeleteTarget(null); }}
      />
    </div>
  );
}
