import {
  ROUTINES_STORAGE_KEY,
  loadCustomRoutines,
  saveCustomRoutines,
} from "@/src/data/routines-store";
import { routines as canonicalRoutines } from "@/src/data/product-summaries";
import type { Routine } from "@/types/product";
import type { ResourceAdapter } from "./types";

export const ROUTINES_DELETED_KEY = "luminous-routines-deleted";

/**
 * Overlay locally-saved routine overrides (created/edited via the admin) on top
 * of the canonical routine list, and hide routines that were soft-deleted
 * locally. Used client-side so that admin changes are visible even when
 * Supabase is unavailable.
 */
export function applyRoutineOverrides(base: Routine[]): Routine[] {
  if (typeof window === "undefined") return base;
  try {
    const deleted = new Set(
      JSON.parse(window.localStorage.getItem(ROUTINES_DELETED_KEY) || "[]") as string[],
    );
    const merged = [...base].filter((routine) => !deleted.has(routine.id));
    const stored = loadCustomRoutines();
    for (const routine of stored) {
      const index = merged.findIndex((item) => item.id === routine.id);
      if (index >= 0) merged[index] = routine;
      else merged.push(routine);
    }
    return merged;
  } catch {
    return base;
  }
}

export function listRoutines(): Routine[] {
  return applyRoutineOverrides(canonicalRoutines);
}

export function saveRoutineLocal(routine: Routine) {
  if (typeof window === "undefined") return;
  try {
    const existing = loadCustomRoutines();
    const index = existing.findIndex((item) => item.id === routine.id);
    if (index >= 0) existing[index] = routine;
    else existing.push(routine);
    saveCustomRoutines(existing);
    const deleted = new Set(
      JSON.parse(window.localStorage.getItem(ROUTINES_DELETED_KEY) || "[]") as string[],
    );
    deleted.delete(routine.id);
    window.localStorage.setItem(ROUTINES_DELETED_KEY, JSON.stringify([...deleted]));
  } catch {}
}

export function removeRoutineLocal(id: string) {
  if (typeof window === "undefined") return;
  try {
    saveCustomRoutines(loadCustomRoutines().filter((routine) => routine.id !== id));
    const deleted = new Set(
      JSON.parse(window.localStorage.getItem(ROUTINES_DELETED_KEY) || "[]") as string[],
    );
    deleted.add(id);
    window.localStorage.setItem(ROUTINES_DELETED_KEY, JSON.stringify([...deleted]));
  } catch {}
}

export const routinesAdapter: ResourceAdapter<Routine[]> = {
  resource: "routines",
  storageKeys: [ROUTINES_STORAGE_KEY, ROUTINES_DELETED_KEY],
  load: loadCustomRoutines,
  save: saveCustomRoutines,
};
