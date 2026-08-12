"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { useCurrency, CURRENCIES } from "@/context/CurrencyContext";
import { useLang } from "@/lib/use-lang";

export default function CurrencySelector({ className = "" }: { className?: string }) {
  const { currency, setCurrencyCode } = useCurrency();
  const { lang } = useLang();
  const isAr = lang === "ar";
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(typeof window !== "undefined");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className={`relative shrink-0 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={isAr ? "اختيار العملة" : "Currency selector"}
        className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 shadow-sm transition-all duration-200 hover:border-primary/40 hover:text-primary active:scale-95"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">
          {currency.symbol}
        </span>
        <span className="hidden sm:inline">{currency.code}</span>
        <ChevronDown size={13} className={`text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && mounted && (
        <div className="absolute top-full end-0 z-50 mt-2 min-w-[170px] overflow-hidden rounded-xl border border-gray-100 bg-white p-1.5 shadow-xl shadow-primary/10 animate-slide-down">
          <p className="px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            {isAr ? "اختر العملة" : "Select currency"}
          </p>
          {CURRENCIES.map((opt) => {
            const active = opt.code === currency.code;
            return (
              <button
                key={opt.code}
                type="button"
                onClick={() => {
                  setCurrencyCode(opt.code);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-base leading-none">{opt.code === "YER" ? "🇾🇪" : "🇸🇦"}</span>
                  {isAr ? opt.labelAr : opt.labelEn}
                </span>
                <span className={`text-[10px] font-bold ${active ? "text-primary" : "text-gray-400"}`}>
                  {opt.symbol} {opt.code}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

