"use client";

import IntelligenceCenterV2 from "@/components/admin/IntelligenceCenterV2";

/**
 * Intelligence Center v2 — Chat-like interface for the Luminous Intelligence Agent.
 * 
 * This page provides a conversational interface where users can:
 * - Ask natural language questions about their business
 * - Get ranked, explainable recommendations
 * - See the AI's thinking pipeline
 * - Follow up with contextual questions
 * - Take actions directly from recommendations
 * 
 * Route: /admin/intelligence/chat
 */
export default function IntelligenceChatPage() {
  return <IntelligenceCenterV2 />;
}
