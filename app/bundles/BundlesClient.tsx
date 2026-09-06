"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Package, Sparkles, Tag } from "lucide-react";
import Container from "@/components/ui/Container";
import ProductImage from "@/components/product/ProductImage";
import { getBundleProducts } from "@/src/data/bundles";
import { fetchCanonicalBundles } from "@/src/lib/canonical-bundles";
import type { Bundle } from "@/src/types/bundle";

const OCCASION_AR: Record<string, string> = {
  bride: "عروس",
  engagement: "خطوبة",
  wedding: "زفاف",
  holidays: "أعياد",
  valentine: "عيد الحب",
  "mothers-day": "عيد الأم",
  summer: "صيف",
  winter: "شتاء",
};

function formatPrice(amount: number): string {
  return amount.toLocaleString("ar-YE");
}

function BundleImage({ bundle }: { bundle: Bundle }) {
  const products = getBundleProducts(bundle);
  return (
    <div className="relative h-44 overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 sm:h-48">
      {products.length > 0 ? (
        <div className="flex h-full w-full items-stretch">
          {products.slice(0, 4).map(
            (p) =>
              p.gallery?.[0] && (
                <div key={p.id} className="relative min-w-0 flex-1 overflow-hidden">
<ProductImage
                      src={p.gallery[0]}
                      alt={p.name.ar}
                      productId={p.id}
                      variant="clean"
                      hoverZoom={false}
                      pedestal={false}
                      className="absolute inset-0 h-full w-full"
                      sizes="220px"
                    />
                </div>
              )
          )}
        </div>
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-100 to-secondary-100">
          <Sparkles size={32} className="text-primary/60" />
        </div>
      )}
      {bundle.badgeAr && (
        <div className="absolute top-3 start-3 z-10">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[10px] font-bold text-white shadow-lg">
            <Sparkles size={10} />
            {bundle.badgeAr}
          </span>
        </div>
      )}
      {bundle.savingsPercent > 0 && products.length >= 3 && (
        <div className="absolute top-3 end-3 z-10">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-extrabold text-emerald-600 shadow-sm">
            <Tag size={10} />
            -{bundle.savingsPercent}%
          </span>
        </div>
      )}
    </div>
  );
}

export default function BundlesClient({ serverBundles }: { serverBundles?: Bundle[] }) {
  const [bundles, setBundles] = useState<Bundle[]>(serverBundles ?? []);
  useEffect(() => {
    if (serverBundles && serverBundles.length > 0) return;
    let cancelled = false;
    fetchCanonicalBundles()
      .then((d) => { if (!cancelled) setBundles(d.bundles); })
      .catch(() => {})
      .finally(() => { if (!cancelled) {} });
    return () => { cancelled = true; };
  }, [serverBundles]);
  return (
    <div dir="rtl" className="w-full pb-16">
      <section className="w-full bg-gradient-to-b from-white via-primary/5 to-white py-14 sm:py-18 lg:py-20">
        <Container>
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="mb-3 inline-flex items-center gap-2 text-xs font-semibold tracking-widest text-secondary">
                <span className="h-0.5 w-6 rounded-pill bg-accent" />
                باقات وهدايا
              </span>
              <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                هدايا وباقات مختارة بعناية
              </h1>
              <p className="mt-2 max-w-xl text-sm text-gray-500">
                باقات جاهزة لكل مناسبة — اختاري الباقة المثالية أو صممي باقتك الخاصة
              </p>
            </div>
            <Link
              href="/bundles/design"
              className="group inline-flex items-center gap-3 rounded-full bg-primary px-6 py-3 text-sm font-bold text-white shadow-xl shadow-primary/25 transition-all duration-300 hover:bg-primary-700 hover:shadow-primary/40 active:scale-95"
            >
              <Sparkles size={15} className="text-accent-light" />
              صممي باقتك الخاصة
              <ArrowLeft size={14} className="transition-transform duration-300 group-hover:-translate-x-1" />
            </Link>
          </div>

          {bundles.length > 6 ? (
            <div className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory" style={{ scrollbarWidth: "thin" }}>
              {bundles.map((bundle) => {
                const products = getBundleProducts(bundle);
                return (
                  <Link
                    key={bundle.id}
                    href={`/bundles/${bundle.slug}`}
                    className="group relative flex min-w-[280px] max-w-[340px] flex-1 flex-col overflow-hidden rounded-card border border-border bg-card shadow-card transition-all duration-300 ease-out-smooth hover:-translate-y-1.5 hover:border-primary/30 hover:shadow-card-hover snap-start"
                  >
                    <BundleImage bundle={bundle} />
                    <div className="flex flex-1 flex-col p-5">
                      <div className="flex items-center gap-1.5">
                        <Package size={13} className="text-primary" />
                        <span className="text-[11px] font-medium text-gray-400">{products.length} منتجات</span>
                      </div>
                      <h2 className="mt-1 text-base font-bold text-gray-900 line-clamp-1 transition-colors duration-300 group-hover:text-primary">{bundle.nameAr}</h2>
                      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted">{bundle.descriptionAr}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {bundle.occasion.map((oc) => (
                          <span key={oc} className="rounded-pill bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">{OCCASION_AR[oc] ?? oc}</span>
                        ))}
                      </div>
                      <div className="mt-auto flex items-baseline gap-2 border-t border-border pt-3">
                        <span className="text-lg font-extrabold text-gray-900">{formatPrice(bundle.bundlePrice)}</span>
                        <span className="text-sm text-gray-400 line-through">{formatPrice(bundle.originalPrice)}</span>
                        <span className="ms-auto text-[10px] font-bold text-emerald-600">ر.ي</span>
                      </div>
                      <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-white transition-all duration-300 hover:bg-primary-700 group-hover:shadow-lg group-hover:shadow-primary/40 active:scale-[0.98]">
                        استكشف الباقة
                        <ArrowLeft size={13} className="text-accent-light transition-transform duration-300 group-hover:-translate-x-1" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {bundles.map((bundle) => {
                const products = getBundleProducts(bundle);
                return (
                  <Link
                    key={bundle.id}
                    href={`/bundles/${bundle.slug}`}
                    className="group relative flex flex-col overflow-hidden rounded-card border border-border bg-card shadow-card transition-all duration-300 ease-out-smooth hover:-translate-y-1.5 hover:border-primary/30 hover:shadow-card-hover"
                  >
                    <BundleImage bundle={bundle} />
                    <div className="flex flex-1 flex-col p-5">
                      <div className="flex items-center gap-1.5">
                        <Package size={13} className="text-primary" />
                        <span className="text-[11px] font-medium text-gray-400">{products.length} منتجات</span>
                      </div>
                      <h2 className="mt-1 text-base font-bold text-gray-900 line-clamp-1 transition-colors duration-300 group-hover:text-primary">{bundle.nameAr}</h2>
                      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted">{bundle.descriptionAr}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {bundle.occasion.map((oc) => (
                          <span key={oc} className="rounded-pill bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">{OCCASION_AR[oc] ?? oc}</span>
                        ))}
                      </div>
                      <div className="mt-auto flex items-baseline gap-2 border-t border-border pt-3">
                        <span className="text-lg font-extrabold text-gray-900">{formatPrice(bundle.bundlePrice)}</span>
                        <span className="text-sm text-gray-400 line-through">{formatPrice(bundle.originalPrice)}</span>
                        <span className="ms-auto text-[10px] font-bold text-emerald-600">ر.ي</span>
                      </div>
                      <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-white transition-all duration-300 hover:bg-primary-700 group-hover:shadow-lg group-hover:shadow-primary/40 active:scale-[0.98]">
                        استكشف الباقة
                        <ArrowLeft size={13} className="text-accent-light transition-transform duration-300 group-hover:-translate-x-1" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Container>
      </section>
    </div>
  );
}
