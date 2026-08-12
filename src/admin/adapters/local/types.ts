import type { AdminResource } from "../../types";

export type ResourceAdapter<T = unknown> = {
  resource: AdminResource;
  storageKeys: string[];
  load: () => T | null;
  save: (value: T) => void;
  clear?: () => void;
};
