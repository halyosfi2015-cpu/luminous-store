"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { SkinType, SkinConcern } from "@/types/product";
import type { SkinProfile } from "@/lib/recommendations";

type SkinProfileContextType = {
  profile: SkinProfile | null;
  saveProfile: (skinTypes: SkinType[], skinConcerns: SkinConcern[]) => void;
  clearProfile: () => void;
};

const STORAGE_KEY = "luminous-skin-profile";

function loadProfile(): SkinProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.skinTypes) && Array.isArray(parsed.skinConcerns)) return parsed;
    return null;
  } catch { return null; }
}

const SkinProfileContext = createContext<SkinProfileContextType | null>(null);

export function SkinProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<SkinProfile | null>(() => loadProfile());

  useEffect(() => {
    if (profile) localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    else localStorage.removeItem(STORAGE_KEY);
  }, [profile]);

  const saveProfile = (skinTypes: SkinType[], skinConcerns: SkinConcern[]) => {
    setProfile({ skinTypes, skinConcerns, completedAt: new Date().toISOString() });
  };

  const clearProfile = () => setProfile(null);

  return (
    <SkinProfileContext.Provider value={{ profile, saveProfile, clearProfile }}>
      {children}
    </SkinProfileContext.Provider>
  );
}

export function useSkinProfile() {
  const ctx = useContext(SkinProfileContext);
  if (!ctx) throw new Error("useSkinProfile must be used within SkinProfileProvider");
  return ctx;
}
