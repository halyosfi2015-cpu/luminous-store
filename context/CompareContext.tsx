"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

const STORAGE_KEY = "luminous-compare";
const MAX_COMPARE = 4;

type CompareContextType = {
  items: string[];
  toggle: (productId: string) => void;
  isCompared: (productId: string) => boolean;
  clear: () => void;
  count: number;
  isFull: boolean;
};

const CompareContext = createContext<CompareContextType | null>(null);

function load(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function save(items: string[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
}

export function CompareProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<string[]>(load);

  useEffect(() => { save(items); }, [items]);

  const toggle = useCallback((productId: string) => {
    setItems((prev) => {
      if (prev.includes(productId)) return prev.filter((id) => id !== productId);
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, productId];
    });
  }, []);

  const isCompared = useCallback((productId: string) => items.includes(productId), [items]);
  const clear = useCallback(() => setItems([]), []);

  return (
    <CompareContext.Provider value={{ items, toggle, isCompared, clear, count: items.length, isFull: items.length >= MAX_COMPARE }}>
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used within CompareProvider");
  return ctx;
}
