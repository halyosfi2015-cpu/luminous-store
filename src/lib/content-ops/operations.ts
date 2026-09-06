/**
 * PART 2 — CONTENT OPERATIONS ENGINE
 * ==================================
 * Server-side orchestration that turns Part 1 intelligence into an
 * operational system: ideas, generation, versioned editing, approval,
 * rejection, scheduling, idempotent publishing, plans, campaigns, and
 * the hybrid auto-publish pipeline.
 *
 * All AI calls stay server-side (never reachable from the UI directly).
 * Deterministic by construction — every entry point accepts `now` for tests.
 */

import { randomUUID } from "crypto";
import type { Product } from "@/src/types/product";
import { products } from "@/src/data/products";
import { isAIConfigured } from "@/src/lib/ai/config";
import type { AIProvider } from "@/src/lib/ai/provider";
import { onlyPublished, isPublished } from "@/src/lib/publication";
import { selectProductImage } from "@/src/lib/product-image";
import { extractPricingFacts } from "@/src/lib/product-pricing";
import {
  buildContentContext,
  buildContentBrief,
  generateContent,
  generateContentIdeas,
  selectContentCandidates,
  validateGeneratedContent,
  validateContentOriginality,
  type ContentItem,
} from "@/src/lib/ai/content";
import {
  createActiveInsightAdapter,
  getProviderStatus,
  generateBestIdeas,
} from "@/src/lib/ai/hybrid";
import { getChannelConnectionStatuses } from "./channels";
import { createDefaultPublisherRegistry } from "./publishing";
import type { ContentStore } from "./store";
import { persistContentStore } from "./store";
import { assertTransition, makeAudit, appendAudit, auditActionFor } from "./state";
import type {
  ContentOpsItem,
  ContentOpsStatus,
  ContentVersion,
  ContentApproval,
  RejectionRecord,
  ContentSchedule,
  ContentPublication,
  ContentCampaign,
  ContentIdeaRecord,
  ContentPlan,
  ContentOpsSettings,
  GenerateRequest,
  OpResult,
  PlanRequest,
  ChannelKey,
  ContentFormat,
  PublishedContent,
  HybridAIProviderName,
} from "./types";
import {
  REJECTION_REASONS,
} from "./types";

export const CONTENT_OPS_ENGINE_VERSION = "content_ops_part2_v1";

/* ------------------------------------------------------------------------ */
/* INTERNAL HELPERS                                                          */
/* ------------------------------------------------------------------------ */

function nowIso(now?: string): string {
  return now ?? new Date().toISOString();
}

function makeVersion(
  item: ContentItem,
  editor: string,
  at: string,
): ContentVersion {
  return {
    id: randomUUID(),
    itemId: item.id,
    versionNumber: 1,
    content: {
      title: item.title,
      body: item.body,
      callToAction: item.callToAction,
      language: item.language,
      productIds: item.productIds,
      mediaReference: item.mediaReference,
    },
    promptVersion: item.promptVersion,
    sourceFacts: item.sourceFacts,
    validation: item.validation,
    originality: item.originality,
    editor,
    createdAt: at,
    status: "draft",
  };
}

function nextVersionNumber(item: ContentOpsItem): number {
  return Math.max(0, ...item.versions.map((v) => v.versionNumber)) + 1;
}

function latestVersion(item: ContentOpsItem): ContentVersion | null {
  return item.versions[0] ?? null;
}

/** Eligibility → initial ops status (never AI→Published directly). */
function initialOpsStatus(
  eligibility: ContentItem["eligibility"],
  settings: ContentOpsSettings,
  contentType: ContentItem["contentType"],
  categoryId: string | null,
): ContentOpsStatus {
  if (eligibility === "BLOCKED") return "VALIDATION_FAILED";
  if (settings.mode === "admin_approval" || !settings.autoPublish) return "REVIEW_REQUIRED";
  const typeOk = settings.autoPublishContentTypes.includes(contentType);
  const catOk = settings.autoPublishCategories.length === 0 || (categoryId !== null && settings.autoPublishCategories.includes(categoryId));
  if (eligibility === "AUTO_PUBLISH_ELIGIBLE" && typeOk && catOk) return "APPROVED";
  return "REVIEW_REQUIRED";
}

/* ------------------------------------------------------------------------ */
/* FRESHNESS / STALE CHECKS (at schedule + publish time)                     */
/* ------------------------------------------------------------------------ */

export interface FreshnessResult {
  passed: boolean;
  issues: string[];
}

/**
 * Re-check every material condition right before scheduling/publishing:
 * product published, price current, image valid, campaign active.
 * A campaign can never make an unpublished product eligible.
 */
export function checkContentFreshness(store: ContentStore, item: ContentOpsItem, settings: ContentOpsSettings, now?: string): FreshnessResult {
  const issues: string[] = [];

  // Published-only enforcement (reuses the Part 1 publication model).
  for (const pid of item.item.productIds) {
    if (!isProductPublished(pid)) {
      issues.push(`product ${pid} is no longer published`);
    }
  }

  // Price + image freshness on the first referenced product we can resolve.
  const resolved = item.item.productIds.map(resolveProduct).filter((p): p is Product => p !== null);
  for (const p of resolved) {
    if (!(p.pricing?.price > 0)) issues.push(`product ${p.id} has no valid price`);
    if (item.item.validation.reasons.some((r) => r.code === "STALE_PRICE")) {
      issues.push(`content references a price that is no longer current`);
    }
    const image = selectProductImage(p);
    if (image.selectedImage === null || image.status === "REJECTED") {
      issues.push(`product ${p.id} image is invalid`);
    }
  }

  // Campaign active check (store-backed — a campaign can never revive stale content).
  if (item.campaignId) {
    const campaign = store.campaigns.get(item.campaignId);
    if (!campaign) {
      issues.push(`linked campaign ${item.campaignId} no longer exists`);
    } else if (!isCampaignActive(campaign, now)) {
      issues.push(`linked campaign ${campaign.id} is not active at this time`);
    }
  }

  return { passed: issues.length === 0, issues };
}

/** Price current check: re-validate the content body against live product pricing. */
export function checkPriceFreshness(item: ContentOpsItem): FreshnessResult {
  const issues: string[] = [];
  for (const pid of item.item.productIds) {
    const p = resolveProduct(pid);
    if (!p) continue;
    const priceFacts = extractPricingFacts(p);
    const canonical = Number.isFinite(priceFacts.price) && priceFacts.price > 0 ? priceFacts.price : null;
    if (canonical === null || canonical <= 0) continue;
    const priceResult = validateGeneratedContent(item.item.body, [], {
      canonicalPrice: canonical,
      canonicalDiscountPercent: null,
      expectedLanguage: "ar",
    });
    if (priceResult.reasons.some((r) => r.code === "STALE_PRICE")) {
      issues.push(`product ${pid} price changed — content shows a stale price`);
    }
  }
  return { passed: issues.length === 0, issues };
}

/* ------------------------------------------------------------------------ */
/* IDEAS                                                                     */
/* ------------------------------------------------------------------------ */

export async function createIdeaRecord(
  store: ContentStore,
  idea: {
    title: string;
    categoryId: string | null;
    contentType: ContentItem["contentType"];
    objective: ContentItem["objective"];
    productIds: string[];
    reason: string;
    priority: "high" | "medium" | "low";
  },
  actor: string,
  now?: string,
): Promise<OpResult<ContentIdeaRecord>> {
  const at = nowIso(now);
  const record: ContentIdeaRecord = {
    ...idea,
    ideaId: randomUUID(),
    status: "IDEA",
    createdAt: at,
  };
  store.ideas.set(record.ideaId, record);
  appendAudit(store, makeAudit({ actor, action: "IDEA_CREATED", contentId: null, at }));
  await persistContentStore(store);
  return { ok: true, data: record };
}

export async function selectIdea(
  store: ContentStore,
  ideaId: string,
  actor: string,
  now?: string,
): Promise<OpResult<ContentIdeaRecord>> {
  const idea = store.ideas.get(ideaId);
  if (!idea) return { ok: false, error: { code: "not_found", message: "Idea not found" } };
  idea.status = "SELECTED";
  idea.createdAt = nowIso(now);
  appendAudit(store, makeAudit({ actor, action: "AI_GENERATED", contentId: null, at: nowIso(now) }));
  await persistContentStore(store);
  return { ok: true, data: idea };
}

export async function dismissIdea(
  store: ContentStore,
  ideaId: string,
  actor: string,
  now?: string,
): Promise<OpResult<ContentIdeaRecord>> {
  const idea = store.ideas.get(ideaId);
  if (!idea) return { ok: false, error: { code: "not_found", message: "Idea not found" } };
  idea.status = "DISMISSED";
  appendAudit(store, makeAudit({ actor, action: "IDEA_DISMISSED", contentId: null, at: nowIso(now) }));
  await persistContentStore(store);
  return { ok: true, data: idea };
}

export function listIdeas(store: ContentStore): ContentIdeaRecord[] {
  return [...store.ideas.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/* ------------------------------------------------------------------------ */
/* GENERATION                                                                */
/* ------------------------------------------------------------------------ */

export interface GenerateOptions {
  provider?: AIProvider;
  now?: string;
  autoSchedule?: boolean;
  scheduledFor?: string | null;
  channel?: ChannelKey;
  sourceEditorialAr?: string;
  sourceEditorialEn?: string;
  markIdeaId?: string | null;
}

export async function generateItem(
  store: ContentStore,
  request: GenerateRequest,
  actor: string,
  options: GenerateOptions = {},
): Promise<OpResult<ContentOpsItem>> {
  const at = nowIso(options.now);
  if (!isAIConfigured() && !options.provider) {
    return { ok: false, error: { code: "ai_not_configured", message: "AI service is not configured" } };
  }

  // Resolve products: explicit IDs, else the Part 1 candidate selector.
  let productIds = request.productIds ?? [];
  let categoryId = request.categoryId ?? null;
  if (productIds.length === 0) {
    const candidates = selectContentCandidates({
      contentType: request.contentType,
      objective: request.objective,
      categoryId,
      limit: 1,
    });
    if (candidates.length === 0) {
      return { ok: false, error: { code: "no_candidates", message: "No eligible content candidates" } };
    }
    productIds = [candidates[0].productId];
    categoryId = candidates[0].categoryId;
  }

  const contentType = request.contentType ?? "PRODUCT_SPOTLIGHT";
  const objective = request.objective ?? "DISCOVERY";
  const language = request.language ?? store.settings.defaultLanguage;

  const context = buildContentContext({ productIds, strict: true });
  if (!context.allProductsResolved || context.products.length === 0) {
    return {
      ok: false,
      error: { code: "invalid_request", message: "No published products resolved", details: context.warnings },
    };
  }

  const brief = buildContentBrief({
    categoryId,
    contentType,
    objective,
    productIds,
    language,
    verifiedFacts: context.products.flatMap((p) => p.facts),
  });

  const generation = await generateContent(brief, context, {
    provider: options.provider,
    sourceEditorialAr: options.sourceEditorialAr,
    sourceEditorialEn: options.sourceEditorialEn,
    now: at,
  });

  if (!generation.item) {
    return { ok: false, error: { code: generation.error?.code ?? "internal_error", message: generation.error?.message ?? "Generation failed" } };
  }

  const item = generation.item;
  const opsStatus = initialOpsStatus(item.eligibility, store.settings, contentType, categoryId);
  const opsItem = wrapGeneratedItem(item, opsStatus, actor, at, request.campaignId ?? null, options.markIdeaId ?? null);

  store.items.set(opsItem.id, opsItem);
  if (options.markIdeaId) {
    const idea = store.ideas.get(options.markIdeaId);
    if (idea) {
      idea.status = "GENERATED";
      idea.itemId = opsItem.id;
    }
  }
  appendAudit(store, makeAudit({ actor, action: "AI_GENERATED", contentId: opsItem.id, versionId: opsItem.versions[0].id, previousStatus: null, newStatus: opsStatus, at }));

  // Auto-schedule when automation is on and the item is auto-eligible.
  // Auto-eligible content has already passed validation + originality gates, so
  // the system records a documented approval (never a validation bypass).
  if (options.autoSchedule !== false && opsStatus === "APPROVED" && store.settings.autoSchedule && store.settings.schedulingEnabled) {
    const v0 = opsItem.versions[0];
    v0.status = "approved";
    opsItem.approvals.push({
      id: randomUUID(),
      itemId: opsItem.id,
      versionId: v0.id,
      approverId: "system:auto",
      approvedAt: at,
      validationSnapshot: v0.validation,
      promptVersion: v0.promptVersion,
    });
    const channel = options.channel ?? "website";
    const target = options.scheduledFor ?? defaultScheduleTime(at, store.settings);
    const sched = await scheduleContentItem(store, {
      itemId: opsItem.id,
      channel,
      scheduledFor: target,
      campaignId: request.campaignId ?? null,
    }, actor, { now: at, allowAuto: true });
    if (!sched.ok) {
      opsItem.status = "REVIEW_REQUIRED";
    }
  }

  await persistContentStore(store);
  return { ok: true, data: opsItem };
}

function wrapGeneratedItem(
  item: ContentItem,
  status: ContentOpsStatus,
  actor: string,
  at: string,
  campaignId: string | null,
  ideaId: string | null,
): ContentOpsItem {
  const version = makeVersion(item, actor, at);
  return {
    id: item.id,
    item,
    status,
    versions: [version],
    approvals: [],
    rejections: [],
    campaignId,
    ideaId,
    createdAt: at,
    updatedAt: at,
  };
}

export function defaultScheduleTime(nowIsoStr: string, settings: ContentOpsSettings): string {
  const d = new Date(nowIsoStr);
  const times = settings.defaultTimes.length > 0 ? settings.defaultTimes : ["10:00"];
  const t = times[0];
  const [h, m] = t.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

/* ------------------------------------------------------------------------ */
/* EDITING + REVALIDATION (versioned)                                        */
/* ------------------------------------------------------------------------ */

export interface EditPatch {
  title?: string | null;
  body?: string;
  callToAction?: string | null;
  productIds?: string[];
  mediaReference?: ContentItem["mediaReference"];
  language?: ContentItem["language"];
}

export async function editItem(
  store: ContentStore,
  itemId: string,
  patch: EditPatch,
  actor: string,
  now?: string,
): Promise<OpResult<ContentOpsItem>> {
  const at = nowIso(now);
  const ops = store.items.get(itemId);
  if (!ops) return { ok: false, error: { code: "not_found", message: "Content item not found" } };
  if (ops.status === "PUBLISHED" || ops.status === "ARCHIVED") {
    return { ok: false, error: { code: "locked", message: `Cannot edit item in ${ops.status} state` } };
  }

  // Build new content from the latest version, applied on top.
  const prev = latestVersion(ops);
  const content = {
    title: patch.title !== undefined ? patch.title : (prev?.content.title ?? null),
    body: patch.body !== undefined ? patch.body : (prev?.content.body ?? ""),
    callToAction: patch.callToAction !== undefined ? patch.callToAction : (prev?.content.callToAction ?? null),
    language: patch.language ?? (prev?.content.language ?? "ar"),
    productIds: patch.productIds ?? (prev?.content.productIds ?? []),
    mediaReference: patch.mediaReference ?? (prev?.content.mediaReference ?? { kind: "none" }),
  };

  // Revalidate against the product context + freshness.
  const context = buildContentContext({ productIds: content.productIds, strict: false });
  const validation = validateGeneratedContent(content.body, context.products.flatMap((p) => p.facts), {
    canonicalPrice: firstCurrentPrice(content.productIds),
    canonicalDiscountPercent: null,
    expectedLanguage: content.language === "en" ? "en" : "ar",
  });
  const originality = validateContentOriginality({
    candidateAr: content.body,
    sourceAr: "",
    sourceEn: "",
    allowedOverlapTokens: content.productIds,
  });

  const version: ContentVersion = {
    id: randomUUID(),
    itemId,
    versionNumber: nextVersionNumber(ops),
    content,
    promptVersion: ops.item.promptVersion,
    sourceFacts: context.products.flatMap((p) => p.facts).map((f) => ({ evidence: f.evidence, source: f.source })),
    validation,
    originality,
    editor: actor,
    createdAt: at,
    status: "draft",
  };

  // Never overwrite: mark previous drafts superseded.
  for (const v of ops.versions) {
    if (v.status === "draft" || v.status === "superseded") v.status = "superseded";
  }
  ops.versions.unshift(version);

  // Update the Part 1 payload (single source) and reset operational state.
  ops.item = {
    ...ops.item,
    title: content.title,
    body: content.body,
    callToAction: content.callToAction,
    language: content.language,
    productIds: content.productIds,
    mediaReference: content.mediaReference,
    validation,
    originality,
    status: validation.passed ? "REVIEW_REQUIRED" : "REVIEW_REQUIRED",
    updatedAt: at,
  };
  ops.approvals = [];
  ops.updatedAt = at;
  ops.status = validation.passed ? "REVIEW_REQUIRED" : "VALIDATION_FAILED";

  // Cancel pending schedules for the superseded version.
  for (const s of store.schedules.values()) {
    if (s.itemId === itemId && s.status === "scheduled") {
      s.status = "cancelled";
    }
  }

  appendAudit(store, makeAudit({
    actor,
    action: "ADMIN_EDITED",
    contentId: itemId,
    versionId: version.id,
    previousStatus: null,
    newStatus: ops.status,
    at,
  }));
  if (!validation.passed) {
    appendAudit(store, makeAudit({
      actor,
      action: "VALIDATION_FAILED",
      contentId: itemId,
      versionId: version.id,
      previousStatus: ops.status,
      newStatus: "VALIDATION_FAILED",
      reason: validation.reasons.map((r) => r.code).join(","),
      at,
    }));
  }

  await persistContentStore(store);
  return { ok: true, data: ops };
}

export async function revalidateItem(
  store: ContentStore,
  itemId: string,
  actor: string,
  now?: string,
): Promise<OpResult<ContentOpsItem>> {
  const at = nowIso(now);
  const ops = store.items.get(itemId);
  if (!ops) return { ok: false, error: { code: "not_found", message: "Content item not found" } };
  const version = latestVersion(ops);
  if (!version) return { ok: false, error: { code: "no_version", message: "No version exists" } };

  const context = buildContentContext({ productIds: version.content.productIds, strict: false });
  const validation = validateGeneratedContent(version.content.body, context.products.flatMap((p) => p.facts), {
    canonicalPrice: firstCurrentPrice(version.content.productIds),
    canonicalDiscountPercent: null,
    expectedLanguage: version.content.language === "en" ? "en" : "ar",
  });
  const originality = validateContentOriginality({
    candidateAr: version.content.body,
    sourceAr: "",
    sourceEn: "",
    allowedOverlapTokens: version.content.productIds,
  });

  version.validation = validation;
  version.originality = originality;
  ops.item = { ...ops.item, validation, originality, updatedAt: at };
  ops.status = validation.passed && originality.passed ? "REVIEW_REQUIRED" : "VALIDATION_FAILED";
  ops.updatedAt = at;

  appendAudit(store, makeAudit({
    actor,
    action: "REVALIDATED",
    contentId: itemId,
    versionId: version.id,
    previousStatus: null,
    newStatus: ops.status,
    at,
  }));
  await persistContentStore(store);
  return { ok: true, data: ops };
}

/* ------------------------------------------------------------------------ */
/* APPROVAL / REJECTION                                                      */
/* ------------------------------------------------------------------------ */

export async function approveItem(
  store: ContentStore,
  itemId: string,
  actor: string,
  now?: string,
): Promise<OpResult<ContentOpsItem>> {
  const at = nowIso(now);
  const ops = store.items.get(itemId);
  if (!ops) return { ok: false, error: { code: "not_found", message: "Content item not found" } };
  const version = latestVersion(ops);
  if (!version) return { ok: false, error: { code: "no_version", message: "No version exists" } };

  // Approval requires validation to pass — no bypass.
  if (!version.validation.passed || !version.originality.passed) {
    return { ok: false, error: { code: "validation_required", message: "Validation must pass before approval" } };
  }

  const approval: ContentApproval = {
    id: randomUUID(),
    itemId,
    versionId: version.id,
    approverId: actor,
    approvedAt: at,
    validationSnapshot: version.validation,
    promptVersion: version.promptVersion,
  };
  version.status = "approved";
  ops.approvals.push(approval);
  ops.item = { ...ops.item, status: "APPROVED", updatedAt: at };
  ops.status = "APPROVED";
  ops.updatedAt = at;

  appendAudit(store, makeAudit({
    actor,
    action: "APPROVED",
    contentId: itemId,
    versionId: version.id,
    previousStatus: ops.status === "APPROVED" ? "APPROVED" : "REVIEW_REQUIRED",
    newStatus: "APPROVED",
    at,
  }));
  await persistContentStore(store);
  return { ok: true, data: ops };
}

export async function rejectItem(
  store: ContentStore,
  itemId: string,
  input: { reason: RejectionRecord["reason"]; note?: string },
  actor: string,
  now?: string,
): Promise<OpResult<ContentOpsItem>> {
  const at = nowIso(now);
  if (!REJECTION_REASONS.includes(input.reason)) {
    return { ok: false, error: { code: "invalid_reason", message: "Invalid rejection reason" } };
  }
  const ops = store.items.get(itemId);
  if (!ops) return { ok: false, error: { code: "not_found", message: "Content item not found" } };
  const version = latestVersion(ops);
  if (!version) return { ok: false, error: { code: "no_version", message: "No version exists" } };

  const rejection: RejectionRecord = {
    id: randomUUID(),
    itemId,
    versionId: version.id,
    rejectorId: actor,
    reason: input.reason,
    note: input.note,
    at,
  };
  version.status = "rejected";
  ops.rejections.push(rejection);
  ops.status = "REVIEW_REQUIRED";
  ops.updatedAt = at;

  appendAudit(store, makeAudit({
    actor,
    action: "REJECTED",
    contentId: itemId,
    versionId: version.id,
    previousStatus: "REVIEW_REQUIRED",
    newStatus: "REVIEW_REQUIRED",
    reason: input.reason,
    at,
  }));
  await persistContentStore(store);
  return { ok: true, data: ops };
}

/* ------------------------------------------------------------------------ */
/* REGENERATE (preserves history)                                            */
/* ------------------------------------------------------------------------ */

export async function regenerateItem(
  store: ContentStore,
  itemId: string,
  actor: string,
  options: GenerateOptions = {},
): Promise<OpResult<ContentOpsItem>> {
  const at = nowIso(options.now);
  const ops = store.items.get(itemId);
  if (!ops) return { ok: false, error: { code: "not_found", message: "Content item not found" } };
  const prev = latestVersion(ops);
  if (!prev) return { ok: false, error: { code: "no_version", message: "No version exists" } };

const request: GenerateRequest = {
    categoryId: ops.item.categoryId,
    contentType: ops.item.contentType,
    objective: ops.item.objective,
    productIds: prev.content.productIds,
    language: prev.content.language,
    campaignId: ops.campaignId,
  };
  const res = await generateItem(store, request, actor, {
    ...options,
    markIdeaId: null,
  });
  if (!res.ok || !res.data) return res;

  // Preserve history: append the previous versions to the new item.
  const fresh = res.data;
  for (const v of ops.versions) {
    v.itemId = fresh.id;
    fresh.versions.push(v);
  }
  fresh.versions.sort((a, b) => b.versionNumber - a.versionNumber);
  fresh.campaignId = ops.campaignId;
  fresh.approvals = [];
  fresh.rejections = [...ops.rejections];
  store.items.set(fresh.id, fresh);
  if (fresh.id !== itemId) store.items.delete(itemId);

  appendAudit(store, makeAudit({
    actor,
    action: "AI_GENERATED",
    contentId: fresh.id,
    versionId: fresh.versions[0].id,
    previousStatus: null,
    newStatus: fresh.status,
    at,
  }));
  await persistContentStore(store);
  return { ok: true, data: fresh };
}

/* ------------------------------------------------------------------------ */
/* SCHEDULING                                                                */
/* ------------------------------------------------------------------------ */

export interface ScheduleInput {
  itemId: string;
  channel: ChannelKey;
  scheduledFor: string;
  campaignId?: string | null;
  /** Null = channel default. Only "post"|"story" accepted. */
  format?: ContentFormat | null;
}

export async function scheduleContentItem(
  store: ContentStore,
  input: ScheduleInput,
  actor: string,
  options: { now?: string; allowAuto?: boolean } = {},
): Promise<OpResult<ContentSchedule>> {
  const at = nowIso(options.now);
  const ops = store.items.get(input.itemId);
  if (!ops) return { ok: false, error: { code: "not_found", message: "Content item not found" } };

  // 1. No duplicate schedule (same item+channel within 30 minutes).
  const windowMs = 30 * 60 * 1000;
  const target = new Date(input.scheduledFor).getTime();
  for (const s of store.schedules.values()) {
    if (s.itemId === input.itemId && s.channel === input.channel && s.status === "scheduled") {
      if (Math.abs(Date.parse(s.scheduledFor) - target) < windowMs) {
        return { ok: false, error: { code: "duplicate_schedule", message: "A schedule already exists for this item and channel" } };
      }
    }
  }

  // 2. Must be APPROVED (and an approved version must exist).
  if (ops.status !== "APPROVED") {
    return { ok: false, error: { code: "not_approved", message: "Only approved content can be scheduled" } };
  }
  const version = ops.versions.find((v) => v.status === "approved");
  if (!version) return { ok: false, error: { code: "no_approved_version", message: "No approved version exists" } };

  // 3. Channel must be enabled.
  if (!store.settings.enabledChannels.includes(input.channel)) {
    return { ok: false, error: { code: "channel_disabled", message: `Channel ${input.channel} is disabled` } };
  }

  // 4. Scheduled time valid.
  if (!Number.isFinite(target)) return { ok: false, error: { code: "invalid_time", message: "Invalid scheduled time" } };
  if (target < Date.parse(at) && !options.allowAuto) {
    return { ok: false, error: { code: "past_time", message: "Scheduled time is in the past" } };
  }

  // 5. Campaign active (if linked).
  if (input.campaignId) {
    const campaign = store.campaigns.get(input.campaignId);
    if (!campaign) return { ok: false, error: { code: "campaign_missing", message: "Linked campaign not found" } };
    if (!isCampaignActive(campaign, input.scheduledFor)) {
      return { ok: false, error: { code: "campaign_inactive", message: "Linked campaign is not active at the scheduled time" } };
    }
  }

  // 6. Freshness re-check (product published, price current, image valid).
  const freshness = checkContentFreshness(store, ops, store.settings, input.scheduledFor);
  if (!freshness.passed) {
    ops.status = "REVIEW_REQUIRED";
    ops.updatedAt = at;
    appendAudit(store, makeAudit({
      actor,
      action: "REVALIDATION_REQUIRED",
      contentId: ops.id,
      versionId: version.id,
      previousStatus: ops.status,
      newStatus: "REVIEW_REQUIRED",
      reason: freshness.issues.join("; "),
      at,
    }));
    await persistContentStore(store);
    return { ok: false, error: { code: "revalidation_required", message: freshness.issues.join("; ") } };
  }

  const format = input.format === "story" || input.format === "post" ? input.format : null;
  const schedule: ContentSchedule = {
    id: randomUUID(),
    itemId: input.itemId,
    versionId: version.id,
    channel: input.channel,
    format,
    scheduledFor: input.scheduledFor,
    timezone: store.settings.timezone,
    campaignId: input.campaignId ?? null,
    status: "scheduled",
    createdAt: at,
    updatedAt: at,
  };
  store.schedules.set(schedule.id, schedule);
  ops.status = "SCHEDULED";
  ops.updatedAt = at;
  // Bind the item to the campaign so publish-time freshness validates it too.
  if (input.campaignId) {
    ops.campaignId = input.campaignId;
  }

  appendAudit(store, makeAudit({
    actor,
    action: "SCHEDULED",
    contentId: ops.id,
    versionId: version.id,
    previousStatus: "APPROVED",
    newStatus: "SCHEDULED",
    channel: input.channel,
    reason: input.scheduledFor,
    at,
  }));
  await persistContentStore(store);
  return { ok: true, data: schedule };
}

export async function reschedule(
  store: ContentStore,
  scheduleId: string,
  newTime: string,
  actor: string,
  now?: string,
): Promise<OpResult<ContentSchedule>> {
  const at = nowIso(now);
  const schedule = store.schedules.get(scheduleId);
  if (!schedule) return { ok: false, error: { code: "not_found", message: "Schedule not found" } };
  if (schedule.status !== "scheduled") {
    return { ok: false, error: { code: "not_scheduled", message: "Only scheduled items can be moved" } };
  }
  const ops = store.items.get(schedule.itemId);
  if (!ops) return { ok: false, error: { code: "not_found", message: "Content item not found" } };

  // Do not move content outside campaign validity.
  if (schedule.campaignId) {
    const campaign = store.campaigns.get(schedule.campaignId);
    if (campaign && !isCampaignActive(campaign, newTime)) {
      return { ok: false, error: { code: "campaign_window", message: "Cannot move content outside the campaign validity window" } };
    }
  }

  // Revalidate freshness; preserve approval when content did not change.
  const freshness = checkContentFreshness(store, ops, store.settings, newTime);
  schedule.scheduledFor = newTime;
  schedule.updatedAt = at;
  if (!freshness.passed) {
    ops.status = "REVIEW_REQUIRED";
    ops.updatedAt = at;
    appendAudit(store, makeAudit({
      actor,
      action: "REVALIDATION_REQUIRED",
      contentId: ops.id,
      versionId: schedule.versionId,
      previousStatus: "SCHEDULED",
      newStatus: "REVIEW_REQUIRED",
      reason: freshness.issues.join("; "),
      at,
    }));
  } else {
    appendAudit(store, makeAudit({
      actor,
      action: "RESCHEDULED",
      contentId: ops.id,
      versionId: schedule.versionId,
      previousStatus: "SCHEDULED",
      newStatus: "SCHEDULED",
      channel: schedule.channel,
      reason: newTime,
      at,
    }));
  }
  await persistContentStore(store);
  return { ok: true, data: schedule };
}

export async function cancelSchedule(
  store: ContentStore,
  scheduleId: string,
  actor: string,
  now?: string,
): Promise<OpResult<ContentSchedule>> {
  const at = nowIso(now);
  const schedule = store.schedules.get(scheduleId);
  if (!schedule) return { ok: false, error: { code: "not_found", message: "Schedule not found" } };
  schedule.status = "cancelled";
  schedule.updatedAt = at;
  const ops = store.items.get(schedule.itemId);
  if (ops && ops.status === "SCHEDULED") {
    ops.status = "APPROVED";
    ops.updatedAt = at;
  }
  appendAudit(store, makeAudit({
    actor,
    action: "CANCELLED",
    contentId: schedule.itemId,
    versionId: schedule.versionId,
    previousStatus: "SCHEDULED",
    newStatus: ops?.status ?? "SCHEDULED",
    channel: schedule.channel,
    at,
  }));
  await persistContentStore(store);
  return { ok: true, data: schedule };
}

/* ------------------------------------------------------------------------ */
/* PUBLISHING (state machine + idempotency)                                  */
/* ------------------------------------------------------------------------ */

export interface PublisherLike {
  key: ChannelKey;
  isConfigured: () => boolean;
  publish: (payload: { item: ContentOpsItem; versionId: string }, publication: ContentPublication) => Promise<{ ok: boolean; providerId?: string; error?: string }>;
}

export async function publishSchedule(
  store: ContentStore,
  scheduleId: string,
  publisher: PublisherLike,
  actor: string,
  now?: string,
): Promise<OpResult<ContentPublication>> {
  const at = nowIso(now);
  const schedule = store.schedules.get(scheduleId);
  if (!schedule) return { ok: false, error: { code: "not_found", message: "Schedule not found" } };
  const ops = store.items.get(schedule.itemId);
  if (!ops) return { ok: false, error: { code: "not_found", message: "Content item not found" } };

  // Idempotency key: itemId + versionId + channel + scheduleId.
  const publicationId = `${schedule.itemId}:${schedule.versionId}:${schedule.channel}:${schedule.id}`;
  const existing = store.publications.get(publicationId);
  if (existing?.status === "succeeded") {
    return { ok: true, data: existing };
  }

  // Publish only from an approved schedule.
  if (schedule.status !== "scheduled") {
    return { ok: false, error: { code: "not_scheduled", message: "Schedule is not in scheduled state" } };
  }

  // Stale protection at publish time.
  const freshness = checkContentFreshness(store, ops, store.settings, at);
  if (!freshness.passed) {
    const publication: ContentPublication = {
      id: publicationId,
      itemId: ops.id,
      versionId: schedule.versionId,
      channel: schedule.channel,
      scheduleId: schedule.id,
      format: schedule.format ?? null,
      status: "failed",
      revalidation: { passed: false, issues: freshness.issues },
      attemptedAt: at,
      completedAt: at,
    };
    store.publications.set(publicationId, publication);
    schedule.status = "failed";
    schedule.updatedAt = at;
    ops.status = "REVIEW_REQUIRED";
    ops.updatedAt = at;
    appendAudit(store, makeAudit({
      actor,
      action: "REVALIDATION_REQUIRED",
      contentId: ops.id,
      versionId: schedule.versionId,
      previousStatus: "SCHEDULED",
      newStatus: "REVIEW_REQUIRED",
      channel: schedule.channel,
      reason: freshness.issues.join("; "),
      at,
    }));
    await persistContentStore(store);
    return { ok: false, error: { code: "revalidation_required", message: freshness.issues.join("; ") }, data: publication };
  }

  // Channel must be configured — never simulate success.
  if (!publisher.isConfigured()) {
    const publication: ContentPublication = {
      id: publicationId,
      itemId: ops.id,
      versionId: schedule.versionId,
      channel: schedule.channel,
      scheduleId: schedule.id,
      format: schedule.format ?? null,
      status: "failed",
      revalidation: { passed: true, issues: [] },
      attemptedAt: at,
      completedAt: at,
    };
    store.publications.set(publicationId, publication);
    schedule.status = "failed";
    ops.status = "PUBLISH_FAILED";
    ops.updatedAt = at;
    appendAudit(store, makeAudit({
      actor,
      action: "PUBLISH_FAILED",
      contentId: ops.id,
      versionId: schedule.versionId,
      previousStatus: "SCHEDULED",
      newStatus: "PUBLISH_FAILED",
      channel: schedule.channel,
      reason: "CHANNEL_NOT_CONNECTED",
      at,
    }));
    await persistContentStore(store);
    return { ok: false, error: { code: "channel_not_connected", message: `Channel ${schedule.channel} is not connected` }, data: publication };
  }

  // Transition APPROVED → SCHEDULED → PUBLISHING → PUBLISHED.
  if (ops.status !== "SCHEDULED" && ops.status !== "APPROVED") {
    return { ok: false, error: { code: "invalid_state", message: `Cannot publish from ${ops.status}` } };
  }
  ops.status = "PUBLISHING";
  ops.updatedAt = at;
  schedule.status = "publishing";
  schedule.updatedAt = at;

  const publication: ContentPublication = {
    id: publicationId,
    itemId: ops.id,
    versionId: schedule.versionId,
    channel: schedule.channel,
    scheduleId: schedule.id,
    format: schedule.format ?? null,
    status: "pending",
    revalidation: { passed: true, issues: [] },
    attemptedAt: at,
  };

  appendAudit(store, makeAudit({
    actor,
    action: "PUBLISH_STARTED",
    contentId: ops.id,
    versionId: schedule.versionId,
    previousStatus: "SCHEDULED",
    newStatus: "PUBLISHING",
    channel: schedule.channel,
    at,
  }));

  try {
    const result = await publisher.publish({ item: ops, versionId: schedule.versionId }, publication);
    if (result.ok) {
      publication.status = "succeeded";
      publication.providerResponse = { providerId: result.providerId, ok: true };
      publication.completedAt = at;
      schedule.status = "published";
      schedule.updatedAt = at;
      ops.status = "PUBLISHED";
      ops.updatedAt = at;
      const version = ops.versions.find((v) => v.id === schedule.versionId);
      if (version) version.status = "published";
      // Website channel: surface published content to the storefront.
      if (schedule.channel === "website") {
        const published: PublishedContent = {
          publicationId,
          contentId: ops.id,
          title: ops.item.title,
          body: ops.item.body,
          callToAction: ops.item.callToAction,
          productIds: ops.item.productIds,
          categoryId: ops.item.categoryId,
          channel: "website",
          publishedAt: at,
          visible: true,
        };
        store.published.set(ops.id, published);
      }
      appendAudit(store, makeAudit({
        actor,
        action: "PUBLISHED",
        contentId: ops.id,
        versionId: schedule.versionId,
        previousStatus: "PUBLISHING",
        newStatus: "PUBLISHED",
        channel: schedule.channel,
        publicationResult: publicationId,
        at,
      }));
    } else {
      publication.status = "failed";
      publication.providerResponse = { ok: false, error: result.error ?? "provider_error" };
      publication.completedAt = at;
      schedule.status = "failed";
      schedule.updatedAt = at;
      ops.status = "PUBLISH_FAILED";
      ops.updatedAt = at;
      appendAudit(store, makeAudit({
        actor,
        action: "PUBLISH_FAILED",
        contentId: ops.id,
        versionId: schedule.versionId,
        previousStatus: "PUBLISHING",
        newStatus: "PUBLISH_FAILED",
        channel: schedule.channel,
        reason: result.error ?? "provider_error",
        at,
      }));
    }
  } catch (err) {
    publication.status = "failed";
    publication.providerResponse = { ok: false, error: err instanceof Error ? err.message : "provider_error" };
    publication.completedAt = at;
    schedule.status = "failed";
    schedule.updatedAt = at;
    ops.status = "PUBLISH_FAILED";
    ops.updatedAt = at;
    appendAudit(store, makeAudit({
      actor,
      action: "PUBLISH_FAILED",
      contentId: ops.id,
      versionId: schedule.versionId,
      previousStatus: "PUBLISHING",
      newStatus: "PUBLISH_FAILED",
      channel: schedule.channel,
      reason: err instanceof Error ? err.message : "provider_error",
      at,
    }));
  }

  store.publications.set(publicationId, publication);
  await persistContentStore(store);
  return { ok: publication.status === "succeeded", data: publication };
}

/**
 * HYBRID / AUTO PIPELINE — process the due queue without letting one item
 * block the rest. Fully validated low-risk content is published; items that
 * need a human move to the review queue; blocked items are stopped + logged.
 */
export async function publishDueItems(
  store: ContentStore,
  getPublisher: (channel: ChannelKey) => PublisherLike | undefined,
  options: { actor?: string; now?: string } = {},
): Promise<{ processed: number; published: number; failed: number; skipped: number; revalidationRequired: number }> {
  const at = nowIso(options.now);
  const actor = options.actor ?? "system";
  const result = { processed: 0, published: 0, failed: 0, skipped: 0, revalidationRequired: 0 };

  const due = [...store.schedules.values()]
    .filter((s) => s.status === "scheduled" && Date.parse(s.scheduledFor) <= Date.parse(at))
    .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));

  for (const schedule of due) {
    result.processed++;
    const ops = store.items.get(schedule.itemId);
    if (!ops) {
      result.skipped++;
      continue;
    }
    // Items needing human judgment (or blocked) never auto-publish.
    if (ops.item.eligibility !== "AUTO_PUBLISH_ELIGIBLE" && !store.settings.autoPublish) {
      result.skipped++;
      continue;
    }
    const publisher = getPublisher(schedule.channel);
    if (!publisher) {
      result.failed++;
      continue;
    }
    // Isolate per-item failures.
    try {
      const res = await publishSchedule(store, schedule.id, publisher, actor, at);
      if (res.ok) {
        result.published++;
      } else if (res.data?.revalidation?.passed === false) {
        result.revalidationRequired++;
      } else {
        result.failed++;
      }
    } catch {
      result.failed++;
    }
  }
  return result;
}

/* ------------------------------------------------------------------------ */
/* ARCHIVE / CANCEL ITEM                                                     */
/* ------------------------------------------------------------------------ */

export async function setItemStatus(
  store: ContentStore,
  itemId: string,
  status: "ARCHIVED" | "CANCELLED",
  actor: string,
  now?: string,
): Promise<OpResult<ContentOpsItem>> {
  const at = nowIso(now);
  const ops = store.items.get(itemId);
  if (!ops) return { ok: false, error: { code: "not_found", message: "Content item not found" } };
  const from = ops.status;
  assertTransition(from, status);
  ops.status = status;
  ops.updatedAt = at;
  for (const s of store.schedules.values()) {
    if (s.itemId === itemId && s.status === "scheduled") {
      s.status = "cancelled";
      s.updatedAt = at;
    }
  }
  if (status === "ARCHIVED") {
    const published = store.published.get(itemId);
    if (published) {
      published.visible = false;
    }
  }
  appendAudit(store, makeAudit({
    actor,
    action: auditActionFor(from, status),
    contentId: itemId,
    versionId: latestVersion(ops)?.id ?? null,
    previousStatus: from,
    newStatus: status,
    at,
  }));
  await persistContentStore(store);
  return { ok: true, data: ops };
}

/* ------------------------------------------------------------------------ */
/* PLANNING                                                                  */
/* ------------------------------------------------------------------------ */

export async function generatePlan(
  store: ContentStore,
  kind: ContentPlan["kind"],
  request: PlanRequest,
  actor: string,
  now?: string,
): Promise<OpResult<ContentPlan>> {
  const at = nowIso(now);
  const day = request.date ?? at.slice(0, 10);
  const count = kind === "daily" ? (request.itemCount ?? store.settings.maxDailyItems) : kind === "weekly" ? 14 : 30;

  // Build exposure history from the store (Part 1 ContentItems of active items).
  const history = [...store.items.values()]
    .filter((it) => it.status === "PUBLISHED" || it.status === "SCHEDULED" || it.status === "APPROVED")
    .map((it) => it.item);

  const ideas = generateContentIdeas({
    counts: undefined,
    limit: count,
    history,
    now: at,
  });

  const items = ideas.map((idea) => ({
    categoryId: idea.categoryId,
    contentType: idea.contentType,
    objective: idea.objective,
    productIds: idea.productIds,
    suggestedFor: suggestionTime(day, kind, idea, at),
    reason: idea.reason,
    status: "proposed" as const,
  }));

  const plan: ContentPlan = {
    id: randomUUID(),
    kind,
    label: kind === "daily" ? `خطة يوم ${day}` : kind === "weekly" ? `خطة أسبوع ${day}` : `خطة شهر ${day}`,
    generatedAt: at,
    items,
  };
  store.plans.set(plan.id, plan);
  appendAudit(store, makeAudit({ actor, action: "PLAN_GENERATED", contentId: null, at, reason: `${kind}:${day}` }));
  await persistContentStore(store);
  return { ok: true, data: plan };
}

function suggestionTime(day: string, kind: ContentPlan["kind"], idea: { contentType: string }, at: string): string {
  const base = new Date(day + "T00:00:00.000Z");
  const times = ["10:00", "14:00", "18:00"];
  const idx = Math.abs(hashCode(idea.contentType + day)) % times.length;
  const [h, m] = times[idx].split(":").map(Number);
  base.setHours(h, m, 0, 0);
  if (kind === "daily" && base < new Date(at)) base.setDate(base.getDate() + 1);
  return base.toISOString();
}

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
  return Math.abs(h);
}

export function listPlans(store: ContentStore): ContentPlan[] {
  return [...store.plans.values()].sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
}

/* ------------------------------------------------------------------------ */
/* CAMPAIGNS                                                                 */
/* ------------------------------------------------------------------------ */

export function validateCampaignInput(input: Omit<ContentCampaign, "id" | "createdAt" | "updatedAt">): string[] {
  const errors: string[] = [];
  if (!input.name.trim()) errors.push("campaign name is required");
  if (!input.objective) errors.push("campaign objective is required");
  const start = Date.parse(input.startAt);
  const end = Date.parse(input.endAt);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    errors.push("campaign dates are invalid");
  } else if (end <= start) {
    errors.push("campaign end date must be after start date");
  }
  if (input.priority < 0 || input.priority > 100) errors.push("priority must be between 0 and 100");
  if (input.contentTypes.length === 0) errors.push("at least one content type is required");
  if (input.channels.length === 0) errors.push("at least one channel is required");
  // Product publication + eligibility (a campaign can never make an unpublished product eligible).
  const publishedIds = new Set(onlyPublished(products).map((p) => p.id));
  for (const pid of input.productIds) {
    if (!publishedIds.has(pid)) errors.push(`product ${pid} is not published`);
  }
  // Real promotions: skip price claim checks here — validated at generation/scheduling.
  return errors;
}

export async function createCampaign(
  store: ContentStore,
  input: Omit<ContentCampaign, "id" | "createdAt" | "updatedAt">,
  actor: string,
  now?: string,
): Promise<OpResult<ContentCampaign>> {
  const at = nowIso(now);
  const errors = validateCampaignInput(input);
  if (errors.length > 0) {
    return { ok: false, error: { code: "invalid_campaign", message: errors.join("; ") } };
  }
  const campaign: ContentCampaign = {
    ...input,
    id: randomUUID(),
    createdAt: at,
    updatedAt: at,
  };
  store.campaigns.set(campaign.id, campaign);
  appendAudit(store, makeAudit({ actor, action: "CAMPAIGN_CREATED", contentId: null, at, reason: campaign.name }));
  await persistContentStore(store);
  return { ok: true, data: campaign };
}

export async function updateCampaign(
  store: ContentStore,
  campaignId: string,
  patch: Partial<Omit<ContentCampaign, "id" | "createdAt" | "updatedAt">>,
  actor: string,
  now?: string,
): Promise<OpResult<ContentCampaign>> {
  const at = nowIso(now);
  const campaign = store.campaigns.get(campaignId);
  if (!campaign) return { ok: false, error: { code: "not_found", message: "Campaign not found" } };
  const next = { ...campaign, ...patch, id: campaign.id, createdAt: campaign.createdAt, updatedAt: at };
  const errors = validateCampaignInput(next);
  if (errors.length > 0) return { ok: false, error: { code: "invalid_campaign", message: errors.join("; ") } };
  store.campaigns.set(campaignId, next);
  appendAudit(store, makeAudit({ actor, action: "CAMPAIGN_UPDATED", contentId: null, at, reason: campaignId }));
  await persistContentStore(store);
  return { ok: true, data: next };
}

export async function setCampaignStatus(
  store: ContentStore,
  campaignId: string,
  status: ContentCampaign["status"],
  actor: string,
  now?: string,
): Promise<OpResult<ContentCampaign>> {
  const at = nowIso(now);
  const campaign = store.campaigns.get(campaignId);
  if (!campaign) return { ok: false, error: { code: "not_found", message: "Campaign not found" } };
  campaign.status = status;
  campaign.updatedAt = at;
  appendAudit(store, makeAudit({ actor, action: "CAMPAIGN_STATUS_CHANGED", contentId: null, at, reason: `${campaignId}:${status}` }));
  await persistContentStore(store);
  return { ok: true, data: campaign };
}

export function listCampaigns(store: ContentStore): ContentCampaign[] {
  return [...store.campaigns.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function isCampaignActive(campaign: ContentCampaign, at?: string): boolean {
  const t = at ? Date.parse(at) : Date.now();
  const start = Date.parse(campaign.startAt);
  const end = Date.parse(campaign.endAt);
  if (campaign.status === "cancelled" || campaign.status === "paused" || campaign.status === "completed") return false;
  return Number.isFinite(start) && Number.isFinite(end) && t >= start && t <= end;
}

/* ------------------------------------------------------------------------ */
/* QUERIES                                                                   */
/* ------------------------------------------------------------------------ */

export function listItems(store: ContentStore, filter?: { status?: ContentOpsStatus; campaignId?: string }): ContentOpsItem[] {
  let items = [...store.items.values()];
  if (filter?.status) items = items.filter((i) => i.status === filter.status);
  if (filter?.campaignId) items = items.filter((i) => i.campaignId === filter.campaignId);
  return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getItem(store: ContentStore, itemId: string): ContentOpsItem | null {
  return store.items.get(itemId) ?? null;
}

export function listSchedules(store: ContentStore, filter?: { status?: ContentSchedule["status"]; date?: string }): ContentSchedule[] {
  let schedules = [...store.schedules.values()];
  if (filter?.status) schedules = schedules.filter((s) => s.status === filter.status);
  if (filter?.date) {
    const day = filter.date.slice(0, 10);
    schedules = schedules.filter((s) => s.scheduledFor.slice(0, 10) === day);
  }
  return schedules.sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
}

export function listPublished(store: ContentStore): PublishedContent[] {
  return [...store.published.values()].filter((p) => p.visible).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function getDashboardStats(store: ContentStore): {
  drafts: number;
  review: number;
  approved: number;
  scheduledToday: number;
  scheduledWeek: number;
  publishedToday: number;
  publishFailures: number;
  activeCampaigns: number;
  totalItems: number;
  totalScheduled: number;
  totalPublished: number;
  categoryCoverage: Array<{ categoryId: string | null; count: number }>;
  contentTypeBalance: Array<{ contentType: string; count: number }>;
} {
  const now = new Date().toISOString();
  const day = now.slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600000).toISOString();

  const items = [...store.items.values()];
  const schedules = [...store.schedules.values()];

  const categoryCoverage = new Map<string, number>();
  const contentTypeBalance = new Map<string, number>();
  for (const it of items) {
    const cat = it.item.categoryId ?? "none";
    categoryCoverage.set(cat, (categoryCoverage.get(cat) ?? 0) + 1);
    contentTypeBalance.set(it.item.contentType, (contentTypeBalance.get(it.item.contentType) ?? 0) + 1);
  }

  return {
    drafts: items.filter((i) => i.status === "GENERATED" || i.status === "VALIDATING").length,
    review: items.filter((i) => i.status === "REVIEW_REQUIRED").length,
    approved: items.filter((i) => i.status === "APPROVED").length,
    scheduledToday: schedules.filter((s) => s.status === "scheduled" && s.scheduledFor.slice(0, 10) === day).length,
    scheduledWeek: schedules.filter((s) => s.status === "scheduled" && s.scheduledFor >= weekAgo).length,
    publishedToday: items.filter((i) => i.status === "PUBLISHED" && i.updatedAt.slice(0, 10) === day).length,
    publishFailures: items.filter((i) => i.status === "PUBLISH_FAILED" || i.status === "VALIDATION_FAILED").length,
    activeCampaigns: listCampaigns(store).filter((c) => isCampaignActive(c)).length,
    totalItems: items.length,
    totalScheduled: schedules.filter((s) => s.status === "scheduled").length,
    totalPublished: items.filter((i) => i.status === "PUBLISHED").length,
    categoryCoverage: [...categoryCoverage.entries()].map(([categoryId, count]) => ({ categoryId: categoryId === "none" ? null : categoryId, count })),
    contentTypeBalance: [...contentTypeBalance.entries()].map(([contentType, count]) => ({ contentType, count })),
  };
}

/* ------------------------------------------------------------------------ */
/* SETTINGS                                                                  */
/* ------------------------------------------------------------------------ */

export async function updateContentOpsSettings(
  store: ContentStore,
  patch: Partial<ContentOpsSettings>,
  actor: string,
  now?: string,
): Promise<OpResult<ContentOpsSettings>> {
  const at = nowIso(now);
  const next: ContentOpsSettings = {
    ...store.settings,
    ...patch,
    autoPublishContentTypes: patch.autoPublishContentTypes ? [...patch.autoPublishContentTypes] : [...store.settings.autoPublishContentTypes],
    autoPublishCategories: patch.autoPublishCategories ? [...patch.autoPublishCategories] : [...store.settings.autoPublishCategories],
    enabledChannels: patch.enabledChannels ? [...patch.enabledChannels] : [...store.settings.enabledChannels],
    defaultTimes: patch.defaultTimes ? [...patch.defaultTimes] : [...store.settings.defaultTimes],
  };
  // Safety invariants that can never be switched off.
  next.originalityThreshold = Math.max(0.5, Math.min(0.95, next.originalityThreshold));
  next.priceFreshnessDays = Math.max(1, next.priceFreshnessDays);
  if (!next.enabledChannels.includes("website")) next.enabledChannels = ["website", ...next.enabledChannels];
  store.settings = next;
  appendAudit(store, makeAudit({ actor, action: "SETTINGS_UPDATED", contentId: null, at }));
  await persistContentStore(store);
  return { ok: true, data: next };
}

/* ------------------------------------------------------------------------ */
/* PART 3 — HYBRID PROVIDER, AUTOMATION, PIPELINE, DIAGNOSTICS               */
/* ------------------------------------------------------------------------ */

/** Switch the AI provider. Only the insight engine changes — every rule stays. */
export async function switchContentProvider(
  store: ContentStore,
  provider: HybridAIProviderName,
  actor: string,
  now?: string,
): Promise<OpResult<{ provider: HybridAIProviderName; status: ReturnType<typeof getProviderStatus> }>> {
  const at = nowIso(now);
  if (provider !== "self" && provider !== "openai") {
    return { ok: false, error: { code: "invalid_provider", message: "Provider must be self or openai" } };
  }
  const previous = store.settings.aiProvider;
  if (previous !== provider) {
    store.settings.aiProvider = provider;
    appendAudit(store, makeAudit({
      actor,
      action: "AI_PROVIDER_CHANGED",
      contentId: null,
      previousStatus: null,
      newStatus: null,
      at,
      reason: `${previous} -> ${provider}`,
    }));
    await persistContentStore(store);
  }
  return { ok: true, data: { provider, status: getProviderStatus(store.settings) } };
}

/** Update automation toggles (safety rules can never be switched off here). */
export async function updateAutomation(
  store: ContentStore,
  patch: Pick<ContentOpsSettings, "autoGenerate" | "autoSchedule" | "autoPublish">,
  actor: string,
  now?: string,
): Promise<OpResult<ContentOpsSettings>> {
  const at = nowIso(now);
  store.settings = { ...store.settings, ...patch };
  appendAudit(store, makeAudit({
    actor,
    action: "AUTOMATION_UPDATED",
    contentId: null,
    at,
    reason: `autoGenerate=${store.settings.autoGenerate};autoSchedule=${store.settings.autoSchedule};autoPublish=${store.settings.autoPublish}`,
  }));
  await persistContentStore(store);
  return { ok: true, data: store.settings };
}

function activeCampaignProductIds(store: ContentStore): string[] {
  const ids = new Set<string>();
  for (const c of store.campaigns.values()) {
    if (isCampaignActive(c)) for (const pid of c.productIds) ids.add(pid);
  }
  return [...ids];
}

export interface PipelineRunResult {
  generated: number;
  failed: number;
  published: number;
  skipped: number;
  revalidationRequired: number;
  provider: ReturnType<typeof getProviderStatus>;
}

/**
 * One-click automation run: auto-generate a fresh batch (when enabled), then
 * publish every due, auto-eligible schedule. One failed item never blocks the
 * rest. Provider switch never changes these rules.
 */
export async function runContentPipeline(
  store: ContentStore,
  actor: string,
  options: { now?: string; provider?: AIProvider } = {},
): Promise<PipelineRunResult> {
  const at = nowIso(options.now);
  const registry = createDefaultPublisherRegistry();
  const result = { generated: 0, failed: 0, published: 0, skipped: 0, revalidationRequired: 0 };

  if (store.settings.autoGenerate && store.settings.generationEnabled) {
    const ideas = generateBestIdeas({
      limit: 3,
      creativeLimit: 2,
      now: at,
      campaignProductIds: activeCampaignProductIds(store),
      fatiguedProductIds: [...store.items.values()]
        .filter((i) => i.status === "PUBLISHED" || i.status === "SCHEDULED")
        .flatMap((i) => i.item.productIds),
    });
    for (const idea of ideas) {
      try {
        const res = await generateItem(
          store,
          {
            categoryId: idea.categoryId,
            contentType: idea.contentType,
            objective: idea.objective,
            productIds: idea.productIds,
          },
          actor,
          { provider: options.provider ?? createActiveInsightAdapter(store.settings), now: at },
        );
        if (res.ok) result.generated++;
        else result.failed++;
      } catch {
        result.failed++;
      }
    }
  }

  const due = await publishDueItems(store, (ch) => registry.get(ch), { actor, now: at });
  result.published += due.published;
  result.failed += due.failed;
  result.skipped += due.skipped;
  result.revalidationRequired += due.revalidationRequired;

  appendAudit(store, makeAudit({
    actor,
    action: "PIPELINE_RUN",
    contentId: null,
    at,
    reason: JSON.stringify(result),
  }));
  await persistContentStore(store);
  return { ...result, provider: getProviderStatus(store.settings) };
}

export interface SystemDiagnostics {
  engineVersions: { part1: string; part2: string; part3: string };
  provider: ReturnType<typeof getProviderStatus>;
  channels: ReturnType<typeof getChannelConnectionStatuses>;
  automation: {
    generationEnabled: boolean;
    schedulingEnabled: boolean;
    autoGenerate: boolean;
    autoSchedule: boolean;
    autoPublish: boolean;
  };
  counts: ReturnType<typeof getDashboardStats>;
}

export function getSystemDiagnostics(store: ContentStore): SystemDiagnostics {
  return {
    engineVersions: {
      part1: store.items.values().next().value?.item.promptVersion ?? "content_engine_part1_v1",
      part2: CONTENT_OPS_ENGINE_VERSION,
      part3: getProviderStatus(store.settings).version,
    },
    provider: getProviderStatus(store.settings),
    channels: getChannelConnectionStatuses(store.settings),
    automation: {
      generationEnabled: store.settings.generationEnabled,
      schedulingEnabled: store.settings.schedulingEnabled,
      autoGenerate: store.settings.autoGenerate,
      autoSchedule: store.settings.autoSchedule,
      autoPublish: store.settings.autoPublish,
    },
    counts: getDashboardStats(store),
  };
}

/* ------------------------------------------------------------------------ */
/* PRODUCT LOOKUPS (Part 1 publication model reused)                         */
/* ------------------------------------------------------------------------ */

function isProductPublished(pid: string): boolean {
  try {
    const p = resolveProduct(pid);
    return p ? isPublished(p) : false;
  } catch {
    return false;
  }
}

// Static catalog import (same pattern as Part 1) — never loaded lazily.
function resolveProduct(pid: string): Product | null {
  return products.find((p) => p.id === pid) ?? null;
}

function firstCurrentPrice(productIds: string[]): number | null {
  for (const pid of productIds) {
    const p = resolveProduct(pid);
    if (p && p.pricing?.price > 0) return p.pricing.price;
  }
  return null;
}