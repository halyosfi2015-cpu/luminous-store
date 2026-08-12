import type { AdminBanner } from "../../types";

const BANNERS_STORAGE_KEY = "luminous-banners";

function loadBanners(): AdminBanner[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(BANNERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as AdminBanner[];
    }
  } catch {}
  return [];
}

function saveBannersToStorage(list: AdminBanner[]) {
  try {
    window.localStorage.setItem(BANNERS_STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

export function listBanners(): AdminBanner[] {
  return loadBanners();
}

export function saveBanners(list: AdminBanner[]) {
  saveBannersToStorage(list);
}

export function getBanners(): AdminBanner[] {
  return listBanners();
}

export function addBanner(banner: AdminBanner): AdminBanner[] {
  const list = listBanners();
  list.push(banner);
  saveBannersToStorage(list);
  return list;
}

export function updateBanner(banner: AdminBanner): AdminBanner[] {
  const list = listBanners();
  const idx = list.findIndex((b) => b.id === banner.id);
  if (idx >= 0) {
    list[idx] = banner;
    saveBannersToStorage(list);
  }
  return list;
}

export function deleteBanner(id: string): AdminBanner[] {
  const list = listBanners().filter((b) => b.id !== id);
  saveBannersToStorage(list);
  return list;
}

export function getBanner(id: string): AdminBanner | null {
  return listBanners().find((b) => b.id === id) || null;
}
