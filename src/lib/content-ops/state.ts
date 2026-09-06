/**
 * PART 2 — LIFECYCLE STATE MACHINE + AUDIT
 * ========================================
 * Valid transitions and a single audit record writer used by all operations.
 */

import { randomUUID } from "crypto";
import type { ContentOpsStatus, ContentAuditEntry, ContentAuditAction, ChannelKey } from "./types";
import { CONTENT_OPS_TRANSITIONS } from "./types";

export function canTransition(from: ContentOpsStatus, to: ContentOpsStatus): boolean {
  if (from === to) return true;
  return CONTENT_OPS_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: ContentOpsStatus, to: ContentOpsStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid lifecycle transition: ${from} → ${to}`);
  }
}

export function makeAudit(
  input: Omit<ContentAuditEntry, "id" | "at" | "versionId" | "previousStatus" | "newStatus"> & {
    at?: string;
    versionId?: string | null;
    previousStatus?: ContentOpsStatus | null;
    newStatus?: ContentOpsStatus | null;
  },
): ContentAuditEntry {
  return {
    id: randomUUID(),
    at: input.at ?? new Date().toISOString(),
    contentId: input.contentId ?? null,
    versionId: input.versionId ?? null,
    actor: input.actor,
    action: input.action,
    previousStatus: input.previousStatus ?? null,
    newStatus: input.newStatus ?? null,
    reason: input.reason,
    channel: input.channel,
    publicationResult: input.publicationResult,
  };
}

export interface AuditSink {
  audit: ContentAuditEntry[];
}

export function appendAudit(sink: AuditSink, entry: ContentAuditEntry): ContentAuditEntry {
  sink.audit.push(entry);
  return entry;
}

export function auditActionFor(
  from: ContentOpsStatus,
  to: ContentOpsStatus,
): ContentAuditAction {
  if (from === "PUBLISHING" && to === "PUBLISHED") return "PUBLISHED";
  if (to === "PUBLISH_FAILED") return "PUBLISH_FAILED";
  if (to === "SCHEDULED") return "SCHEDULED";
  if (to === "ARCHIVED") return "ARCHIVED";
  if (to === "CANCELLED") return "CANCELLED";
  if (to === "APPROVED") return "APPROVED";
  if (to === "VALIDATION_FAILED") return "VALIDATION_FAILED";
  if (from === "APPROVED" && to === "PUBLISHING") return "PUBLISH_STARTED";
  if (to === "REVIEW_REQUIRED") return "REVALIDATED";
  return "AI_GENERATED";
}

export type { ChannelKey };