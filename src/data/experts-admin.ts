import type { Expert } from "@/src/types/expert";

export const EXPERTS_STORAGE_KEY = "luminous-experts";

export function loadExperts(): Expert[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(EXPERTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [];
}

export function saveExperts(list: Expert[]) {
  try {
    window.localStorage.setItem(EXPERTS_STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

export function getExpertsWithDefaults(): Expert[] {
  const stored = loadExperts();
  if (stored.length > 0) return stored;
  return [];
}