import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/admin-auth";
import { can } from "@/src/admin/permissions";
import { getVisualMemory, addVisualMemoryEntry, getVisualTemplates, upsertVisualTemplate, deleteVisualTemplate, divisionKeyFor, hasRecentVisualFor } from "@/src/lib/visual-studio/store";
import { TEMPLATE_CATALOG, getTemplate, type VisualPlatform, type VisualSourceType } from "@/src/lib/visual-studio/templates";
import { loadSourceManifest } from "@/src/lib/visual-studio/source-loader";
import { generateCopy, recommendTemplates, FREEFORM_DEF } from "@/src/lib/visual-studio/copy-engine";
import { validateFreeformSpec, buildFreeformAuthoringPrompt, summarizeSpec, type FreeformSpec } from "@/src/lib/visual-studio/freeform-spec";
import { decideNextBrief } from "@/src/lib/visual-studio/daily-brief";
import { isAllowedResearchUrl, extractReadable, type ResearchEntry, type ResearchRejection } from "@/src/lib/visual-studio/research";
import { isAIConfigured } from "@/src/lib/ai/config";
import { checkBlockers, scanTextForForbiddenClaims } from "@/src/lib/visual-studio/claim-filter";
import { checkRepetition, hashCaption, type HistoryRecord } from "@/src/lib/visual-studio/anti-repeat";
import { getVisualHistory, saveVisualRecord, updateVisualRecord } from "@/src/lib/visual-studio/history";
import { generateItem, editItem } from "@/src/lib/content-ops/operations";
import { createActiveInsightAdapter, buildExternalContext, getProviderStatus } from "@/src/lib/ai/hybrid";
import { getContentStore } from "@/src/lib/content-ops/store";
import { createAdminClient } from "@/src/lib/supabase";
import { getCreativePlan, getTemplateForPillar } from "@/src/lib/visual-studio/creative-director";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Compose payload: everything VisualComposer needs (verified facts only). */
function buildComposePayload(manifest: {
  facts: unknown;
}) {
  const mf = manifest.facts as unknown as Record<string, unknown>;
  const prodList = (Array.isArray(mf.products) ? mf.products : [mf]) as Record<string, unknown>[];
  const first = prodList[0] ?? {};
  const galleryOf = (x: Record<string, unknown>): string[] => {
    const g = Array.isArray(x.gallery) ? x.gallery : Array.isArray(x.images) ? x.images : [];
    const list = [...(g as string[])];
    if (typeof x.heroImage === "string" && x.heroImage) list.unshift(x.heroImage);
    if (typeof x.image === "string" && x.image) list.unshift(x.image);
    return list;
  };
  const images = prodList.flatMap(galleryOf).filter((s) => typeof s === "string" && s.length > 4);
  const pricing = (first.pricing ?? {}) as Record<string, unknown>;
  const flatPrice = typeof first.price === "number" ? (first.price as number) : Number(pricing.price ?? 0) || null;
  const flatOriginal = typeof first.originalPrice === "number"
    ? (first.originalPrice as number)
    : Number(pricing.originalPrice ?? 0) || null;
  return {
    images: [...new Set(images)].slice(0, 8),
    productName: String(first.nameAr ?? mf.nameAr ?? mf.titleAr ?? ""),
    brandAr: String(first.brandAr ?? ""),
    price: flatPrice ?? (mf.bundlePrice as number) ?? null,
    originalPrice: flatOriginal ?? (mf.originalPrice as number) ?? null,
    currency: String(first.currency ?? "YER"),
    rating: (first.rating as number) ?? null,
    reviewCount: Number(first.reviewCount ?? 0),
    offerLabel: typeof mf.discount === "number" && (mf.discount as number) > 0
      ? `خصم ${mf.discount}%`
      : typeof mf.savingsPercent === "number" && (mf.savingsPercent as number) > 0
        ? `وفّري ${mf.savingsPercent}%` : null,
    deadlineLabel: typeof mf.endsAt === "string" && mf.endsAt ? `ينتهي في ${String(mf.endsAt).slice(0, 10)}` : null,
    ingredient: Array.isArray(first.ingredients) ? String((first.ingredients as string[])[0] ?? "") || null : null,
    concernLabel: null,
    steps: (Array.isArray(mf.steps) ? mf.steps : []).map((s) => ({ titleAr: String((s as Record<string, unknown>).titleAr ?? "") })),
    reviewSnippet: null,
    quote: null,
  };
}

function toHistoryRecords(history: Awaited<ReturnType<typeof getVisualHistory>>): HistoryRecord[] {
  return history.map((h) => ({
    id: h.id, templateId: h.templateId, productIds: h.sourceIds, platform: h.platform,
    campaignId: h.campaignId, headline: h.copy.headline, hook: h.copy.hook, cta: h.copy.cta,
    captionHash: h.captionHash, createdAt: h.createdAt,
  }));
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;
  if (!can((admin as any).role, "content", "view")) return NextResponse.json({ error: { message: "forbidden" } }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") ?? "list";
  if (action === "templates") return NextResponse.json({ templates: await getVisualTemplates() });
  if (action === "memory") return NextResponse.json({ memory: await getVisualMemory() });
  if (action === "products") {
    const supabase: any = createAdminClient();
    const { data } = await supabase.from("products").select("id, slug, name, pricing, gallery").limit(50);
    return NextResponse.json({ products: data ?? [] });
  }
  if (action === "templates catalog") {
    return NextResponse.json({ templates: TEMPLATE_CATALOG });
  }
  if (action === "creative-plan") {
    const pillarId = String(searchParams.get("pillarId") ?? "discovery");
    const recent = (await getVisualHistory(100)).map((h) => h.templateId);
    const plan = getCreativePlan(pillarId, recent);
    return NextResponse.json({ plan, recommendedTemplate: getTemplateForPillar(pillarId, recent) });
  }
  if (action === "history") {
    const limit = Math.min(Number(searchParams.get("limit") ?? 100) || 100, 500);
    return NextResponse.json({ history: await getVisualHistory(limit) });
  }
  return NextResponse.json({ templates: await getVisualTemplates(), memory: await getVisualMemory(), provider: getProviderStatus((await getContentStore()).settings) });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;
  if (!can((admin as any).role, "content", "edit")) return NextResponse.json({ error: { message: "forbidden" } }, { status: 403 });
  const body = await request.json().catch(() => ({})) as any;
  const action = body.action as string;

  if (action === "template-upsert") {
    const tpl = body.template;
    if (!tpl?.id || !tpl?.referenceImage) return NextResponse.json({ error: { message: "id and referenceImage required" } }, { status: 400 });
    const now = new Date().toISOString();
    const toSave = { ...tpl, updatedAt: now, createdAt: tpl.createdAt ?? now };
    await upsertVisualTemplate(toSave);
    return NextResponse.json({ template: toSave });
  }
  if (action === "template-delete") {
    await deleteVisualTemplate(body.id);
    return NextResponse.json({ ok: true });
  }
  if (action === "generate") {
    const productIds: string[] = body.productIds ?? [];
    const recentTemplates = (await getVisualHistory(100)).map((h) => h.templateId);
    const pillarId = typeof body.pillarId === "string" ? body.pillarId : null;
    const selectedTemplate = pillarId ? getTemplateForPillar(pillarId, recentTemplates) : null;
    const templateId: string = body.templateId ?? selectedTemplate?.id;
    const useExternal = body.useExternalResearch === true;
    const useChatGPT = body.useChatGPTDesign === true;
    if (!productIds.length || !templateId) return NextResponse.json({ error: { message: "productIds and templateId (or pillarId) required" } }, { status: 400 });

    // Memory: avoid recent repeat (30 days) — division on demand
    for (const pid of productIds) {
      if (await hasRecentVisualFor(pid, 30)) {
        return NextResponse.json({ error: { message: `المنتج ${pid} تم تصميمه مؤخراً — اختر منتجاً آخر أو غيّر القالب` } }, { status: 409 });
      }
    }

    // External browsing + ChatGPT design context
    let external: any = null;
    let provider: any = null;
    if (useExternal || useChatGPT) {
      const store = await getContentStore();
      provider = createActiveInsightAdapter(store.settings);
      if (useExternal) {
        external = buildExternalContext({ productIds, categoryId: null, categoryAr: null, contentType: "PRODUCT_SPOTLIGHT", objective: "DISCOVERY", now: new Date().toISOString() }, store.settings.externalResearchEnabled);
      }
    }

    // For now, visual generation is template-driven HTML snapshot + optional AI image
    // If ChatGPT design requested, try to generate via AI provider (text prompt for visual concept)
    let aiVisualConcept: string | null = null;
    if (useChatGPT && provider) {
      try {
        const res = await provider.generateInsight(
          "You are a visual post designer for Luminous Derma. Output JSON with keys: visualConceptAr, visualConceptEn, palette, layout.",
          `Design a visual post for products ${productIds.join(",")} with template ${templateId}. External: ${JSON.stringify(external?.context ?? {}).slice(0,1200)}`,
          { model: "gpt-4o-mini" } as any
        );
        aiVisualConcept = (res as any)?.rawContent?.slice(0, 2000) ?? null;
      } catch {}
    }

    const visualId = crypto.randomUUID();
    const now = new Date().toISOString();
    const divisionKey = divisionKeyFor(productIds, templateId);
    for (const pid of productIds) {
      await addVisualMemoryEntry({ productId: pid, templateId, visualId, createdAt: now, divisionKey });
    }

    return NextResponse.json({
      visual: { visualId, productIds, templateId, pillarId, creativePlan: pillarId ? getCreativePlan(pillarId, recentTemplates) : null, divisionKey, createdAt: now, external, aiVisualConcept },
      message: "تم توليد المنشور البصري — مع ذاكرة وتقسيم حسب الطلب",
    });
  }

  // ─── PART 2: recommend — top-3 templates with real-data reasons ───
  if (action === "recommend") {
    const sourceType = body.sourceType as VisualSourceType;
    const sourceId = String(body.sourceId ?? "");
    const platform = (body.platform ?? "instagram-post") as VisualPlatform;
    const objective = String(body.objective ?? "awareness");
    if (!sourceType || !sourceId) return NextResponse.json({ error: { message: "sourceType and sourceId required" } }, { status: 400 });
    const loaded = await loadSourceManifest(sourceType, sourceId);
    if ("error" in loaded) return NextResponse.json({ error: { message: loaded.error } }, { status: 404 });
    const history = await getVisualHistory(500);
    const penalties: Record<string, number> = {};
    for (const h of history) {
      if (h.sourceIds.includes(sourceId) || h.templateId) {
        const ageDays = (Date.now() - Date.parse(h.createdAt)) / 86400000;
        if (ageDays < 14) penalties[h.templateId] = Math.max(penalties[h.templateId] ?? 0, Math.round(20 * (1 - ageDays / 14)));
      }
    }
    const recs = recommendTemplates(loaded.manifest, TEMPLATE_CATALOG, {
      sourceType, objective, platform, productCount: Math.max(loaded.display.productCount, 1), penalties,
    });
    return NextResponse.json({
      recommendations: recs.map((r) => ({ ...r, template: getTemplate(r.templateId) })),
      source: loaded.display, missing: loaded.manifest.missing, intent: loaded.manifest.intent,
    });
  }

  // ─── PART 2: generate-content — facts → gates → anti-repeat → copy → history ───
  if (action === "generate-content") {
    const sourceType = body.sourceType as VisualSourceType;
    const sourceId = String(body.sourceId ?? "");
    const templateId = String(body.templateId ?? "");
    const platform = (body.platform ?? "instagram-post") as VisualPlatform;
    const campaignId = body.campaignId ? String(body.campaignId) : null;
    const template = getTemplate(templateId);
    if (!template) return NextResponse.json({ error: { message: "unknown templateId" } }, { status: 400 });
    if (!template.platforms.includes(platform)) {
      return NextResponse.json({ error: { message: `القالب ${templateId} لا يدعم المنصة ${platform}` } }, { status: 422 });
    }
    const loaded = await loadSourceManifest(sourceType, sourceId);
    if ("error" in loaded) return NextResponse.json({ error: { message: loaded.error } }, { status: 404 });

    const gate = checkBlockers(template.blockers, loaded.manifest);
    if (gate.blocked) return NextResponse.json({ error: { message: gate.reasonAr, code: "template_blocked" } }, { status: 422 });

    const history = await getVisualHistory(500);
    const historyRecords: HistoryRecord[] = history.map((h) => ({
      id: h.id, templateId: h.templateId, productIds: h.sourceIds, platform: h.platform,
      campaignId: h.campaignId, headline: h.copy.headline, hook: h.copy.hook, cta: h.copy.cta,
      captionHash: h.captionHash, createdAt: h.createdAt,
    }));
    const seed = history.filter((h) => h.sourceIds.includes(sourceId)).length;
    const copy = generateCopy(loaded.manifest, template, { seed, platform });
    const repeat = checkRepetition(historyRecords, {
      templateId, productIds: [sourceId], platform, campaignId,
      headline: copy.headline, hook: copy.hook, cta: copy.cta, caption: copy.caption,
    });

    const record = await saveVisualRecord({
      sourceType, sourceIds: [sourceId], templateId, platform, campaignId,
      copy, captionHash: hashCaption(copy.caption), status: "DRAFT",
      scheduledFor: null, publishedAt: null, externalPostId: null, publishedUrl: null,
      failure: null, contentItemId: null,
    });

    const compose = buildComposePayload(loaded.manifest);

    return NextResponse.json({
      record, copy, repeat, compose, source: loaded.display,
      missing: loaded.manifest.missing, intent: loaded.manifest.intent, template,
    });
  }

  // ─── PART 2 FINAL (revised): generate-freeform — Path B, AI authors idea + spec ───
  // Honest gate: originating a genuinely new idea requires a configured LLM.
  // The self engine cannot invent — simulating creativity would be fake AI,
  // so without OpenAI this returns 503, never a parametric imitation.
  if (action === "generate-freeform") {
    const sourceType = body.sourceType as VisualSourceType;
    const sourceId = String(body.sourceId ?? "");
    const platform = (body.platform ?? "instagram-post") as VisualPlatform;
    const objective = String(body.objective ?? "awareness");
    const campaignId = body.campaignId ? String(body.campaignId) : null;
    if (!isAIConfigured()) {
      return NextResponse.json({
        error: {
          code: "ai_not_configured",
          message: "المفهوم الحر الكامل يتطلب OpenAI مهيأ (AI_API_KEY) — المحرك الذاتي لا يؤلف أفكاراً جديدة. القوالب الـ35 تعمل دون مفتاح.",
        },
      }, { status: 503 });
    }
    const loaded = await loadSourceManifest(sourceType, sourceId);
    if ("error" in loaded) return NextResponse.json({ error: { message: loaded.error } }, { status: 404 });

    const history = await getVisualHistory(500);
    const historyRecords = toHistoryRecords(history);
    const compose0 = buildComposePayload(loaded.manifest);
    if (compose0.images.length === 0) {
      return NextResponse.json({ error: { message: "لا توجد صورة موثقة لهذا المصدر — المفهوم الحر يتطلب صورة حقيقية" } }, { status: 422 });
    }

    // Avoidance context: the 35 families + recent angles/hooks the AI must NOT repeat.
    const recent = history.slice(0, 12);
    const avoid = {
      familyNames: TEMPLATE_CATALOG.map((t) => `${t.id}: ${t.nameAr} (${t.whyDifferentAr})`),
      recentAngles: recent.map((h) => h.copy.angleAr ?? "").filter(Boolean),
      recentHooks: recent.map((h) => h.copy.hook).filter(Boolean),
      recentStructures: [] as string[],
    };
    const format = platform.endsWith("story") ? "9:16" : "4:5";
    const facts = loaded.manifest.facts as unknown as Record<string, unknown>;
    // Operator-attached web research (inspiration only — never facts).
    const researchIn = (Array.isArray(body.research) ? body.research : [])
      .filter((r: unknown): r is { source: string; statements: string[] } =>
        !!r && typeof (r as { source?: unknown }).source === "string" &&
        Array.isArray((r as { statements?: unknown }).statements))
      .slice(0, 3)
      .map((r: { source: string; statements: string[] }) => ({
        source: String(r.source).slice(0, 200),
        statements: r.statements.filter((s: unknown): s is string => typeof s === "string").slice(0, 4),
      }));
    const { systemPrompt, userMessage } = buildFreeformAuthoringPrompt(
      JSON.stringify(facts).slice(0, 1500),
      objective, platform, format, [...FREEFORM_DEF.ctaOptions], avoid, researchIn,
    );

    const store = await getContentStore();
    const adapter = createActiveInsightAdapter(store.settings);
    let authored: {
      angleAr: string; headline: string; subheadline: string; body: string | null;
      cta: string; caption: string; hashtags: string[]; spec: FreeformSpec;
    };
    try {
      const res = await adapter.generateInsight(systemPrompt, userMessage, { model: "gpt-4o-mini" } as never);
      const raw = (res as { rawContent?: string | null }).rawContent;
      if (!raw) throw new Error("empty AI response");
      authored = JSON.parse(raw);
    } catch {
      return NextResponse.json({
        error: { code: "ai_failed", message: "تعذر توليد المفهوم الحر من النموذج — أعد المحاولة دون حفظ أي شيء" },
      }, { status: 502 });
    }

    // Server-side enforcement on AI output (never trust it blindly).
    const specCheck = validateFreeformSpec(authored.spec, { imageCount: compose0.images.length, allowTrust: true });
    if (!specCheck.ok) {
      return NextResponse.json({
        error: { code: "spec_rejected", message: `رفض تكوين النموذج: ${specCheck.reasonAr} — أعد التوليد` },
      }, { status: 422 });
    }
    if (authored.spec.format !== format) {
      return NextResponse.json({ error: { code: "spec_rejected", message: "صيغة التكوين لا تطابق المنصة — أعد التوليد" } }, { status: 422 });
    }
    const words = (s: unknown) => String(s ?? "").split(/\s+/).filter(Boolean);
    const trunc = (s: unknown, max: number) => words(s).slice(0, max).join(" ");
    const headline = trunc(authored.headline, 8);
    const subheadline = trunc(authored.subheadline, 14);
    const bodyText = authored.body ? trunc(authored.body, 30) : null;
    const ctaList = [...FREEFORM_DEF.ctaOptions] as string[];
    const cta = ctaList.includes(String(authored.cta)) ? String(authored.cta) : ctaList[0];
    const caption = [headline, compose0.productName, subheadline, bodyText, `${cta} عبر لومينوس ديرما`].filter(Boolean).join("\n");
    const hashtags = Array.isArray(authored.hashtags) ? authored.hashtags.filter((h) => typeof h === "string").slice(0, 5) : [];
    const scan = scanTextForForbiddenClaims([authored.angleAr, headline, subheadline, bodyText ?? "", caption, hashtags.join(" ")].join(" "));
    if (scan.blocked) {
      return NextResponse.json({ error: { code: "claim_blocked", message: `رُصدت صياغة محظورة في إخراج النموذج (${scan.reasonAr}) — أعد التوليد` } }, { status: 422 });
    }

    const copy = {
      hook: trunc(authored.angleAr, 10),
      headline, subheadline, body: bodyText,
      benefits: [] as string[],
      cta, caption, hashtags,
      engine: "openai" as const,
      warningsAr: [] as string[],
      checks: [] as string[], faqs: [] as { q: string; a: string }[], branches: [] as { label: string; target: string }[],
      degradedMode: false,
      angleAr: trunc(authored.angleAr, 12),
      freeformStructure: summarizeSpec(authored.spec),
      freeformSpec: authored.spec,
    };
    const repeat = checkRepetition(historyRecords, {
      templateId: "FREEFORM", productIds: [sourceId], platform, campaignId,
      headline: copy.headline, hook: copy.hook, cta: copy.cta, caption: copy.caption,
    });
    const record = await saveVisualRecord({
      sourceType, sourceIds: [sourceId], templateId: "FREEFORM", platform, campaignId,
      copy,
      captionHash: hashCaption(copy.caption), status: "DRAFT",
      scheduledFor: null, publishedAt: null, externalPostId: null, publishedUrl: null,
      failure: null, contentItemId: null,
      research: researchIn.map((r: { source: string; statements: string[] }) => ({
        url: r.source, title: r.statements[0]?.slice(0, 120) ?? r.source,
      })),
    });
    const concept = {
      angleAr: copy.angleAr, format, structure: "spec-authored",
      bgTint: authored.spec.bgTint,
      emphasisAr: `تكوين حر من تأليف النموذج (${summarizeSpec(authored.spec)})`,
      reasonAr: "فكرة وتكوين جديدان من الذكاء مع تجنب القوالب الـ35 والزوايا الأخيرة",
      engine: "openai" as const,
    };
    const compose = { ...compose0, freeform: { spec: authored.spec } };
    const researchUsed = researchIn.map((r: { source: string; statements: string[] }) => ({
      url: r.source, title: r.statements[0]?.slice(0, 120) ?? r.source,
    }));
    return NextResponse.json({
      record, copy, repeat, compose, concept, source: loaded.display,
      missing: loaded.manifest.missing, intent: loaded.manifest.intent, provider: "openai",
      researchUsed,
    });
  }

  // ─── PART 2 FINAL: suggest-next — deterministic daily brief from history + catalog ───
  // Decision logic lives in the pure daily-brief module (unit-tested Day1-4);
  // here we only supply REAL history + REAL catalog signals.
  if (action === "suggest-next") {
    const history = await getVisualHistory(500);
    const DAY = 86400000;
    const now = Date.now();
    const recent = history.filter((h) => now - Date.parse(h.createdAt) < 14 * DAY);
    const usedTemplates = [...new Set(recent.map((h) => h.templateId))];
    const usedProducts = [...new Set(
      history.filter((h) => now - Date.parse(h.createdAt) < 7 * DAY).flatMap((h) => h.sourceIds),
    )];
    const usedHooks = recent.map((h) => h.copy.hook);
    const usedCtas = recent.map((h) => h.copy.cta);

    const { getAllProducts } = await import("@/src/lib/product-dal");
    const all = (await getAllProducts().catch(() => [])) as unknown as Record<string, unknown>[];
    const keyOf = (p: Record<string, unknown>) => String(p.legacy_id ?? p.slug ?? p.id ?? "");
    const pricingOf = (p: Record<string, unknown>) => (p.pricing ?? {}) as Record<string, unknown>;
    const candidates = all
      .filter((p) => keyOf(p))
      .map((p) => ({
        id: keyOf(p),
        hasOffer: Number(p.discount ?? 0) > 0 ||
          (Number(pricingOf(p).originalPrice ?? 0) > Number(pricingOf(p).price ?? 0)),
        isNew: Boolean(p.is_new ?? p.isNew ?? p.new),
      }));
    const brief = decideNextBrief(
      candidates,
      { templateIds14d: usedTemplates, productIds7d: usedProducts, hooks: usedHooks, ctas: usedCtas },
      TEMPLATE_CATALOG.map((t) => ({ id: t.id, objective: t.objective, sourceTypes: [...t.sourceTypes] })),
    );
    return NextResponse.json({
      ...brief,
      context: {
        templatesUsed14d: usedTemplates,
        productsUsed7d: usedProducts.slice(0, 20),
        recentHooks: usedHooks.slice(0, 5),
        recentCtas: [...new Set(usedCtas)].slice(0, 5),
      },
      noteAr: "موجز حتمي من السجل والكتالوج (ليس ذكاءً توليدياً) — القرار النهائي للمشغّل",
    });
  }

  // ─── PART 2 COMPLETION: research-fetch — REAL fetch of operator-supplied URLs ───
  // Only explicitly provided URLs are fetched (no random scraping). SSRF-guarded.
  // Results are inspiration/context with source+date — never product facts.
  if (action === "research-fetch") {
    const urls = (Array.isArray(body.urls) ? body.urls : []).map(String).slice(0, 3);
    if (urls.length === 0) {
      return NextResponse.json({ error: { message: "قدّم رابطاً واحداً على الأقل (حتى 3)" } }, { status: 400 });
    }
    const entries: ResearchEntry[] = [];
    const rejected: ResearchRejection[] = [];
    for (const url of urls) {
      const gate = isAllowedResearchUrl(url);
      if (!gate.ok) {
        rejected.push({ url, reasonAr: gate.reasonAr ?? "مرفوض" });
        continue;
      }
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "LuminousDerma-ResearchBot/1.0 (+https://luminousderma.com)" },
          signal: AbortSignal.timeout(12000),
        });
        const ctype = res.headers.get("content-type") ?? "";
        if (!res.ok || !ctype.includes("text/html")) {
          rejected.push({ url, reasonAr: !res.ok ? `HTTP ${res.status}` : "ليس صفحة HTML" });
          continue;
        }
        const buf = await res.arrayBuffer();
        if (buf.byteLength > 500 * 1024) {
          rejected.push({ url, reasonAr: "الصفحة أكبر من 500KB" });
          continue;
        }
        const html = new TextDecoder().decode(buf).slice(0, 200000);
        const entry = extractReadable(html, url);
        if (entry.statements.length === 0) {
          rejected.push({ url, reasonAr: "لا محتوى مقروء مستخرج" });
          continue;
        }
        entries.push(entry);
      } catch {
        rejected.push({ url, reasonAr: "تعذر الجلب (شبكة/مهلة)" });
      }
    }
    return NextResponse.json({ entries, rejected });
  }

  // ─── PART 2: content-item — promote a visual record into the Content-Ops review flow ───
  if (action === "content-item") {
    const visualId = String(body.visualId ?? "");
    const history = await getVisualHistory(500);
    const record = history.find((h) => h.id === visualId);
    if (!record) return NextResponse.json({ error: { message: "visual record not found" } }, { status: 404 });
    const store = await getContentStore();
    if (record.contentItemId) {
      const existing = store.items.get(record.contentItemId);
      if (existing) {
        return NextResponse.json({ contentItemId: existing.id, status: existing.status, reused: true });
      }
    }
    const adapter = createActiveInsightAdapter(store.settings);
    const productIds = record.sourceType === "product" || record.sourceType === "education"
      ? record.sourceIds : [];
    const res = await generateItem(
      store,
      {
        productIds,
        contentType: "PRODUCT_SPOTLIGHT",
        objective: "DISCOVERY",
        language: "ar",
        campaignId: record.campaignId,
        sourceEditorialAr: [record.copy.hook, record.copy.headline, record.copy.subheadline, record.copy.body ?? "", record.copy.caption, record.copy.hashtags.join(" ")]
          .filter(Boolean)
          .join("\n"),
      },
      `visual:${(admin as { id?: string }).id ?? "admin"}`,
      { provider: adapter as never, autoSchedule: false },
    );
    if (!res.ok || !res.data) {
      const code = res.error?.code ?? "generation_failed";
      const status = code === "ai_not_configured" ? 503 : 500;
      return NextResponse.json({
        error: {
          message: code === "ai_not_configured"
            ? "خدمة الذكاء غير مهيأة — فعّل المزود أو التوليد الذاتي من الإعدادات"
            : res.error?.message ?? "generation failed",
          code,
        },
      }, { status });
    }
    const edited = await editItem(store, res.data.id, {
      title: record.copy.headline,
      body: [record.copy.hook, record.copy.subheadline, record.copy.body ?? "", record.copy.caption, record.copy.hashtags.join(" ")]
        .filter(Boolean)
        .join("\n"),
      callToAction: record.copy.cta,
    }, `visual:${(admin as { id?: string }).id ?? "admin"}`);
    if (!edited.ok || !edited.data) {
      return NextResponse.json({ error: { message: edited.error?.message ?? "تعذر حفظ النسخة المعدلة في Content-Ops", code: edited.error?.code ?? "edit_failed" } }, { status: 500 });
    }
    const { persistContentStore } = await import("@/src/lib/content-ops/store");
    await persistContentStore(store);
    await updateVisualRecord(record.id, { status: "REVIEW", contentItemId: edited.data.id });
    return NextResponse.json({ contentItemId: edited.data.id, status: edited.data.status ?? "REVIEW_REQUIRED" });
  }

  // Persist the latest operator-edited copy before promoting it to Content-Ops.
  // This is intentionally separate from generation: saving must never restore AI output.
  if (action === "update-copy") {
    const visualId = String(body.visualId ?? "");
    const history = await getVisualHistory(500);
    const record = history.find((h) => h.id === visualId);
    if (!record) return NextResponse.json({ error: { message: "visual record not found" } }, { status: 404 });
    if (["PUBLISHED", "PUBLISHING"].includes(record.status)) {
      return NextResponse.json({ error: { message: "لا يمكن تعديل محتوى تم نشره أو بدأ نشره" } }, { status: 409 });
    }
    const current = record.copy;
    const next = {
      ...current,
      hook: typeof body.hook === "string" ? body.hook.trim() : current.hook,
      headline: typeof body.headline === "string" ? body.headline.trim() : current.headline,
      subheadline: typeof body.subheadline === "string" ? body.subheadline.trim() : current.subheadline,
      body: typeof body.body === "string" ? body.body.trim() : current.body,
      cta: typeof body.cta === "string" ? body.cta.trim() : current.cta,
      caption: typeof body.caption === "string" ? body.caption.trim() : current.caption,
      hashtags: Array.isArray(body.hashtags)
        ? body.hashtags.filter((tag: unknown): tag is string => typeof tag === "string").map((tag: string) => tag.trim()).filter(Boolean).slice(0, 20)
        : current.hashtags,
    };
    const combined = [next.hook, next.headline, next.subheadline, next.body ?? "", next.caption, next.hashtags.join(" ")].join("\n");
    const claimScan = scanTextForForbiddenClaims(combined);
    if (claimScan.blocked) {
      return NextResponse.json({ error: { message: `التعديل يتضمن ادعاءً غير مسموح: ${claimScan.reasonAr}` } }, { status: 422 });
    }
    const updated = await updateVisualRecord(record.id, {
      copy: next,
      status: record.status === "DRAFT" ? "DRAFT" : "REVIEW",
    });
    if (!updated) return NextResponse.json({ error: { message: "تعذر حفظ التعديل" } }, { status: 500 });
    return NextResponse.json({ record: updated, saved: true });
  }

  // ─── PART 2: visual-status — mirror lifecycle transitions onto the history record ───
  if (action === "visual-status") {
    const visualId = String(body.visualId ?? "");
    const status = body.status as "APPROVED" | "SCHEDULED" | "PUBLISHING" | "PUBLISHED" | "FAILED";
    if (!["APPROVED", "SCHEDULED", "PUBLISHING", "PUBLISHED", "FAILED"].includes(status)) {
      return NextResponse.json({ error: { message: "invalid status" } }, { status: 400 });
    }
    const patch: Record<string, string | null> = {};
    if (body.scheduledFor) patch.scheduledFor = String(body.scheduledFor);
    if (body.externalPostId) patch.externalPostId = String(body.externalPostId);
    if (body.publishedUrl) patch.publishedUrl = String(body.publishedUrl);
    if (body.failure) patch.failure = String(body.failure);
    if (status === "PUBLISHED") patch.publishedAt = new Date().toISOString();
    const updated = await updateVisualRecord(visualId, { status, ...patch });
    if (!updated) return NextResponse.json({ error: { message: "visual record not found" } }, { status: 404 });
    return NextResponse.json({ record: updated });
  }

  return NextResponse.json({ error: { message: "unknown action" } }, { status: 400 });
}
