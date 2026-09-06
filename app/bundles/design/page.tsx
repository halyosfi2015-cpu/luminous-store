"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import ProductImage from "@/components/product/ProductImage";
import { Search, Plus, Minus, Trash2, ShoppingBag, Package, Check, Sparkles } from "lucide-react";
import Container from "@/components/ui/Container";
import { publishedProductSummaries as products } from "@/src/data/product-summaries";
import { useLang } from "@/lib/use-lang";
import { useCurrency, CurrencyProvider, type CurrencyCode } from "@/context/CurrencyContext";
import { useCart } from "@/context/CartContext";
import { getBundleDiscountPercent, fetchBundleDiscountFromAPI } from "@/src/data/bundle-discount";

type CartItem = {
  product: typeof products[0];
  quantity: number;
};

export default function DesignBundlePage() {
  return (
    <CurrencyProvider>
      <DesignBundlePageInner />
    </CurrencyProvider>
  );
}

const CATEGORY_AR_MAP: Record<string, string> = {
  cleansers: "المنظفات",
  toners: "التونر",
  serums: "السيروم",
  moisturizers: "المرطبات",
  sunscreen: "واقي الشمس",
  masks: "القناعات",
  exfoliants: "المقشرات",
  eye_care: "العناية بالعيون",
  lip_care: "العناية بالشفاه",
  skincare: "العناية بالبشرة",
  haircare: "العناية بالشعر",
  bodycare: "العناية بالجسم",
  makeup: "المكياج",
  perfume: "العطور",
  baby: "الأطفال والأمهات",
  tools: "الأدوات والمستلزمات",
};

function DesignBundlePageInner() {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const { currency, setCurrencyCode, formatPrice } = useCurrency();
  const { addItem } = useCart();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [bundleAdded, setBundleAdded] = useState(false);
  const [discountPercent, setDiscountPercent] = useState<number>(getBundleDiscountPercent());

  useEffect(() => {
    fetchBundleDiscountFromAPI().then(setDiscountPercent);
  }, []);

  const categories = useMemo(() => {
    const catMap = new Map<string, string>();
    products.forEach((p) => {
      if (p.categorySlug && !catMap.has(p.categorySlug)) {
        catMap.set(p.categorySlug, p.categoryAr || CATEGORY_AR_MAP[p.categorySlug] || p.categorySlug);
      }
    });
    return Array.from(catMap.entries()).map(([slug, nameAr]) => ({ slug, nameAr }));
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = search === "" ||
        p.name.ar.includes(search) ||
        p.name.en.toLowerCase().includes(search.toLowerCase()) ||
        (p.brandAr || "").includes(search) ||
        p.brand.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === null || p.categorySlug === selectedCategory;
      return matchesSearch && matchesCategory && p.inStock;
    });
  }, [search, selectedCategory]);

  const addToCart = (product: typeof products[0]) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const totalPrice = cart.reduce((sum, item) => sum + item.product.pricing.price * item.quantity, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const meetsMinimum = cart.length >= 3;
  const qualifiesForDiscount = cart.length >= 3;
  const discount = qualifiesForDiscount ? Math.round(totalPrice * (discountPercent / 100)) : 0;
  const bundleTotal = totalPrice - discount;
  const missingToMinimum = Math.max(0, 3 - cart.length);

  const handleAddToCart = () => {
    if (!meetsMinimum) return;
    const bundleId = `BUNDLE-${Date.now()}`;
    addItem({
      productId: bundleId,
      slug: "custom-bundle",
      name: isAr ? "باقة مخصصة" : "Custom Bundle",
      nameAr: "باقة مخصصة",
      price: bundleTotal,
      image: cart[0]?.product.gallery[0] ?? "",
      quantity: 1,
      inStock: true,
      kind: "bundle",
      bundle: {
        bundleId,
        bundleName: isAr ? "باقة مخصصة" : "Custom Bundle",
        discountPercent: qualifiesForDiscount ? discountPercent : 0,
        originalSubtotal: totalPrice,
        discount: qualifiesForDiscount ? discount : 0,
        giftMessage: "",
        items: cart.map((item) => ({
          productId: item.product.id,
          nameAr: item.product.name.ar,
          nameEn: item.product.name.en,
          price: item.product.pricing.price,
          quantity: item.quantity,
          image: item.product.gallery[0],
        })),
      },
    });
    setBundleAdded(true);
  };

  return (
    <Container className="py-8">
      {/* Discount Banner */}
      <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-rose-600 via-pink-500 to-fuchsia-500 p-6 text-center shadow-lg shadow-rose-200">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Sparkles size={20} className="text-amber-300" />
          <span className="text-lg font-bold text-white">
            {isAr ? "صمّمي باقتك واحصلي على خصم خاص!" : "Design Your Bundle & Get a Special Discount!"}
          </span>
          <Sparkles size={20} className="text-amber-300" />
        </div>
        <p className="text-sm text-white/90">
          {isAr
            ? `اختاري 3 منتجات أو أكثر واحصلي على خصم ${discountPercent}% على إجمالي طلبك`
            : `Choose 3 products or more and get ${discountPercent}% off your total order`}
        </p>
      </div>

      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          {isAr ? "صمّمي باقتك" : "Design Your Bundle"}
        </h1>
        <p className="text-gray-500">
          {isAr
            ? "اختاري المنتجات اللي تناسبك وصممي باقتك الخاصة"
            : "Choose the products that suit you and design your own bundle"}
        </p>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Products Section */}
        <div className="flex-1">
          {/* Search */}
          <div className="mb-4 relative">
            <Search size={18} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={isAr ? "ابحثي عن منتج..." : "Search for a product..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-rose-200 bg-white py-3 pe-4 ps-10 text-sm transition-all focus:border-rose-400 focus:ring-2 focus:ring-rose-100 focus:outline-none"
            />
          </div>

          {/* Category Filter */}
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${
                selectedCategory === null
                  ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-200"
                  : "bg-rose-50 text-rose-600 hover:bg-rose-100"
              }`}
            >
              {isAr ? "الكل" : "All"}
            </button>
            {categories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => setSelectedCategory(cat.slug)}
                className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${
                  selectedCategory === cat.slug
                    ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-200"
                    : "bg-rose-50 text-rose-600 hover:bg-rose-100"
                }`}
              >
                {cat.nameAr}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {filteredProducts.slice(0, 20).map((product) => {
              const inCart = cart.find((item) => item.product.id === product.id);
              return (
                <div
                  key={product.id}
                  className={`group relative overflow-hidden rounded-2xl border bg-white transition-all duration-300 hover:shadow-lg ${
                    inCart ? "border-rose-400 shadow-rose-100" : "border-gray-100 hover:border-rose-200"
                  }`}
                >
                  {/* Product Image */}
                  <div className="relative aspect-square overflow-hidden bg-gray-50">
                    {product.gallery[0] && (
                      <ProductImage
                        src={product.gallery[0]}
                        alt={product.name.ar}
                        productId={product.id}
                        hoverZoom
                        pedestal={false}
                        className="absolute inset-0 h-full w-full"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    )}
                    {inCart && (
                      <div className="absolute inset-0 bg-rose-500/10 flex items-center justify-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg">
                          <Check size={20} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-3">
                    <p className="mb-1 text-[10px] font-medium text-rose-400">{product.brandAr}</p>
                    <h3 className="mb-2 text-xs font-semibold text-gray-900 line-clamp-2">
                      {product.name.ar}
                    </h3>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-900">
                        {formatPrice(product.pricing.price)}
                      </span>
                      <button
                        onClick={() => addToCart(product)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-200 transition-all hover:shadow-lg hover:shadow-rose-300 active:scale-95"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cart Sidebar */}
        <div className="w-full shrink-0 lg:w-96">
          <div className="sticky top-24 overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-lg shadow-rose-50">
            {/* Cart Header */}
            <div className="bg-gradient-to-r from-rose-500 to-pink-500 px-6 py-4">
              <div className="flex items-center gap-2">
                <Package size={20} className="text-white" />
                <h2 className="text-lg font-bold text-white">
                  {isAr ? "باقة" : "Your Bundle"}
                </h2>
                <span className="ms-auto text-sm text-white/80">
                  {totalItems} {isAr ? "منتج" : "items"}
                </span>
                {/* Currency toggle */}
                <div className="flex items-center gap-1 rounded-full bg-white/20 p-0.5">
                  {(["YER", "SAR"] as CurrencyCode[]).map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setCurrencyCode(code)}
                      aria-pressed={currency.code === code}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-all ${
                        currency.code === code ? "bg-white text-rose-600" : "text-white/80 hover:text-white"
                      }`}
                    >
                      {code === "YER" ? "ر.ي" : "ر.س"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6">
              {cart.length === 0 ? (
                <div className="py-8 text-center text-gray-400">
                  <ShoppingBag size={40} className="mx-auto mb-3 text-rose-200" />
                  <p className="text-sm">
                    {isAr ? "لم تختاري أي منتج بعد" : "No products selected yet"}
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-4 max-h-80 space-y-3 overflow-y-auto">
                    {cart.map((item) => (
                      <div key={item.product.id} className="flex items-center gap-3 rounded-xl bg-rose-50/50 p-3">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white">
                          {item.product.gallery[0] && (
                            <ProductImage
                              src={item.product.gallery[0]}
                              alt={item.product.name.ar}
                              productId={item.product.id}
                              variant="clean"
                              hoverZoom={false}
                              pedestal={false}
                              className="absolute inset-0 h-full w-full"
                              sizes="48px"
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-gray-900">
                            {item.product.name.ar}
                          </p>
                          <p className="text-[10px] text-rose-400">
                            {formatPrice(item.product.pricing.price)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQuantity(item.product.id, -1)}
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-gray-600 transition-all hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Minus size={10} />
                          </button>
                          <span className="w-6 text-center text-xs font-semibold">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, 1)}
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-gray-600 transition-all hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Plus size={10} />
                          </button>
                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 transition-all hover:bg-red-50 hover:text-red-500"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total breakdown */}
                  <div className="mb-4 space-y-1.5 border-t border-rose-100 pt-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-600">
                        {isAr ? "سعر المنتجات" : "Products"}
                      </span>
                      <span className="text-gray-400 line-through">{formatPrice(totalPrice)}</span>
                    </div>
                    {qualifiesForDiscount ? (
                      <div className="flex items-center justify-between animate-fade-in">
                        <span className="font-medium text-gray-600">
                          {isAr ? `خصم ${discountPercent}%` : `${discountPercent}% Discount`}
                        </span>
                        <span className="text-emerald-600 font-semibold">-{formatPrice(discount)}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-600">
                          {isAr ? `خصم ${discountPercent}%` : `${discountPercent}% Discount`}
                        </span>
                        <span className="text-xs text-amber-500">
                          {isAr ? "أضيفي منتجاً إضافياً" : "Add 1 more"}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between border-t border-rose-100 pt-2">
                      <span className="font-semibold text-gray-900">
                        {isAr ? "سعر الباقة" : "Bundle Total"}
                      </span>
                      <span className="text-lg font-extrabold text-rose-600">{formatPrice(bundleTotal)}</span>
                    </div>
                    <p className="pt-1 text-[10px] text-gray-400">
                      {isAr
                        ? "التوصيل يُحدَّد عند إتمام الطلب — صنعاء 700 ر.ي وبقية المحافظات 1500 ر.ي."
                        : "Delivery is set at checkout — Sana'a 700 YER, other governorates 1500 YER."}
                    </p>
                  </div>

                  {/* Min-3 requirement notice */}
                  {!meetsMinimum && (
                    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-center">
                      <p className="text-xs font-semibold text-amber-700">
                        {isAr
                          ? `أضيفي ${missingToMinimum} ${missingToMinimum === 1 ? "منتجًا آخر" : "منتجات أخرى"} على الأقل لإكمال الباقة`
                          : `Add at least ${missingToMinimum} more ${missingToMinimum === 1 ? "product" : "products"} to complete your bundle`}
                      </p>
                    </div>
                  )}

                  {/* Add to cart */}
                  {bundleAdded ? (
                    <Link
                      href="/cart"
                      className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-sm font-bold text-white transition-all hover:bg-[#1ebe5b] active:scale-[0.98]"
                    >
                      <ShoppingBag size={18} />
                      {isAr ? "الانتقال إلى السلة لإتمام الطلب" : "Go to Cart to Complete Order"}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      disabled={!meetsMinimum}
                      className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 py-3 text-sm font-bold text-white shadow-lg shadow-rose-200 transition-all hover:shadow-xl hover:shadow-rose-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                    >
                      <ShoppingBag size={18} />
                      {isAr ? "أضيفي الباقة إلى السلة" : "Add Bundle to Cart"}
                    </button>
                  )}
                  <p className="text-center text-[10px] text-gray-400">
                    {isAr
                      ? "أكملي الطلب من صفحة إتمام الطلب الموحدة — نستقبل باقتك بالتفصيل عبر واتساب ثم نرسل لك طريقة الدفع."
                      : "Finish from the unified checkout — we receive your full bundle via WhatsApp, then send you the payment method."}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}
