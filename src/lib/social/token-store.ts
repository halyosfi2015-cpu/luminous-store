/**
 * Server-only CRUD for social_channel_tokens (service-role, RLS bypass).
 * Tokens are stored ENCRYPTED (token-crypto). NEVER return plaintext tokens
 * to the client — only metadata (page name, status, expiry).
 */
import { createAdminClient } from "@/src/lib/supabase";
import { encryptToken, decryptToken, getTokenKey } from "./token-crypto";
import type { ChannelKey } from "../content-ops/types";

export interface StoredToken {
  channel: string;
  provider: string;
  page_id: string | null;
  page_name: string | null;
  ig_user_id: string | null;
  ig_username: string | null;
  token_expires_at: string | null;
  scopes: string[];
  status: string;
  last_error: string | null;
  updated_at: string;
}

type Supa = {
  from: (t: string) => {
    select: (c: string) => {
      eq: (c: string, v: string) => { maybeSingle: () => Promise<{ data: Record<string, unknown> | null }> };
    };
    upsert: (r: unknown) => Promise<{ error: { message: string } | null }>;
    delete: () => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> };
    update: (r: unknown) => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> };
  };
};

function db(): Supa {
  return createAdminClient() as unknown as Supa;
}

/** Plaintext token for server-side delivery ONLY. Never send to client. */
export async function getChannelToken(channel: Extract<ChannelKey, "facebook" | "instagram" | "tiktok" | "whatsapp">): Promise<{
  accessToken: string;
  pageId: string;
  pageName: string | null;
  igUserId: string | null;
  igUsername: string | null;
} | null> {
  const { data } = await db().from("social_channel_tokens").select("*").eq("channel", channel).maybeSingle();
  if (!data || data.status !== "active" || typeof data.access_token_enc !== "string") return null;
  if (data.token_expires_at && Date.parse(String(data.token_expires_at)) < Date.now()) return null;
  try {
    const accessToken = decryptToken(String(data.access_token_enc), getTokenKey());
    return {
      accessToken,
      pageId: String(data.page_id ?? ""),
      pageName: typeof data.page_name === "string" ? data.page_name : null,
      igUserId: typeof data.ig_user_id === "string" ? data.ig_user_id : null,
      igUsername: typeof data.ig_username === "string" ? data.ig_username : null,
    };
  } catch {
    return null;
  }
}

export async function saveChannelToken(input: {
  channel: string;
  provider?: string;
  pageId: string;
  pageName?: string;
  igUserId?: string;
  igUsername?: string;
  accessToken: string;
  expiresAt?: string | null;
  scopes?: string[];
  connectedBy?: string;
}): Promise<void> {
  const enc = encryptToken(input.accessToken, getTokenKey());
  const { error } = await db().from("social_channel_tokens").upsert({
    channel: input.channel,
    provider: input.provider ?? "meta",
    page_id: input.pageId,
    page_name: input.pageName ?? null,
    ig_user_id: input.igUserId ?? null,
    ig_username: input.igUsername ?? null,
    access_token_enc: enc,
    token_expires_at: input.expiresAt ?? null,
    scopes: input.scopes ?? [],
    status: "active",
    last_error: null,
    connected_by: input.connectedBy ?? null,
  });
  if (error) throw new Error(`token store failed: ${error.message}`);
}

export async function deleteChannelToken(channel: string): Promise<void> {
  await db().from("social_channel_tokens").delete().eq("channel", channel);
}

export async function markTokenError(channel: string, message: string): Promise<void> {
  await db().from("social_channel_tokens").update({ status: "error", last_error: message.slice(0, 500) }).eq("channel", channel);
}

/** Client-safe metadata (no secrets). */
export async function getTokenMeta(channel: string): Promise<StoredToken | null> {
  const { data } = await db().from("social_channel_tokens").select(
    "channel,provider,page_id,page_name,ig_user_id,ig_username,token_expires_at,scopes,status,last_error,updated_at",
  ).eq("channel", channel).maybeSingle();
  if (!data) return null;
  return {
    channel: String(data.channel),
    provider: String(data.provider ?? "meta"),
    page_id: typeof data.page_id === "string" ? data.page_id : null,
    page_name: typeof data.page_name === "string" ? data.page_name : null,
    ig_user_id: typeof data.ig_user_id === "string" ? data.ig_user_id : null,
    ig_username: typeof data.ig_username === "string" ? data.ig_username : null,
    token_expires_at: typeof data.token_expires_at === "string" ? data.token_expires_at : null,
    scopes: Array.isArray(data.scopes) ? data.scopes as string[] : [],
    status: String(data.status ?? "active"),
    last_error: typeof data.last_error === "string" ? data.last_error : null,
    updated_at: String(data.updated_at ?? ""),
  };
}
