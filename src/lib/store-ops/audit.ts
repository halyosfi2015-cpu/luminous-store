/**
 * PART 4 — BUSINESS AUDIT
 * =======================
 * Mirrors the content-ops audit pattern (makeAudit/appendAudit) so every
 * consequential business operation is audited with actor, action, entity,
 * previous/new state, timestamp and reason.
 */

import { randomUUID } from "node:crypto";
import type { BusinessAuditEntry, StoreOpsState } from "./types";

export function makeBusinessAudit(
  input: Omit<BusinessAuditEntry, "id" | "at" | "entityId"> & {
    at?: string;
    entityId?: string | null;
  },
): BusinessAuditEntry {
  return {
    id: randomUUID(),
    actor: input.actor,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    previous: input.previous ?? null,
    new: input.new ?? null,
    at: input.at ?? new Date().toISOString(),
    reason: input.reason ?? null,
  };
}

export function appendBusinessAudit(state: StoreOpsState, entry: BusinessAuditEntry): BusinessAuditEntry {
  state.audit.push(entry);
  return entry;
}

export function businessAuditFor(state: StoreOpsState, entityId: string): BusinessAuditEntry[] {
  return state.audit.filter((a) => a.entityId === entityId);
}