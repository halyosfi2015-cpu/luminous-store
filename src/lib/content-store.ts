/**
 * Server-only content store — reads/writes the permanent JSON content files
 * under src/data/content. Used by API routes; never imported by client code.
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";
import type { HomepageContent } from "./home-content";
import type { TaxonomyNode } from "@/src/types/taxonomy";

const CONTENT_DIR = path.join(process.cwd(), "src", "data", "content");

const HOMEPAGE_FILE = path.join(CONTENT_DIR, "homepage.json");
const TAXONOMY_FILE = path.join(CONTENT_DIR, "taxonomy.json");
const LUMINOUS_FILE = path.join(CONTENT_DIR, "luminous-stage.json");
const PROBLEM_SOLUTIONS_FILE = path.join(CONTENT_DIR, "problemSolutions.json");
const SERVICES_FILE = path.join(CONTENT_DIR, "services.json");

export interface TaxonomyOverrides {
  nodes: TaxonomyNode[];
  hiddenSlugs: string[];
  /** Per-category product selection overrides keyed by category slug. */
  categoryProducts?: Record<string, CategoryProductOverride>;
}

/** Pinned products appear first in a category; excluded products are removed from it. */
export interface CategoryProductOverride {
  pinned?: string[];
  excluded?: string[];
}

function readJson<T>(file: string, fallback: T): T {
  try {
    let raw = readFileSync(file, "utf8");
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(file: string, data: unknown): void {
  mkdirSync(CONTENT_DIR, { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

export function readHomepageOverrides(): HomepageContent {
  return readJson<HomepageContent>(HOMEPAGE_FILE, { sections: {} });
}

export function writeHomepageOverrides(data: HomepageContent): void {
  writeJson(HOMEPAGE_FILE, data);
}

export function readTaxonomyOverrides(): TaxonomyOverrides {
  return readJson<TaxonomyOverrides>(TAXONOMY_FILE, { nodes: [], hiddenSlugs: [] });
}

export function writeTaxonomyOverrides(data: TaxonomyOverrides): void {
  writeJson(TAXONOMY_FILE, data);
}

export interface LuminousStageFile {
  slides: unknown[];
}

export function readLuminousStageOverrides(): LuminousStageFile | null {
  const data = readJson<LuminousStageFile | null>(LUMINOUS_FILE, null);
  if (!data || !Array.isArray((data as { slides?: unknown }).slides)) return null;
  return data;
}

export function writeLuminousStageOverrides(data: LuminousStageFile): void {
  writeJson(LUMINOUS_FILE, data);
}

export interface ProblemSolutionItem {
  id: string;
  labelAr: string;
  labelEn: string;
  taglineAr: string;
  taglineEn: string;
  descAr: string;
  descEn: string;
  image: string;
  accent: string;
  accentBg: string;
  emoji: string;
  routineAr: string[];
  routineEn: string[];
  hidden?: boolean;
  displayOrder?: number;
}

export interface ProblemSolutionsOverrides {
  items?: ProblemSolutionItem[];
  /** Per-concern product overrides keyed by concern slug (skinConcerns stays the base selection). */
  productOverrides?: Record<string, CategoryProductOverride>;
}

export function readProblemSolutionsOverrides(): ProblemSolutionsOverrides {
  return readJson<ProblemSolutionsOverrides>(PROBLEM_SOLUTIONS_FILE, {});
}

export function writeProblemSolutionsOverrides(data: ProblemSolutionsOverrides): void {
  writeJson(PROBLEM_SOLUTIONS_FILE, data);
}

/** Admin-editable beauty services. Icon is stored by name and mapped in the UI. */
export interface ServiceItemOverride {
  id: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  /** Arabic feature list; "|" separated for compact storage. */
  featuresAr: string;
  featuresEn: string;
  icon: string;
  href: string;
  available: boolean;
  hidden?: boolean;
  /** Optional service image URL. */
  image?: string;
  /** Optional tagline/subtitle. */
  taglineAr?: string;
  taglineEn?: string;
  /** Display order (lower = first). */
  displayOrder?: number;
}

export interface ServicesOverrides {
  items?: ServiceItemOverride[];
}

export function readServicesOverrides(): ServicesOverrides {
  return readJson<ServicesOverrides>(SERVICES_FILE, {});
}

export function writeServicesOverrides(data: ServicesOverrides): void {
  writeJson(SERVICES_FILE, data);
}