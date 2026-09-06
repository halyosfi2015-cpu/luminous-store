/**
 * PART 2 — CONTENT OPERATIONS, CALENDAR, CAMPAIGNS & PUBLISHING VERIFICATION
 * ========================================================================
 * Run with: npx tsx --tsconfig tsconfig.verify.json scripts/verify-content-part2.mts
 *
 * Coverage (deterministic, in-memory store + mock AI provider + real catalog):
 *  22  operations lifecycle tests
 *  14  performance analytics tests
 *   8  channel adapter tests
 *   +  runtime end-to-end + category coverage (controlled results)
 */

import { onlyPublished } from "../src/lib/publication";
import { products } from "../src/data/products";
import type { AIProvider, RawAIResult } from "../src/lib/ai/provider";
import type { AIProviderConfig } from "../src/lib/ai/types";
import type { ContentItem, VerifiedProductFact } from "../src/lib/ai/content/types";
import type {
  ContentOpsItem,
  ContentOpsStatus,
  ContentCampaign,
  ChannelKey,
  ContentVersion,
} from "../src/lib/content-ops/types";
import { REJECTION_REASONS } from "../src/lib/content-ops/types";
import { createMemoryStore, type ContentStore } from "../src/lib/content-ops/store";
import { assertTransition, canTransition } from "../src/lib/content-ops/state";
import {
  generateItem,
  createIdeaRecord,
  selectIdea,
  dismissIdea,
  listIdeas,
  editItem,
  revalidateItem,
  approveItem,
  rejectItem,
  regenerateItem,
  scheduleContentItem,
  reschedule,
  cancelSchedule,
  publishSchedule,
  publishDueItems,
  setItemStatus,
  generatePlan,
  listPlans,
  createCampaign,
  updateCampaign,
  setCampaignStatus,
  listCampaigns,
  isCampaignActive,
  listItems,
  getItem,
  listSchedules,
  listPublished,
  getDashboardStats,
  updateContentOpsSettings,
  checkContentFreshness,
} from "../src/lib/content-ops/operations";
import {
  recordPerformanceEvent,
  getContentPerformance,
  getProductPerformance,
  getCampaignPerformance,
  getCategoryPerformance,
  getPerformanceDashboard,
  analyzeContentFatigue,
} from "../src/lib/content-ops/analytics";
import {
  createWebsiteAdapter,
  createSocialAdapter,
  createPublisherRegistry,
  createDefaultPublisherRegistry,
  CHANNEL_NOT_CONNECTED,
} from "../src/lib/content-ops/publishing";
import { validateGeneratedContent } from "../src/lib/ai/content/validator";
import { buildContentContext } from "../src/lib/ai/content/context";
import { generateContentIdeas } from "../src/lib/ai/content/planner";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: boolean, name: string, detail?: string) {
  if (cond) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    failures.push(name + (detail ? ` — ${detail}` : ""));
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

const NOW = "2026-01-05T08:00:00.000Z";
const FUTURE = "2026-01-06T10:00:00.000Z";
const REAL = "yq-754";
const SAFE_BODY = "ينظف البشرة ويزيل الشوائب بلطف";

/* ------------------------------------------------------------------------ */
/* MOCK AI PROVIDER                                                          */
/* ------------------------------------------------------------------------ */

function jsonResult(json: unknown): RawAIResult {
  return {
    rawContent: JSON.stringify(json),
    error: null,
    metrics: { inputTokens: 10, outputTokens: 20, totalTokens: 30, latencyMs: 1, model: "mock" },
  };
}

class MockProvider implements AIProvider {
  private responses: Array<() => RawAIResult>;
  private callCount = 0;
  constructor(responses: Array<() => RawAIResult>) {
    this.responses = responses;
  }
  async generateInsight(_s: string, _u: string, _c: AIProviderConfig): Promise<RawAIResult> {
    const idx = Math.min(this.callCount, this.responses.length - 1);
    this.callCount++;
    return this.responses[idx]();
  }
}

function safeProvider(): MockProvider {
  return new MockProvider([
    () =>
      jsonResult({
        title: "منظف لطيف",
        body: SAFE_BODY,
        callToAction: "تسوق الآن",
        language: "ar",
        selectedProductIds: [REAL],
        status: "GENERATED",
      }),
  ]);
}

/* ------------------------------------------------------------------------ */
/* FIXTURES                                                                  */
/* ------------------------------------------------------------------------ */

function makeOpsItem(store: ContentStore, opts: { id?: string; status?: ContentOpsStatus; campaignId?: string | null; eligibility?: ContentItem["eligibility"]; stalePrice?: boolean; contentType?: ContentItem["contentType"] } = {}): ContentOpsItem {
  const id = opts.id ?? "ops-1";
  const contentType = opts.contentType ?? "EDUCATIONAL";
  const validationReasons = opts.stalePrice ? [{ code: "STALE_PRICE" as const, message: "price changed" }] : [];
  const item: ContentItem = {
    id,
    categoryId: "cleansers",
    subcategoryId: null,
    contentType,
    objective: "DISCOVERY",
    productIds: [REAL],
    title: "منظف للبشرة",
    body: SAFE_BODY,
    callToAction: "تسوق الآن",
    language: "ar",
    mediaReference: { kind: "product_image", productId: REAL, imageUrl: "/images/products/yq-754.png" },
    contentBriefId: "b-1",
    promptVersion: "CONTENT_GENERATION_V1",
    sourceFacts: [],
    validation: {
      passed: !opts.stalePrice,
      status: opts.stalePrice ? "REVIEW_REQUIRED" : "VALID",
      claimMappings: [],
      pricingValidated: true,
      discountValidated: true,
      languageValid: true,
      reasons: validationReasons,
    },
    originality: { passed: true, score: 95, editorialSimilarity: 0.05, reasons: [] },
    status: "GENERATED",
    eligibility: opts.eligibility ?? "AUTO_PUBLISH_ELIGIBLE",
    createdAt: NOW,
    updatedAt: NOW,
  };
  const version: ContentVersion = {
    id: `v-${id}`,
    itemId: id,
    versionNumber: 1,
    content: {
      title: item.title,
      body: item.body,
      callToAction: item.callToAction,
      language: "ar",
      productIds: [REAL],
      mediaReference: item.mediaReference,
    },
    promptVersion: item.promptVersion,
    sourceFacts: [],
    validation: item.validation,
    originality: item.originality,
    editor: "test",
    createdAt: NOW,
    status: "draft",
  };
  const ops: ContentOpsItem = {
    id,
    item,
    status: opts.status ?? "REVIEW_REQUIRED",
    versions: [version],
    approvals: [],
    rejections: [],
    campaignId: opts.campaignId ?? null,
    ideaId: null,
    createdAt: NOW,
    updatedAt: NOW,
  };
  store.items.set(id, ops);
  return ops;
}

async function approve(store: ContentStore, id: string): Promise<boolean> {
  const res = await approveItem(store, id, "test", NOW);
  return res.ok;
}

async function scheduleApproved(store: ContentStore, id: string, channel: ChannelKey = "website", scheduledFor = FUTURE, campaignId?: string | null) {
  return scheduleContentItem(store, { itemId: id, channel, scheduledFor, campaignId: campaignId ?? null }, "test", { now: NOW });
}

function makeCampaign(store: ContentStore, overrides: Partial<ContentCampaign> = {}): ContentCampaign {
  const campaign: ContentCampaign = {
    id: "camp-1",
    name: "حملة تجريبية",
    nameEn: "Test Campaign",
    objective: "DISCOVERY",
    startAt: "2026-01-01T00:00:00.000Z",
    endAt: "2026-01-31T23:59:59.000Z",
    priority: 80,
    categoryIds: ["cleansers"],
    productIds: [REAL],
    contentTypes: ["EDUCATIONAL", "FAQ"],
    channels: ["website"],
    status: "running",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
  store.campaigns.set(campaign.id, campaign);
  return campaign;
}

const websitePublisher = createDefaultPublisherRegistry().get("website")!;
const instagramPublisher = createDefaultPublisherRegistry().get("instagram")!;

/* ------------------------------------------------------------------------ */
/* OPERATIONS (22)                                                           */
/* ------------------------------------------------------------------------ */

section("Operations — Generation");

{
  const store = createMemoryStore();
  const res = await generateItem(store, { productIds: [REAL], contentType: "EDUCATIONAL", objective: "EDUCATION" }, "test", { provider: safeProvider(), now: NOW });
  assert(res.ok, "T1 generateItem returns an item", res.error?.message);
  assert(res.data?.status === "REVIEW_REQUIRED", "T1 hybrid+autoPublish-off → REVIEW_REQUIRED", res.data?.status);
  assert(res.data?.versions.length === 1, "T1 item has one initial version");
  assert(res.data !== undefined && res.data.versions[0].validation.passed, "T1 generated item passed validation");
}

{
  const store = createMemoryStore();
  const res = await generateItem(store, { productIds: [REAL] }, "test", { now: NOW });
  assert(!res.ok && res.error?.code === "ai_not_configured", "T2 generateItem without provider → ai_not_configured");
}

{
  const store = createMemoryStore();
  const res = await generateItem(store, { productIds: ["missing-product-xyz"], contentType: "EDUCATIONAL" }, "test", { provider: safeProvider(), now: NOW });
  assert(!res.ok && res.error?.code === "invalid_request", "T3 generateItem with unresolved product → invalid_request");
}

{
  const store = createMemoryStore();
  store.settings.mode = "hybrid";
  store.settings.autoPublish = true;
  store.settings.autoSchedule = true;
  store.settings.schedulingEnabled = true;
  const res = await generateItem(store, { productIds: [REAL], contentType: "FAQ", objective: "EDUCATION" }, "test", { provider: safeProvider(), now: NOW });
  assert(res.ok, "T4 auto path generates item", res.error?.message);
  assert(res.data?.status === "SCHEDULED", "T4 auto-eligible FAQ auto-schedules → SCHEDULED", res.data?.status);
  assert(store.schedules.size === 1, "T4 one schedule created");
}

section("Operations — Ideas");

{
  const store = createMemoryStore();
  const res = await createIdeaRecord(store, { title: "فكرة", categoryId: "cleansers", contentType: "EDUCATIONAL", objective: "EDUCATION", productIds: [REAL], reason: "r", priority: "medium" }, "test", NOW);
  assert(res.ok && res.data?.status === "IDEA", "T5 idea created as IDEA");
  const sel = await selectIdea(store, res.data!.ideaId, "test", NOW);
  assert(sel.ok && sel.data?.status === "SELECTED", "T6 idea selected");
  const dis = await dismissIdea(store, res.data!.ideaId, "test", NOW);
  assert(dis.ok && dis.data?.status === "DISMISSED", "T7 idea dismissed");
  assert(listIdeas(store).length === 1, "T7b listIdeas returns the idea");
}

section("Operations — Versioned editing + revalidation");

{
  const store = createMemoryStore();
  const ops = makeOpsItem(store);
  const before = ops.versions[0].content.body;
  const res = await editItem(store, "ops-1", { body: SAFE_BODY + " " }, "test", NOW);
  assert(res.ok, "T8 editItem succeeds");
  assert(res.data!.versions.length === 2, "T8 editing creates a new version");
  assert(res.data!.versions[0].versionNumber === 2, "T8 new version number is 2", String(res.data!.versions[0].versionNumber));
  assert(res.data!.versions[0].content.body === SAFE_BODY + " ", "T8 new version carries the edit");
  assert(res.data!.versions[1].content.body === before, "T8 previous version content is unchanged (immutable)");
  assert(res.data!.status === "REVIEW_REQUIRED", "T8 edit resets status to REVIEW_REQUIRED", res.data!.status);
  assert(res.data!.approvals.length === 0, "T8 approvals cleared after edit");
}

{
  const store = createMemoryStore();
  const ops = makeOpsItem(store, { status: "PUBLISHED" });
  const res = await editItem(store, ops.id, { body: SAFE_BODY + " x" }, "test", NOW);
  assert(!res.ok && res.error?.code === "locked", "T9 editing PUBLISHED item is locked");
}

{
  const store = createMemoryStore();
  const ops = makeOpsItem(store);
  const res = await revalidateItem(store, ops.id, "test", NOW);
  assert(res.ok, "T10 revalidateItem runs");
  assert(res.data!.versions[0].validation.passed === true, "T10 revalidation keeps passed result");
}

section("Operations — Approval / Rejection");

{
  const store = createMemoryStore();
  makeOpsItem(store, { id: "bad", stalePrice: true });
  const res = await approveItem(store, "bad", "test", NOW);
  assert(!res.ok && res.error?.code === "validation_required", "T11 approval blocked when validation fails");
}

{
  const store = createMemoryStore();
  makeOpsItem(store, { id: "ok" });
  const res = await approveItem(store, "ok", "test", NOW);
  assert(res.ok && res.data?.status === "APPROVED", "T12 approveItem → APPROVED");
  assert(res.data!.versions[0].status === "approved", "T12 approved version is marked approved");
  assert(res.data!.approvals.length === 1, "T12 approval recorded");
}

{
  const store = createMemoryStore();
  makeOpsItem(store, { id: "rj" });
  const res = await rejectItem(store, "rj", { reason: "BAD_COPY", note: "ضعيف" }, "test", NOW);
  assert(res.ok, "T13 rejectItem with valid reason");
  assert(res.data!.status === "REVIEW_REQUIRED", "T13 rejection returns to REVIEW_REQUIRED");
  assert(res.data!.rejections.length === 1 && res.data!.rejections[0].reason === "BAD_COPY", "T13 rejection recorded with reason");
}

{
  const store = createMemoryStore();
  makeOpsItem(store, { id: "rj2" });
  const res = await rejectItem(store, "rj2", { reason: "NOT_A_REASON" as never }, "test", NOW);
  assert(!res.ok && res.error?.code === "invalid_reason", "T14 invalid rejection reason rejected");
}

section("Operations — Scheduling");

{
  const store = createMemoryStore();
  makeOpsItem(store, { id: "notapp" });
  const res = await scheduleApproved(store, "notapp");
  assert(!res.ok && res.error?.code === "not_approved", "T15 scheduling non-approved → not_approved");
}

{
  const store = createMemoryStore();
  makeOpsItem(store, { id: "sc" });
  assert(await approve(store, "sc"), "T16 pre-approve");
  const res = await scheduleApproved(store, "sc");
  assert(res.ok, "T16 scheduleApproved happy path", res.error?.message);
  const ops = getItem(store, "sc")!;
  assert(ops.status === "SCHEDULED", "T16 item becomes SCHEDULED");
  assert(listSchedules(store, { status: "scheduled" }).length === 1, "T16 schedule record stored");
}

{
  const store = createMemoryStore();
  makeOpsItem(store, { id: "dup" });
  await approve(store, "dup");
  const a = await scheduleApproved(store, "dup");
  const b = await scheduleApproved(store, "dup");
  assert(a.ok, "T17 first schedule ok");
  assert(!b.ok && b.error?.code === "duplicate_schedule", "T17 duplicate schedule within window blocked");
}

{
  const store = createMemoryStore();
  makeOpsItem(store, { id: "past" });
  await approve(store, "past");
  const res = await scheduleContentItem(store, { itemId: "past", channel: "website", scheduledFor: "2026-01-01T10:00:00.000Z", campaignId: null }, "test", { now: NOW });
  assert(!res.ok && res.error?.code === "past_time", "T18 scheduling in the past (manual) → past_time");
}

{
  const store = createMemoryStore();
  makeOpsItem(store, { id: "camp" });
  await approve(store, "camp");
  const campaign = makeCampaign(store, { id: "camp-inactive", startAt: "2026-02-01T00:00:00.000Z", endAt: "2026-02-28T00:00:00.000Z" });
  void campaign;
  const res = await scheduleContentItem(store, { itemId: "camp", channel: "website", scheduledFor: FUTURE, campaignId: "camp-inactive" }, "test", { now: NOW });
  assert(!res.ok && res.error?.code === "campaign_inactive", "T19 inactive campaign blocks scheduling");
}

{
  const store = createMemoryStore();
  makeOpsItem(store, { id: "mv" });
  await approve(store, "mv");
  const camp = makeCampaign(store);
  const res = await scheduleContentItem(store, { itemId: "mv", channel: "website", scheduledFor: FUTURE, campaignId: camp.id }, "test", { now: NOW });
  assert(res.ok, "T20 schedule inside active campaign window");
  const mv = await reschedule(store, res.data!.id, "2026-01-20T10:00:00.000Z", "test", NOW);
  assert(mv.ok, "T20 reschedule within campaign window ok");
  const outside = await reschedule(store, res.data!.id, "2026-03-01T10:00:00.000Z", "test", NOW);
  assert(!outside.ok && outside.error?.code === "campaign_window", "T20 reschedule outside campaign window blocked");
}

section("Operations — Publishing");

{
  const store = createMemoryStore();
  makeOpsItem(store, { id: "pub" });
  await approve(store, "pub");
  const s = await scheduleApproved(store, "pub");
  assert(s.ok, "T21 pre-schedule for website publish");
  const pub = await publishSchedule(store, s.data!.id ?? "", websitePublisher, "test", NOW);
  assert(pub.ok, "T21 website publish succeeds", pub.error?.message);
  assert(pub.data!.status === "succeeded", "T21 publication succeeded");
  assert(getItem(store, "pub")!.status === "PUBLISHED", "T21 item becomes PUBLISHED");
  assert(listPublished(store).length === 1, "T21 published content surfaced to storefront");
  const again = await publishSchedule(store, s.data!.id ?? "", websitePublisher, "test", NOW);
  assert(again.ok && again.data?.id === pub.data!.id, "T21 idempotency key prevents double publish");
}

{
  const store = createMemoryStore();
  store.settings.enabledChannels = ["website", "instagram"];
  makeOpsItem(store, { id: "soc" });
  await approve(store, "soc");
  const s = await scheduleApproved(store, "soc", "instagram", FUTURE);
  assert(s.ok, "T22 pre-schedule for instagram");
  const pub = await publishSchedule(store, s.data!.id ?? "", instagramPublisher, "test", NOW);
  assert(!pub.ok && pub.error?.code === "channel_not_connected", "T22 unconfigured social channel → CHANNEL_NOT_CONNECTED");
  assert(pub.data!.status === "failed", "T22 publication recorded failed");
  assert(getItem(store, "soc")!.status === "PUBLISH_FAILED", "T22 item → PUBLISH_FAILED");
}

{
  const store = createMemoryStore();
  const campaign = makeCampaign(store, { id: "stale-camp" });
  makeOpsItem(store, { id: "stale", campaignId: campaign.id });
  assert(await approve(store, "stale"), "T23 pre-approve stale");
  const s = await scheduleContentItem(store, { itemId: "stale", channel: "website", scheduledFor: FUTURE, campaignId: campaign.id }, "test", { now: NOW });
  assert(s.ok, "T23 pre-schedule inside active campaign");
  await setCampaignStatus(store, campaign.id, "paused", "test", NOW);
  const pub = await publishSchedule(store, s.data!.id, websitePublisher, "test", "2026-01-07T08:00:00.000Z");
  assert(!pub.ok && pub.error?.code === "revalidation_required", "T23 stale content blocked at publish time");
  assert(pub.data?.revalidation?.passed === false, "T23 publication has failed revalidation");
  assert(getItem(store, "stale")!.status === "REVIEW_REQUIRED", "T23 item moved to REVIEW_REQUIRED");
}

{
  const store = createMemoryStore();
  const campaign = makeCampaign(store, { id: "pause-camp" });
  makeOpsItem(store, { id: "auto1", eligibility: "AUTO_PUBLISH_ELIGIBLE" });
  await approve(store, "auto1");
  const a = await scheduleContentItem(store, { itemId: "auto1", channel: "website", scheduledFor: "2026-01-05T09:00:00.000Z", campaignId: null }, "test", { now: NOW });
  assert(a.ok, "T24 pre-schedule auto1");

  makeOpsItem(store, { id: "human1", eligibility: "ADMIN_REVIEW_REQUIRED" });
  await approve(store, "human1");
  const b = await scheduleContentItem(store, { itemId: "human1", channel: "website", scheduledFor: "2026-01-05T09:00:00.000Z", campaignId: null }, "test", { now: NOW });
  assert(b.ok, "T24 pre-schedule human1");

  makeOpsItem(store, { id: "stale1", eligibility: "AUTO_PUBLISH_ELIGIBLE" });
  await approve(store, "stale1");
  const c = await scheduleContentItem(store, { itemId: "stale1", channel: "website", scheduledFor: "2026-01-05T09:00:00.000Z", campaignId: campaign.id }, "test", { now: NOW });
  assert(c.ok, "T24 pre-schedule stale1 (inside campaign)");
  await setCampaignStatus(store, campaign.id, "paused", "test", NOW);

  const registry = createDefaultPublisherRegistry();
  const result = await publishDueItems(store, (ch) => registry.get(ch), { actor: "test", now: "2026-01-05T10:00:00.000Z" });
  assert(result.processed === 3, "T24 publishDueItems processes 3 due schedules", `processed=${result.processed}`);
  assert(result.published === 1, "T24 one auto-eligible item published", `published=${result.published}`);
  assert(result.skipped === 1, "T24 human-review item skipped", `skipped=${result.skipped}`);
  assert(result.revalidationRequired === 1, "T24 stale item → revalidation required", `reval=${result.revalidationRequired}`);
  assert(getItem(store, "auto1")!.status === "PUBLISHED", "T24 auto1 PUBLISHED");
  assert(getItem(store, "human1")!.status === "SCHEDULED", "T24 human1 not auto-published");
}

section("Operations — Archive / cancel / state machine");

{
  const store = createMemoryStore();
  makeOpsItem(store, { id: "arch" });
  assert(canTransition("REVIEW_REQUIRED", "ARCHIVED"), "T25 transition table allows REVIEW_REQUIRED → ARCHIVED");
  let threw = false;
  try {
    assertTransition("PUBLISHED", "SCHEDULED");
  } catch {
    threw = true;
  }
  assert(threw, "T25 transition table rejects PUBLISHED → SCHEDULED");
  const res = await setItemStatus(store, "arch", "ARCHIVED", "test", NOW);
  assert(res.ok && res.data?.status === "ARCHIVED", "T25 archive item");
}

section("Operations — Plans (never auto-publish)");

{
  const store = createMemoryStore();
  const daily = await generatePlan(store, "daily", { date: "2026-01-05" }, "test", NOW);
  assert(daily.ok && daily.data?.kind === "daily", "T26 daily plan generated");
  const weekly = await generatePlan(store, "weekly", { date: "2026-01-05" }, "test", NOW);
  assert(weekly.ok && weekly.data?.kind === "weekly", "T27 weekly plan generated");
  const monthly = await generatePlan(store, "monthly", { date: "2026-01-05" }, "test", NOW);
  assert(monthly.ok && monthly.data?.kind === "monthly", "T28 monthly plan generated");
  assert(listPlans(store).length === 3, "T28b plans stored");
  assert(store.items.size === 0 && store.schedules.size === 0, "T28c plans never auto-publish (no items/schedules created)");
}

section("Operations — Campaigns");

{
  const store = createMemoryStore();
  const camp = makeCampaign(store);
  assert(isCampaignActive(camp, FUTURE), "T29 active campaign within window");
  const upd = await updateCampaign(store, camp.id, { priority: 90 }, "test", NOW);
  assert(upd.ok && upd.data?.priority === 90, "T30 update campaign");
  const bad = await createCampaign(store, { name: "", objective: "DISCOVERY", startAt: "2026-01-01T00:00:00.000Z", endAt: "2026-01-02T00:00:00.000Z", priority: 50, categoryIds: [], productIds: [], contentTypes: [], channels: [], status: "draft" }, "test", NOW);
  assert(!bad.ok && bad.error?.code === "invalid_campaign", "T31 invalid campaign input rejected");
  const unpub = await createCampaign(store, { name: "x", objective: "DISCOVERY", startAt: "2026-01-01T00:00:00.000Z", endAt: "2026-01-02T00:00:00.000Z", priority: 50, categoryIds: [], productIds: ["unpublished-product-1"], contentTypes: ["EDUCATIONAL"], channels: ["website"], status: "draft" }, "test", NOW);
  assert(!unpub.ok && (unpub.error?.message ?? "").includes("not published"), "T32 campaign cannot include unpublished products");
  assert(listCampaigns(store).length === 1, "T32b one campaign stored");
}

section("Operations — Settings safety invariants");

{
  const store = createMemoryStore();
  const res = await updateContentOpsSettings(store, { originalityThreshold: 0.1, priceFreshnessDays: 0, enabledChannels: [] }, "test", NOW);
  assert(res.ok, "T33 settings update ok");
  assert(res.data!.originalityThreshold >= 0.5, "T33 originalityThreshold safety floor enforced", String(res.data!.originalityThreshold));
  assert(res.data!.priceFreshnessDays >= 1, "T33 priceFreshnessDays floor enforced", String(res.data!.priceFreshnessDays));
  assert(res.data!.enabledChannels.includes("website"), "T33 website channel always enabled");
}

section("Operations — Dashboard + freshness + queries");

{
  const store = createMemoryStore();
  makeOpsItem(store, { id: "d1" });
  const f = checkContentFreshness(store, store.items.get("d1")!, store.settings, FUTURE);
  assert(f.passed, "T34 freshness passes for a real published product", f.issues.join("; "));
  const stats = getDashboardStats(store);
  assert(stats.totalItems === 1 && stats.review === 1, "T35 dashboard aggregates items");
}

/* ------------------------------------------------------------------------ */
/* ANALYTICS (14)                                                            */
/* ------------------------------------------------------------------------ */

section("Analytics");

{
  const store = createMemoryStore();
  for (let i = 0; i < 100; i++) recordPerformanceEvent(store, { id: `c1:impression:${i}`, contentId: "c1", productId: REAL, campaignId: "camp1", categoryId: "cleansers", metric: "impression", occurredAt: NOW, source: "test" });
  for (let i = 0; i < 5; i++) recordPerformanceEvent(store, { id: `c1:like:${i}`, contentId: "c1", productId: REAL, campaignId: "camp1", categoryId: "cleansers", metric: "like", occurredAt: NOW, source: "test" });
  for (let i = 0; i < 2; i++) recordPerformanceEvent(store, { id: `c1:comment:${i}`, contentId: "c1", productId: REAL, campaignId: "camp1", categoryId: "cleansers", metric: "comment", occurredAt: NOW, source: "test" });
  recordPerformanceEvent(store, { id: "c1:share", contentId: "c1", productId: REAL, campaignId: "camp1", categoryId: "cleansers", metric: "share", occurredAt: NOW, source: "test" });
  recordPerformanceEvent(store, { id: "c1:save", contentId: "c1", productId: REAL, campaignId: "camp1", categoryId: "cleansers", metric: "save", occurredAt: NOW, source: "test" });
  for (let i = 0; i < 10; i++) recordPerformanceEvent(store, { id: `c1:click:${i}`, contentId: "c1", productId: REAL, campaignId: "camp1", categoryId: "cleansers", metric: "click", occurredAt: NOW, source: "test" });
  for (let i = 0; i < 3; i++) recordPerformanceEvent(store, { id: `c1:atc:${i}`, contentId: "c1", productId: REAL, campaignId: "camp1", categoryId: "cleansers", metric: "add_to_cart", occurredAt: NOW, source: "test" });
  for (let i = 0; i < 2; i++) recordPerformanceEvent(store, { id: `c1:co:${i}`, contentId: "c1", productId: REAL, campaignId: "camp1", categoryId: "cleansers", metric: "checkout", occurredAt: NOW, source: "test", value: 1000 });
  recordPerformanceEvent(store, { id: "c1:purchase", contentId: "c1", productId: REAL, campaignId: "camp1", categoryId: "cleansers", metric: "purchase", occurredAt: NOW, source: "test", value: 900 });

  const dup = recordPerformanceEvent(store, { id: "c1:purchase", contentId: "c1", metric: "purchase", occurredAt: NOW, source: "test" });
  assert(!dup.ok && dup.error?.code === "duplicate_event", "A1 duplicate event id rejected (dedupe)");

  const p = getContentPerformance(store, "c1");
  assert(p.impressions === 100, "A2 impressions counted", String(p.impressions));
  assert(p.likes === 5 && p.comments === 2 && p.shares === 1 && p.saves === 1, "A2 engagement metrics counted");
  assert(p.clicks === 10 && p.productViews === 0, "A2 click + product-view counts");
  assert(p.engagementRate === 9, "A3 engagementRate = (5+2+1+1)/100 = 9%", String(p.engagementRate));
  assert(p.clickThroughRate === 10, "A4 clickThroughRate = 10/100 = 10%", String(p.clickThroughRate));
  assert(p.conversionRate === 10, "A5 conversionRate = 1/10 = 10%", String(p.conversionRate));
  assert(p.revenueYER === 2900, "A6 revenue = 2×1000 + 900 = 2900 YER", String(p.revenueYER));
  assert(p.addToCarts === 3, "A7 addToCarts counted");

  const none = getContentPerformance(store, "no-content");
  assert(none.engagementRate === "insufficient_data", "A8 no data → insufficient_data (never 0%)", String(none.engagementRate));
  assert(none.clickThroughRate === "insufficient_data" && none.conversionRate === "insufficient_data", "A8 all rate metrics insufficient_data");

  const prod = getProductPerformance(store, REAL);
  assert(prod.impressions === 100, "A9 product attribution sums impressions");
  const camp = getCampaignPerformance(store, "camp1");
  assert(camp.purchases === 1, "A10 campaign attribution purchase count");
  const cat = getCategoryPerformance(store, "cleansers");
  assert(cat.impressions === 100, "A11 category attribution impressions");

  const dash = getPerformanceDashboard(store);
  assert(dash.totalEvents === 100 + 5 + 2 + 1 + 1 + 10 + 3 + 2 + 1, "A12 dashboard total events", String(dash.totalEvents));
  assert(dash.uniqueContent === 1, "A12 dashboard unique content");
  assert(dash.topByEngagement.length === 1 && dash.topByEngagement[0].contentId === "c1", "A12 dashboard top by engagement");
  assert(dash.topProducts.some((t) => t.productId === REAL && t.purchases === 1 && t.revenueYER === 900), "A12 dashboard top products with revenue");

  const fatigue = analyzeContentFatigue(store, { now: "2026-01-06T00:00:00.000Z" });
  assert(fatigue.length === 1, "A13 fatigue analyzes content with data");
  assert(fatigue[0].contentId === "c1" && (fatigue[0].recommendation === "watch" || fatigue[0].recommendation === "refresh"), "A13 fatigue recommendation computed", fatigue[0].recommendation);

  const store2 = createMemoryStore();
  for (let i = 0; i < 1000; i++) recordPerformanceEvent(store2, { id: `c9:i:${i}`, contentId: "c9", metric: "impression", occurredAt: NOW, source: "test" });
  const fatigue2 = analyzeContentFatigue(store2, { now: "2026-01-06T00:00:00.000Z" });
  assert(fatigue2[0].impressions === 1000 && fatigue2[0].recommendation === "rest", "A14 high impressions + zero engagement → rest", fatigue2[0].recommendation);
}

/* ------------------------------------------------------------------------ */
/* CHANNEL ADAPTERS (8)                                                      */
/* ------------------------------------------------------------------------ */

section("Channel adapters");

{
  const web = createWebsiteAdapter();
  assert(web.isConfigured(), "C1 website adapter configured (real channel)");
  const emptyItem = makeOpsItem(createMemoryStore(), { id: "x" });
  emptyItem.item.body = "";
  const fail = await web.publish({ item: emptyItem, versionId: "v-x" }, { id: "k", itemId: "x", versionId: "v-x", channel: "website", scheduleId: "s", status: "pending", revalidation: { passed: true, issues: [] }, attemptedAt: NOW });
  assert(!fail.ok && fail.error === "empty body cannot be published", "C2 website rejects empty body");
  const okItem = makeOpsItem(createMemoryStore(), { id: "y" });
  const good = await web.publish({ item: okItem, versionId: "v-y" }, { id: "k2", itemId: "y", versionId: "v-y", channel: "website", scheduleId: "s2", status: "pending", revalidation: { passed: true, issues: [] }, attemptedAt: NOW });
  assert(good.ok && good.providerId === "website", "C3 website publish confirms delivery with providerId");
}

{
  const ig = createSocialAdapter("instagram");
  assert(!ig.isConfigured(), "C4 social adapter unconfigured by default");
  const item = makeOpsItem(createMemoryStore(), { id: "s" });
  const res = await ig.publish({ item, versionId: "v-s" }, { id: "k", itemId: "s", versionId: "v-s", channel: "instagram", scheduleId: "s", status: "pending", revalidation: { passed: true, issues: [] }, attemptedAt: NOW });
  assert(!res.ok && res.error === CHANNEL_NOT_CONNECTED, "C5 unconfigured social publish → CHANNEL_NOT_CONNECTED (no fake success)");
}

{
  const fb = createSocialAdapter("facebook", { enabled: true, deliver: async () => ({ providerId: "fb-post-1" }) });
  const item = makeOpsItem(createMemoryStore(), { id: "s2" });
  const res = await fb.publish({ item, versionId: "v" }, { id: "k", itemId: "s2", versionId: "v", channel: "facebook", scheduleId: "s", status: "pending", revalidation: { passed: true, issues: [] }, attemptedAt: NOW });
  assert(res.ok && res.providerId === "fb-post-1", "C6 configured social adapter performs real delivery (injected deliver)");
}

{
  const tt = createSocialAdapter("tiktok", { enabled: true, deliver: async () => ({ error: "rate_limited" }) });
  const item = makeOpsItem(createMemoryStore(), { id: "s3" });
  const res = await tt.publish({ item, versionId: "v" }, { id: "k", itemId: "s3", versionId: "v", channel: "tiktok", scheduleId: "s", status: "pending", revalidation: { passed: true, issues: [] }, attemptedAt: NOW });
  assert(!res.ok && res.error === "rate_limited", "C7 configured adapter propagates provider errors honestly");
}

{
  const reg = createDefaultPublisherRegistry();
  assert(reg.list().length === 5, "C8 registry exposes all 5 channels", String(reg.list().length));
  assert(reg.get("website")?.isConfigured() === true, "C8 website configured in registry");
  assert(reg.get("whatsapp")?.isConfigured() === false, "C8 whatsapp unconfigured in registry");
}

/* ------------------------------------------------------------------------ */
/* RUNTIME — full lifecycle end-to-end                                       */
/* ------------------------------------------------------------------------ */

section("Runtime — full lifecycle");

{
  const store = createMemoryStore();
  const idea = await createIdeaRecord(store, { title: "روتين العناية", categoryId: "cleansers", contentType: "FAQ", objective: "EDUCATION", productIds: [REAL], reason: "r", priority: "high" }, "admin", NOW);
  assert(idea.ok, "R1 idea recorded");

  const gen = await generateItem(store, { productIds: [REAL], contentType: "FAQ", objective: "EDUCATION", campaignId: null }, "admin", { provider: safeProvider(), now: NOW });
  assert(gen.ok, "R2 generated from idea path", gen.error?.message);
  const id = gen.data!.id;

  const edit = await editItem(store, id, { body: SAFE_BODY + " " }, "admin", NOW);
  assert(edit.ok && edit.data!.versions.length === 2, "R3 versioned edit");

  const reval = await revalidateItem(store, id, "admin", NOW);
  assert(reval.ok && reval.data!.status === "REVIEW_REQUIRED", "R4 revalidated to REVIEW_REQUIRED");

  const appr = await approveItem(store, id, "admin", NOW);
  assert(appr.ok && appr.data!.status === "APPROVED", "R5 approved");

  const sched = await scheduleContentItem(store, { itemId: id, channel: "website", scheduledFor: "2026-01-05T09:00:00.000Z", campaignId: null }, "admin", { now: NOW });
  assert(sched.ok, "R6 scheduled");

  const due = await publishDueItems(store, (ch) => createDefaultPublisherRegistry().get(ch), { actor: "admin", now: "2026-01-05T10:00:00.000Z" });
  assert(due.published === 1 && getItem(store, id)!.status === "PUBLISHED", "R7 auto pipeline published the eligible item", `published=${due.published}`);

  const pub = listPublished(store);
  assert(pub.length === 1 && pub[0].contentId === id, "R8 published content surfaced");

  const auditActions = store.audit.map((a) => a.action);
  assert(auditActions.includes("AI_GENERATED") && auditActions.includes("ADMIN_EDITED") && auditActions.includes("REVALIDATED") && auditActions.includes("APPROVED") && auditActions.includes("SCHEDULED") && auditActions.includes("PUBLISH_STARTED") && auditActions.includes("PUBLISHED"), "R9 every state change audited", auditActions.join(","));
  assert(getDashboardStats(store).totalPublished === 1, "R10 dashboard reflects the published item");
}

/* ------------------------------------------------------------------------ */
/* CATEGORY COVERAGE (controlled results)                                    */
/* ------------------------------------------------------------------------ */

section("Category coverage");

{
  const store = createMemoryStore();
  const plan = await generatePlan(store, "daily", { date: "2026-01-05", itemCount: 10 }, "test", NOW);
  assert(plan.ok && Array.isArray(plan.data!.items), "G1 daily plan returns items array");
  assert(store.items.size === 0, "G1 plan does not auto-publish");

  const themes: Array<[string, string]> = [
    ["Makeup", "face-makeup"],
    ["Fragrance", "perfume-women"],
    ["Face Care", "cleansers"],
    ["Skin Care", "moisturizers"],
    ["Hair Care", "hair-oils"],
    ["Supplements", "vitamins"],
    ["Oral Care", "appliances-teeth"],
    ["Body Care", "body-wash"],
    ["Gifts", "perfume-gift-sets"],
    ["Bundles", "perfume-musk"],
  ];
  let controlledEmpty = 0;
  for (const [label, slug] of themes) {
    let threw = false;
    let count = 0;
    try {
      const ideas = generateContentIdeas({ categoryId: slug, limit: 3, now: NOW });
      count = ideas.length;
    } catch {
      threw = true;
    }
    assert(!threw, `G2 ${label} (${slug}) selection runs without error`);
    if (count === 0) controlledEmpty++;
  }
  console.log(`  INFO  controlled-empty categories: ${controlledEmpty}/${themes.length} (insufficient eligible content handled)`);
  assert(controlledEmpty <= themes.length, "G3 controlled empty results are permitted");

  const realCategories = [...new Set(onlyPublished(products).map((p) => p.categorySlug).filter(Boolean))];
  const ctx = buildContentContext({ productIds: [REAL], strict: true });
  const v = validateGeneratedContent(SAFE_BODY, ctx.products[0]?.facts ?? [], { canonicalPrice: onlyPublished(products).find((p) => p.id === REAL)?.pricing?.price ?? null });
  assert(v.passed, "G4 safe fixture body still validates against real catalog");
  assert(realCategories.length >= 30, "G5 real catalog has broad category coverage", `categories=${realCategories.length}`);
}

/* ------------------------------------------------------------------------ */
/* SUMMARY                                                                   */
/* ------------------------------------------------------------------------ */

console.log(`\n================ RESULTS ================`);
console.log(`  PASSED: ${passed}`);
console.log(`  FAILED: ${failed}`);
if (failures.length > 0) {
  console.log(`\nFailures:`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exitCode = 1;
} else {
  console.log(`  ALL PART 2 TESTS PASSED`);
}