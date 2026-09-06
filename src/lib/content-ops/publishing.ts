/**
 * PART 2 — CONTENT PUBLISHER ABSTRACTION
 * ======================================
 * Real delivery through the in-app Website channel + a strict contract for
 * social channels (Instagram / Facebook / TikTok / WhatsApp).
 *
 * Rules:
 *  - NEVER simulate a successful social publish. An unconfigured channel
 *    returns CHANNEL_NOT_CONNECTED and the operation layer records
 *    PUBLISH_FAILED.
 *  - The Website adapter is the REAL in-app channel: publishing surfaces
 *    content to the storefront (handled by the operations layer); the
 *    adapter only performs the final validation and confirms delivery.
 *  - Adapters are pure functions of their config so tests can verify the
 *    contract with an injected deliver mock — but the app default never
 *    fabricates success.
 */

import type { ChannelKey } from "./types";
import { CHANNELS } from "./types";
import type { PublisherLike } from "./operations";

export const CHANNEL_NOT_CONNECTED = "CHANNEL_NOT_CONNECTED";

export interface DeliveryPayload {
  contentId: string;
  versionId: string;
  channel: ChannelKey;
  publicationId: string;
  title: string | null;
  body: string;
  callToAction: string | null;
  productIds: string[];
}

export type DeliverFn = (
  payload: DeliveryPayload,
) => Promise<{ providerId?: string; error?: string }>;

export interface ChannelAdapterConfig {
  enabled?: boolean;
  deliver?: DeliverFn;
}

/* ------------------------------------------------------------------------ */
/* WEBSITE ADAPTER (real in-app channel)                                     */
/* ------------------------------------------------------------------------ */

/**
 * The website channel is always connected: publishing to it means surfacing
 * the content on the storefront, which the operations layer performs. The
 * adapter confirms delivery only after validating the payload is publishable
 * (never confirms an empty/invalid piece).
 */
export function createWebsiteAdapter(config: ChannelAdapterConfig = {}): PublisherLike {
  const enabled = config.enabled !== false;
  const deliver: DeliverFn =
    config.deliver ??
    (async () => {
      return { providerId: "website" };
    });

  return {
    key: "website",
    isConfigured: () => enabled,
    async publish(payload, _publication) {
      if (!enabled) return { ok: false, error: CHANNEL_NOT_CONNECTED };
      if (!payload.item.item.body || payload.item.item.body.trim().length === 0) {
        return { ok: false, error: "empty body cannot be published" };
      }
      const result = await deliver({
        contentId: payload.item.id,
        versionId: payload.versionId,
        channel: "website",
        publicationId: _publication.id,
        title: payload.item.item.title,
        body: payload.item.item.body,
        callToAction: payload.item.item.callToAction,
        productIds: payload.item.item.productIds,
      });
      if (result.error) return { ok: false, error: result.error };
      return { ok: true, providerId: result.providerId ?? "website" };
    },
  };
}

/* ------------------------------------------------------------------------ */
/* SOCIAL ADAPTERS (contract only — never fake success)                      */
/* ------------------------------------------------------------------------ */

/**
 * A social channel adapter. When not configured (no credentials), isConfigured
 * is false and publish returns CHANNEL_NOT_CONNECTED — the operation layer then
 * records PUBLISH_FAILED. When a deliver implementation is injected (only ever
 * done for tests/integration), the adapter performs real delivery through it.
 */
export function createSocialAdapter(
  key: Exclude<ChannelKey, "website">,
  config: ChannelAdapterConfig = {},
): PublisherLike {
  const enabled = config.enabled === true && typeof config.deliver === "function";
  const deliver = config.deliver;

  return {
    key,
    isConfigured: () => enabled,
    async publish(payload, publication) {
      if (!enabled || !deliver) {
        return { ok: false, error: CHANNEL_NOT_CONNECTED };
      }
      const result = await deliver({
        contentId: payload.item.id,
        versionId: payload.versionId,
        channel: key,
        publicationId: publication.id,
        title: payload.item.item.title,
        body: payload.item.item.body,
        callToAction: payload.item.item.callToAction,
        productIds: payload.item.item.productIds,
      });
      if (result.error) return { ok: false, error: result.error };
      return { ok: true, providerId: result.providerId ?? key };
    },
  };
}

/* ------------------------------------------------------------------------ */
/* REGISTRY                                                                  */
/* ------------------------------------------------------------------------ */

export interface PublisherRegistry {
  get: (channel: ChannelKey) => PublisherLike | undefined;
  list: () => PublisherLike[];
}

/**
 * Build the registry. Default: website connected, all social channels
 * unconfigured (no credentials exist in the app today).
 */
export function createPublisherRegistry(
  socialConfigs?: Partial<Record<Exclude<ChannelKey, "website">, ChannelAdapterConfig>>,
): PublisherRegistry {
  const website = createWebsiteAdapter();
  const socials: PublisherLike[] = [
    createSocialAdapter("instagram", socialConfigs?.instagram),
    createSocialAdapter("facebook", socialConfigs?.facebook),
    createSocialAdapter("tiktok", socialConfigs?.tiktok),
    createSocialAdapter("whatsapp", socialConfigs?.whatsapp),
  ];
  const byChannel = new Map<ChannelKey, PublisherLike>();
  byChannel.set("website", website);
  for (const s of socials) byChannel.set(s.key, s);

  return {
    get: (channel) => byChannel.get(channel),
    list: () => CHANNELS.map((c) => byChannel.get(c)!).filter(Boolean),
  };
}

export function createDefaultPublisherRegistry(): PublisherRegistry {
  return createPublisherRegistry();
}