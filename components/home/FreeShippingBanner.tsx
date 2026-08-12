"use client";

export default function FreeShippingBanner() {
  return (
    <div className="relative w-full overflow-hidden bg-gray-900 py-2.5">
      <div
        className="relative flex w-max will-change-transform"
        style={{ animation: "banner-marquee 30s linear infinite" }}
      >
        {[...Array(2)].map((_, i) => (
          <div key={i} aria-hidden={i === 1} className="flex shrink-0 items-center gap-4 px-6">
            <span className="text-xs font-semibold text-white/90">
              توصيل مجاني للطلبات فوق 30,000 لجميع المدن
            </span>
            <span className="text-lg text-amber-400">✦</span>
          </div>
        ))}
      </div>
    </div>
  );
}
