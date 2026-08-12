import type { AdminResource } from "../../types";
import { heroAdapter } from "./hero";
import { offersAdapter } from "./offers";
import { shippingAdapter } from "./shipping";
import { expertsAdapter } from "./experts";
import { bundlesAdapter, giftOptionsAdapter } from "./bundles";
import { routinesAdapter } from "./routines";
import { couponsAdapter } from "./coupons";
import { homepageAdapter } from "./homepage";

export type { ResourceAdapter } from "./types";

export type LocalAdapter =
  | typeof heroAdapter
  | typeof offersAdapter
  | typeof shippingAdapter
  | typeof expertsAdapter
  | typeof bundlesAdapter
  | typeof giftOptionsAdapter
  | typeof routinesAdapter
  | typeof couponsAdapter
  | typeof homepageAdapter;

export const localAdapters: Partial<Record<AdminResource, LocalAdapter[]>> = {
  hero: [heroAdapter],
  offers: [offersAdapter],
  shipping: [shippingAdapter],
  experts: [expertsAdapter],
  bundles: [bundlesAdapter, giftOptionsAdapter],
  routines: [routinesAdapter],
  coupons: [couponsAdapter],
  settings: [homepageAdapter],
};
