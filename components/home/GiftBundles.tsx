"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Gift, Package, ArrowLeft, Sparkles } from "lucide-react";
import AutoProductStrip from "@/components/home/AutoProductStrip";
import Container from "@/components/ui/Container";
import { getBundleProducts } from "@/src/data/bundles";
import { useEffect } from "react";
import { fetchCanonicalBundles } from "@/src/lib/canonical-bundles";
import type { Bundle, BundleOccasion } from "@/src/types/bundle";
import { useLang } from "@/lib/use-lang";

function formatPrice(amount: number): string {
  return amount.toLocaleString("ar-YE");
}
/* ================================================================================================ */
/* OCCASION TABS & FILTERS                 */
/* ================================================================================================ */
const MAIN_TABS = [
  { key: "all", label: "الكل" },
  { key: "bride", label: "عروس" },
  { key: "holidays", label: "أعياد" },
  { key: "valentine", label: "عيد الحب" },
  { key: "mothers-day", label: "عيد الأم" },
  { key: "summer", label: "صيف" },
  { key: "winter", label: "شتاء" },
];

const BRIDE_SUB_TABS = [
  { key: "all", label: "الكل" },
  { key: "engagement", label: "خطوبة" },
  { key: "wedding", label: "زفاف" },
];

function getBadgeStyle(badge?: string): string {
  switch (badge) {
    case "HOT":
      return "bg-amber-500 text-white";
    case "PREMIUM":
      return "bg-primary text-white";
    case "NEW":
      return "bg-emerald-500 text-white";
    default:
      return "bg-red-500 text-white";
  }
}

function getBadgeAr(bundle: { badge?: string; badgeAr?: string; savingsPercent?: number }): string {
  if (bundle.badgeAr) return bundle.badgeAr;
  if (bundle.badge === "HOT") return "الأكثر طلبًا";
  if (bundle.badge === "PREMIUM") return "فاخرة";
  if (bundle.badge === "NEW") return "جديد";
  return `خصم ${bundle.savingsPercent}%`;
}
/* ================================================================================================ */
/* BUNDLE CARD                             */
/* ================================================================================================ */
function BundleCard({ bundle }: { bundle: Bundle }) {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const products = getBundleProducts(bundle);

  return (
    <Link
      href={`/bundles/${bundle.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-xl hover:ring-2 hover:ring-amber-400/40"
    >
      {/* Image — auto product strip */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-50">
        <AutoProductStrip products={products} speed={0.15} itemClassName="w-40" itemRounded="rounded-xl" />

        {/* Badge */}
        {bundle.badge && (
          <div className="absolute top-3 start-3">
            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold shadow-lg ${getBadgeStyle(bundle.badge)}`}>
              <Sparkles size={10} />
              {getBadgeAr(bundle)}
            </span>
          </div>
        )}

        {/* Savings badge */}
        <div className="absolute top-3 end-3">
          <span className="inline-flex items-center rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-extrabold text-emerald-600 shadow-sm">
            وفّري {bundle.savingsPercent}%
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-1.5">
          <Package size={13} className="text-primary" />
          <span className="text-[11px] font-medium text-gray-400">{products.length} منتجات</span>
        </div>

        <h3 className="text-base font-bold text-gray-900 line-clamp-1 transition-colors duration-300 group-hover:text-primary">
          {bundle.nameAr}
        </h3>

        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{bundle.descriptionAr}</p>

        {/* Price */}
        <div className="mt-auto flex items-baseline gap-2 pt-2">
          <span className="text-lg font-extrabold text-gray-900">{formatPrice(bundle.bundlePrice)}</span>
          <span className="text-sm text-gray-400 line-through">{formatPrice(bundle.originalPrice)}</span>
          <span className="ms-auto text-[10px] font-bold text-emerald-600">{isAr ? "ر.ي" : "YER"}</span>
        </div>

        {/* Button */}
        <div className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-gray-900 py-2.5 text-xs font-bold text-white transition-all duration-300 group-hover:bg-primary group-hover:shadow-lg group-hover:shadow-primary/30 active:scale-[0.98]">
          {isAr ? "استكشف الباقة" : "Explore Bundle"}
          <ArrowLeft size={13} className="transition-transform duration-300 group-hover:-translate-x-1" />
        </div>
      </div>
    </Link>
  );
}
/* ================================================================================================ */
/* MAIN SECTION                            */
/* ================================================================================================ */
export default function GiftBundles() {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const [activeTab, setActiveTab] = useState<string>("all");
  const [activeSubTab, setActiveSubTab] = useState<string>("all");
  const [allBundles, setAllBundles] = useState<Bundle[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetchCanonicalBundles().then((d) => { if (!cancelled) setAllBundles(d.bundles); });
    return () => { cancelled = true; };
  }, []);

  const filteredBundles = useMemo(() => {
    if (activeTab === "all") return allBundles;

    if (activeTab === "bride") {
      if (activeSubTab === "all") return allBundles.filter((b) => b.occasion.includes("bride"));
      return allBundles.filter((b) => b.occasion.includes(activeSubTab as BundleOccasion));
    }

    return allBundles.filter((b) => b.occasion.includes(activeTab as BundleOccasion));
  }, [allBundles, activeTab, activeSubTab]);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setActiveSubTab("all");
  };

  return (
    <section id="bundles" className="w-full bg-gradient-to-b from-white via-primary-50/30 to-white py-14 sm:py-18 lg:py-22">
      <Container>
        {/* = Header = */}
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 shadow-lg shadow-primary/20">
            <Gift size={14} className="text-amber-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              {isAr ? "هدايا مميزة" : "Curated Gifts"}
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-primary sm:text-3xl lg:text-4xl">
            {isAr ? "هدايا وباقات مختارة بعناية" : "Carefully Selected Bundles & Gifts"}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-gray-500">
            {isAr
              ? "باقات جاهزة لكل مناسبة — اختاري الباقة المثالية أو صممي باقتك الخاصة"
              : "Ready bundles for every occasion — pick the perfect one or design your own"}
          </p>
        </div>

        {/* = Occasion Tabs = */}
        <div className="mb-4 flex justify-center">
          <div className="hide-scrollbar flex max-w-full gap-2 overflow-x-auto pb-2">
            {MAIN_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-300 ${
                  activeTab === tab.key
                    ? "bg-primary text-white shadow-lg shadow-primary/30 scale-105"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-primary/40 hover:text-primary"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* = Bride Sub-Filter = */}
        {activeTab === "bride" && (
          <div className="mb-8 flex justify-center" style={{ animation: "megaMenuFadeIn 0.3s ease-out" }}>
            <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-white p-1.5 shadow-sm">
              {BRIDE_SUB_TABS.map((sub) => (
                <button
                  key={sub.key}
                  onClick={() => setActiveSubTab(sub.key)}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-300 ${
                    activeSubTab === sub.key
                      ? "bg-primary/10 text-primary"
                      : "text-gray-500 hover:text-primary"
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* = Bundles Grid = */}
        {filteredBundles.length > 0 ? (
          <div
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
            style={{ animation: "megaMenuFadeIn 0.3s ease-out" }}
          >
            {filteredBundles.map((bundle) => (
              <BundleCard key={bundle.id} bundle={bundle} />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center text-gray-400">
            <Package size={48} className="mx-auto mb-4 text-gray-200" />
            <p className="text-sm">{isAr ? "لا توجد باقات لهذه المناسبة حالياً" : "No bundles for this occasion yet"}</p>
          </div>
        )}

        {/* = Design Your Bundle CTA = */}
        <div className="mt-10 flex justify-center">
          <Link
            href="/bundles/design"
            className="group inline-flex items-center gap-3 rounded-full bg-gray-900 px-8 py-3.5 text-sm font-bold text-white shadow-xl transition-all duration-300 hover:bg-primary hover:shadow-primary/30 active:scale-95"
          >
            <Sparkles size={16} className="text-amber-400" />
            {isAr ? "صممي باقتك الخاصة" : "Design Your Own Bundle"}
            <ArrowLeft size={15} className="transition-transform duration-300 group-hover:-translate-x-1" />
          </Link>
        </div>
      </Container>
    </section>
  );
}

