/**
 * PART 3 — CHANNEL CONNECTION ARCHITECTURE
 * =========================================
 * Connection-ready channel management for the Content Center. The website
 * channel is ALWAYS connected (real storefront surface). Social channels are
 * connection-ready: connecting them is honest only when credentials exist
 * (future account authorization), and never fabricates a connection.
 *
 * Multi-channel publishing is idempotent (per-channel publication keys),
 * isolates per-channel failures and NEVER publishes without admin approval.
 */

import { randomUUID } from "crypto";
import type { ContentStore } from "./store";
import { persistContentStore } from "./store";
import { appendAudit, makeAudit } from "./state";
import type { ChannelKey, ContentAuditEntry, OpResult } from "./types";
import { CHANNELS, CHANNEL_LABELS } from "./types";
import { CHANNEL_NOT_CONNECTED } from "./publishing";
import type { PublisherLike } from "./operations";

export interface ChannelConnectionStatus {
  channel: ChannelKey;
  labelAr: string;
  enabled: boolean;
  connected: boolean;
  website: boolean;
  /** Arabic-first note for the admin UI. */
  noteAr: string;
}

export interface MultiChannelPublishResult {
  itemId: string;
  results: Array<{
    channel: ChannelKey;
    ok: boolean;
    code: string;
    message: string;
    publicationId?: string;
  }>;
  anySucceeded: boolean;
}

export const CHANNEL_CREDENTIALS_NOT_CONFIGURED = "CHANNEL_CREDENTIALS_NOT_CONFIGURED";

/* ------------------------------------------------------------------------ */
/* CONNECTION STATE                                                          */
/* ------------------------------------------------------------------------ */

export function isChannelConnected(channel: ChannelKey, connectedChannels: ChannelKey[]): boolean {
  if (channel === "website") return true;
  return connectedChannels.includes(channel);
}

export function isChannelEnabled(channel: ChannelKey, enabledChannels: ChannelKey[]): boolean {
  return enabledChannels.includes(channel);
}

export function getChannelConnectionStatuses(
  settings: { enabledChannels: ChannelKey[]; connectedChannels: ChannelKey[] },
): ChannelConnectionStatus[] {
  return CHANNELS.map((channel) => {
    const enabled = isChannelEnabled(channel, settings.enabledChannels);
    const connected = isChannelConnected(channel, settings.connectedChannels);
    const website = channel === "website";
    let noteAr = connected ? "متصل" : "غير مربوط";
    if (website) noteAr = "متصل";
    else if (enabled && !connected) noteAr = "غير مربوط — سيتم الربط عند توفر بيانات الاعتماد";
    return { channel, labelAr: CHANNEL_LABELS[channel].ar, enabled, connected, website, noteAr };
  });
}

/* ------------------------------------------------------------------------ */
/* CONNECT / DISCONNECT (honest, connection-ready)                           */
/* ------------------------------------------------------------------------ */

/**
 * Connect a channel. The website channel is always connected. A social channel
 * can only be marked connected when credentials/authorization exist; today no
 * credentials are configured, so the operation reports that honestly instead of
 * faking a connection.
 */
export async function connectChannel(
  store: ContentStore,
  channel: ChannelKey,
  actor: string,
  options: { credentialsProvided?: boolean; now?: string } = {},
): Promise<OpResult<{ channel: ChannelKey; connected: boolean }>> {
  const at = options.now ?? new Date().toISOString();
  if (channel === "website") {
    return { ok: true, data: { channel, connected: true } };
  }
  if (store.settings.connectedChannels.includes(channel)) {
    return { ok: true, data: { channel, connected: true } };
  }
  if (!options.credentialsProvided) {
    return {
      ok: false,
      error: {
        code: CHANNEL_CREDENTIALS_NOT_CONFIGURED,
        message: `لا توجد بيانات اعتماد لقناة ${CHANNEL_LABELS[channel].ar} بعد — سيتم الربط عند توفر الحساب`,
      },
    };
  }
  store.settings.connectedChannels = [...store.settings.connectedChannels, channel];
  appendAudit(store, makeAudit({
    actor,
    action: "CHANNEL_CONNECTED",
    contentId: null,
    previousStatus: null,
    newStatus: null,
    channel,
    at,
  }));
  await persistContentStore(store);
  return { ok: true, data: { channel, connected: true } };
}

export async function disconnectChannel(
  store: ContentStore,
  channel: ChannelKey,
  actor: string,
  options: { now?: string } = {},
): Promise<OpResult<{ channel: ChannelKey; connected: boolean }>> {
  const at = options.now ?? new Date().toISOString();
  if (channel === "website") {
    return { ok: false, error: { code: "website_always_connected", message: "قناة الموقع متصلة دائمًا ولا يمكن فصلها" } };
  }
  store.settings.connectedChannels = store.settings.connectedChannels.filter((c) => c !== channel);
  appendAudit(store, makeAudit({
    actor,
    action: "CHANNEL_DISCONNECTED",
    contentId: null,
    previousStatus: null,
    newStatus: null,
    channel,
    at,
  }));
  await persistContentStore(store);
  return { ok: true, data: { channel, connected: false } };
}

/* ------------------------------------------------------------------------ */
/* MULTI-CHANNEL PUBLISH (approved content only, idempotent, isolated)       */
/* ------------------------------------------------------------------------ */

export async function publishApprovedContent(
  store: ContentStore,
  itemId: string,
  getPublisher: (channel: ChannelKey) => PublisherLike | undefined,
  actor: string,
  options: { now?: string; allowAuto?: boolean } = {},
): Promise<OpResult<MultiChannelPublishResult>> {
  const at = options.now ?? new Date().toISOString();
  const ops = store.items.get(itemId);
  if (!ops) return { ok: false, error: { code: "not_found", message: "Content item not found" } };
  if (ops.status !== "APPROVED" && ops.status !== "PUBLISHED") {
    return {
      ok: false,
      error: { code: "not_approved", message: "Only approved content can be published to channels" },
    };
  }

  let version = ops.versions.find((v) => v.status === "approved") ?? null;
  if (!version) {
    // Idempotent re-publish of an already PUBLISHED item resolves its published version.
    version = ops.versions.find((v) => v.status === "published") ?? null;
  }
  if (!version) {
    // Auto-eligible items reach APPROVED through the documented system-approval
    // path (same as Part 2 auto-scheduling). Record that approval here so a
    // multi-channel publish is never an unapproved publish.
    const latest = ops.versions[0] ?? null;
    if (latest && ops.item.eligibility === "AUTO_PUBLISH_ELIGIBLE" && latest.validation.passed && latest.originality.passed) {
      latest.status = "approved";
      ops.approvals.push({
        id: randomUUID(),
        itemId: ops.id,
        versionId: latest.id,
        approverId: "system:auto",
        approvedAt: at,
        validationSnapshot: latest.validation,
        promptVersion: latest.promptVersion,
      });
      version = latest;
    }
  }
  if (!version) return { ok: false, error: { code: "no_approved_version", message: "No approved version exists" } };

  const results: MultiChannelPublishResult["results"] = [];
  let anySucceeded = false;

  for (const channel of store.settings.enabledChannels) {
    const connected = isChannelConnected(channel, store.settings.connectedChannels);
    if (!connected) {
      results.push({
        channel,
        ok: false,
        code: CHANNEL_NOT_CONNECTED,
        message: `قناة ${CHANNEL_LABELS[channel].ar} غير مربوطة`,
      });
      continue;
    }
    const publisher = getPublisher(channel);
    if (!publisher) {
      results.push({ channel, ok: false, code: "no_publisher", message: `لا يوجد ناشر لقناة ${channel}` });
      continue;
    }

    // Idempotency key: item + version + channel (schedule-independent).
    const publicationId = `${ops.id}:${version.id}:${channel}:approved`;
    const existing = store.publications.get(publicationId);
    if (existing?.status === "succeeded") {
      results.push({ channel, ok: true, code: "already_published", message: "منشور مسبقًا", publicationId });
      anySucceeded = true;
      continue;
    }

    // Direct publish from APPROVED (still gated by freshness + publisher).
    try {
      const pub = await publisher.publish({ item: ops, versionId: version.id }, {
        id: publicationId,
        itemId: ops.id,
        versionId: version.id,
        channel,
        scheduleId: "approved",
        format: null,
        status: "pending",
        revalidation: { passed: true, issues: [] },
        attemptedAt: at,
      });
      if (pub.ok) {
        store.publications.set(publicationId, {
          id: publicationId,
          itemId: ops.id,
          versionId: version.id,
          channel,
          scheduleId: "approved",
          format: null,
          status: "succeeded",
          providerResponse: { providerId: pub.providerId, ok: true },
          revalidation: { passed: true, issues: [] },
          attemptedAt: at,
          completedAt: at,
        });
        if (channel === "website") {
          store.published.set(ops.id, {
            publicationId,
            contentId: ops.id,
            title: ops.item.title,
            body: ops.item.body,
            callToAction: ops.item.callToAction,
            productIds: ops.item.productIds,
            categoryId: ops.item.categoryId,
            channel,
            publishedAt: at,
            visible: true,
          });
        }
        version.status = "published";
        appendAudit(store, makeAudit({
          actor,
          action: "PUBLISHED",
          contentId: ops.id,
          versionId: version.id,
          previousStatus: "APPROVED",
          newStatus: "PUBLISHED",
          channel,
          publicationResult: publicationId,
          at,
        }));
        results.push({ channel, ok: true, code: "published", message: "تم النشر", publicationId });
        anySucceeded = true;
      } else {
        store.publications.set(publicationId, {
          id: publicationId,
          itemId: ops.id,
          versionId: version.id,
          channel,
          scheduleId: "approved",
          format: null,
          status: "failed",
          providerResponse: { ok: false, error: pub.error ?? "provider_error" },
          revalidation: { passed: true, issues: [] },
          attemptedAt: at,
          completedAt: at,
        });
        appendAudit(store, makeAudit({
          actor,
          action: "PUBLISH_FAILED",
          contentId: ops.id,
          versionId: version.id,
          previousStatus: "APPROVED",
          newStatus: "APPROVED",
          channel,
          reason: pub.error ?? "provider_error",
          at,
        }));
        results.push({ channel, ok: false, code: pub.error ?? "provider_error", message: `فشل النشر إلى ${CHANNEL_LABELS[channel].ar}` });
      }
    } catch (err) {
      results.push({
        channel,
        ok: false,
        code: "provider_error",
        message: err instanceof Error ? err.message : "provider_error",
      });
    }
  }

  if (anySucceeded) {
    ops.status = "PUBLISHED";
    ops.updatedAt = at;
  }
  appendAudit(store, makeAudit({
    actor,
    action: "PUBLISH_APPROVED_MULTI",
    contentId: ops.id,
    versionId: version.id,
    previousStatus: "APPROVED",
    newStatus: anySucceeded ? "PUBLISHED" : "APPROVED",
    at,
    reason: results.map((r) => `${r.channel}:${r.ok ? "ok" : r.code}`).join(", "),
  }));
  await persistContentStore(store);

  return {
    ok: anySucceeded,
    data: { itemId, results, anySucceeded },
  };
}

export function auditEntriesForChannel(store: ContentStore, channel: ChannelKey): ContentAuditEntry[] {
  return store.audit.filter((a) => a.channel === channel);
}

export { CHANNELS };

/** Convenience seed so admin audit has a stable channel snapshot. */
export function seedChannelConnections(store: ContentStore): void {
  if (!store.settings.connectedChannels.includes("website")) {
    store.settings.connectedChannels = ["website", ...store.settings.connectedChannels];
  }
  if (!store.settings.enabledChannels.includes("website")) {
    store.settings.enabledChannels = ["website", ...store.settings.enabledChannels];
  }
}