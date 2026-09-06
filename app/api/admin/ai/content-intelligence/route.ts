import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/admin-auth";
import { isAIConfigured } from "@/src/lib/ai/config";
import { createAIProvider } from "@/src/lib/ai/provider";
import {
  buildContentContext,
  buildContentBrief,
  generateContent,
  generateContentIdeas,
  selectNextBestContent,
  selectContentCandidates,
  saveContentItem,
  listContentItems,
  getContentItem,
  validateGeneratedContent,
  type ContentType,
  type ContentObjective,
  type ContentLanguage,
} from "@/src/lib/ai/content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") ?? "list";
  const id = searchParams.get("id");

  if (action === "retrieve" && id) {
    const item = getContentItem(id);
    if (!item) {
      return NextResponse.json({ error: { code: "not_found", message: "Content item not found" } }, { status: 404 });
    }
    return NextResponse.json({ item });
  }

  return NextResponse.json({
    configured: isAIConfigured(),
    engine: "content_intelligence_part1",
    count: listContentItems().length,
    items: listContentItems().slice(0, 50),
  });
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

  try {
    switch (action) {
      case "generate": {
        if (!isAIConfigured()) {
          return NextResponse.json(
            { error: { code: "ai_not_configured", message: "AI service is not configured" } },
            { status: 503 },
          );
        }
        const contentType = body.contentType as ContentType;
        const objective = body.objective as ContentObjective;
        const productIds = (body.productIds as string[]) ?? [];
        const categoryId = (body.categoryId as string | null) ?? null;
        const language = (body.language as ContentLanguage | undefined) ?? "ar";

        if (!contentType || !objective || productIds.length === 0) {
          return NextResponse.json(
            { error: { code: "invalid_request", message: "contentType, objective and productIds are required" } },
            { status: 400 },
          );
        }

        const context = buildContentContext({ productIds, strict: true });
        if (!context.allProductsResolved || context.products.length === 0) {
          return NextResponse.json(
            {
              error: { code: "invalid_request", message: "No published products resolved", details: context.warnings },
            },
            { status: 400 },
          );
        }

        const brief = buildContentBrief({
          categoryId,
          contentType,
          objective,
          productIds,
          language,
          verifiedFacts: context.products.flatMap((p) => p.facts),
        });

        const result = await generateContent(brief, context, {
          provider: createAIProvider(),
          sourceEditorialAr: (body.sourceEditorialAr as string | undefined) ?? "",
          sourceEditorialEn: (body.sourceEditorialEn as string | undefined) ?? "",
        });

        if (!result.item) {
          return NextResponse.json(
            { error: { code: result.error?.code ?? "internal_error", message: result.error?.message ?? "Generation failed" } },
            { status: 500 },
          );
        }

        saveContentItem(result.item);
        return NextResponse.json({ item: result.item, retriesUsed: result.retriesUsed });
      }

      case "ideas": {
        const ideas = generateContentIdeas({
          categoryId: (body.categoryId as string | null) ?? null,
          contentType: body.contentType as ContentType | undefined,
          objective: body.objective as ContentObjective | undefined,
          counts: body.counts as Partial<Record<ContentType, number>> | undefined,
          limit: (body.limit as number | undefined) ?? 20,
        });
        return NextResponse.json({ ideas });
      }

      case "next-best": {
        const contentType = body.contentType as ContentType | undefined;
        const objective = body.objective as ContentObjective | undefined;
        const categoryId = (body.categoryId as string | null) ?? null;
        const limit = (body.limit as number | undefined) ?? 10;
        const candidates = selectContentCandidates({ contentType, objective, categoryId, limit });
        const next = selectNextBestContent({ contentType, objective, categoryId });
        return NextResponse.json({ candidates, next });
      }

      case "validate": {
        const text = (body.text as string | undefined) ?? "";
        const productIds = (body.productIds as string[]) ?? [];
        if (!text || productIds.length === 0) {
          return NextResponse.json({ error: { code: "invalid_request", message: "text and productIds are required" } }, { status: 400 });
        }
        const context = buildContentContext({ productIds, strict: true });
        const result = validateGeneratedContent(text, context.products.flatMap((p) => p.facts));
        return NextResponse.json({ validation: result });
      }

      default:
        return NextResponse.json({ error: { code: "invalid_request", message: "Unknown action" } }, { status: 400 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[Content Intelligence API]", msg);
    return NextResponse.json({ error: { code: "internal_error", message: "Internal server error" } }, { status: 500 });
  }
}