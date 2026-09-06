/**
 * INTELLIGENCE API v2
 * ==================
 *
 * Unified endpoint for the Contextual Commerce Agent.
 * Accepts natural language questions, routes through the intelligence pipeline,
 * and returns structured, ranked, explainable results.
 *
 * POST /api/admin/intelligence/chat
 *
 * Flow:
 *   1. Classify intent
 *   2. Route context
 *   3. Think-before-generate pipeline
 *   4. Ranked recommendations
 *   5. Explainability
 *   6. Guardrails check
 *   7. Return result
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';
import type { AdminUser } from '@/src/lib/admin-auth';
import { can } from '@/src/admin/permissions';

import { orchestrate } from '@/src/lib/ai/intelligence/orchestrator';
import type { OrchestratorInput } from '@/src/lib/ai/intelligence/orchestrator';
import { getSession, addUserTurn, addAssistantTurn } from '@/src/lib/ai/intelligence/conversation';
import { getObservabilityMetrics, getRecentRecords } from '@/src/lib/ai/intelligence/observability';
import { getActiveRules } from '@/src/lib/ai/intelligence/guardrails';
import { classifyIntent } from '@/src/lib/ai/intelligence/intent-classifier';

import { getStoreOps } from '@/src/lib/store-ops';
import { supabaseGetOrders, supabaseGetProducts } from '@/src/lib/admin-supabase';
import type { Product } from '@/src/types/product';
import type { Order } from '@/types/cart';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* ------------------------------------------------------------------------ */
/* DATA LOADING                                                               */
/* ------------------------------------------------------------------------ */

async function loadProducts(): Promise<Product[]> {
  try {
    const rows = await supabaseGetProducts();
    if (rows && rows.length > 0) return rows as Product[];
  } catch { /* fall back */ }
  return (await import('@/src/data/products')).products as Product[];
}

async function loadOrders(): Promise<Order[]> {
  return await supabaseGetOrders();
}

/* ------------------------------------------------------------------------ */
/* POST HANDLER                                                               */
/* ------------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;

  if (!can(admin.role, 'ai', 'edit')) {
    return NextResponse.json(
      { error: { code: 'forbidden', message: 'Permission denied' } },
      { status: 403 },
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: { code: 'invalid_request', message: 'Invalid JSON body' } },
      { status: 400 },
    );
  }

  const question = (body.question as string)?.trim();
  if (!question) {
    return NextResponse.json(
      { error: { code: 'invalid_request', message: 'السؤال مطلوب' } },
      { status: 400 },
    );
  }

  const sessionId = (body.sessionId as string) || `session_${admin.id}_${Date.now().toString(36)}`;
  const regenerationReason = body.regenerationReason as string | undefined;
  const previousOutput = body.previousOutput as Record<string, unknown> | undefined;

  try {
    // Load canonical data
    const [products, orders, state] = await Promise.all([
      loadProducts(),
      loadOrders(),
      getStoreOps(),
    ]);

    // Quick intent preview for context routing
    const intentPreview = classifyIntent(question);

    // Build context data based on intent
    const contextData: Record<string, unknown> = {};

    // Always include what we have
    if (products.length > 0) contextData.products = products;
    if (orders.length > 0) {
      contextData.orders = orders;

      // Derive analytics from orders if available
      const { computeSalesSummary, salesByProduct, salesByCategory, salesByBrand } = await import('@/src/lib/store-ops');
      const summary = computeSalesSummary(orders);
      if (summary.hasOrders) {
        contextData.analytics = {
          summary,
          byProduct: salesByProduct(orders),
          byCategory: salesByCategory(orders, products),
          byBrand: salesByBrand(orders, products),
        };
      }
    }

    // Store operations data
    if (state) {
      const { buildInventoryOverview, buildPriceIntelligence, computeOrderIntelligence, computeCustomerStats, detectAnomalies } = await import('@/src/lib/store-ops');
      const now = new Date().toISOString();
      const inventory = buildInventoryOverview(state, { products, orders, now });
      contextData.inventory = inventory;
      contextData.storeOps = {
        alerts: state.alerts,
        reorder: state.reorder,
        settings: state.settings,
      };
    }

    // Run the intelligence pipeline
    const input: OrchestratorInput = {
      question,
      sessionId,
      contextData,
      provider: 'self', // Use deterministic provider; upgrade to openai when configured
    };

    if (previousOutput) {
      input.previousOutput = previousOutput as any;
      input.regenerationReason = regenerationReason;
    }

    const result = await orchestrate(input);

    // Record conversation turns
    addUserTurn(sessionId, question, result.intent);
    addAssistantTurn(sessionId, result.answer, result);

    return NextResponse.json({
      success: true,
      sessionId,
      result: {
        status: result.status,
        intent: result.intent,
        answer: result.answer,
        summary: result.summary,
        rankedRecommendations: result.rankedRecommendations,
        facts: result.facts,
        insights: result.insights,
        confidence: result.confidence,
        dataSources: result.dataSources,
        contextRange: result.contextRange,
        actions: result.actions,
        requiresApproval: result.requiresApproval,
        executionId: result.executionId,
      },
      pipeline: result.pipeline ? {
        id: result.pipeline.id,
        steps: result.pipeline.steps.map((s) => ({
          phase: s.phase,
          status: s.status,
        })),
        totalDurationMs: result.pipeline.totalDurationMs,
      } : undefined,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Intelligence Chat API]', msg);
    return NextResponse.json(
      { error: { code: 'internal_error', message: 'خطأ داخلي في المعالجة' } },
      { status: 500 },
    );
  }
}

/* ------------------------------------------------------------------------ */
/* GET HANDLER — Status & Observability                                      */
/* ------------------------------------------------------------------------ */

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;

  const url = new URL(request.url);
  const section = url.searchParams.get('section') ?? 'status';

  if (section === 'observability') {
    const metrics = getObservabilityMetrics();
    const recentRecords = getRecentRecords(10);
    return NextResponse.json({
      success: true,
      metrics,
      recentRecords: recentRecords.map((r) => ({
        executionId: r.executionId,
        requestType: r.requestType,
        intent: r.intent,
        resultStatus: r.resultStatus,
        latencyMs: r.latencyMs,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        approvalRequired: r.approvalRequired,
        errorMessage: r.errorMessage,
      })),
    });
  }

  if (section === 'guardrails') {
    const rules = getActiveRules();
    return NextResponse.json({
      success: true,
      rules: rules.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        level: r.level,
      })),
    });
  }

  // Default: status
  return NextResponse.json({
    success: true,
    agent: 'Luminous Intelligence Agent',
    version: '2.0.0',
    sections: {
      intent_classifier: 'active',
      context_router: 'active',
      orchestrator: 'active',
      guardrails: 'active',
      observability: 'active',
      conversational_continuity: 'active',
    },
  });
}
