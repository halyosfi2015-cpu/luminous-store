/**
 * Builds a publisher registry wired to REAL stored channel tokens.
 * Channels without a valid token stay unconfigured → honest
 * CHANNEL_NOT_CONNECTED (never faked). Website always connected.
 */
import { createPublisherRegistry, type PublisherRegistry } from "../content-ops/publishing";
import { createMetaDeliver } from "./meta-adapter";
import { getChannelToken } from "./token-store";
import { getAllProducts } from "../product-dal";

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
          deliver: createMetaDeliver("facebook", {
            accessToken: facebook.accessToken,
            pageId: facebook.pageId,
            pageName: facebook.pageName ?? undefined,
          }, { imageResolver: publicImageResolver }),
        },
      }
      : {}),
    ...(instagram
      ? {
        instagram: {
          enabled: true,
          deliver: createMetaDeliver("instagram", {
            accessToken: instagram.accessToken,
            pageId: instagram.pageId,
            igUserId: instagram.igUserId ?? undefined,
            igUsername: instagram.igUsername ?? undefined,
          }, { imageResolver: publicImageResolver }),
        },
      }
      : {}),
  });
}
