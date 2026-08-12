import {
  EXPERTS_STORAGE_KEY,
  loadExperts,
  saveExperts,
} from "@/src/data/experts-admin";
import { experts as canonicalExperts } from "@/src/data/experts";
import type { Expert } from "@/src/types/expert";
import type { ResourceAdapter } from "./types";

export const EXPERTS_DELETED_KEY = "luminous-experts-deleted";

/**
 * Overlay locally-saved expert overrides (created/edited via the admin) on top
 * of the canonical expert list, and hide experts that were soft-deleted
 * locally. Used client-side so that admin changes are visible even when
 * Supabase is unavailable.
 */
export function applyExpertOverrides(base: Expert[]): Expert[] {
  if (typeof window === "undefined") return base;
  try {
    const deleted = new Set(
      JSON.parse(window.localStorage.getItem(EXPERTS_DELETED_KEY) || "[]") as string[],
    );
    const merged = [...base].filter((expert) => !deleted.has(expert.id));
    const stored = loadExperts();
    for (const expert of stored) {
      const index = merged.findIndex((item) => item.id === expert.id);
      if (index >= 0) merged[index] = expert;
      else merged.push(expert);
    }
    return merged;
  } catch {
    return base;
  }
}

export function listExperts(): Expert[] {
  return applyExpertOverrides(canonicalExperts);
}

export function saveExpertLocal(expert: Expert) {
  if (typeof window === "undefined") return;
  try {
    const existing = loadExperts();
    const index = existing.findIndex((item) => item.id === expert.id);
    if (index >= 0) existing[index] = expert;
    else existing.push(expert);
    saveExperts(existing);
    const deleted = new Set(
      JSON.parse(window.localStorage.getItem(EXPERTS_DELETED_KEY) || "[]") as string[],
    );
    deleted.delete(expert.id);
    window.localStorage.setItem(EXPERTS_DELETED_KEY, JSON.stringify([...deleted]));
  } catch {}
}

export function removeExpertLocal(id: string) {
  if (typeof window === "undefined") return;
  try {
    saveExperts(loadExperts().filter((expert) => expert.id !== id));
    const deleted = new Set(
      JSON.parse(window.localStorage.getItem(EXPERTS_DELETED_KEY) || "[]") as string[],
    );
    deleted.add(id);
    window.localStorage.setItem(EXPERTS_DELETED_KEY, JSON.stringify([...deleted]));
  } catch {}
}

export const expertsAdapter: ResourceAdapter<Expert[]> = {
  resource: "experts",
  storageKeys: [EXPERTS_STORAGE_KEY, EXPERTS_DELETED_KEY],
  load: loadExperts,
  save: saveExperts,
};
