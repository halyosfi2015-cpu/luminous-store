"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { HERO_SECTIONS, type HeroSectionConfig } from "@/lib/hero-config";

interface HeroState {
  currentSection: HeroSectionConfig;
  setCurrentSection: (section: HeroSectionConfig) => void;
}

const HeroContext = createContext<HeroState | null>(null);

export function HeroProvider({ children }: { children: ReactNode }) {
  const [currentSection, setCurrentSection] = useState<HeroSectionConfig>(HERO_SECTIONS[0]);

  return (
    <HeroContext.Provider
      value={{
        currentSection,
        setCurrentSection,
      }}
    >
      {children}
    </HeroContext.Provider>
  );
}

export function useHeroContext(): HeroState {
  const ctx = useContext(HeroContext);
  if (!ctx) throw new Error("useHeroContext must be used within HeroProvider");
  return ctx;
}
