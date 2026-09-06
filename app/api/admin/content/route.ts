import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/admin-auth";
import { isAIConfigured } from "@/src/lib/ai/config";
import { selectNextBestContent, type ContentType, type ContentObjective, type ContentLanguage } from "@/src/lib/ai/content";
import { can } from "@/src/admin/permissions";
import {
  createActiveInsightAdapter,
  getProviderStatus,
  generateBestIdeas,
  buildExternalContext,
  getOpenAIEnvState,
} from "@/src/lib/ai/hybrid";
import { getContentStore } from "@/src/lib/content-ops/store";
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
  listItems,
  getItem,
  listSchedules,
  listPublished,
  getDashboardStats,
  updateContentOpsSettings,
  checkContentFreshness,
  switchContentProvider,
  updateAutomation,
  runContentPipeline,
  getSystemDiagnostics,
  type ScheduleInput,
} from "@/src/lib/content-ops/operations";
import {
  getChannelConnectionStatuses,
  connectChannel,
  disconnectChannel,
  publishApprovedContent,
} from "@/src/lib/content-ops/channels";
import {
  recordPerformanceEvent,
  getContentPerformance,
  getProductPerformance,
  getCampaignPerformance,
  getCategoryPerformance,
  getPerformanceDashboard,
  analyzeContentFatigue,
} from "@/src/lib/content-ops/analytics";
import { createConfiguredPublisherRegistry } from "@/src/lib/social/registry";
import { simulateMonthlyContent } from "@/src/lib/content-ops/monthly-simulation";
import type {
  ChannelKey,
  ContentCampaignStatus,
  ContentOpsStatus,
  HybridAIProviderName,
} from "@/src/lib/content-ops/types";
import { REJECTION_REASONS } from "@/src/lib/content-ops/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;
  if (!can((admin as any).role, "content", "view")) {
    return NextResponse.json({ error: { code: "forbidden", message: "Insufficient permissions for Content Center" } }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") ?? "dashboard";
  const store = await getContentStore();

  switch (action) {
    case "list": {
      const status = searchParams.get("status");
      const campaignId = searchParams.get("campaignId");
      return NextResponse.json({
        configured: isAIConfigured(),
        items: listItems(store, { status: (status as ContentOpsStatus | null) ?? undefined, campaignId: campaignId ?? undefined }),
      });
    }
    case "item": {
      const id = searchParams.get("id");
      if (!id) return NextResponse.json({ error: { code: "invalid_request", message: "id is required" } }, { status: 400 });
      const item = getItem(store, id);
      if (!item) return NextResponse.json({ error: { code: "not_found", message: "Content item not found" } }, { status: 404 });
      return NextResponse.json({ item });
    }
    case "dashboard":
      return NextResponse.json({ dashboard: getDashboardStats(store) });
    case "calendar": {
      const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
      const range = searchParams.get("range") ?? "day";
      const all = listSchedules(store);
      const inRange = all.filter((s) => {
        const d = s.scheduledFor.slice(0, 10);
        if (range === "day") return d === date;
        if (range === "week") {
          const start = new Date(date + "T00:00:00.000Z");
          const end = new Date(start);
          end.setDate(start.getDate() + 7);
          const t = Date.parse(s.scheduledFor);
          return t >= start.getTime() && t < end.getTime();
        }
        return d.slice(0, 7) === date.slice(0, 7);
      });
      return NextResponse.json({ schedules: inRange, items: listItems(store) });
    }
    case "campaigns":
      return NextResponse.json({ campaigns: listCampaigns(store) });
    case "ideas":
      return NextResponse.json({ ideas: listIdeas(store) });
    case "plans":
      return NextResponse.json({ plans: listPlans(store) });
    case "published":
      return NextResponse.json({ published: listPublished(store) });
    case "settings":
      return NextResponse.json({ settings: store.settings, timezone: store.settings.timezone });
    case "audit":
      return NextResponse.json({ audit: store.audit.slice(-200) });
    case "analytics": {
      const contentId = searchParams.get("contentId");
      const productId = searchParams.get("productId");
      const campaignId = searchParams.get("campaignId");
      const categoryId = searchParams.get("categoryId");
      if (contentId) return NextResponse.json({ performance: getContentPerformance(store, contentId) });
      if (productId) return NextResponse.json({ performance: getProductPerformance(store, productId) });
      if (campaignId) return NextResponse.json({ performance: getCampaignPerformance(store, campaignId) });
      if (categoryId) return NextResponse.json({ performance: getCategoryPerformance(store, categoryId) });
      return NextResponse.json({ dashboard: getPerformanceDashboard(store), fatigue: analyzeContentFatigue(store) });
    }
    case "freshness": {
      const id = searchParams.get("id");
      if (!id) return NextResponse.json({ error: { code: "invalid_request", message: "id is required" } }, { status: 400 });
      const item = getItem(store, id);
      if (!item) return NextResponse.json({ error: { code: "not_found", message: "Content item not found" } }, { status: 404 });
      return NextResponse.json({ freshness: checkContentFreshness(store, item, store.settings) });
    }
    case "ai-status":
      return NextResponse.json({
        configured: isAIConfigured(),
        provider: getProviderStatus(store.settings),
        openai: getOpenAIEnvState(),
      });
    case "channels":
      return NextResponse.json({ channels: getChannelConnectionStatuses(store.settings) });
    case "diagnostics":
      return NextResponse.json({ diagnostics: getSystemDiagnostics(store) });
    case "monthly-simulation": {
      const days = Math.min(Number(searchParams.get("days") ?? 30) || 30, 31);
      return NextResponse.json({ simulation: simulateMonthlyContent(days), persisted: false, noteAr: "محاكاة قراءة فقط — لم يتم إنشاء أو جدولة أو نشر أي منشور حقيقي" });
    }
    default:
      return NextResponse.json({ error: { code: "invalid_request", message: "Unknown action" } }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: { code: "invalid_request", message: "Invalid JSON body" } }, { status: 400 });
  }

  const action = (body.action as string) ?? "generate";
  const actor = (admin as any).name ?? "admin";
  const store = await getContentStore();
  // Registry wired to REAL stored channel tokens (Meta). Channels without a
  // valid token stay unconfigured → honest CHANNEL_NOT_CONNECTED.
  const registry = await createConfiguredPublisherRegistry();

  // Content Center permissions: view for all, edit for mutations (Step 14)
  if (!can((admin as any).role, "content", "view")) {
    return NextResponse.json({ error: { code: "forbidden", message: "Insufficient permissions for Content Center" } }, { status: 403 });
  }
  const editActions = new Set([
    "generate","regenerate","next-best","idea-create","idea-select","idea-dismiss",
    "plan","campaign-create","campaign-update","edit","revalidate","approve","reject",
    "schedule","reschedule","cancel-schedule","publish","publish-due","set-status",
    "settings","ai-switch","generate-ideas","generate-from-idea","improve-content",
    "external-context","connect-channel","disconnect-channel","update-automation",
    "run-pipeline","publish-approved","event",
  ]);
  if (editActions.has(action) && !can((admin as any).role, "content", "edit")) {
    return NextResponse.json({ error: { code: "forbidden", message: "Insufficient permissions — edit required" } }, { status: 403 });
  }

  try {
    switch (action) {
      /* ------------------------------ generation ------------------------------ */
      case "generate": {
        const providerStatus = getProviderStatus(store.settings);
        if (!providerStatus.ready) {
          return NextResponse.json(
            { error: { code: "ai_not_configured", message: providerStatus.messageAr }, provider: providerStatus },
            { status: 503 },
          );
        }
        const res = await generateItem(
          store,
          {
            categoryId: (body.categoryId as string | null) ?? null,
            contentType: body.contentType as ContentType | undefined,
            objective: body.objective as ContentObjective | undefined,
            productIds: (body.productIds as string[] | undefined) ?? undefined,
            language: (body.language as ContentLanguage | undefined) ?? undefined,
            campaignId: (body.campaignId as string | null) ?? null,
            sourceEditorialAr: body.sourceEditorialAr as string | undefined,
            sourceEditorialEn: body.sourceEditorialEn as string | undefined,
          },
          actor,
          { provider: createActiveInsightAdapter(store.settings) },
        );
        if (!res.ok) {
          const status = res.error?.code === "no_candidates" || res.error?.code === "invalid_request" ? 400 : 500;
          return NextResponse.json({ error: res.error, provider: providerStatus }, { status });
        }
        return NextResponse.json({ item: res.data, provider: providerStatus });
      }

      case "regenerate": {
        const providerStatus = getProviderStatus(store.settings);
        const res = await regenerateItem(store, body.id as string, actor, { provider: createActiveInsightAdapter(store.settings) });
        if (!res.ok) return NextResponse.json({ error: res.error, provider: providerStatus }, { status: 400 });
        return NextResponse.json({ item: res.data, provider: providerStatus });
      }

      case "next-best": {
        const candidates = selectNextBestContent({
          contentType: body.contentType as ContentType | undefined,
          objective: body.objective as ContentObjective | undefined,
          categoryId: (body.categoryId as string | null) ?? null,
        });
        // Wire Part 1 candidate selection → Part 2 generation pipeline (Step 6).
        // If a candidate was selected and generation is requested, produce a draft via generateItem.
        const shouldGenerate = body.generate === true || body.generate === "true";
        if (shouldGenerate && candidates.reasons.some((r) => r.key === "selected")) {
          // Extract selected candidate details from reason trace (format: "selected product <id> ...")
          const sel = candidates.reasons.find((r) => r.key === "selected")?.detail ?? "";
          const pidMatch = sel.match(/product (\S+) with/);
          const productId = pidMatch?.[1];
          const catMatch = candidates.reasons.find((r) => r.key === "category_relevance" || r.key === "category_underexposed");
          // Fallback: use body params or first candidate via direct selector
          const { selectContentCandidates } = await import("@/src/lib/ai/content/candidate-selector");
          const direct = selectContentCandidates({
            contentType: body.contentType as ContentType | undefined,
            objective: body.objective as ContentObjective | undefined,
            categoryId: (body.categoryId as string | null) ?? null,
            limit: 1,
          });
          const genProductIds = productId ? [productId] : direct[0] ? [direct[0].productId] : [];
          const genCategoryId = (body.categoryId as string | null) ?? direct[0]?.categoryId ?? null;
          if (genProductIds.length > 0) {
            const gen = await generateItem(
              store,
              {
                categoryId: genCategoryId,
                contentType: (body.contentType as ContentType | undefined) ?? "EDUCATIONAL",
                objective: (body.objective as ContentObjective | undefined) ?? "DISCOVERY",
                productIds: genProductIds,
                language: (body.language as ContentLanguage | undefined) ?? store.settings.defaultLanguage,
                campaignId: (body.campaignId as string | null) ?? null,
              },
              actor,
              { provider: createActiveInsightAdapter(store.settings) },
            );
            if (gen.ok) {
              return NextResponse.json({ next: candidates, item: gen.data, generated: true });
            }
            return NextResponse.json({ next: candidates, error: gen.error, generated: false });
          }
        }
        return NextResponse.json({ next: candidates, generated: false });
      }

      /* -------------------------------- ideas -------------------------------- */
      case "idea-create": {
        const res = await createIdeaRecord(
          store,
          {
            title: body.title as string,
            categoryId: (body.categoryId as string | null) ?? null,
            contentType: body.contentType as ContentType,
            objective: body.objective as ContentObjective,
            productIds: (body.productIds as string[]) ?? [],
            reason: (body.reason as string) ?? "",
            priority: (body.priority as "high" | "medium" | "low") ?? "medium",
          },
          actor,
        );
        if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
        return NextResponse.json({ idea: res.data });
      }

      case "idea-select": {
        const res = await selectIdea(store, body.id as string, actor);
        if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
        return NextResponse.json({ idea: res.data });
      }

      case "idea-dismiss": {
        const res = await dismissIdea(store, body.id as string, actor);
        if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
        return NextResponse.json({ idea: res.data });
      }

      /* -------------------------------- plans -------------------------------- */
      case "plan": {
        const res = await generatePlan(
          store,
          (body.kind as "daily" | "weekly" | "monthly") ?? "daily",
          { date: body.date as string | undefined, itemCount: body.itemCount as number | undefined, campaignId: (body.campaignId as string | null) ?? null },
          actor,
        );
        if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
        return NextResponse.json({ plan: res.data });
      }

      /* ------------------------------ campaigns ------------------------------ */
      case "campaign-create": {
        const res = await createCampaign(
          store,
          {
            name: body.name as string,
            nameEn: body.nameEn as string | undefined,
            objective: body.objective as ContentObjective,
            startAt: body.startAt as string,
            endAt: body.endAt as string,
            priority: (body.priority as number) ?? 50,
            categoryIds: (body.categoryIds as string[]) ?? [],
            productIds: (body.productIds as string[]) ?? [],
            contentTypes: (body.contentTypes as ContentType[]) ?? [],
            channels: (body.channels as ChannelKey[]) ?? [],
            status: (body.status as ContentCampaignStatus) ?? "draft",
          },
          actor,
        );
        if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
        return NextResponse.json({ campaign: res.data });
      }

      case "campaign-update": {
        const res = await updateCampaign(store, body.id as string, body as never, actor);
        if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
        return NextResponse.json({ campaign: res.data });
      }

      case "campaign-status": {
        const res = await setCampaignStatus(store, body.id as string, body.status as "draft" | "scheduled" | "running" | "paused" | "completed" | "cancelled", actor);
        if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
        return NextResponse.json({ campaign: res.data });
      }

      /* ------------------------------ lifecycle ------------------------------ */
      case "edit": {
        const res = await editItem(
          store,
          body.id as string,
          {
            title: body.title as string | null,
            body: body.body as string,
            callToAction: body.callToAction as string | null,
            productIds: body.productIds as string[] | undefined,
            language: body.language as ContentLanguage | undefined,
          },
          actor,
        );
        if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
        return NextResponse.json({ item: res.data });
      }

      case "revalidate": {
        const res = await revalidateItem(store, body.id as string, actor);
        if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
        return NextResponse.json({ item: res.data });
      }

      case "approve": {
        const res = await approveItem(store, body.id as string, actor);
        if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
        return NextResponse.json({ item: res.data });
      }

      case "reject": {
        const reason = body.reason as string;
        if (!REJECTION_REASONS.includes(reason as never)) {
          return NextResponse.json({ error: { code: "invalid_reason", message: "Invalid rejection reason" } }, { status: 400 });
        }
        const res = await rejectItem(store, body.id as string, { reason: reason as never, note: body.note as string | undefined }, actor);
        if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
        return NextResponse.json({ item: res.data });
      }

      case "schedule": {
        const input: ScheduleInput = {
          itemId: body.id as string,
          channel: (body.channel as ChannelKey) ?? "website",
          scheduledFor: body.scheduledFor as string,
          campaignId: (body.campaignId as string | null) ?? null,
        };
        const res = await scheduleContentItem(store, input, actor);
        if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
        return NextResponse.json({ schedule: res.data });
      }

      case "reschedule": {
        const res = await reschedule(store, body.id as string, body.scheduledFor as string, actor);
        if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
        return NextResponse.json({ schedule: res.data });
      }

      case "cancel-schedule": {
        const res = await cancelSchedule(store, body.id as string, actor);
        if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
        return NextResponse.json({ schedule: res.data });
      }

      case "publish": {
        const channel = (body.channel as ChannelKey) ?? "website";
        const publisher = registry.get(channel);
        if (!publisher) return NextResponse.json({ error: { code: "channel_missing", message: `No publisher for ${channel}` } }, { status: 400 });
        const rawId = body.id as string;
        const scheduleId = store.schedules.has(rawId)
          ? rawId
          : ([...store.schedules.values()].find((s) => s.itemId === rawId && s.channel === channel && s.status === "scheduled")?.id ?? rawId);
        const res = await publishSchedule(store, scheduleId, publisher, actor);
        if (!res.ok) {
          const status = res.error?.code === "channel_not_connected" || res.error?.code === "not_scheduled" ? 409 : 400;
          return NextResponse.json({ error: res.error, publication: res.data }, { status });
        }
        return NextResponse.json({ publication: res.data });
      }

      case "publish-due": {
        const res = await publishDueItems(store, (ch) => registry.get(ch), { actor });
        return NextResponse.json({ result: res });
      }

      case "set-status": {
        const res = await setItemStatus(store, body.id as string, body.status as "ARCHIVED" | "CANCELLED", actor);
        if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
        return NextResponse.json({ item: res.data });
      }

      /* ------------------------------- settings ------------------------------ */
      case "settings": {
        const res = await updateContentOpsSettings(store, body as never, actor);
        if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
        return NextResponse.json({ settings: res.data });
      }

      /* -------------------- PART 3 — hybrid AI + channels -------------------- */
      case "ai-switch": {
        const res = await switchContentProvider(store, body.provider as HybridAIProviderName, actor);
        if (!res.ok || !res.data) return NextResponse.json({ error: res.error }, { status: 400 });
        return NextResponse.json({ provider: res.data.status });
      }

      case "generate-ideas": {
        const campaignId = (body.campaignId as string | null) ?? null;
        const campaign = campaignId ? (listCampaigns(store).find((c) => c.id === campaignId) ?? null) : null;
        const ideas = generateBestIdeas({
          limit: (body.limit as number) ?? 10,
          creativeLimit: (body.creativeLimit as number) ?? 5,
          contentTypes: body.contentTypes as ContentType[] | undefined,
          objectives: body.objectives as ContentObjective[] | undefined,
          productIds: body.productIds as string[] | undefined,
          campaignProductIds: campaign?.productIds ?? undefined,
          fatiguedProductIds: listItems(store, { status: "PUBLISHED" })
            .concat(listItems(store, { status: "SCHEDULED" }))
            .flatMap((i) => i.item.productIds),
        });
        // One-click: persist the ranked ideas to the board (regenerate dismisses old IDEA rows).
        if (body.regenerate === true) {
          for (const idea of listIdeas(store).filter((i) => i.status === "IDEA")) {
            await dismissIdea(store, idea.ideaId, actor);
          }
        }
        const records = [];
        for (const idea of ideas) {
          const rec = await createIdeaRecord(store, {
            title: idea.title,
            categoryId: idea.categoryId,
            contentType: idea.contentType,
            objective: idea.objective,
            productIds: idea.productIds,
            reason: `${idea.reason} — score ${Math.round(idea.score * 100)} (${idea.source})${idea.angle ? ` — ${idea.angle.labelAr}` : ""}`,
            priority: idea.priority,
          }, actor);
          if (rec.ok && rec.data) records.push(rec.data);
        }
        return NextResponse.json({ ideas, records });
      }

      case "generate-from-idea": {
        const idea = listIdeas(store).find((i) => i.ideaId === body.id);
        if (!idea) return NextResponse.json({ error: { code: "not_found", message: "Idea not found" } }, { status: 404 });
        const providerStatus = getProviderStatus(store.settings);
        if (!providerStatus.ready) {
          return NextResponse.json({ error: { code: "ai_not_configured", message: providerStatus.messageAr }, provider: providerStatus }, { status: 503 });
        }
        await selectIdea(store, idea.ideaId, actor);
        const res = await generateItem(
          store,
          {
            categoryId: idea.categoryId,
            contentType: idea.contentType,
            objective: idea.objective,
            productIds: idea.productIds,
          },
          actor,
          { provider: createActiveInsightAdapter(store.settings), markIdeaId: idea.ideaId },
        );
        if (!res.ok) return NextResponse.json({ error: res.error, provider: providerStatus }, { status: 500 });
        return NextResponse.json({ item: res.data, provider: providerStatus });
      }

      case "improve-content": {
        const providerStatus = getProviderStatus(store.settings);
        const res = await regenerateItem(store, body.id as string, actor, { provider: createActiveInsightAdapter(store.settings) });
        if (!res.ok) return NextResponse.json({ error: res.error, provider: providerStatus }, { status: 400 });
        return NextResponse.json({ item: res.data, provider: providerStatus });
      }

      case "external-context": {
        const result = buildExternalContext(
          {
            categoryId: (body.categoryId as string | null) ?? null,
            categoryAr: (body.categoryAr as string | null) ?? null,
            contentType: (body.contentType as string) ?? "PRODUCT_SPOTLIGHT",
            objective: (body.objective as string) ?? "DISCOVERY",
            productIds: (body.productIds as string[]) ?? [],
            now: new Date().toISOString(),
          },
          store.settings.externalResearchEnabled,
        );
        store.audit.push({
          id: crypto.randomUUID(),
          contentId: null,
          versionId: null,
          actor,
          action: "EXTERNAL_CONTEXT_REQUESTED",
          previousStatus: null,
          newStatus: null,
          at: new Date().toISOString(),
          reason: `enabled=${result.enabled};applied=${result.applied}`,
        });
        return NextResponse.json({ result });
      }

      case "connect-channel": {
        const channel = body.channel as ChannelKey;
        // Meta connect flow: pasted Page/User token → validate → long-lived
        // exchange → encrypted store → mark connected + enabled.
        if ((channel === "facebook" || channel === "instagram") && typeof body.pageAccessToken === "string" && body.pageAccessToken.trim()) {
          const { connectMetaChannel } = await import("@/src/lib/social/meta-connect");
          const meta = await connectMetaChannel({
            channel,
            userToken: body.pageAccessToken.trim(),
            pageId: typeof body.pageId === "string" ? body.pageId.trim() : undefined,
            actor,
          });
          if (!meta.ok) {
            const status = meta.error?.code === "meta_not_configured" ? 503 : 400;
            return NextResponse.json({ error: meta.error }, { status });
          }
          const res = await connectChannel(store, channel, actor, { credentialsProvided: true });
          if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
          if (!store.settings.enabledChannels.includes(channel)) {
            store.settings.enabledChannels = [...store.settings.enabledChannels, channel];
            const { persistContentStore } = await import("@/src/lib/content-ops/store");
            await persistContentStore(store);
          }
          const { getTokenMeta } = await import("@/src/lib/social/token-store");
          return NextResponse.json({
            channel: res.data,
            channels: getChannelConnectionStatuses(store.settings),
            meta: await getTokenMeta(channel),
          });
        }
        const res = await connectChannel(store, channel, actor, {
          credentialsProvided: body.credentialsProvided === true,
        });
        if (!res.ok) {
          const status = res.error?.code === "CHANNEL_CREDENTIALS_NOT_CONFIGURED" ? 409 : 400;
          return NextResponse.json({ error: res.error }, { status });
        }
        return NextResponse.json({ channel: res.data, channels: getChannelConnectionStatuses(store.settings) });
      }

      case "disconnect-channel": {
        const channel = body.channel as ChannelKey;
        if (channel === "facebook" || channel === "instagram") {
          const { deleteChannelToken } = await import("@/src/lib/social/token-store");
          await deleteChannelToken(channel).catch(() => {});
        }
        const res = await disconnectChannel(store, channel, actor);
        if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
        return NextResponse.json({ channel: res.data, channels: getChannelConnectionStatuses(store.settings) });
      }

      case "channel-meta": {
        // Client-safe token metadata (page name, expiry, status) — no secrets.
        const channel = String(body.channel ?? "");
        if (channel !== "facebook" && channel !== "instagram") {
          return NextResponse.json({ error: { code: "invalid_request", message: "facebook|instagram only" } }, { status: 400 });
        }
        const { getTokenMeta } = await import("@/src/lib/social/token-store");
        return NextResponse.json({ meta: await getTokenMeta(channel) });
      }

      case "update-automation": {
        const res = await updateAutomation(
          store,
          {
            autoGenerate: body.autoGenerate as boolean,
            autoSchedule: body.autoSchedule as boolean,
            autoPublish: body.autoPublish as boolean,
          },
          actor,
        );
        if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
        return NextResponse.json({ settings: res.data });
      }

      case "run-pipeline": {
        const res = await runContentPipeline(store, actor);
        return NextResponse.json({ result: res });
      }

      case "publish-approved": {
        const res = await publishApprovedContent(store, body.id as string, (ch) => registry.get(ch), actor);
        if (!res.ok) {
          const status = res.error?.code === "not_approved" ? 409 : 400;
          return NextResponse.json({ error: res.error }, { status });
        }
        return NextResponse.json({ result: res.data });
      }

      /* ----------------------------- performance ----------------------------- */
      case "event": {
        const res = recordPerformanceEvent(store, {
          contentId: body.contentId as string,
          productId: (body.productId as string | null) ?? null,
          campaignId: (body.campaignId as string | null) ?? null,
          categoryId: (body.categoryId as string | null) ?? null,
          metric: body.metric as never,
          source: (body.source as string) ?? "admin",
          value: body.value as number | undefined,
        });
        if (!res.ok) return NextResponse.json({ error: res.error }, { status: 409 });
        return NextResponse.json({ event: res.data });
      }

      default:
        return NextResponse.json({ error: { code: "invalid_request", message: "Unknown action" } }, { status: 400 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[Content Center API]", msg);
    return NextResponse.json({ error: { code: "internal_error", message: "Internal server error" } }, { status: 500 });
  }
}
