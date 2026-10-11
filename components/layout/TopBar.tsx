"use client";

import { useState, useEffect } from "react";
import { Globe, ChevronDown, Truck, Sparkles } from "lucide-react";
import Container from "@/components/ui/Container";
import { useLang } from "@/lib/use-lang";

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
  const { lang, setLang } = useLang();

  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIndex((i) => (i + 1) % shippingMessages[lang].length);
    }, 4000);
    return () => clearInterval(timer);
  }, [lang]);

  const currentMsg = shippingMessages[lang][msgIndex];

  const selectLang = (next: "ar" | "en") => {
    setLang(next);
    setShowLang(false);
  };

  return (
    <>
      <div
        dir={lang === "ar" ? "rtl" : "ltr"}
        className="relative z-[60] w-full bg-primary-dark/95 text-white border-b border-primary/20"
      >
        <Container>
          <div className="flex min-h-[36px] items-center justify-between gap-2 py-1 text-xs font-medium tracking-wide">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="flex min-w-0 items-center gap-1 animate-fade-in">
                <currentMsg.icon size={11} className="shrink-0 text-secondary" />
                <span className="text-[10px] leading-snug sm:text-xs sm:max-w-none sm:truncate sm:overflow-hidden sm:whitespace-nowrap sm:text-ellipsis">{currentMsg.text}</span>
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 ms-auto sm:gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowLang(!showLang)}
                  className="flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2 py-1.5 min-h-[32px] text-[10px] font-medium uppercase tracking-widest transition-all hover:bg-white/20 sm:px-3 sm:py-2 sm:min-h-[36px] sm:text-[11px]"
                  aria-expanded={showLang}
                  aria-haspopup="listbox"
                >
                  <Globe size={13} strokeWidth={2.5} className="shrink-0 text-white" />
                  <span>{lang === "ar" ? "عربي" : "EN"}</span>
                  <ChevronDown size={10} className={showLang ? "rotate-180" : ""} />
                </button>
                {showLang && (
                  <div className="absolute top-full end-0 mt-1.5 min-w-[140px] rounded-lg border border-border bg-card shadow-lg overflow-hidden z-50 animate-slide-down">
                    <button
                      onClick={() => selectLang("ar")}
                      className={`w-full px-4 py-3 min-h-[44px] text-start text-sm font-medium transition-colors hover:bg-accent ${lang === "ar" ? "bg-primary/10 font-bold text-primary" : "text-foreground"}`}
                    >
                      العربية {lang === "ar" ? "✓" : ""}
                    </button>
                    <button
                      onClick={() => selectLang("en")}
                      className={`w-full px-4 py-3 min-h-[44px] text-start text-sm font-medium transition-colors hover:bg-accent ${lang === "en" ? "bg-primary/10 font-bold text-primary" : "text-foreground"}`}
                    >
                      English {lang === "en" ? "✓" : ""}
                    </button>
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
