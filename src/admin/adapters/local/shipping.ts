import {
  SHIPPING_STORAGE_KEY,
  loadGovernorates,
  saveGovernorates,
  type Governorate,
} from "@/src/data/shipping";
import type { ResourceAdapter } from "./types";

export const shippingAdapter: ResourceAdapter<Governorate[]> = {
  resource: "shipping",
  storageKeys: [SHIPPING_STORAGE_KEY],
  load: loadGovernorates,
  save: saveGovernorates,
};
