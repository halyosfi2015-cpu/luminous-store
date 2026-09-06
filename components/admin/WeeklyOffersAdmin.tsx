"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import ContainerComponent from "@/components/ui/Container";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import { productSummaries as products } from "@/src/data/product-summaries";
import { useLang } from "@/lib/use-lang";
import {
  getConfig, saveConfig, getCurrentWeekOffers, forceRegenerate,
  resetEngine, getEngineStats, CATEGORY_GROUPS, getCurrentWeek,
} from "@/src/engine/engine";
import type { EngineConfig, WeeklyCampaign } from "@/src/engine/types";

function ChevronUpIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
      <path d="m18 15-6-6-6 6" />
    </svg>
  );
}

function SettingsIcon({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function RotateIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}

function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function BookmarkIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
    </svg>
  );
}

function XIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function TrashIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

function SearchIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function BoltIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

function PackageIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" />
    </svg>
  );
}

function ShieldIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </svg>
  );
}

function ToggleOnIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size *0.5} viewBox="0 0 48 24" fill="none">
      <rect x="1" y="1" width="46" height="22" rx="11" fill="#10b981" />
      <circle cx="33" cy="12" r="8" fill="white" />
    </svg>
  );
}

function ToggleOffIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size*0.5} viewBox="0 0 48 24" fill="none">
      <rect x="1" y="1" width="46" height="22" rx="11" fill="#d1d5db" />
      <circle cx="15" cy="12" r="8" fill="white" />
    </svg>
  );
}

function BarChartIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" x2="12" y1="20" y2="10" /><line x1="18" x2="18" y1="20" y2="4" /><line x1="6" x2="6" y1="20" y2="16" />
    </svg>
  );
}

const REASON_MAP: Record<string, { ar: string; en: string; color: string }> = {
  best_seller: { ar: "الأكثر مبيعاً", en: "Best Seller", color: "bg-amber-50 text-amber-700" },
  high_demand: { ar: "طلب مرتفع", en: "High Demand", color: "bg-emerald-50 text-emerald-700" },
  low_demand: { ar: "تحفيز مبيعات", en: "Boost Sales", color: "bg-blue-50 text-blue-700" },
  new: { ar: "جديد", en: "New", color: "bg-purple-50 text-purple-700" },
  seasonal: { ar: "موسمي", en: "Seasonal", color: "bg-orange-50 text-orange-700" },
  boost_sales: { ar: "تعزيز", en: "Boost", color: "bg-pink-50 text-pink-700" },
  admin_pinned: { ar: "مثبت", en: "Pinned", color: "bg-red-50 text-red-700" },
  month_top: { ar: "top الشهر", en: "Month Top", color: "bg-yellow-50 text-yellow-700" },
};

export default function WeeklyOffersAdmin() {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const [config, setConfig] = useState<EngineConfig>(getConfig());
  const [currentWeek, setCurrentWeek] = useState(1);
  const [monthCampaign, setMonthCampaign] = useState<WeeklyCampaign[] | null>(null);
  const [stats, setStats] = useState(getEngineStats());
  const [searchQuery] = useState("");
  const [expandedSection, setExpandedSection] = useState<string | null>("config");
  const [excludedSearch, setExcludedSearch] = useState("");
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const { toast } = useAdminToast();

  useEffect(() => {
    const apply = () => {
      const { monthCampaign: mc } = getCurrentWeekOffers(products);
      setCurrentWeek(getCurrentWeek());
      setMonthCampaign(mc ? mc.weeks : null);
      setStats(getEngineStats());
    };
    apply();
  }, []);

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await saveConfig(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      toast((err as Error).message || "فشل حفظ إعدادات العروض", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = () => {
    const campaign = forceRegenerate(products);
    setMonthCampaign(campaign.weeks);
    setStats(getEngineStats());
    setConfig(getConfig());
  };

  const handleReset = () => {
    resetEngine();
    setMonthCampaign(null);
    setStats(getEngineStats());
    setConfirmReset(false);
    toast("تم مسح جميع البيانات وإعادة تهيئة المحرك", "success");
  };

  const toggleExclude = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      excludedProductIds: prev.excludedProductIds.includes(id)
        ? prev.excludedProductIds.filter((x) => x !== id)
        : [...prev.excludedProductIds, id],
    }));
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) =>
      p.name.ar.includes(searchQuery) || p.name.en.toLowerCase().includes(searchQuery.toLowerCase()) || p.brand.includes(searchQuery)
    );
  }, [searchQuery]);

  const excludedProducts = useMemo(() => {
    return products.filter((p) => config.excludedProductIds.includes(p.id));
  }, [config.excludedProductIds]);

  const totalDiscounted = monthCampaign?.reduce((sum, w) => sum + w.products.length, 0) ?? 0;
  const weekCampaign = monthCampaign?.find((w) => w.week === currentWeek);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b border-gray-200 px-4 py-6">
        <ContainerComponent>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                <SettingsIcon size={24} className="text-primary" />
                {isAr ? "محرك العروض الأسبوعية" : "Weekly Offers Engine"}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {isAr ? "نظام ذكي يختار المنتجات والخصومات تلقائياً كل أسبوع" : "Smart system that auto-selects products and discounts weekly"}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleRegenerate} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-600 transition-colors">
                <RotateIcon size={14} />
                {isAr ? "إعادة توليد" : "Regenerate"}
              </button>
              <button onClick={handleSave} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary/90 transition-colors">
                {saved ? <CheckIcon size={14} /> : <BookmarkIcon size={14} />}
                {saved ? (isAr ? "تم الحفظ" : "Saved") : (isAr ? "حفظ" : "Save")}
              </button>
            </div>
          </div>
        </ContainerComponent>
      </div>

      <ContainerComponent>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: <BoltIcon />, label: isAr ? "المحرك" : "Engine", value: config.enabled ? (isAr ? "مفعّل" : "Active") : (isAr ? "معطّل" : "Off"), color: config.enabled ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50" },
            { icon: <PackageIcon />, label: isAr ? "منتجات هذا الأسبوع" : "This Week", value: `${weekCampaign?.products.length ?? 0}`, color: "text-blue-600 bg-blue-50" },
            { icon: <BarChartIcon />, label: isAr ? "إجمالي العروض" : "Total Offers", value: `${totalDiscounted}`, color: "text-purple-600 bg-purple-50" },
            { icon: <ShieldIcon />, label: isAr ? "مستبعدة" : "Excluded", value: `${config.excludedProductIds.length}`, color: "text-orange-600 bg-orange-50" },
          ].map((stat, i) => (
            <div key={i} className="rounded-2xl bg-white border border-gray-100 p-4">
              <div className={`inline-flex items-center justify-center rounded-xl p-2 ${stat.color}`}>{stat.icon}</div>
              <p className="mt-2 text-2xl font-extrabold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl bg-white border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900">{isAr ? "تفعيل/تعطيل النظام التلقائي" : "Enable/Disable Auto Engine"}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{isAr ? "عند التعطيل لن يتم إنشاء عروض جديدة تلقائياً" : "When disabled, no new offers will be generated automatically"}</p>
            </div>
            <button onClick={() => setConfig((p) => ({ ...p, enabled: !p.enabled }))} className="transition-colors">
              {config.enabled ? <ToggleOnIcon size={40} /> : <ToggleOffIcon size={40} />}
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-white border border-gray-100 overflow-hidden">
          <button onClick={() => setExpandedSection(expandedSection === "config" ? null : "config")} className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors">
            <h3 className="font-bold text-gray-900">{isAr ? "إعدادات الخصومات" : "Discount Settings"}</h3>
            {expandedSection === "config" ? <ChevronUpIcon size={18} /> : <ChevronDownIcon size={18} />}
          </button>
          {expandedSection === "config" && (
            <div className="border-t border-gray-100 p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">{isAr ? "خصم الطلب المرتفع %" : "High Demand %"}</label>
                  <input type="number" min="0" max="50" value={config.highDemandDiscount} onChange={(e) => setConfig((p) => ({ ...p, highDemandDiscount: +e.target.value }))} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">{isAr ? "خصم الطلب المنخفض %" : "Low Demand %"}</label>
                  <input type="number" min="0" max="50" value={config.lowDemandDiscount} onChange={(e) => setConfig((p) => ({ ...p, lowDemandDiscount: +e.target.value }))} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">{isAr ? "عدد منتجات الأسبوع" : "Products Per Week"}</label>
                  <input type="number" min="4" max="30" value={config.productsPerWeek} onChange={(e) => setConfig((p) => ({ ...p, productsPerWeek: +e.target.value }))} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">{isAr ? "حد أقصى للخصم %" : "Max Discount %"}</label>
                  <input type="number" min="5" max="50" value={config.maxDiscount} onChange={(e) => setConfig((p) => ({ ...p, maxDiscount: +e.target.value }))} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 rounded-2xl bg-white border border-gray-100 overflow-hidden">
          <button onClick={() => setExpandedSection(expandedSection === "excluded" ? null : "excluded")} className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <TrashIcon size={16} />
              {isAr ? "المنتجات المستبعدة" : "Excluded Products"}
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">{config.excludedProductIds.length}</span>
            </h3>
            {expandedSection === "excluded" ? <ChevronUpIcon size={18} /> : <ChevronDownIcon size={18} />}
          </button>
          {expandedSection === "excluded" && (
            <div className="border-t border-gray-100 p-5">
              <div className="relative mb-3">
                <SearchIcon size={14} />
                <input value={excludedSearch} onChange={(e) => setExcludedSearch(e.target.value)} placeholder={isAr ? "ابحث عن منتج لاستبعاده..." : "Search product to exclude..."} className="w-full rounded-xl border border-gray-200 pe-3 ps-9 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {filteredProducts.filter((p) => excludedSearch === "" || p.name.ar.includes(excludedSearch) || p.name.en.toLowerCase().includes(excludedSearch.toLowerCase())).slice(0, 30).map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                        {p.gallery[0] && <Image src={p.gallery[0]} alt={p.name.ar} fill className="object-cover" sizes="32px" />}
                      </div>
                      <span className="text-xs font-medium text-gray-700 truncate">{p.name.ar}</span>
                    </div>
                    <button onClick={() => toggleExclude(p.id)} className={`shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-bold transition-colors ${config.excludedProductIds.includes(p.id) ? "bg-red-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                      {config.excludedProductIds.includes(p.id) ? (isAr ? "مستبعد" : "Excluded") : (isAr ? "استبعاد" : "Exclude")}
                    </button>
                  </div>
                ))}
              </div>
              {excludedProducts.length > 0 && (
                <div className="mt-3 border-t border-gray-100 pt-3">
                  <p className="text-xs font-semibold text-red-600 mb-2">{isAr ? "المنتجات المستبعدة حالياً:" : "Currently excluded:"}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {excludedProducts.map((p) => (
                      <button key={p.id} onClick={() => toggleExclude(p.id)} className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-medium text-red-700 hover:bg-red-100 transition-colors">
                        {p.name.ar}
                        <XIcon size={10} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {monthCampaign && (
          <div className="mt-4 rounded-2xl bg-white border border-gray-100 overflow-hidden">
            <button onClick={() => setExpandedSection(expandedSection === "weeks" ? null : "weeks")} className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors">
              <h3 className="font-bold text-gray-900">{isAr ? "العروض الأسبوعية" : "Weekly Campaigns"}</h3>
              {expandedSection === "weeks" ? <ChevronUpIcon size={18} /> : <ChevronDownIcon size={18} />}
            </button>
            {expandedSection === "weeks" && (
              <div className="border-t border-gray-100 p-5 space-y-4">
                {monthCampaign.map((week) => (
                  <div key={week.id} className={`rounded-xl border p-4 ${week.week === currentWeek ? "border-primary/30 bg-primary/5" : "border-gray-100"}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${week.week === currentWeek ? "bg-primary text-white" : "bg-gray-100 text-gray-600"}`}>
                          {week.week === currentWeek && (isAr ? "← الحالي" : "← Current")}
                        </span>
                        <h4 className="text-sm font-bold text-gray-900">
                          {isAr ? `الأسبوع ${["", "الأول", "الثاني", "الثالث", "الرابع"][week.week]}` : `Week ${week.week}`}
                        </h4>
                        <span className="text-xs text-gray-400">{week.products.length} {isAr ? "منتج" : "products"}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                      {week.products.map((op) => {
                        const product = products.find((p) => p.id === op.productId);
                        if (!product) return null;
                        const reason = REASON_MAP[op.reason] || REASON_MAP.low_demand;
                        return (
                          <div key={op.productId} className="flex items-center gap-2 rounded-lg bg-white border border-gray-50 p-2">
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-50">
                              {product.gallery[0] && <Image src={product.gallery[0]} alt={product.name.ar} fill className="object-cover" sizes="40px" />}
                              <span className="absolute -bottom-0.5 -end-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-bold text-white">
                                -{op.discount}%
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-medium text-gray-700 truncate">{product.name.ar}</p>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[8px] font-bold ${reason.color}`}>
                                  {reason.ar}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 rounded-2xl bg-white border border-gray-100 overflow-hidden">
          <button onClick={() => setExpandedSection(expandedSection === "coverage" ? null : "coverage")} className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors">
            <h3 className="font-bold text-gray-900">{isAr ? "تغطية الفئات" : "Category Coverage"}</h3>
            {expandedSection === "coverage" ? <ChevronUpIcon size={18} /> : <ChevronDownIcon size={18} />}
          </button>
          {expandedSection === "coverage" && (
            <div className="border-t border-gray-100 p-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {CATEGORY_GROUPS.map((group) => {
                  const count = stats.categoryCoverage[group.slug] || 0;
                  const maxPossible = weekCampaign?.products.length ?? 12;
                  const pct = Math.min(100, (count / Math.max(maxPossible, 1)) * 100);
                  return (
                    <div key={group.slug} className="rounded-xl border border-gray-100 p-3 text-center">
                      <span className="text-xl">{group.icon}</span>
                      <p className="mt-1 text-[10px] font-bold text-gray-700">{isAr ? group.labelAr : group.labelEn}</p>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-1 text-[9px] text-gray-400">{count} {isAr ? "عرض" : "offers"}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-center">
          <button onClick={() => setConfirmReset(true)} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-6 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors">
            <TrashIcon size={14} />
            {isAr ? "مسح جميع البيانات وإعادة البدء" : "Reset All Data"}
          </button>
        </div>
      </ContainerComponent>

      <ConfirmDialog
        open={confirmReset}
        title="مسح جميع البيانات"
        message={isAr ? "سيتم حذف جميع العروض المولدة وإعادة تهيئة المحرك من الصفر. هل أنت متأكد؟" : "All generated offers will be deleted and the engine will be re-initialized. Are you sure?"}
        confirmLabel={isAr ? "مسح البيانات" : "Reset Data"}
        tone="danger"
        onConfirm={handleReset}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}

function ChevronDownIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

