"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, Gift, Heart, MessageCircle, Flower2, Truck, Sparkles, Package, Check, ShoppingBag, Eye } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Container from "@/components/ui/Container";
import ProductCard from "@/components/product/ProductCard";
import QuickViewModal from "@/components/product/QuickViewModal";
import { getBundleProducts, bundles as staticBundles } from "@/src/data/bundles";
import { DEFAULT_GIFT_OPTIONS as staticGiftOptions } from "@/src/data/bundles-admin";
import { fetchCanonicalBundles } from "@/src/lib/canonical-bundles";
import type { Bundle } from "@/src/types/bundle";
import type { GiftOption } from "@/src/data/bundles-admin";
import { useLang } from "@/lib/use-lang";
import { useCart } from "@/context/CartContext";
import { trackClient } from "@/src/lib/analytics/client";
import { ANALYTICS_EVENT_TYPES } from "@/src/lib/analytics/types";
import type { ProductSummary } from "@/src/types/product";

function formatPrice(amount: number): string {
  return amount.toLocaleString("ar-YE");
}

const SHIPPING_CITIES = [
  { name: "صنعاء", cost: 700 },
  { name: "بقية المحافظات", cost: 1500 },
];

const GIFT_OPTION_ICONS: Record<string, LucideIcon> = {
  wrap: Gift,
  card: MessageCircle,
  ribbon: Gift,
  flower: Flower2,
};

export default function BundleDetailClient({ slug }: { slug: string }) {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const { addItem } = useCart();
  const [giftMessage, setGiftMessage] = useState("");
  const [selectedGifts, setSelectedGifts] = useState<string[]>([]);
  const [addedToCart, setAddedToCart] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<ProductSummary | null>(null);

  const staticFallback = useMemo(() => ({
    bundles: staticBundles as unknown as Bundle[],
    giftOptions: staticGiftOptions,
  }), []);

  const [canonical, setCanonical] = useState<{ bundles: Bundle[]; giftOptions: GiftOption[] }>(staticFallback);

  useEffect(() => {
    let cancelled = false;
    fetchCanonicalBundles()
      .then((d) => {
        if (!cancelled && d.bundles.length > 0) setCanonical(d);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const allBundles = canonical.bundles;
  const bundle = useMemo(() => allBundles.find((b) => b.slug === slug) ?? null, [allBundles, slug]);
  const bundleProducts = useMemo(() => bundle ? getBundleProducts(bundle) : [], [bundle]);
  const giftOptions = canonical.giftOptions;
  const selectedAddons = giftOptions.filter((g) => selectedGifts.includes(g.id));
  const addonsTotal = selectedAddons.reduce((sum, g) => sum + g.price, 0);
  const totalPrice = (bundle?.bundlePrice ?? 0) + addonsTotal;

  const similarBundles = useMemo(() =>
    bundle
      ? allBundles
          .filter((b) => b.slug !== slug && b.occasion.some((o) => bundle.occasion.includes(o)))
          .slice(0, 3)
      : [], [allBundles, slug, bundle]);

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
              href="/"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              {isAr ? "العودة للرئيسية" : "Back to Home"}
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

  const handleAddToCart = () => {
    if (!bundle) return;
    const bundleId = `BUNDLE-${Date.now()}`;
    const items = bundle.bundleItems ?? bundle.productIds.map((id) => ({ productId: id, quantity: 1 }));
    const lineItems = items.map((it) => {
      const p = bundleProducts.find((x) => x.id === it.productId);
      return {
        productId: it.productId,
        nameAr: p?.name.ar ?? it.productId,
        nameEn: p?.name.en,
        price: p ? (p.pricing.originalPrice ?? p.pricing.price) : 0,
        quantity: it.quantity,
        image: p?.gallery?.[0],
      };
    });
    addItem({
      productId: bundleId,
      slug: bundle.slug,
      name: bundle.nameEn,
      nameAr: bundle.nameAr,
      price: totalPrice,
      image: bundle.image,
      quantity: 1,
      inStock: true,
      kind: "bundle",
      bundle: {
        bundleId,
        bundleName: bundle.nameAr,
        discountPercent: bundle.discountPercent ?? bundle.savingsPercent,
        originalSubtotal: lineItems.reduce((sum, it) => sum + it.price * it.quantity, 0),
        discount: lineItems.reduce((sum, it) => sum + it.price * it.quantity, 0) - bundle.bundlePrice,
        addons: selectedAddons.map((a) => ({ id: a.id, labelAr: a.labelAr, price: a.price })),
        giftMessage: giftMessage.trim(),
        items: lineItems,
      },
    });
    setAddedToCart(true);
  };

  return (
    <div dir="rtl" className="w-full pb-16">
      <Container>
        <nav aria-label="breadcrumb" className="pt-4">
          <ol className="flex items-center gap-1.5 text-sm text-muted">
            <li><Link href="/" className="transition-colors hover:text-primary">الرئيسية</Link></li>
            <ChevronLeft size={14} className="text-muted" />
            <li><Link href="/" className="transition-colors hover:text-primary">باقات وهدايا</Link></li>
            <ChevronLeft size={14} className="text-muted" />
            <li className="font-medium text-foreground">{bundle.nameAr}</li>
          </ol>
        </nav>

        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-2">
          <div className="relative">
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
                <Package size={12} className="text-primary" />
                <span className="text-[11px] font-bold text-primary">{bundleProducts.length} {isAr ? "منتجات في الباقة" : "products in bundle"}</span>
              </span>
              {bundle.badge && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[10px] font-bold text-white shadow-lg">
                  <Sparkles size={10} className="text-amber-400" />
                  {bundle.badgeAr || bundle.badge}
                </span>
              )}
            </div>
            {bundleProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {bundleProducts.map((p) => p && (
                  <div key={p.id} className="relative group">
                    <ProductCard product={p} disableCart />
                    <button
                      type="button"
                      onClick={() => setQuickViewProduct(p)}
                      className="absolute end-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-500 shadow-md opacity-0 group-hover:opacity-100 transition-all hover:bg-primary hover:text-white"
                      title={isAr ? "تصفح سريع" : "Quick View"}
                    >
                      <Eye size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-3xl bg-gradient-to-br from-primary-100 to-secondary-100">
                <Sparkles size={48} className="text-primary/40" />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{bundle.nameAr}</h1>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">{bundle.descriptionAr}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {bundle.occasion.map((occ) => (
                  <span key={occ} className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">
                    {{ all:"الكل", bride:"عروس", engagement:"خطوبة", wedding:"زفاف", holidays:"أعياد", valentine:"عيد الحب", "mothers-day":"عيد الأم", summer:"صيف", winter:"شتاء" }[occ] ?? occ}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-baseline gap-3 rounded-2xl border border-gray-100 bg-white p-4">
              <span className="text-3xl font-bold text-gray-900">{formatPrice(bundle.bundlePrice)}</span>
              <span className="text-lg text-gray-400 line-through">{formatPrice(bundle.originalPrice)}</span>
              {bundleProducts.length >= 3 && bundle.savingsPercent > 0 && (
                <span className="ms-auto rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
                  وفّري {bundle.savingsPercent}%
                </span>
              )}
            </div>

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

            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">
                <Truck size={15} className="text-primary" />
                معلومات الشحن
              </h3>
              <div className="flex flex-wrap gap-2">
                {SHIPPING_CITIES.map((city) => (
                  <span
                    key={city.name}
                    className="rounded-full bg-gray-50 px-4 py-2 text-xs font-bold text-gray-600"
                  >
                    {city.name}
                    <span className="ms-1 text-[10px] font-normal text-gray-400">({formatPrice(city.cost)})</span>
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-gray-400">
                {isAr
                  ? "يُحدَّد التوصيل عند إتمام الطلب — داخل صنعاء 700 ر.ي وبقية المحافظات 1500 ر.ي."
                  : "Delivery is finalized at checkout — Sana'a 700 YER, other governorates 1500 YER."}
              </p>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{isAr ? "سعر الباقة + الإضافات" : "Bundle + Add-ons"}</span>
                <span className="text-xl font-extrabold text-gray-900">
                  {formatPrice(totalPrice)} {isAr ? "ر.ي" : "YER"}
                </span>
              </div>
              {addedToCart ? (
                <Link
                  href="/cart"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-4 text-sm font-bold text-white shadow-lg shadow-[#25D366]/30 transition-all duration-300 hover:bg-[#1ebe5b] active:scale-[0.98]"
                >
                  <ShoppingBag size={18} />
                  {isAr ? "الانتقال إلى السلة لإتمام الطلب" : "Go to Cart to Complete Order"}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={!bundleProducts.length}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-4 text-sm font-bold text-white shadow-lg shadow-[#25D366]/30 transition-all duration-300 hover:bg-[#1ebe5b] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ShoppingBag size={18} />
                  {isAr ? "أضيفي الباقة إلى السلة" : "Add Bundle to Cart"}
                </button>
              )}
              <p className="text-center text-[11px] text-gray-400">
                {isAr
                  ? "عند إتمام الطلب نستقبل باقتك كاملة بالتفصيل عبر واتساب ثم نرسل لك طريقة الدفع."
                  : "At checkout your full bundle details are sent to us via WhatsApp, then we send you the payment method."}
              </p>
              {bundle.placeholder && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center">
                  <span className="text-[11px] font-semibold text-amber-600">⚠️ باقة تجريبية — قيد الإعداد</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {similarBundles.length > 0 && (
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
        )}
      </Container>

      {quickViewProduct && (
        <QuickViewModal
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
          disableCart
        />
      )}
    </div>
  );
}
