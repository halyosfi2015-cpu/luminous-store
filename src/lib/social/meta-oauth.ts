/**
 * Meta OAuth (server-only): authorization URL builder + code exchange +
 * short-lived pending handshake storage. No secrets leave the server.
 */
import { randomBytes } from "crypto";
import { getSetting, setSetting, removeSetting } from "@/src/lib/site-settings";
import { encryptToken, decryptToken, getTokenKey } from "./token-crypto";
import { listMetaPages, type MetaPageInfo } from "./meta-adapter";

export const META_SCOPES = [
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish",
];

export function getMetaAppId(): string {
  const id = process.env.META_APP_ID;
  if (!id) throw new Error("META_APP_ID is not set — Meta OAuth NOT CONFIGURED");
  return id;
}

function getRedirectUri(origin: string): string {
  if (process.env.META_REDIRECT_URI) return process.env.META_REDIRECT_URI;
  return `${origin}/api/social/meta/callback`;
}

export function buildAuthorizeUrl(origin: string, state: string): string {
  const url = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  url.searchParams.set("client_id", getMetaAppId());
  url.searchParams.set("redirect_uri", getRedirectUri(origin));
  url.searchParams.set("scope", META_SCOPES.join(","));
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  return url.toString();
}

export function newOAuthState(): string {
  return randomBytes(24).toString("hex");
}

export interface PendingHandshake {
  userTokenEnc: string;
  pages: { pageId: string; pageName: string; igUserId?: string; igUsername?: string }[];
  createdAt: string;
}

const PENDING_TTL_MS = 10 * 60 * 1000;

function pendingKey(id: string): string {
  return `meta_oauth_pending_${id}`;
}

export async function storePendingHandshake(userToken: string, pages: MetaPageInfo[]): Promise<string> {
  const id = randomBytes(12).toString("hex");
  const payload: PendingHandshake = {
    userTokenEnc: encryptToken(userToken, getTokenKey()),
    pages: pages.map((p) => ({
      pageId: p.pageId,
      pageName: p.pageName,
      igUserId: p.igUserId,
      igUsername: p.igUsername,
    })),
    createdAt: new Date().toISOString(),
  };
  await setSetting(pendingKey(id), payload);
  return id;
}

export async function readPendingHandshake(id: string): Promise<{ userToken: string; pages: PendingHandshake["pages"] } | null> {
  if (!/^[0-9a-f]{24}$/.test(id)) return null;
  const data = await getSetting<PendingHandshake | null>(pendingKey(id), null);
  if (!data) return null;
  if (Date.parse(data.createdAt) + PENDING_TTL_MS < Date.now()) {
    await removeSetting(pendingKey(id)).catch(() => false);
    return null;
  }
  try {
    return { userToken: decryptToken(data.userTokenEnc, getTokenKey()), pages: data.pages };
  } catch {
    return null;
  }
}

export async function clearPendingHandshake(id: string): Promise<void> {
  await removeSetting(pendingKey(id)).catch(() => false);
}

/** Exchange an authorization code for a short-lived user token. */
export async function exchangeCodeForToken(code: string, origin: string): Promise<string> {
  const appId = getMetaAppId();
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) throw new Error("META_APP_SECRET is not set — Meta OAuth NOT CONFIGURED");
  const url = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("redirect_uri", getRedirectUri(origin));
  url.searchParams.set("code", code);
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  const json = (await res.json().catch(() => ({}))) as { access_token?: string; error?: { message?: string } };
  if (!res.ok || !json.access_token) {
    throw new Error(`OAuth code exchange failed: ${json.error?.message ?? res.status}`);
  }
  return json.access_token;
}

/** Full post-callback processing: code → user token → pages → pending id. */
export async function processOAuthCallback(code: string, origin: string): Promise<{ pendingId: string; pages: PendingHandshake["pages"] }> {
  const userToken = await exchangeCodeForToken(code, origin);
  const pages = await listMetaPages(userToken);
  if (pages.length === 0) {
    throw new Error("هذا الحساب لا يملك أي صفحة فيسبوك — أنشئ صفحة أولاً");
  }
  const pendingId = await storePendingHandshake(userToken, pages);
  return {
    pendingId,
    pages: pages.map((p) => ({
      pageId: p.pageId,
      pageName: p.pageName,
      igUserId: p.igUserId,
      igUsername: p.igUsername,
    })),
  };
}
