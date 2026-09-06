/**
 * PART 1 — CONTENT STORE (Part-1 persistence)
 * ===========================================
 *
 * Part 1 stores generated content in an in-memory registry (per server
 * process) so the admin API can list/retrieve what the engine generated.
 * This is intentionally NOT scheduling/publishing infrastructure — Part 2 owns
 * that. The registry is seeded from the engine on generation and can be
 * re-hydrated by the caller.
 *
 * NOTE: Because this runs server-side and the engine is deterministic, the
 * in-memory store is enough for Part 1. Persistence to Supabase (a
 * `content_items` table) is a Part 2 concern.
 */

import type { ContentItem } from "./types";

const registry = new Map<string, ContentItem>();

export function saveContentItem(item: ContentItem): void {
  registry.set(item.id, item);
}

export function saveContentItems(items: ContentItem[]): void {
  for (const item of items) saveContentItem(item);
}

export function getContentItem(id: string): ContentItem | null {
  return registry.get(id) ?? null;
}

export function listContentItems(): ContentItem[] {
  return [...registry.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listContentItemsByStatus(status: ContentItem["status"]): ContentItem[] {
  return listContentItems().filter((i) => i.status === status);
}

export function clearContentItems(): void {
  registry.clear();
}

export function contentStoreSize(): number {
  return registry.size;
}