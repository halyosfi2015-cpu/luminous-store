"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ProductImage from "@/components/product/ProductImage";
import { ChevronLeft, Gift, Heart, MessageCircle, Flower2, Truck, Sparkles, Package, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Container from "@/components/ui/Container";
import { getBundleProducts } from "@/src/data/bundles";
import { listBundles, listGiftOptions } from "@/src/admin/adapters/local/bundles";
import { useLang } from "@/lib/use-lang";
import { trackClient } from "@/src/lib/analytics/client";
import { ANALYTICS_EVENT_TYPES } from "@/src/lib/analytics/types";

const WHATSAPP_NUMBER = "967771234567";

function buildWhatsAppMessage(bundle: { nameAr: string; bundlePrice: number; originalPrice: number; savingsPercent: number; products: { nameAr: string; price: number; }[]; image: string }): string {
  const lines: string[] = [];
  lines.push("🛍️ طلب باقة — Luminous Derma");
  lines.push(`📦 الباقة: ${bundle.nameAr}`);
  lines.push(`📏 السعر: ${bundle.bundlePrice} ر.ي`);
  lines.push("🛒 المنتجات:");
  bundle.products.forEach((p) => {
    lines.push(`• ${p.nameAr} × ${p.price} ر.ي`);
  });
  lines.push(`💰 ${bundle.bundlePrice} ر.ي (استفادة ${bundle.savingsPercent}%)`);
  lines.push("📋 التفاصيل:");
  lines.push("🧑 الاسم: (أدخل الاسم)");
  lines.push("📱 الهاتف: (أدخل الهاتف)");
  lines.push("📍 الموقع: (أدخل الموقع)");
  lines.push("📝 ملاحظات: (اختياري)");
  return encodeURIComponent(lines.join("\n"));
}

function formatPrice(amount: number): string {
  return amount.toLocaleString("ar-YE");
}
/* ================================================================================================ */
/* GIFT OPTIONS                            */
/* ================================================================================================ */
const SHIPPING_CITIES = [
  { name: "صنعاء", cost: 2000 },
  { name: "عدن", cost: 3000 },
  { name: "تعز", cost: 3000 },
  { name: "الحديدة", cost: 3000 },
  { name: "المكلا", cost: 4000 },
  { name: "إب", cost: 2500 },
  { name: "ذمار", cost: 2500 },
];

// Pure UI mapping: gift option id → icon. Data (labels/prices/descriptions/enabled)
// comes from the shared read path (listGiftOptions); new/admin-created options fall
// back to a default gift icon so the visual layout is preserved.
const GIFT_OPTION_ICONS: Record<string, LucideIcon> = {
  wrap: Gift,
  card: MessageCircle,
  ribbon: Gift,
  flower: Flower2,
};

export default function BundleDetailClient({ slug }: { slug: string }) {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const [giftMessage, setGiftMessage] = useState("");
  const [selectedCity, setSelectedCity] = useState<string>(SHIPPING_CITIES[0].name);
  const [selectedGifts, setSelectedGifts] = useState<string[]>([]);

  const allBundles = listBundles();
  const bundle = allBundles.find((b) => b.slug === slug) ?? null;
  const bundleProducts = bundle ? getBundleProducts(bundle) : [];
  const giftOptions = listGiftOptions();
  const selectedCityInfo = SHIPPING_CITIES.find((c) => c.name === selectedCity);
  const totalPrice =
    (bundle?.bundlePrice ?? 0) +
    selectedGifts.reduce((sum, id) => {
      const opt = giftOptions.find((g) => g.id === id);
      return sum + (opt?.price ?? 0);
    }, 0) +
    (selectedCityInfo?.cost ?? 0);

  const similarBundles = bundle
    ? allBundles
        .filter((b) => b.slug !== slug && b.occasion.some((o) => bundle.occasion.includes(o)))
        .slice(0, 3)
    : [];

  useEffect(() => {
    trackClient({
      event_type: ANALYTICS_EVENT_TYPES.BUNDLE_VIEW,
      entity_type: "bundle",
      entity_id: slug,
      properties: { slug },
    });
  }, [slug]);

  useEffect(() => {
    if (similarBundles.length > 0) {
      trackClient({
        event_type: ANALYTICS_EVENT_TYPES.RECOMMENDATION_IMPRESSION,
        properties: {
          type: "bundle_based",
          bundle_ids: similarBundles.map((s) => s.id),
          count: similarBundles.length,
          source: "similar_bundles",
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- similarBundles is derived from slug, so slug is sufficient
  }, [slug]);

  if (!bundle) {
    return (
      <div dir="rtl" className="w-full pb-16">
        <Container>
          <div className="py-24 text-center">
            <Package size={48} className="mx-auto text-muted" />
            <h1 className="mt-4 text-xl font-bold text-foreground">
              {isAr ? "الباقة غير موجودة" : "Bundle not found"}
            </h1>
            <Link
              href="/bundles"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              {isAr ? "تصفح الباقات" : "Browse Bundles"}
            </Link>
          </div>
        </Container>
      </div>
    );
  }

  const toggleGift = (id: string) => {
    setSelectedGifts((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const handleWhatsAppOrder = () => {
    const msg = buildWhatsAppMessage({
      nameAr: bundle.nameAr,
      bundlePrice: bundle.bundlePrice,
      originalPrice: bundle.originalPrice,
      savingsPercent: bundle.savingsPercent,
      products: bundleProducts.map((p) => ({ nameAr: p.name.ar, price: p.pricing.price })),
      image: bundle.image,
    });
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div dir="rtl" className="w-full pb-16">
      <Container>
        {/* = Breadcrumb = */}
        <nav aria-label="breadcrumb" className="pt-4">
          <ol className="flex items-center gap-1.5 text-sm text-muted">
            <li><Link href="/" className="transition-colors hover:text-primary">الرئيسية</Link></li>
            <ChevronLeft size={14} className="text-muted" />
            <li><Link href="/bundles" className="transition-colors hover:text-primary">الهدايا والباقات</Link></li>
            <ChevronLeft size={14} className="text-muted" />
            <li className="font-medium text-foreground">{bundle.nameAr}</li>
          </ol>
        </nav>

        {/* = Main Grid = */}
        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-2">
          {/* Image */}
          <div className="relative overflow-hidden rounded-3xl bg-gray-50">
            <div className="relative aspect-square">
          <ProductImage
                src={bundle.image}
                alt={bundle.nameAr}
                productId={bundle.id}
                hoverZoom={false}
                pedestal
                className="absolute inset-0"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            </div>
            {bundle.badge && (
              <div className="absolute top-4 start-4">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-white shadow-lg">
                  <Sparkles size={12} className="text-amber-400" />
                  {bundle.badgeAr || bundle.badge}
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col gap-6">
            <div>
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
                <Package size={12} className="text-primary" />
                <span className="text-[11px] font-bold text-primary">{bundleProducts.length} منتجات</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{bundle.nameAr}</h1>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">{bundle.descriptionAr}</p>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 rounded-2xl border border-gray-100 bg-white p-4">
              <span className="text-3xl font-bold text-gray-900">{formatPrice(bundle.bundlePrice)}</span>
              <span className="text-lg text-gray-400 line-through">{formatPrice(bundle.originalPrice)}</span>
              {bundleProducts.length >= 3 && (
                <span className="ms-auto rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
                  وفّري {bundle.savingsPercent}%
                </span>
              )}
            </div>

            {/* Products in bundle */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <h3 className="mb-4 text-sm font-bold text-gray-900">المنتجات في الباقة</h3>
              <div className="grid grid-cols-2 gap-3">
                {bundleProducts.map((p) => p && (
                  <div key={p.id} className="flex items-center gap-2 rounded-xl bg-gray-50 p-2.5">
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-white">
                      {p.gallery?.[0] && (
                        <ProductImage
                          src={p.gallery[0]}
                          alt={p.name.ar}
                          productId={p.id}
                          variant="soft"
                          hoverZoom={false}
                          pedestal={false}
                          className="absolute inset-0"
                          sizes="44px"
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[11px] font-semibold text-gray-800 line-clamp-1">{p.name.ar}</span>
                      <span className="text-[10px] text-gray-400">{p.brandAr}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gift options */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <h3 className="mb-4 text-sm font-bold text-gray-900">إضافات اختيارية</h3>
              <div className="grid grid-cols-2 gap-3">
                {giftOptions.map((opt) => {
                  const Icon = GIFT_OPTION_ICONS[opt.id] ?? Gift;
                  const selected = selectedGifts.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleGift(opt.id)}
                      className={`group relative flex flex-col items-start gap-2 rounded-2xl border-2 p-3.5 text-start transition-all duration-300 ${
                        selected
                          ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                          : "border-gray-100 hover:border-primary/30"
                      }`}
                    >
                      {selected && (
                        <div className="absolute top-2.5 end-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                          <Check size={11} />
                        </div>
                      )}
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-300 ${
                        selected ? "bg-primary text-white" : "bg-primary/10 text-primary"
                      }`}>
                        <Icon size={18} />
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-gray-900">{isAr ? opt.labelAr : opt.labelEn}</span>
                        <span className="text-[10px] text-gray-400">{isAr ? opt.descAr : opt.descEn}</span>
                        <span className="mt-1 block text-xs font-bold text-primary">+{formatPrice(opt.price)} {isAr ? "ر.ي" : "YER"}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Gift message */}
            {selectedGifts.includes("card") && (
              <div className="rounded-2xl border border-gray-100 bg-white p-5" style={{ animation: "megaMenuFadeIn 0.3s ease-out" }}>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">
                  <MessageCircle size={15} className="text-primary" />
                  رسالة الإهداء
                </h3>
                <textarea
                  value={giftMessage}
                  onChange={(e) => setGiftMessage(e.target.value)}
                  rows={3}
                  placeholder={isAr ? "اكتبي رسالة شخصية..." : "Write a personal message..."}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800 transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
            )}

            {/* Shipping info */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">
                <Truck size={15} className="text-primary" />
                معلومات الشحن
              </h3>
              <div className="flex flex-wrap gap-2">
                {SHIPPING_CITIES.map((city) => (
                  <button
                    key={city.name}
                    type="button"
                    onClick={() => setSelectedCity(city.name)}
                    className={`rounded-full px-4 py-2 text-xs font-bold transition-all duration-200 ${
                      selectedCity === city.name
                        ? "bg-primary text-white shadow-md shadow-primary/20"
                        : "bg-gray-50 text-gray-600 hover:bg-primary/10 hover:text-primary"
                    }`}
                  >
                    {city.name}
                    <span className="ms-1 text-[10px] font-normal opacity-70">({formatPrice(city.cost)})</span>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-gray-400">
                {isAr ? `تكلفة الشحن إلى ${selectedCity}: ${formatPrice(selectedCityInfo?.cost || 0)} ر.ي` : `Shipping to ${selectedCity}: ${formatPrice(selectedCityInfo?.cost || 0)} YER`}
              </p>
            </div>

{/* Add to cart */}
              <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{isAr ? "الإجمالي" : "Total"}</span>
                  <span className="text-xl font-extrabold text-gray-900">
                    {formatPrice(totalPrice)} {isAr ? "ر.ي" : "YER"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleWhatsAppOrder}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-4 text-sm font-bold text-white shadow-lg shadow-[#25D366]/30 transition-all duration-300 hover:bg-[#1ebe5b] active:scale-[0.98]"
                >
                  <MessageCircle size={18} />
                  {isAr ? "أرسل عبر واتساب" : "Complete Order via WhatsApp"}
                </button>
                {bundle.placeholder && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center">
                    <span className="text-[11px] font-semibold text-amber-600">⚠️ باقة تجريبية — قيد الإعداد</span>
                  </div>
                )}
              </div>
          </div>
        </div>

{/* = Similar Bundles = */}
        {similarBundles.length > 0 && (
          <div>
            <div className="mt-16">
              <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-primary">
                <Heart size={20} className="text-amber-500" />
                {isAr ? "قد يعجبك أيضاً" : "You May Also Like"}
              </h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {similarBundles.map((sim, index) => (
                  <Link
                    key={sim.id}
                    href={`/bundles/${sim.slug}`}
                    onClick={() => {
                      trackClient({
                        event_type: ANALYTICS_EVENT_TYPES.RECOMMENDATION_CLICK,
                        entity_type: "bundle",
                        entity_id: sim.id,
                        properties: {
                          type: "bundle_based",
                          position: index + 1,
                          source: "similar_bundles",
                        },
                      });
                    }}
                    className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:ring-2 hover:ring-amber-400/40"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-gray-50">
                      <ProductImage
                        src={sim.image}
                        alt={sim.nameAr}
                        productId={sim.id}
                        hoverZoom
                        pedestal={false}
                        className="absolute inset-0"
                        sizes="(max-width: 640px) 100vw, 33vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>
                    <div className="p-4">
                      <h3 className="text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-primary transition-colors">{sim.nameAr}</h3>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-base font-extrabold text-gray-900">{formatPrice(sim.bundlePrice)}</span>
                        <span className="text-xs text-gray-400 line-through">{formatPrice(sim.originalPrice)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}
