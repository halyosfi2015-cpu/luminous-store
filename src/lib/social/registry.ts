/**
 * Builds a publisher registry wired to REAL stored channel tokens.
 * Channels without a valid token stay unconfigured → honest
 * CHANNEL_NOT_CONNECTED (never faked). Website always connected.
 */
import { createPublisherRegistry, type PublisherRegistry, type DeliverFn } from "../content-ops/publishing";
import { createMetaDeliver } from "./meta-adapter";
import { getChannelToken, markTokenError } from "./token-store";
import { getAllProducts } from "../product-dal";
import type { ChannelKey } from "../content-ops/types";

/**
 * Wraps a Meta deliver fn: on auth/token errors (Meta code 190,
 * OAuthException, invalid/expired token) the stored token row is flagged
 * `error` so the admin sees it and the channel stops silently retrying
 * a dead credential. Delivery result itself stays honest.
 */
function withTokenHealth(
  channel: Extract<ChannelKey, "facebook" | "instagram">,
  deliver: DeliverFn,
): DeliverFn {
  return async (payload) => {
    const result = await deliver(payload);
    if (result.error && /190|OAuthException|invalid(?:\s|_)token|expired(?:\s|_)token|Session has expired/i.test(result.error)) {
      await markTokenError(channel, result.error).catch(() => {});
    }
    return result;
  };
}

/** Map a catalog productId → first PUBLIC http(s) gallery image (Meta crawls it). */
let imageMap: Map<string, string> | null = null;

function publicImageResolver(productId: string): string | null {
  if (!imageMap) return null;
  return imageMap.get(productId) ?? null;
}

async function preloadImageMap(): Promise<void> {
  try {
    const all = (await getAllProducts().catch(() => [])) as unknown as Record<string, unknown>[];
    const map = new Map<string, string>();
    for (const p of all) {
      const gallery = Array.isArray(p.gallery) ? p.gallery : [];
      const remote = gallery.find((g): g is string => typeof g === "string" && /^https?:\/\//i.test(g));
      if (!remote) continue;
      for (const k of [p.id, p.legacy_id, p.slug, p.sku]) {
        if (typeof k === "string" && k) map.set(k, remote);
      }
    }
    imageMap = map;
  } catch {
    imageMap = new Map();
  }
}

export async function createConfiguredPublisherRegistry(): Promise<PublisherRegistry> {
  await preloadImageMap();
  const facebook = await getChannelToken("facebook").catch(() => null);
  const instagram = await getChannelToken("instagram").catch(() => null);

  return createPublisherRegistry({
    ...(facebook
      ? {
        facebook: {
          enabled: true,
          deliver: withTokenHealth("facebook", createMetaDeliver("facebook", {
            accessToken: facebook.accessToken,
            pageId: facebook.pageId,
            pageName: facebook.pageName ?? undefined,
          }, { imageResolver: publicImageResolver })),
        },
      }
      : {}),
    ...(instagram
      ? {
        instagram: {
          enabled: true,
          deliver: withTokenHealth("instagram", createMetaDeliver("instagram", {
            accessToken: instagram.accessToken,
            pageId: instagram.pageId,
            igUserId: instagram.igUserId ?? undefined,
            igUsername: instagram.igUsername ?? undefined,
          }, { imageResolver: publicImageResolver })),
        },
      }
      : {}),
  });
}
