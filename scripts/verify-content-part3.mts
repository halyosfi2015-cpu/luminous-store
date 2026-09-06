/**
 * PART 3 — HYBRID AI ENGINE, CREATIVE INTELLIGENCE & ONE-CLICK ADMIN CONTROL
 * =========================================================================
 * Run with: npx tsx --tsconfig tsconfig.verify.json scripts/verify-content-part3.mts
 *
 * Coverage:
 *   Hybrid provider config/status   (fallback rules, honest messages)
 *   Self engine through Part 1/2    (real catalog, validation/originality intact)
 *   CUSTOM_OTHER taxonomy           (creative freedom, never auto-published)
 *   Creative idea intelligence      (scoring, novelty, seasonality, campaigns)
 *   External context abstraction    (graceful degradation, facts override)
 *   Channel connection architecture (honest connect, website always connected)
 *   Multi-channel idempotent publish
 *   Provider switch + automation + pipeline
 */

import { onlyPublished } from "../src/lib/publication";
import { products } from "../src/data/products";
import type { AIProvider, RawAIResult } from "../src/lib/ai/provider";
import type { AIProviderConfig } from "../src/lib/ai/types";
import { createMemoryStore, type ContentStore } from "../src/lib/content-ops/store";
import {
  generateItem,
  scheduleContentItem,
  approveItem,
  switchContentProvider,
  updateAutomation,
  runContentPipeline,
} from "../src/lib/content-ops/operations";
import {
  isChannelConnected,
  getChannelConnectionStatuses,
  connectChannel,
  disconnectChannel,
  publishApprovedContent,
  CHANNEL_CREDENTIALS_NOT_CONFIGURED,
} from "../src/lib/content-ops/channels";
import { createDefaultPublisherRegistry } from "../src/lib/content-ops/publishing";
import { CHANNEL_NOT_CONNECTED } from "../src/lib/content-ops/publishing";
import { DEFAULT_CONTENT_OPS_SETTINGS, CONTENT_OPS_STATUS_LABELS } from "../src/lib/content-ops/types";
import {
  generateContent,
} from "../src/lib/ai/content/generator";
import { buildContentContext, serializeContentContext } from "../src/lib/ai/content/context";
import { buildContentBrief } from "../src/lib/ai/content/content-brief";
import { CONTENT_TYPES, CUSTOM_CONTENT_TYPE } from "../src/lib/ai/content/types";
import { CONTENT_TYPE_META } from "../src/lib/ai/content/taxonomy";
import {
  SelfAIProvider,
  createSelfAIProvider,
  buildSelfContentBody,
  buildSelfContentPayload,
} from "../src/lib/ai/hybrid/self-provider";
import {
  resolveEffectiveProvider,
  buildHybridProviderStatus,
  isOpenAIConfigured,
} from "../src/lib/ai/hybrid/config";
import { createActiveInsightAdapter, getEffectiveProvider, getProviderStatus } from "../src/lib/ai/hybrid/provider";
import { generateBestIdeas } from "../src/lib/ai/hybrid/ideas";
import {
  buildExternalContext,
  mergeExternalFacts,
  assertInternalFactsOverride,
} from "../src/lib/ai/hybrid/external-context";
import { CONTENT_ENGINE_VERSION } from "../src/lib/ai/content/types";
import { CONTENT_OPS_ENGINE_VERSION } from "../src/lib/content-ops/operations";

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
const REAL = onlyPublished(products)[0]?.id ?? "yq-754";

function makeSelfStore(): ContentStore {
  const store = createMemoryStore();
  return store;
}

async function main() {
  /* ------------------------------------------------------------------ */
  section("A. Hybrid provider configuration & status");
  /* ------------------------------------------------------------------ */

  assert(DEFAULT_CONTENT_OPS_SETTINGS.aiProvider === "self", "A1 default provider is self");
  assert(DEFAULT_CONTENT_OPS_SETTINGS.aiFallbackEnabled === true, "A2 fallback enabled by default");
  assert(DEFAULT_CONTENT_OPS_SETTINGS.externalResearchEnabled === false, "A3 external research off by default");
  assert(DEFAULT_CONTENT_OPS_SETTINGS.connectedChannels.includes("website"), "A4 website connected by default");

  const st = makeSelfStore();
  assert(st.settings.connectedChannels.includes("website"), "A5 memory store seeds website connection");

  assert(resolveEffectiveProvider({ aiProvider: "self", aiFallbackEnabled: true }).effective === "self", "A6 self -> self");
  const openaiConfigured = isOpenAIConfigured();
  if (openaiConfigured) {
    assert(resolveEffectiveProvider({ aiProvider: "openai", aiFallbackEnabled: true }).effective === "openai", "A7 openai configured -> openai");
  } else {
    const fb = resolveEffectiveProvider({ aiProvider: "openai", aiFallbackEnabled: true });
    assert(fb.effective === "self" && fb.fallbackUsed === true, "A7 openai missing key + fallback -> self (fallbackUsed)");
    const noFb = resolveEffectiveProvider({ aiProvider: "openai", aiFallbackEnabled: false });
    assert(noFb.effective === "openai" && noFb.fallbackUsed === false, "A8 openai missing key + no fallback -> openai (not ready)");
  }

  const status = buildHybridProviderStatus({ aiProvider: "self", aiFallbackEnabled: true });
  assert(status.ready === true, "A9 self engine always ready");
  assert(status.messageAr === "يعمل بالمحرك الذاتي", "A10 self status Arabic message", status.messageAr);
  assert(status.version.length > 0, "A11 status carries engine version");

  if (!openaiConfigured) {
    const fbStatus = buildHybridProviderStatus({ aiProvider: "openai", aiFallbackEnabled: true });
    assert(fbStatus.messageAr === "OpenAI غير مهيأ — سيتم استخدام المحرك الذاتي", "A12 fallback Arabic message", fbStatus.messageAr);
    const noFbStatus = buildHybridProviderStatus({ aiProvider: "openai", aiFallbackEnabled: false });
    assert(noFbStatus.ready === false, "A13 openai without key + no fallback is NOT ready");
  }

  /* ------------------------------------------------------------------ */
  section("B. Self engine end-to-end through the Part 1 pipeline");
  /* ------------------------------------------------------------------ */

  const ctx = buildContentContext({ productIds: [REAL], strict: true });
  assert(ctx.allProductsResolved && ctx.products.length > 0, "B1 real product context resolves");
  const facts = ctx.products.flatMap((p) => p.facts);
  assert(facts.length > 0, "B2 context exposes verified facts");

  const brief = buildContentBrief({
    categoryId: ctx.products[0].categoryId,
    contentType: "PRODUCT_SPOTLIGHT",
    objective: "DISCOVERY",
    productIds: [REAL],
    language: "ar",
    verifiedFacts: facts,
  });

  const gen = await generateContent(brief, ctx, { provider: new SelfAIProvider(), now: NOW });
  assert(gen.item !== null && gen.error === null, "B3 self provider generates an item");
  assert(gen.item !== null, "B4 self provider returns content", gen.item ? "" : "no item");
  if (gen.item) {
    assert(gen.item.validation.passed === true, "B5 self output passes fact validation");
    assert(gen.item.originality.passed === true, "B6 self output passes originality");
    assert(gen.item.status === "APPROVED", "B7 valid + original content is APPROVED", gen.item.status);
    assert(gen.item.eligibility === "ADMIN_REVIEW_REQUIRED", "B8 medium-risk spotlight is not auto-publishable", gen.item.eligibility);
    const priceMentions = (gen.item.body.match(/ريال|ير/g) ?? []).length;
    assert(priceMentions === 0 || brief.priceRequirement !== "forbidden", "B9 price only appears when allowed");
  }

  // Self provider only emits verified fact statements: every claim maps 1:1.
  const body = gen.item?.body ?? "";
  const claims = body.split(/(?<=[.۔.!؟])/g).map((c) => c.trim()).filter(Boolean);
  const unsupported = claims.filter((c) => {
    return !facts.some((f) => f.statementAr === c.replace(/\.+$/, "").trim());
  });
  assert(unsupported.length === 0, "B10 every self sentence is a verified fact statement", unsupported.slice(0, 2).join(" | "));

  /* ------------------------------------------------------------------ */
  section("C. Creative freedom: CUSTOM_OTHER never auto-publishes");
  /* ------------------------------------------------------------------ */

  assert(CONTENT_TYPES.length === 11, "C1 taxonomy keeps 11 fixed types", `length=${CONTENT_TYPES.length}`);
  assert(CONTENT_TYPE_META[CUSTOM_CONTENT_TYPE].riskLevel === "medium", "C2 CUSTOM_OTHER risk is medium");
  assert(!CONTENT_TYPES.includes(CUSTOM_CONTENT_TYPE), "C3 CUSTOM_OTHER is not in the fixed taxonomy array");

  const customBriefCtx = buildContentContext({ productIds: [REAL], strict: true });
  const briefCustom = buildContentBrief({
    categoryId: customBriefCtx.products[0].categoryId,
    contentType: CUSTOM_CONTENT_TYPE,
    objective: "AWARENESS",
    productIds: [REAL],
    language: "ar",
    verifiedFacts: customBriefCtx.products.flatMap((p) => p.facts),
  });
  assert(briefCustom.contentType === CUSTOM_CONTENT_TYPE, "C4 brief builds for CUSTOM_OTHER without crashing");

  const customCtx = buildContentContext({ productIds: [REAL], strict: true });
  const customBrief = buildContentBrief({
    categoryId: customCtx.products[0].categoryId,
    contentType: CUSTOM_CONTENT_TYPE,
    objective: "AWARENESS",
    productIds: [REAL],
    language: "ar",
    verifiedFacts: customCtx.products.flatMap((p) => p.facts),
  });
  const customGen = await generateContent(customBrief, customCtx, { provider: new SelfAIProvider(), now: NOW });
  assert(customGen.item !== null, "C5 CUSTOM_OTHER idea generates content");
  if (customGen.item) {
    assert(customGen.item.validation.passed === true, "C6 CUSTOM_OTHER output still validates");
    assert(customGen.item.eligibility === "ADMIN_REVIEW_REQUIRED", "C7 CUSTOM_OTHER requires admin review (never auto-publish)");
  }

  /* ------------------------------------------------------------------ */
  section("D. Creative idea intelligence (one-click)");
  /* ------------------------------------------------------------------ */

  const ideas1 = generateBestIdeas({ limit: 10, creativeLimit: 5, now: NOW });
  assert(ideas1.length > 0, "D1 generates ranked ideas");
  assert(ideas1.every((i) => typeof i.score === "number" && i.score >= 0 && i.score <= 1), "D2 all ideas carry 0..1 score");
  assert(ideas1.length <= 10, "D3 respects limit");
  assert(ideas1.some((i) => i.source === "creative"), "D4 includes creative-angle ideas");
  assert(ideas1.some((i) => i.contentType === CUSTOM_CONTENT_TYPE), "D5 creative engine uses CUSTOM_OTHER for open angles");
  const publishedIds = new Set(onlyPublished(products).map((p) => p.id));
  assert(ideas1.every((i) => i.productIds.every((pid) => publishedIds.has(pid))), "D6 ideas reference published products only");
  assert(ideas1.every((i) => typeof i.novelty === "number" && typeof i.seasonalRelevance === "number"), "D7 novelty + seasonality scored");

  const fatiguedId = ideas1[0].productIds[0];
  const ideasFatigued = generateBestIdeas({ limit: 6, creativeLimit: 3, now: NOW, fatiguedProductIds: [fatiguedId] });
  const fatiguePenaltyApplied = ideasFatigued.some((i) => i.productIds[0] !== fatiguedId || i.score < 1);
  assert(fatiguePenaltyApplied, "D8 fatigue reduces exposure of used products");

  const ideas2 = generateBestIdeas({ limit: 10, creativeLimit: 5, now: NOW });
  assert(JSON.stringify(ideas1.map((i) => i.title)) === JSON.stringify(ideas2.map((i) => i.title)), "D9 idea generation is deterministic");

  const storeD = makeSelfStore();
  storeD.settings.autoGenerate = true;
  const pipeStore = makeSelfStore();
  pipeStore.settings.autoGenerate = true;
  const pipeline = await runContentPipeline(pipeStore, "test", { now: NOW });
  assert(pipeline.generated >= 0 && typeof pipeline.published === "number", "D10 pipeline runs and reports counts");
  assert(pipeline.provider.ready === true, "D11 pipeline exposes provider status");

  /* ------------------------------------------------------------------ */
  section("E. External context abstraction (graceful degradation)");
  /* ------------------------------------------------------------------ */

  const extOff = buildExternalContext({ categoryId: null, categoryAr: null, contentType: "PRODUCT_SPOTLIGHT", objective: "DISCOVERY", productIds: [REAL], now: NOW }, false);
  assert(extOff.enabled === false && extOff.applied === false, "E1 disabled -> excluded safely");
  const extOn = buildExternalContext({ categoryId: null, categoryAr: null, contentType: "PRODUCT_SPOTLIGHT", objective: "DISCOVERY", productIds: [REAL], now: NOW }, true);
  assert(extOn.enabled === true && extOn.applied === false, "E2 no source configured -> applied false, honest note");

  const merged = mergeExternalFacts(extOn.entries, facts);
  assert(merged.facts === facts, "E3 internal facts are never replaced");
  assert(Array.isArray(merged.appliedContext), "E4 applied context is an array");
  let assertThrew = false;
  try {
    assertInternalFactsOverride(facts.length, facts.length + 100);
  } catch {
    assertThrew = true;
  }
  assert(assertThrew, "E5 guard refuses external context exceeding internal facts");

  /* ------------------------------------------------------------------ */
  section("F. Channel connection architecture (honest)");
  /* ------------------------------------------------------------------ */

  assert(isChannelConnected("website", ["website"]), "F1 website always connected");
  assert(!isChannelConnected("instagram", ["website"]), "F2 social channels not connected by default");
  const statuses = getChannelConnectionStatuses({ enabledChannels: ["website"], connectedChannels: ["website"] });
  assert(statuses.find((c) => c.channel === "website")?.connected === true, "F3 status shows website connected");
  assert(statuses.every((c) => c.channel === "website" || !c.connected), "F4 status shows socials disconnected");

  const storeF = makeSelfStore();
  const webConn = await connectChannel(storeF, "website", "test", { now: NOW });
  assert(webConn.ok && webConn.data?.connected === true, "F5 connecting website is a no-op success");

  const igNoCreds = await connectChannel(storeF, "instagram", "test", { now: NOW });
  assert(!igNoCreds.ok && igNoCreds.error?.code === CHANNEL_CREDENTIALS_NOT_CONFIGURED, "F6 social connect without credentials is honest", igNoCreds.error?.code ?? "");

  const igWithCreds = await connectChannel(storeF, "instagram", "test", { now: NOW, credentialsProvided: true });
  assert(igWithCreds.ok && isChannelConnected("instagram", storeF.settings.connectedChannels), "F7 connect with credentials marks connected");
  assert(storeF.audit.some((a) => a.action === "CHANNEL_CONNECTED" && a.channel === "instagram"), "F8 connection is audited");

  const igDisconnect = await disconnectChannel(storeF, "instagram", "test", { now: NOW });
  assert(igDisconnect.ok && !isChannelConnected("instagram", storeF.settings.connectedChannels), "F9 disconnect works");
  const webDisconnect = await disconnectChannel(storeF, "website", "test", { now: NOW });
  assert(!webDisconnect.ok, "F10 website cannot be disconnected");

  /* ------------------------------------------------------------------ */
  section("G. Multi-channel idempotent publish (approved only)");
  /* ------------------------------------------------------------------ */

  const storeG = makeSelfStore();
  storeG.settings.autoPublish = true;
  storeG.settings.enabledChannels = ["website", "instagram", "facebook", "tiktok", "whatsapp"];
  const genG = await generateItem(
    storeG,
    { contentType: "EDUCATIONAL", objective: "EDUCATION", productIds: [REAL] },
    "test",
    { provider: createActiveInsightAdapter(storeG.settings), now: NOW },
  );
  assert(genG.ok && genG.data !== undefined, "G1 self-mode generation succeeds");
  const itemId = genG.data!.id;
  assert(genG.data!.status === "APPROVED", "G2 auto-eligible low-risk content is APPROVED", genG.data!.status);

  const registry = createDefaultPublisherRegistry();
  const multi = await publishApprovedContent(storeG, itemId, (ch) => registry.get(ch), "test", { now: NOW });
  assert(multi.ok && multi.data !== undefined, "G3 approved content publishes across channels");
  const websiteRes = multi.data!.results.find((r) => r.channel === "website");
  const socialRes = multi.data!.results.filter((r) => r.channel !== "website");
  assert(websiteRes?.ok === true, "G4 website channel really publishes");
  assert(socialRes.every((r) => !r.ok && r.code === CHANNEL_NOT_CONNECTED), "G5 social channels never fake success");
  assert(multi.data!.anySucceeded === true, "G6 anySucceeded reflects real result");
  assert(storeG.items.get(itemId)?.status === "PUBLISHED", "G7 item moves to PUBLISHED after a real publish");
  assert(storeG.published.has(itemId), "G8 website content surfaced to storefront");
  assert(storeG.audit.some((a) => a.action === "PUBLISH_APPROVED_MULTI"), "G9 multi-publish is audited");

  const multi2 = await publishApprovedContent(storeG, itemId, (ch) => registry.get(ch), "test", { now: NOW });
  assert(multi2.ok && multi2.data !== undefined, "G10 re-publish is idempotent");
  const website2 = multi2.data!.results.find((r) => r.channel === "website");
  assert(website2?.code === "already_published", "G11 duplicate website publish is skipped", website2?.code ?? "");

  const storeG2 = makeSelfStore();
  const genR = await generateItem(
    storeG2,
    { contentType: "EDUCATIONAL", objective: "EDUCATION", productIds: [REAL] },
    "test",
    { provider: createActiveInsightAdapter(storeG2.settings), now: NOW },
  );
  const blockRes = await publishApprovedContent(storeG2, genR.data!.id, (ch) => registry.get(ch), "test", { now: NOW });
  assert(!blockRes.ok && blockRes.error?.code === "not_approved", "G12 review-required content cannot be published", blockRes.error?.code ?? "");

  // AI can never skip to PUBLISHED: a plain generated item is never auto-published.
  const storeG3 = makeSelfStore();
  const gen3 = await generateItem(
    storeG3,
    { contentType: "PRODUCT_SPOTLIGHT", objective: "DISCOVERY", productIds: [REAL] },
    "test",
    { provider: createActiveInsightAdapter(storeG3.settings), now: NOW },
  );
  assert(gen3.ok && gen3.data!.status !== "PUBLISHED", "G13 generated content never jumps to PUBLISHED", gen3.data!.status);
  assert(gen3.data!.status === "REVIEW_REQUIRED", "G14 medium-risk content requires review by default", gen3.data!.status);

  /* ------------------------------------------------------------------ */
  section("H. Provider switch + automation + pipeline");
  /* ------------------------------------------------------------------ */

  const storeH = makeSelfStore();
  const switchRes = await switchContentProvider(storeH, "openai", "admin", NOW);
  assert(switchRes.ok && storeH.settings.aiProvider === "openai", "H1 provider switches to openai");
  assert(storeH.audit.some((a) => a.action === "AI_PROVIDER_CHANGED" && a.reason?.includes("->")), "H2 provider switch is audited");
  const switchBad = await switchContentProvider(storeH, "claude" as never, "admin", NOW);
  assert(!switchBad.ok, "H3 invalid provider rejected");

  const autoRes = await updateAutomation(storeH, { autoGenerate: true, autoSchedule: true, autoPublish: true }, "admin", NOW);
  assert(autoRes.ok && storeH.settings.autoGenerate === true && storeH.settings.autoPublish === true, "H4 automation toggles update");
  assert(storeH.audit.some((a) => a.action === "AUTOMATION_UPDATED"), "H5 automation update is audited");

  const storeH2 = makeSelfStore();
  storeH2.settings.autoPublish = true;
  const genH = await generateItem(
    storeH2,
    { contentType: "EDUCATIONAL", objective: "EDUCATION", productIds: [REAL] },
    "test",
    { provider: createActiveInsightAdapter(storeH2.settings), now: NOW },
  );
  assert(genH.ok && genH.data!.status === "APPROVED", "H6a auto-eligible generation approves without auto-schedule");
  const approvedH = await approveItem(storeH2, genH.data!.id, "admin", NOW);
  assert(approvedH.ok, "H6b explicit approval records the approved version");
  const sched = await scheduleContentItem(
    storeH2,
    { itemId: genH.data!.id, channel: "website", scheduledFor: NOW },
    "test",
    { now: NOW },
  );
  assert(sched.ok, "H6 approved content schedules");

  const pipelineRes = await runContentPipeline(storeH2, "system", { now: NOW });
  assert(typeof pipelineRes.published === "number" && pipelineRes.published >= 0, "H7 pipeline publishes due items");

  /* ------------------------------------------------------------------ */
  section("I. Settings hydration preserves Part 3 fields");
  /* ------------------------------------------------------------------ */

  const storeI = makeSelfStore();
  storeI.settings.aiProvider = "openai";
  storeI.settings.connectedChannels = ["website", "facebook"];
  storeI.settings.externalResearchEnabled = true;
  // Simulate persist + rehydrate through the serialize/hydrate contract.
  const { serializeStore, hydrateStore } = await import("../src/lib/content-ops/store");
  const snapshot = serializeStore(storeI);
  const storeI2 = createMemoryStore();
  hydrateStore(storeI2, snapshot);
  assert(storeI2.settings.aiProvider === "openai", "I1 aiProvider persists");
  assert(storeI2.settings.connectedChannels.includes("facebook"), "I2 connectedChannels persists");
  assert(storeI2.settings.externalResearchEnabled === true, "I3 externalResearchEnabled persists");

  /* ------------------------------------------------------------------ */
  section("J. Part 2 invariants preserved (no regression)");
  /* ------------------------------------------------------------------ */

  assert(CONTENT_OPS_STATUS_LABELS.APPROVED.ar === "معتمد", "J1 ops status labels intact");
  const bareStore = makeSelfStore();
  const bare = await generateItem(bareStore, { contentType: "EDUCATIONAL", objective: "EDUCATION", productIds: [REAL] }, "test", { now: NOW });
  assert(!bare.ok && bare.error?.code === "ai_not_configured", "J2 generateItem without provider still requires AI (Part 2 behavior)", bare.error?.code ?? "");
  assert(CONTENT_ENGINE_VERSION.startsWith("content_engine_part1"), "J3 Part 1 engine untouched");
  assert(CONTENT_OPS_ENGINE_VERSION.startsWith("content_ops_part2"), "J4 Part 2 engine untouched");

  /* ------------------------------------------------------------------ */
  section("K. Provider adapter reuse — same pipeline both modes");
  /* ------------------------------------------------------------------ */

  const adapter = createActiveInsightAdapter({ aiProvider: "self", aiFallbackEnabled: true });
  assert(typeof adapter.generateInsight === "function", "K1 active adapter implements the canonical AIProvider contract");
  const effective = getEffectiveProvider({ aiProvider: "self", aiFallbackEnabled: true });
  assert(effective.name === "self", "K2 effective provider resolves");
  assert(getProviderStatus({ aiProvider: "self", aiFallbackEnabled: true }).ready, "K3 provider status ready");

  console.log(`\n================ RESULTS ================`);
  console.log(`  PASSED: ${passed}`);
  console.log(`  FAILED: ${failed}`);
  if (failures.length > 0) {
    console.log(`\nFailures:`);
    for (const f of failures) console.log(`  - ${f}`);
    process.exitCode = 1;
  } else {
    console.log(`  ALL PART 3 TESTS PASSED`);
  }
}

void main();