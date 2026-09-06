/**
 * Meta (Facebook + Instagram) delivery via Graph API — REAL calls only.
 * No mocks, no simulated success: every failure returns { error } honestly
 * and the operations layer records PUBLISH_FAILED.
 *
 * Requirements (external, Meta dashboard):
 * - Meta App with Facebook Login + Instagram products
 * - Page access token with: pages_read_engagement, pages_manage_posts (FB post),
 *   instagram_basic + instagram_content_publish (IG publish)
 * - IG account must be Business/Creator linked to the Page
 * - Images must be PUBLIC http(s) URLs (Meta crawls them)
 */

import type { ChannelKey } from "../content-ops/types";
import type { DeliverFn } from "../content-ops/publishing";

export const META_API_VERSION = "v21.0";
const GRAPH = `https://graph.facebook.com/${META_API_VERSION}`;

export interface MetaToken {
  accessToken: string;
  pageId: string;
  pageName?: string;
  igUserId?: string;
  igUsername?: string;
}

interface GraphError {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
}

async function graphFetch(path: string, params: Record<string, string>, token: string): Promise<unknown> {
  const url = new URL(GRAPH + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("access_token", token);
  const res = await fetch(url, { signal: AbortSignal.timeout(25000) });
  const json = (await res.json().catch(() => ({}))) as { error?: GraphError };
  if (!res.ok || json.error) {
    const e = json.error ?? {};
    throw new Error(`Meta API ${e.code ?? res.status}: ${e.message ?? "request failed"}`);
  }
  return json;
}

function buildCaption(title: string | null, body: string, cta: string | null): string {
  const parts = [title, body, cta].filter((s) => typeof s === "string" && s.trim().length > 0) as string[];
  return parts.join("\n\n").slice(0, 2200);
}

async function publishFacebook(
  token: MetaToken,
  title: string | null,
  body: string,
  cta: string | null,
  imageUrl: string | null,
): Promise<{ providerId?: string; error?: string }> {
  try {
    const caption = buildCaption(title, body, cta);
    if (imageUrl) {
      // Photo post with caption.
      const res = (await graphFetch(`/${token.pageId}/photos`, { url: imageUrl, caption }, token.accessToken)) as { id?: string; post_id?: string };
      const id = res.post_id ?? res.id;
      if (!id) return { error: "Facebook did not return a post id" };
      return { providerId: `fb:${id}` };
    }
    const res = (await graphFetch(`/${token.pageId}/feed`, { message: caption }, token.accessToken)) as { id?: string };
    if (!res.id) return { error: "Facebook did not return a post id" };
    return { providerId: `fb:${res.id}` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Facebook publish failed" };
  }
}

async function publishInstagram(
  token: MetaToken,
  title: string | null,
  body: string,
  cta: string | null,
  imageUrl: string | null,
  story: boolean,
): Promise<{ providerId?: string; error?: string }> {
  try {
    if (!token.igUserId) return { error: "No Instagram business account linked to this Page" };
    if (!imageUrl) return { error: "Instagram requires a PUBLIC image URL — attach a remote product image first" };
    const caption = buildCaption(title, body, cta);
    const params: Record<string, string> = { image_url: imageUrl, caption };
    if (story) params.media_type = "STORIES";
    const container = (await graphFetch(`/${token.igUserId}/media`, params, token.accessToken)) as { id?: string };
    if (!container.id) return { error: "Instagram did not return a media container" };
    // Small delay so Meta finishes processing the container.
    await new Promise((r) => setTimeout(r, 4000));
    const pub = (await graphFetch(`/${token.igUserId}/media_publish`, { creation_id: container.id }, token.accessToken)) as { id?: string };
    if (!pub.id) return { error: "Instagram did not confirm publication" };
    return { providerId: `ig:${pub.id}` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Instagram publish failed" };
  }
}

/**
 * Deliver function factory. imageResolver maps a productId → PUBLIC image URL
 * (or null). Only remote http(s) images are sent to Meta.
 */
export function createMetaDeliver(
  channel: Extract<ChannelKey, "facebook" | "instagram">,
  token: MetaToken,
  opts: { imageResolver?: (productId: string) => string | null; story?: boolean } = {},
): DeliverFn {
  return async (payload) => {
    let imageUrl: string | null = null;
    for (const pid of payload.productIds ?? []) {
      const url = opts.imageResolver?.(pid) ?? null;
      if (url && /^https?:\/\//i.test(url)) {
        imageUrl = url;
        break;
      }
    }
    const story = opts.story ?? payload.format === "story";
    if (channel === "facebook") {
      return publishFacebook(token, payload.title, payload.body, payload.callToAction, imageUrl);
    }
    return publishInstagram(token, payload.title, payload.body, payload.callToAction, imageUrl, story);
  };
}

/* ------------------------------------------------------------------ */
/* Token validation + long-lived exchange (connect flow)               */
/* ------------------------------------------------------------------ */

export interface MetaPageInfo {
  pageId: string;
  pageName: string;
  pageToken: string;
  igUserId?: string;
  igUsername?: string;
}

/** Validate a user token and list its pages (with linked IG accounts). */
export async function listMetaPages(userToken: string): Promise<MetaPageInfo[]> {
  const res = (await graphFetch(
    "/me/accounts",
    { fields: "id,name,access_token,instagram_business_account{id,username}", limit: "50" },
    userToken,
  )) as { data?: { id: string; name: string; access_token: string; instagram_business_account?: { id: string; username: string } }[] };
  return (res.data ?? []).map((p) => ({
    pageId: p.id,
    pageName: p.name,
    pageToken: p.access_token,
    igUserId: p.instagram_business_account?.id,
    igUsername: p.instagram_business_account?.username,
  }));
}

/** Exchange a short-lived user token for a 60-day one (needs app id/secret). */
export async function exchangeLongLivedToken(shortToken: string): Promise<{ accessToken: string; expiresIn: number }> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error("META_APP_ID / META_APP_SECRET are not set — token exchange NOT CONFIGURED");
  }
  const url = new URL(`${GRAPH}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("fb_exchange_token", shortToken);
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  const json = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: GraphError };
  if (!res.ok || !json.access_token) {
    throw new Error(`Token exchange failed: ${json.error?.message ?? res.status}`);
  }
  return { accessToken: json.access_token, expiresIn: json.expires_in ?? 5184000 };
}
