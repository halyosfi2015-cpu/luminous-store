"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, ExternalLink, Tag, Layers } from "lucide-react";

type FamilyProduct = {
  id: string;
  slug: string;
  name: { ar: string; en: string };
  brand: string;
  gallery: string[];
  price: number;
  currency: string;
};

type AltData = {
  copyPrice: number | null;
  family: FamilyProduct | null;
};

export default function AlternativePopover({ productId, currentPrice }: { productId: string; currentPrice?: number }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<AltData>({ copyPrice: null, family: null });
  const [loading, setLoading] = useState(true);
  const [expandedCopy, setExpandedCopy] = useState(false);
  const [expandedFamily, setExpandedFamily] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const hasCopy = data.copyPrice !== null && data.copyPrice > 0;
  const hasFamily = data.family !== null;
  const hasAny = hasCopy || hasFamily;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/products/${productId}/alternatives`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { copyPrice: null, family: null }))
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData({ copyPrice: null, family: null }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [productId]);

  const close = useCallback(() => { setOpen(false); setExpandedCopy(false); setExpandedFamily(false); }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    const onClick = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onClick); };
  }, [open, close]);

  if (loading) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border-2 border-border bg-muted-bg/60 px-3.5 py-3 animate-pulse">
        <span className="h-8 w-8 rounded-lg bg-muted" />
        <span className="h-3 w-20 rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="relative">
      {/* ── Trigger ── */}
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(!open)}
        className={`relative flex items-center gap-2.5 rounded-xl px-3.5 py-3 border-2 transition-all duration-300 cursor-pointer w-full text-start overflow-hidden ${
          hasAny
            ? "border-green-200 bg-gradient-to-l from-green-50 via-green-50/50 to-transparent hover:border-green-300 hover:shadow-lg hover:shadow-green-100 active:scale-[0.98]"
            : "border-border bg-muted-bg/60 hover:border-green-200"
        }`}
        aria-expanded={open}
      >
        {hasAny && <span className="absolute top-2 left-2 h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />}
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${hasAny ? "bg-green-100 shadow-sm shadow-green-200" : "bg-muted-bg"}`}>
          <Tag size={16} className={hasAny ? "text-green-600" : "text-muted"} />
        </span>
        <span className={`flex-1 text-sm font-extrabold ${hasAny ? "text-green-700" : "text-foreground"}`}>
          خيارات أوفر
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${open ? "rotate-180" : ""} ${hasAny ? "text-green-600" : "text-muted"}`}>
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>

      {/* ── Panel ── */}
      {open && (
        <>
          <div className="fixed inset-0 z-40 sm:bg-transparent" aria-hidden="true" onClick={close} />

          <div
            ref={panelRef}
            className="fixed inset-x-3 bottom-3 z-50 sm:absolute sm:bottom-full sm:mb-2 sm:left-0 sm:right-0 sm:inset-x-auto w-[calc(100%-1.5rem)] sm:w-full rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
          >
            {/* ── نسخة من المنتج ── */}
            {hasCopy && (
              <>
                <button
                  type="button"
                  onClick={() => { setExpandedCopy(!expandedCopy); setExpandedFamily(false); }}
                  className={`flex w-full items-center gap-3 px-4 py-3.5 text-start transition-colors border-b border-border/50 ${expandedCopy ? "bg-green-50" : "hover:bg-muted-bg/50"}`}
                >
                  <Tag size={16} className="text-green-600" />
                  <span className="flex-1 text-sm font-bold text-foreground">نسخة من المنتج</span>
                  <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">متوفر</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`text-muted transition-transform duration-200 ${expandedCopy ? "rotate-180" : ""}`}>
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
                {expandedCopy && (
                  <div className="border-b border-border bg-muted-bg/20 p-4">
                    <div className="text-center py-2">
                      <p className="text-[11px] text-muted mb-1">نسخة بديلة بسعر</p>
                      <p className="text-2xl font-extrabold text-green-700">
                        {data.copyPrice!.toLocaleString("ar-YE")} <span className="text-sm font-bold">ر.ي</span>
                      </p>
                      {currentPrice && data.copyPrice! < currentPrice && (
                        <span className="mt-2 inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700 border border-green-200">
                          أوفر {(currentPrice - data.copyPrice!).toLocaleString("ar-YE")} ر.ي
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── بديل من نفس العائلة ── */}
            {hasFamily && (
              <>
                <button
                  type="button"
                  onClick={() => { setExpandedFamily(!expandedFamily); setExpandedCopy(false); }}
                  className={`flex w-full items-center gap-3 px-4 py-3.5 text-start transition-colors border-b border-border/50 last:border-b-0 ${expandedFamily ? "bg-green-50" : "hover:bg-muted-bg/50"}`}
                >
                  <Layers size={16} className="text-green-700" />
                  <span className="flex-1 text-sm font-bold text-foreground">بديل من نفس العائلة</span>
                  <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">متوفر</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`text-muted transition-transform duration-200 ${expandedFamily ? "rotate-180" : ""}`}>
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
                {expandedFamily && (
                  <div className="bg-muted-bg/20 p-4">
                    <Link href={`/products/${data.family!.slug}`} onClick={close} className="block">
                      <div className="flex items-start gap-3">
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted-bg border border-border">
                          {data.family!.gallery?.[0] ? (
                            <Image src={data.family!.gallery[0]} alt={data.family!.name.ar} fill sizes="64px" className="object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xl">🧴</div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-medium text-muted">{data.family!.brand}</p>
                          <p className="text-sm font-bold text-foreground line-clamp-2 hover:text-green-700 transition-colors">{data.family!.name.ar}</p>
                          <p className="mt-1 text-base font-extrabold text-green-700">{data.family!.price.toLocaleString("ar-YE")} <span className="text-xs font-bold">ر.ي</span></p>
                        </div>
                      </div>
                    </Link>
                    <Link
                      href={`/products/${data.family!.slug}`}
                      onClick={close}
                      className="mt-3 flex items-center justify-center gap-1.5 w-full rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-green-700 active:scale-[0.98]"
                    >
                      عرض المنتج <ExternalLink size={13} />
                    </Link>
                  </div>
                )}
              </>
            )}

            {/* Close */}
            <div className="border-t border-border px-4 py-2">
              <button type="button" onClick={close} className="w-full text-center text-xs font-bold text-muted hover:text-green-700 transition-colors py-1">
                إغلاق
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
