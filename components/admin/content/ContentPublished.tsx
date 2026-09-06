"use client";
import { timedController } from "@/src/lib/fetch-timeout";

import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Eye } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { LoadingState, EmptyState, ErrorState } from "@/components/admin/ui/States";
import { useAdminGuard } from "@/src/admin/useAdminGuard";
import type { PublishedContent } from "@/src/lib/content-ops/types";
import { formatDateTime, formatInt, CHANNEL_LABELS } from "./content-types";

interface PublishedPayload {
  published: PublishedContent[];
}

export default function ContentPublished() {
  const { allowed } = useAdminGuard("content");
  const [published, setPublished] = useState<PublishedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = timedController(15000);
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // Prefer admin store (includes all), fallback to public published API
        const res = await fetch("/api/admin/content?action=published", { signal: controller.signal });
        if (res.ok) {
          const json = (await res.json()) as { published: PublishedContent[] };
          setPublished(json.published);
        } else {
          const pubRes = await fetch("/api/content/published", { signal: controller.signal });
          if (!pubRes.ok) throw new Error(`HTTP ${pubRes.status}`);
          const pj = (await pubRes.json()) as PublishedPayload;
          setPublished(pj.published);
        }
        setLoading(false);
      } catch (e) {
        if (!controller.signal.aborted) {
          setError((e as Error).message);
          setLoading(false);
        }
      }
    })();
    return () => controller.abort();
  }, []);

  if (!allowed) return <EmptyState title="ليس لديك صلاحية" description="دورك لا يملك صلاحية عرض المنشور." />;
  if (loading) return <LoadingState label="جارٍ تحميل المنشور..." />;
  if (error) return <ErrorState title="خطأ" description={error} />;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <CheckCircle2 size={20} className="text-green-600" /> المحتوى المنشور
          </h1>
          <p className="text-xs text-muted">{published.length} عنصر منشور (visible=true فقط — لا يُعرض غير المنشور)</p>
        </div>
        <Badge variant="success" className="text-[11px]">مباشر من Supabase</Badge>
      </div>

      {published.length === 0 ? (
        <Card>
          <EmptyState title="لا يوجد محتوى منشور" description="انشري محتوى معتمد عبر التقويم أو عبر النشر الفوري ليظهر هنا وفي /api/content/published" />
        </Card>
      ) : (
        <div className="grid gap-4">
          {published.map((p) => (
            <Card key={p.contentId} padding="sm" hover>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-foreground">{p.title ?? "بدون عنوان"}</div>
                  <p className="truncate text-xs text-muted">{p.body.slice(0, 120)}...</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Badge variant="success" className="text-[9px]">{CHANNEL_LABELS[p.channel] ?? p.channel}</Badge>
                    <Badge variant="neutral" className="text-[9px]">{formatDateTime(p.publishedAt)}</Badge>
                    {p.productIds.length > 0 && <Badge variant="outline" className="text-[9px]">منتجات: {p.productIds.slice(0, 3).join(", ")}</Badge>}
                    {p.categoryId && <Badge variant="outline" className="text-[9px]">تصنيف: {p.categoryId}</Badge>}
                    <Badge variant={p.visible ? "success" : "error"} className="text-[9px]">{p.visible ? "ظاهر" : "مخفي"}</Badge>
                  </div>
                  <p className="mt-1 text-[10px] text-muted">معرّف المحتوى: {p.contentId} · منشور: {p.publicationId}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <a href="/api/content/published" target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm" className="text-[11px]"><Eye className="h-3 w-3" /> API</Button>
                  </a>
                  <a href="/" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="text-[11px]"><ExternalLink className="h-3 w-3" /> الموقع</Button>
                  </a>
                </div>
              </div>
              <p className="mt-2 text-[10px] text-muted">لا توجد مقاييس مصنعة — التحليلات تُعرض في تبويب الأداء فقط عند توفر {formatInt(0)} أحداث حقيقية.</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
