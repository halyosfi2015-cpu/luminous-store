"use client";

import { useState, useMemo } from "react";
import { FaWhatsapp } from "react-icons/fa";
import ProductImage from "@/components/product/ProductImage";
import { Search, Plus, Minus, Trash2, ShoppingBag, Package, Check, Sparkles, Truck, MapPin } from "lucide-react";
import Container from "@/components/ui/Container";
import { productSummaries as products } from "@/src/data/product-summaries";
import { useLang } from "@/lib/use-lang";
import { useCurrency, CurrencyProvider, type CurrencyCode } from "@/context/CurrencyContext";

/* رقم واتساب المتجر — عدّليه هنا إن لزم */
const WHATSAPP_NUMBER = "967771234567";

/* خيارات التوصيل: صنعاء 700 / باقي المحافظات 1500 (بالريال اليمني) */
const DELIVERY_OPTIONS = [
  { id: "sanaa", fee: 700, nameAr: "صنعاء", nameEn: "Sana'a" },
  { id: "other", fee: 1500, nameAr: "باقي المحافظات", nameEn: "Other Governorates" },
];

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

function DesignBundlePageInner() {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const { currency, setCurrencyCode, formatPrice } = useCurrency();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerArea, setCustomerArea] = useState("");
  const [delivery, setDelivery] = useState<string>("sanaa");

  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.categorySlug));
    return Array.from(cats);
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
            return newQty > 0 ? { ...item, quantity: newQty } : item;
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const totalPrice = cart.reduce((sum, item) => sum + item.product.pricing.price * item.quantity, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  /* الخصم متاح فقط عند اختيار 3 منتجات أو أكثر */
  const qualifiesForDiscount = cart.length >= 3;
  const discount = qualifiesForDiscount ? Math.round(totalPrice * 0.1) : 0;
  const discountedPrice = totalPrice - discount;
  const deliveryOption = DELIVERY_OPTIONS.find((o) => o.id === delivery) ?? DELIVERY_OPTIONS[0];
  const deliveryFee = deliveryOption.fee;
  const finalTotal = discountedPrice + deliveryFee;

  const handleWhatsAppSubmit = () => {
    if (cart.length === 0) return;
    const lines: string[] = [];
    lines.push(isAr ? "🛍️ طلب باقة — Luminous Derma" : "🛍️ Bundle Order — Luminous Derma");
    lines.push(`${isAr ? "👤 الاسم" : "👤 Name"}: ${customerName || "—"}`);
    lines.push(`${isAr ? "📱 الهاتف" : "📱 Phone"}: ${customerPhone || "—"}`);
    lines.push(`${isAr ? "📍 التوصيل إلى" : "📍 Delivery to"}: ${isAr ? deliveryOption.nameAr : deliveryOption.nameEn} (${formatPrice(deliveryFee)})`);
    if (customerArea) lines.push(`${isAr ? "🏠 المنطقة / الحي" : "🏠 Area / District"}: ${customerArea}`);
    lines.push("🛒");
    cart.forEach((item) =>
      lines.push(`• ${item.product.name.ar} × ${item.quantity} = ${formatPrice(item.product.pricing.price * item.quantity)}`)
    );
    lines.push(`💰 ${isAr ? "إجمالي المنتجات" : "Products"}: ${formatPrice(totalPrice)}`);
    lines.push(`🚚 ${isAr ? "التوصيل" : "Delivery"}: ${formatPrice(deliveryFee)}`);
    if (qualifiesForDiscount) {
      lines.push(`🎁 ${isAr ? "الخصم (10%)" : "Discount (10%)"}: -${formatPrice(discount)}`);
    }
    lines.push(`✅ ${isAr ? "الإجمالي" : "Total"}: ${formatPrice(finalTotal)}`);
    const msg = encodeURIComponent(lines.join("\n"));
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, "_blank", "noopener,noreferrer");
  };

  return (
    <Container className="py-8">
      {/* Discount Banner */}
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-gray-900 to-gray-800 p-6 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Sparkles size={20} className="text-amber-400" />
          <span className="text-lg font-bold text-white">
            {isAr ? "احصلي على خصم خاص!" : "Get a Special Discount!"}
          </span>
          <Sparkles size={20} className="text-amber-400" />
        </div>
        <p className="text-sm text-white/80">
          {isAr
            ? "اختاري 3 منتجات أو أكثر واحصلي على خصم 10% على إجمالي طلبك"
            : "Choose 3 products or more and get 10% off your total order"}
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
          {/* Search & Filter */}
          <div className="mb-6 flex gap-4">
            <div className="relative flex-1">
              <Search size={18} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={isAr ? "ابحثي عن منتج..." : "Search for a product..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white py-3 pe-4 ps-10 text-sm transition-all focus:border-gray-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`rounded-full px-4 py-2 text-xs font-medium transition-all ${
                selectedCategory === null
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {isAr ? "الكل" : "All"}
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat ?? null)}
                className={`rounded-full px-4 py-2 text-xs font-medium transition-all ${
                  selectedCategory === cat
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {filteredProducts.slice(0, 20).map((product) => {
              const inCart = cart.find((item) => item.product.id === product.id);
              return (
                <div
                  key={product.id}
                  className={`group relative overflow-hidden rounded-2xl border bg-white transition-all duration-300 hover:shadow-lg ${
                    inCart ? "border-gray-900" : "border-gray-100"
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
                      <div className="absolute inset-0 bg-gray-900/20 flex items-center justify-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-white">
                          <Check size={20} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-3">
                    <p className="mb-1 text-[10px] font-medium text-gray-400">{product.brandAr}</p>
                    <h3 className="mb-2 text-xs font-semibold text-gray-900 line-clamp-2">
                      {product.name.ar}
                    </h3>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-900">
                        {formatPrice(product.pricing.price)}
                      </span>
                      <button
                        onClick={() => addToCart(product)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-white transition-all hover:bg-gray-800 active:scale-95"
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
          <div className="sticky top-24 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Package size={20} className="text-gray-900" />
              <h2 className="text-lg font-bold text-gray-900">
                {isAr ? "باقة" : "Your Bundle"}
              </h2>
              <span className="ms-auto text-sm text-gray-400">
                {totalItems} {isAr ? "منتج" : "items"}
              </span>
              {/* Currency toggle — display only, no stored price changes */}
              <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 p-0.5">
                {(["YER", "SAR"] as CurrencyCode[]).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setCurrencyCode(code)}
                    aria-pressed={currency.code === code}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-all ${
                      currency.code === code ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    {code === "YER" ? "ر.ي" : "ر.س"}
                  </button>
                ))}
              </div>
            </div>

            {cart.length === 0 ? (
              <div className="py-8 text-center text-gray-400">
                <ShoppingBag size={40} className="mx-auto mb-3 text-gray-200" />
                <p className="text-sm">
                  {isAr ? "لم تختاري أي منتج بعد" : "No products selected yet"}
                </p>
              </div>
            ) : (
              <>
                <div className="mb-4 max-h-80 space-y-3 overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                       <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white">
                         {item.product.gallery[0] && (
                           <ProductImage
                             src={item.product.gallery[0]}
                             alt={item.product.name.ar}
                             productId={item.product.id}
                              variant="soft"
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
                        <p className="text-[10px] text-gray-400">
                          {formatPrice(item.product.pricing.price)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-gray-600 transition-all hover:bg-gray-100"
                        >
                          <Minus size={10} />
                        </button>
                        <span className="w-6 text-center text-xs font-semibold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-gray-600 transition-all hover:bg-gray-100"
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

                {/* Delivery filter — صنعاء 700 / باقي المحافظات 1500 */}
                <div className="mb-4">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-gray-900">
                    <Truck size={14} className="text-gray-500" />
                    {isAr ? "التوصيل إلى" : "Delivery to"}
                  </p>
                  <div className="space-y-2">
                    {DELIVERY_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setDelivery(opt.id)}
                        aria-pressed={delivery === opt.id}
                        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition-all ${
                          delivery === opt.id
                            ? "border-gray-900 bg-gray-900 text-white"
                            : "border-gray-200 bg-white text-gray-600 hover:border-gray-400"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <MapPin size={14} className={delivery === opt.id ? "text-amber-300" : "text-gray-400"} />
                          {isAr ? opt.nameAr : opt.nameEn}
                        </span>
                        <span className={`text-xs font-bold ${delivery === opt.id ? "text-amber-300" : "text-gray-500"}`}>
                          {formatPrice(opt.fee)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Total breakdown: products + delivery + total */}
                <div className="mb-4 space-y-1.5 border-t border-gray-100 pt-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-600">
                      {isAr ? "سعر المنتجات" : "Products"}
                    </span>
                    <span className="text-gray-400 line-through">{formatPrice(totalPrice)}</span>
                  </div>
                  {qualifiesForDiscount ? (
                    <div className="flex items-center justify-between animate-fade-in">
                      <span className="font-medium text-gray-600">
                        {isAr ? "خصم 10%" : "10% Discount"}
                      </span>
                      <span className="text-emerald-600">-{formatPrice(discount)}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-600">
                        {isAr ? "خصم 10%" : "10% Discount"}
                      </span>
                      <span className="text-xs text-amber-500">
                        {isAr ? "أضيفي منتجاً إضافياً" : "Add 1 more"}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-600">
                      {isAr ? "التوصيل" : "Delivery"}
                    </span>
                    <span className="text-gray-600">{formatPrice(deliveryFee)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                    <span className="font-semibold text-gray-900">
                      {isAr ? "الإجمالي" : "Total"}
                    </span>
                    <span className="text-lg font-extrabold text-gray-900">{formatPrice(finalTotal)}</span>
                  </div>
                </div>

                {/* Beneficiary data */}
                <div className="mb-4 space-y-3">
                  <input
                    type="text"
                    placeholder={isAr ? "اسم المستلم" : "Recipient name"}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-gray-400 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder={isAr ? "المنطقة / الحي" : "Area / District"}
                    value={customerArea}
                    onChange={(e) => setCustomerArea(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-gray-400 focus:outline-none"
                  />
                  <input
                    type="tel"
                    placeholder={isAr ? "رقم الهاتف" : "Phone number"}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-gray-400 focus:outline-none"
                  />
                </div>

                {/* WhatsApp submit */}
                <button
                  onClick={handleWhatsAppSubmit}
                  disabled={cart.length === 0}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-sm font-bold text-white transition-all hover:bg-[#1ebe5b] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FaWhatsapp size={18} />
                  {isAr ? "إرسال الطلب عبر واتساب" : "Send Order via WhatsApp"}
                </button>
                <p className="mt-2 text-center text-[10px] text-gray-400">
                  {isAr
                    ? "سيتم فتح واتساب برسالة جاهزة تتضمن تفاصيل باقتك"
                    : "WhatsApp will open with your bundle details pre-filled"}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </Container>
  );
}
