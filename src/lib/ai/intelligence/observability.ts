/**
 * AI OBSERVABILITY (11.20)
 * ========================
 *
 * Tracks every AI execution for debugging, learning, and improvement.
 * Logs execution metadata WITHOUT secrets, PII, or sensitive data.
 *
 * Storage: In-memory ring buffer + optional Supabase persistence.
 */

import type { ObservabilityRecord, UserIntent, ResultStatus, ContextSource, ActionType } from './types';

/* ------------------------------------------------------------------------ */
/* RING BUFFER                                                               */
/* ------------------------------------------------------------------------ */

const MAX_RECORDS = 200;
const records: ObservabilityRecord[] = [];

/* ------------------------------------------------------------------------ */
/* PUBLIC API                                                                */
/* ------------------------------------------------------------------------ */

/**
 * Start tracking a new AI execution.
 */
export function startObservabilityTrace(params: {
  requestType: string;
  intent: UserIntent;
  contextSources: ContextSource[];
  provider: string;
  model: string;
}): { executionId: string; startedAt: string; record: ObservabilityRecord } {
  const executionId = `exec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const startedAt = new Date().toISOString();

  const record: ObservabilityRecord = {
    executionId,
    requestType: params.requestType,
    intent: params.intent,
    contextSources: params.contextSources,
    provider: params.provider,
    model: params.model,
    toolCalls: [],
    resultStatus: 'success',
    approvalRequired: false,
    latencyMs: 0,
    startedAt,
    completedAt: startedAt,
  };

  return { executionId, startedAt, record };
}

/**
 * Record a tool call within an execution.
 */
export function recordToolCall(
  record: ObservabilityRecord,
  tool: string,
  status: 'success' | 'error' | 'skipped',
  durationMs: number,
): void {
  record.toolCalls.push({ tool, status, durationMs });
}

/**
 * Complete an observability trace and store it.
 */
export function completeObservabilityTrace(
  record: ObservabilityRecord,
  params: {
    resultStatus: ResultStatus;
    approvalRequired: boolean;
    actionType?: ActionType;
    latencyMs: number;
    tokenUsage?: { input: number; output: number; total: number };
    errorMessage?: string;
  },
): ObservabilityRecord {
  record.resultStatus = params.resultStatus;
  record.approvalRequired = params.approvalRequired;
  record.actionType = params.actionType;
  record.latencyMs = params.latencyMs;
  record.tokenUsage = params.tokenUsage;
  record.errorMessage = params.errorMessage;
  record.completedAt = new Date().toISOString();

  // Add to ring buffer
  records.push(record);
  if (records.length > MAX_RECORDS) {
    records.shift();
  }

  return record;
}

/**
 * Get recent observability records.
 */
export function getRecentRecords(limit = 20): ObservabilityRecord[] {
  return records.slice(-limit).reverse();
}

/**
 * Get records filtered by intent.
 */
export function getRecordsByIntent(intent: UserIntent, limit = 20): ObservabilityRecord[] {
  return records.filter((r) => r.intent === intent).slice(-limit).reverse();
}

/**
 * Get records filtered by status.
 */
export function getRecordsByStatus(status: ResultStatus, limit = 20): ObservabilityRecord[] {
  return records.filter((r) => r.resultStatus === status).slice(-limit).reverse();
}

/**
 * Get aggregate metrics from recent records.
 */
export function getObservabilityMetrics(): {
  totalExecutions: number;
  successRate: number;
  averageLatencyMs: number;
  approvalRate: number;
  intentDistribution: Record<string, number>;
  providerDistribution: Record<string, number>;
  errorRate: number;
} {
  if (records.length === 0) {
    return {
      totalExecutions: 0,
      successRate: 0,
      averageLatencyMs: 0,
      approvalRate: 0,
      intentDistribution: {},
      providerDistribution: {},
      errorRate: 0,
    };
  }

  const total = records.length;
  const successCount = records.filter((r) => r.resultStatus === 'success').length;
  const errorCount = records.filter((r) => r.resultStatus === 'error').length;
  const approvalCount = records.filter((r) => r.approvalRequired).length;
  const totalLatency = records.reduce((sum, r) => sum + r.latencyMs, 0);

  const intentDist: Record<string, number> = {};
  const providerDist: Record<string, number> = {};
  for (const r of records) {
    intentDist[r.intent] = (intentDist[r.intent] ?? 0) + 1;
    providerDist[r.provider] = (providerDist[r.provider] ?? 0) + 1;
  }

  return {
    totalExecutions: total,
    successRate: Math.round((successCount / total) * 100) / 100,
    averageLatencyMs: Math.round(totalLatency / total),
    approvalRate: Math.round((approvalCount / total) * 100) / 100,
    intentDistribution: intentDist,
    providerDistribution: providerDist,
    errorRate: Math.round((errorCount / total) * 100) / 100,
  };
}

/**
 * Clear all records (for testing).
 */
export function clearObservabilityRecords(): void {
  records.length = 0;
}
