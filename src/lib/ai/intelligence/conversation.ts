/**
 * CONVERSATIONAL CONTINUITY (11.23)
 * ==================================
 *
 * Maintains session context across multiple interactions.
 * Enables the AI to understand follow-up requests like:
 *   "اعمل لها حملة" → "لها" = the previous opportunity
 *   "اعملها على Instagram" → change channel, don't restart
 *
 * Storage: In-memory per session (server-side).
 */

import type {
  ConversationSession,
  ConversationTurn,
  UserIntent,
  AssembledContext,
  IntelligenceResult,
} from './types';

/* ------------------------------------------------------------------------ */
/* SESSION STORE                                                              */
/* ------------------------------------------------------------------------ */

const MAX_SESSIONS = 50;
const MAX_TURNS_PER_SESSION = 20;
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

const sessions = new Map<string, ConversationSession>();

/* ------------------------------------------------------------------------ */
/* PUBLIC API                                                                */
/* ------------------------------------------------------------------------ */

/**
 * Get or create a conversation session.
 */
export function getSession(sessionId: string): ConversationSession {
  let session = sessions.get(sessionId);

  if (!session) {
    session = {
      id: sessionId,
      turns: [],
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };
    sessions.set(sessionId, session);
    pruneSessions();
  }

  // Check TTL
  const age = Date.now() - new Date(session.lastActiveAt).getTime();
  if (age > SESSION_TTL_MS) {
    // Reset session but keep ID
    session = {
      id: sessionId,
      turns: [],
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };
    sessions.set(sessionId, session);
  }

  return session;
}

/**
 * Add a user turn to the session.
 */
export function addUserTurn(
  sessionId: string,
  content: string,
  intent?: UserIntent,
  context?: AssembledContext,
): ConversationTurn {
  const session = getSession(sessionId);
  const turn: ConversationTurn = {
    id: `turn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    role: 'user',
    content,
    intent,
    context,
    timestamp: new Date().toISOString(),
  };

  session.turns.push(turn);
  session.lastActiveAt = turn.timestamp;

  // Update topic context
  if (intent) {
    session.topicContext = {
      ...session.topicContext,
      lastIntent: intent,
    };
  }

  pruneTurns(session);
  return turn;
}

/**
 * Add an assistant turn to the session.
 */
export function addAssistantTurn(
  sessionId: string,
  content: string,
  result?: IntelligenceResult,
): ConversationTurn {
  const session = getSession(sessionId);
  const turn: ConversationTurn = {
    id: `turn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    role: 'assistant',
    content,
    result,
    timestamp: new Date().toISOString(),
  };

  session.turns.push(turn);
  session.lastActiveAt = turn.timestamp;

  // Update topic context from result
  if (result) {
    const tc = session.topicContext ?? {};
    tc.lastIntent = result.intent;

    // Track products mentioned in recommendations
    const productIds = result.rankedRecommendations
      .flatMap((r) => r.relatedEntities ?? [])
      .filter((e) => e.type === 'product')
      .map((e) => e.id);
    if (productIds.length > 0) tc.lastProducts = productIds;

    // Track pending action
    if (result.actions.length > 0) {
      tc.pendingAction = result.actions[0];
    }

    session.topicContext = tc;
  }

  pruneTurns(session);
  return turn;
}

/**
 * Get the topic context for follow-up understanding.
 */
export function getTopicContext(sessionId: string): ConversationSession['topicContext'] {
  return getSession(sessionId).topicContext;
}

/**
 * Get recent turns for context window.
 */
export function getRecentTurns(sessionId: string, limit = 5): ConversationTurn[] {
  const session = getSession(sessionId);
  return session.turns.slice(-limit);
}

/**
 * Build a conversation history string for prompt injection.
 */
export function buildConversationHistory(sessionId: string, maxTurns = 5): string {
  const turns = getRecentTurns(sessionId, maxTurns);
  if (turns.length === 0) return '';

  const lines: string[] = ['CONVERSATION HISTORY:'];
  for (const turn of turns) {
    const role = turn.role === 'user' ? 'User' : 'Assistant';
    const content = turn.content.length > 200
      ? turn.content.slice(0, 200) + '...'
      : turn.content;
    lines.push(`${role}: ${content}`);
  }
  return lines.join('\n');
}

/**
 * Check if a follow-up request references previous context.
 */
export function isFollowUp(sessionId: string): boolean {
  const session = getSession(sessionId);
  return session.turns.length > 0;
}

/**
 * Resolve references in a follow-up question using conversation context.
 * E.g., "اعمل لها حملة" → resolves "لها" to the last opportunity.
 */
export function resolveFollowUpReferences(
  sessionId: string,
  question: string,
): { resolved: string; contextUsed: string[] } {
  const session = getSession(sessionId);
  const tc = session.topicContext;
  const contextUsed: string[] = [];
  const resolved = question;

  if (!tc) return { resolved, contextUsed };

  // Arabic pronouns that reference previous context
  const pronouns = ['لها', 'له', 'لهم', 'لها', 'هذا', 'هذه', 'ذلك', 'تلك', 'نفسها', 'نفسه'];
  const hasPronoun = pronouns.some((p) => question.includes(p));

  if (hasPronoun) {
    if (tc.lastProducts && tc.lastProducts.length > 0) {
      contextUsed.push(`last_products: ${tc.lastProducts.join(',')}`);
    }
    if (tc.lastOpportunity) {
      contextUsed.push(`last_opportunity: ${tc.lastOpportunity}`);
    }
    if (tc.lastIntent) {
      contextUsed.push(`last_intent: ${tc.lastIntent}`);
    }
  }

  // Channel switch detection
  const channels = ['instagram', 'tiktok', 'فيسبوك', 'facebook', 'whatsapp', 'واتساب', 'website', 'الموقع'];
  for (const ch of channels) {
    if (question.toLowerCase().includes(ch.toLowerCase())) {
      contextUsed.push(`channel_switch: ${ch}`);
    }
  }

  // "نفس" (same) detection
  if (/نفس/.test(question) && tc.lastProducts) {
    contextUsed.push(`same_context: ${tc.lastProducts.join(',')}`);
  }

  return { resolved, contextUsed };
}

/**
 * Clear a session.
 */
export function clearSession(sessionId: string): void {
  sessions.delete(sessionId);
}

/* ------------------------------------------------------------------------ */
/* INTERNALS                                                                 */
/* ------------------------------------------------------------------------ */

function pruneTurns(session: ConversationSession): void {
  if (session.turns.length > MAX_TURNS_PER_SESSION) {
    session.turns = session.turns.slice(-MAX_TURNS_PER_SESSION);
  }
}

function pruneSessions(): void {
  if (sessions.size <= MAX_SESSIONS) return;

  const now = Date.now();
  const entries = [...sessions.entries()]
    .sort((a, b) => new Date(a[1].lastActiveAt).getTime() - new Date(b[1].lastActiveAt).getTime());

  for (const [id] of entries) {
    if (sessions.size <= MAX_SESSIONS * 0.8) break;
    const session = sessions.get(id);
    if (session) {
      const age = now - new Date(session.lastActiveAt).getTime();
      if (age > SESSION_TTL_MS) sessions.delete(id);
    }
  }
}
