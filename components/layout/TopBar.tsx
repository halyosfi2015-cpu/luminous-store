"use client";

import { useState, useEffect } from "react";
import { Globe, ChevronDown, Truck, Sparkles } from "lucide-react";
import Container from "@/components/ui/Container";
import { useLang } from "@/lib/use-lang";
import { siteConfig } from "@/src/data/siteConfig";

const shippingMessages = {
  ar: [
    { text: "توصيل مجاني للطلبات التي تزيد عن 25,000 ريال", icon: Truck },
    { text: "منتجات أصلية 100٪ من أشهر العلامات التجارية العالمية", icon: Sparkles },
  ],
  en: [
    { text: "Free delivery on orders over YER 25,000", icon: Truck },
    { text: "100% authentic products from world-leading brands", icon: Sparkles },
  ],
};

export default function TopBar() {
  const [msgIndex, setMsgIndex] = useState(0);
  const [showLang, setShowLang] = useState(false);
  const [showCurrency, setShowCurrency] = useState(false);
  const { lang, setLang } = useLang();

  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIndex((i) => (i + 1) % shippingMessages[lang].length);
    }, 4000);
    return () => clearInterval(timer);
  }, [lang]);

  const currentMsg = shippingMessages[lang][msgIndex];
  const currency = siteConfig.currency;
  const currencySymbol = siteConfig.currencySymbol;

  const selectLang = (next: "ar" | "en") => {
    setLang(next);
    setShowLang(false);
  };

  return (
    <>
      <div
        dir={lang === "ar" ? "rtl" : "ltr"}
        className="w-full bg-primary-dark/95 text-white border-b border-primary/20"
      >
        <Container>
          <div className="flex h-10 items-center justify-between gap-2 text-[11px] font-medium tracking-wide sm:text-xs">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 animate-fade-in">
                <currentMsg.icon size={13} className="text-secondary" />
                <span>{currentMsg.text}</span>
              </span>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowLang(!showLang)}
                  className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-medium uppercase tracking-widest transition-all hover:bg-white/20"
                  aria-expanded={showLang}
                  aria-haspopup="listbox"
                >
                  <Globe size={12} className="text-secondary" />
                  <span className="hidden sm:inline">{lang === "ar" ? "العربية" : "English"}</span>
                  <ChevronDown size={10} className={showLang ? "rotate-180" : ""} />
                </button>
                {showLang && (
                  <div className="absolute top-full end-0 mt-1.5 min-w-[140px] rounded-lg border border-border bg-card shadow-lg overflow-hidden z-50 animate-slide-down">
                    <button
                      onClick={() => selectLang("ar")}
                      className="w-full px-4 py-2 text-start text-sm font-medium text-foreground hover:bg-accent"
                    >
                      العربية
                    </button>
                    <button
                      onClick={() => selectLang("en")}
                      className="w-full px-4 py-2 text-start text-sm font-medium text-foreground hover:bg-accent"
                    >
                      English
                    </button>
                  </div>
                )}
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCurrency(!showCurrency)}
                  className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-medium uppercase tracking-widest transition-all hover:bg-white/20"
                  aria-expanded={showCurrency}
                  aria-haspopup="listbox"
                >
                  <span className="text-secondary">{currencySymbol}</span>
                  <span className="hidden sm:inline">{currency}</span>
                  <ChevronDown size={10} className={showCurrency ? "rotate-180" : ""} />
                </button>
                {showCurrency && (
                  <div className="absolute top-full end-0 mt-1.5 min-w-[120px] rounded-lg border border-border bg-card shadow-lg overflow-hidden z-50 animate-slide-down">
                    {["YER", "SAR", "AED", "USD", "EUR"].map((curr) => (
                      <button
                        key={curr}
                        onClick={() => setShowCurrency(false)}
                        className="w-full px-4 py-2 text-start text-sm font-medium text-foreground hover:bg-accent"
                      >
                        {curr}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Container>
      </div>
      <style jsx>{`
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-down { animation: slide-down 150ms ease-out; }
      `}</style>
    </>
  );
}
