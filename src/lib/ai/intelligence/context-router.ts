/**
 * CONTEXT ROUTER (11.3)
 * =====================
 *
 * Maps each UserIntent to the required and optional context sources.
 * Only gathers data that is actually needed — preserving performance,
 * token efficiency, relevance, and privacy.
 */

import type { UserIntent, ContextRoute, ContextSource, AssembledContext } from './types';

/* ------------------------------------------------------------------------ */
/* ROUTE DEFINITIONS                                                         */
/* ------------------------------------------------------------------------ */

const CONTEXT_ROUTES: ContextRoute[] = [
  {
    intent: 'executive_prioritization',
    requiredSources: ['orders', 'inventory', 'analytics', 'customers'],
    optionalSources: ['content', 'campaigns', 'offers'],
    description: 'Full executive view — operations + commercial + customer signals.',
  },
  {
    intent: 'opportunity_discovery',
    requiredSources: ['products', 'orders', 'analytics', 'customers'],
    optionalSources: ['inventory', 'content', 'campaigns', 'offers', 'segments'],
    description: 'Needs product performance, customer behavior, and current opportunities.',
  },
  {
    intent: 'campaign_planning',
    requiredSources: ['products', 'customers', 'offers'],
    optionalSources: ['inventory', 'content', 'campaigns', 'segments', 'intent_signals', 'brand_voice'],
    description: 'Campaign requires product candidates, audience, and existing offers.',
  },
  {
    intent: 'content_generation',
    requiredSources: ['products', 'brand_voice'],
    optionalSources: ['customers', 'content', 'segments', 'intent_signals', 'offers'],
    description: 'Content needs product facts and brand voice. Audience is optional for personalization.',
  },
  {
    intent: 'diagnostic_analysis',
    requiredSources: ['orders', 'analytics'],
    optionalSources: ['products', 'customers', 'inventory', 'campaigns'],
    description: 'Diagnosis starts with sales data and analytics, adds context as available.',
  },
  {
    intent: 'commercial_decision',
    requiredSources: ['products', 'orders', 'analytics'],
    optionalSources: ['inventory', 'customers', 'segments', 'intent_signals', 'offers'],
    description: 'Commercial decision needs product performance and sales data.',
  },
  {
    intent: 'sales_query',
    requiredSources: ['orders', 'analytics'],
    optionalSources: ['products', 'customers'],
    description: 'Sales analysis from order and analytics data.',
  },
  {
    intent: 'customer_query',
    requiredSources: ['customers', 'analytics'],
    optionalSources: ['segments', 'intent_signals', 'orders'],
    description: 'Customer intelligence from profiles and behavioral data.',
  },
  {
    intent: 'inventory_query',
    requiredSources: ['inventory', 'products'],
    optionalSources: ['orders', 'analytics'],
    description: 'Inventory status from stock data and product catalog.',
  },
  {
    intent: 'product_query',
    requiredSources: ['products'],
    optionalSources: ['orders', 'analytics', 'content'],
    description: 'Product information from catalog.',
  },
  {
    intent: 'unknown',
    requiredSources: ['analytics'],
    optionalSources: ['products', 'orders', 'customers', 'inventory'],
    description: 'Unknown intent — gather minimal baseline context.',
  },
];

/* ------------------------------------------------------------------------ */
/* ROUTE RESOLVER                                                            */
/* ------------------------------------------------------------------------ */

/**
 * Get the context route for a given intent.
 */
export function resolveContextRoute(intent: UserIntent): ContextRoute {
  return CONTEXT_ROUTES.find((r) => r.intent === intent) ?? CONTEXT_ROUTES[CONTEXT_ROUTES.length - 1];
}

/**
 * Get all required sources for an intent.
 */
export function getRequiredSources(intent: UserIntent): ContextSource[] {
  return resolveContextRoute(intent).requiredSources;
}

/**
 * Get all sources (required + optional) for an intent.
 */
export function getAllSources(intent: UserIntent): ContextSource[] {
  const route = resolveContextRoute(intent);
  return [...route.requiredSources, ...route.optionalSources];
}

/* ------------------------------------------------------------------------ */
/* CONTEXT ASSEMBLER                                                         */
/* ------------------------------------------------------------------------ */

/**
 * Build an AssembledContext stub from available data.
 * The actual data loading happens in the orchestrator — this just tracks
 * which sources were included.
 */
export function assembleContext(
  intent: UserIntent,
  loadedData: Partial<Record<ContextSource, unknown>>,
): AssembledContext {
  const route = resolveContextRoute(intent);
  const sources: ContextSource[] = [];
  const data: Record<string, unknown> = {};

  // Always include required sources (even if empty)
  for (const src of route.requiredSources) {
    sources.push(src);
    if (loadedData[src] !== undefined) {
      data[src] = loadedData[src];
    }
  }

  // Include optional sources that were loaded
  for (const src of route.optionalSources) {
    if (loadedData[src] !== undefined) {
      sources.push(src);
      data[src] = loadedData[src];
    }
  }

  const assembledAt = new Date().toISOString();
  const hash = simpleHash(JSON.stringify({ intent, sources, assembledAt }));

  return { sources, data, assembledAt, hash };
}

/**
 * Simple deterministic hash for context fingerprinting.
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Check if a context assembly has all required sources with data.
 */
export function isContextComplete(context: AssembledContext, intent: UserIntent): boolean {
  const route = resolveContextRoute(intent);
  return route.requiredSources.every((src) => context.data[src] !== undefined);
}

/**
 * Get a human-readable summary of context completeness.
 */
export function contextCompletenessReport(context: AssembledContext, intent: UserIntent): {
  complete: boolean;
  loaded: ContextSource[];
  missing: ContextSource[];
  total: number;
  completenessRatio: number;
} {
  const route = resolveContextRoute(intent);
  const loaded = route.requiredSources.filter((src) => context.data[src] !== undefined);
  const missing = route.requiredSources.filter((src) => context.data[src] === undefined);
  const total = route.requiredSources.length;

  return {
    complete: missing.length === 0,
    loaded,
    missing,
    total,
    completenessRatio: total > 0 ? loaded.length / total : 0,
  };
}
