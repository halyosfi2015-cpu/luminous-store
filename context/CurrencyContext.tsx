"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export type CurrencyCode = "YER" | "SAR";

export type Currency = {
  code: CurrencyCode;
  symbol: string;
  labelAr: string;
  labelEn: string;
  rate: number; // how many YER per 1 unit of this currency
};

export const CURRENCIES: Currency[] = [
  { code: "YER", symbol: "ر.ي", labelAr: "ريال يمني", labelEn: "Yemeni Rial", rate: 1 },
  { code: "SAR", symbol: "ر.س", labelAr: "ريال سعودي", labelEn: "Saudi Riyal", rate: 1 / 84 },
];

const STORAGE_KEY = "luminous-currency";

type CurrencyContextType = {
  currency: Currency;
  setCurrencyCode: (code: CurrencyCode) => void;
  convert: (amountInYer: number) => number;
  formatPrice: (amountInYer: number) => string;
};

const CurrencyContext = createContext<CurrencyContextType | null>(null);

function loadCurrency(): CurrencyCode {
  if (typeof window === "undefined") return "YER";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "SAR" || raw === "YER") return raw;
  } catch {}
  return "YER";
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<Currency>(() => {
    if (typeof window !== "undefined") {
      const loaded = loadCurrency();
      return CURRENCIES.find((c) => c.code === loaded) || CURRENCIES[0];
    }
    return CURRENCIES[0];
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, currency.code);
    } catch {}
  }, [currency]);

  const setCurrencyCode = useCallback((code: CurrencyCode) => {
    setCurrency(CURRENCIES.find((c) => c.code === code) || CURRENCIES[0]);
  }, []);

  const convert = useCallback(
    (amountInYer: number) => Math.round(amountInYer * currency.rate),
    [currency]
  );

  const formatPrice = useCallback(
    (amountInYer: number) => {
      const converted = Math.round(amountInYer * currency.rate);
      return `${converted.toLocaleString("ar-YE")} ${currency.symbol}`;
    },
    [currency]
  );

  return (
    <CurrencyContext.Provider value={{ currency, setCurrencyCode, convert, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}

