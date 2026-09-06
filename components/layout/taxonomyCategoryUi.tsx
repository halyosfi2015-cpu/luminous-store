"use client";

import { Sparkles, ShowerHead, Flower2, Palette, FlaskRound, Smile, Eye, Baby, Pill, Wrench, Flame, Gem, Droplets, Heart, Sun, Hand, Boxes } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Master Taxonomy → storefront icon/color maps.
 * Shared by the home category cards, navbar, footer, category sidebar and the
 * /categories pages. Keyed by taxonomy CATEGORY slug (12 top-level categories).
 */
export const taxonomyCategoryIcons: Record<string, LucideIcon> = {
  skincare: Sparkles,
  bodycare: ShowerHead,
  haircare: Flower2,
  makeup: Palette,
  perfume: FlaskRound,
  "oral-care": Smile,
  "personal-care": Sparkles,
  "contact-lenses": Eye,
  "mother-baby": Baby,
  "health-wellness": Pill,
  "appliances-tools": Wrench,
  "home-fragrance": Flame,
  accessories: Gem,
};

/** Icon name → component map (used to resolve user-added categories). */
export const taxonomyIconByName: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  shower: ShowerHead,
  flower: Flower2,
  palette: Palette,
  flask: FlaskRound,
  smile: Smile,
  eye: Eye,
  baby: Baby,
  pill: Pill,
  wrench: Wrench,
  flame: Flame,
  gem: Gem,
  droplets: Droplets,
  heart: Heart,
  sun: Sun,
  hand: Hand,
  boxes: Boxes,
};

export function resolveTaxonomyIcon(name?: string): LucideIcon {
  if (name && taxonomyIconByName[name]) return taxonomyIconByName[name];
  return Sparkles;
}

export const taxonomyCategoryColors: Record<string, string> = {
  skincare: "from-primary to-secondary",
  bodycare: "from-accent to-accent/80",
  haircare: "from-secondary to-primary",
  makeup: "from-primary/80 to-secondary/80",
  perfume: "from-accent/80 to-primary/60",
  "oral-care": "from-sky-500 to-blue-600",
  "personal-care": "from-fuchsia-500 to-purple-600",
  "contact-lenses": "from-indigo-500 to-blue-600",
  "mother-baby": "from-rose-400 to-pink-600",
  "health-wellness": "from-emerald-500 to-teal-600",
  "appliances-tools": "from-slate-400 to-slate-600",
  "home-fragrance": "from-amber-500 to-orange-600",
  accessories: "from-fuchsia-400 to-purple-600",
};

export const taxonomyCategoryBgColors: Record<string, string> = {
  skincare: "from-primary/5 to-secondary/5",
  bodycare: "from-accent/10 to-accent/5",
  haircare: "from-secondary/5 to-primary/5",
  makeup: "from-primary/5 to-secondary/5",
  perfume: "from-accent/5 to-primary/5",
  "oral-care": "from-sky-50 to-blue-50",
  "personal-care": "from-fuchsia-50 to-purple-50",
  "contact-lenses": "from-indigo-50 to-blue-50",
  "mother-baby": "from-rose-50 to-pink-50",
  "health-wellness": "from-emerald-50 to-teal-50",
  "appliances-tools": "from-slate-50 to-slate-100",
  "home-fragrance": "from-amber-50 to-orange-50",
  accessories: "from-fuchsia-50 to-purple-50",
};
