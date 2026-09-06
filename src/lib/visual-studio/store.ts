import { createAdminClient } from "@/src/lib/supabase";
import type { VisualTemplate, VisualMemoryEntry } from "./types";

const MEMORY_KEY = "visual_memory_v1";
const TEMPLATES_KEY = "visual_templates_v1";

// In-memory fallback (also persisted to site_settings blob)
let memoryCache: VisualMemoryEntry[] | null = null;
let templatesCache: VisualTemplate[] | null = null;

async function getSetting<T>(key: string, fallback: T): Promise<T> {
  try {
    const { getSetting } = await import("@/src/lib/site-settings");
    return await getSetting<T>(key, fallback);
  } catch { return fallback; }
}
async function setSetting<T>(key: string, value: T): Promise<void> {
  try {
    const { setSetting } = await import("@/src/lib/site-settings");
    await setSetting(key, value);
  } catch {}
}

export async function getVisualMemory(): Promise<VisualMemoryEntry[]> {
  if (memoryCache) return memoryCache;
  const data = await getSetting<VisualMemoryEntry[]>(MEMORY_KEY, []);
  memoryCache = Array.isArray(data) ? data : [];
  return memoryCache;
}

export async function addVisualMemoryEntry(entry: VisualMemoryEntry): Promise<void> {
  const mem = await getVisualMemory();
  mem.push(entry);
  memoryCache = mem;
  await setSetting(MEMORY_KEY, mem);
  // Best-effort Supabase
  try {
    const supabase: any = createAdminClient();
    await supabase.from("visual_memory").upsert({ id: entry.visualId, product_id: entry.productId, template_id: entry.templateId, division_key: entry.divisionKey, created_at: entry.createdAt } as never);
  } catch {}
}

export async function getVisualTemplates(): Promise<VisualTemplate[]> {
  if (templatesCache) return templatesCache;
  const data = await getSetting<VisualTemplate[]>(TEMPLATES_KEY, []);
  if (Array.isArray(data) && data.length > 0) {
    templatesCache = data;
    return data;
  }
  // Seed with 2 defaults from existing slides 15/16 style
  const seed: VisualTemplate[] = [
    { id: "tpl-editorial", nameAr: "تحريرية جمالية", nameEn: "Editorial Beauty", methodAr: "تركيز على المنتج كبطل مع نص تحريري", methodEn: "Product hero with editorial copy", referenceImage: "/images/hero/slide-15-custom.jpeg", style: "editorial_beauty", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: "tpl-minimal", nameAr: "منتج مينيمال", nameEn: "Minimal Product", methodAr: "خلفية بيضاء نظيفة مع المنتج", methodEn: "Clean white with product", referenceImage: "/images/hero/slide-16-custom.jpeg", style: "minimal_product", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ];
  templatesCache = seed;
  await setSetting(TEMPLATES_KEY, seed);
  return seed;
}

export async function upsertVisualTemplate(tpl: VisualTemplate): Promise<void> {
  const list = await getVisualTemplates();
  const idx = list.findIndex((x) => x.id === tpl.id);
  if (idx >= 0) list[idx] = tpl; else list.push(tpl);
  templatesCache = list;
  await setSetting(TEMPLATES_KEY, list);
  try {
    const supabase: any = createAdminClient();
    await supabase.from("visual_templates").upsert({ id: tpl.id, data: tpl } as never);
  } catch {}
}

export async function deleteVisualTemplate(id: string): Promise<void> {
  const list = (await getVisualTemplates()).filter((x) => x.id !== id);
  templatesCache = list;
  await setSetting(TEMPLATES_KEY, list);
  try {
    const supabase: any = createAdminClient();
    await supabase.from("visual_templates").delete().eq("id", id);
  } catch {}
}

export function divisionKeyFor(productIds: string[], templateId: string): string {
  return `${productIds.sort().join(",")}:${templateId}`;
}

export async function hasRecentVisualFor(productId: string, days = 30): Promise<boolean> {
  const mem = await getVisualMemory();
  const cutoff = Date.now() - days * 86400000;
  return mem.some((e) => e.productId === productId && Date.parse(e.createdAt) > cutoff);
}
