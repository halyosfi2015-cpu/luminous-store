export type Governorate = {
  id: string;
  name: string;
  nameEn: string;
  fee: number; // in YER
  enabled: boolean;
};

export const DEFAULT_GOVERNORATES: Governorate[] = [
  { id: "sanaa", name: "صنعاء", nameEn: "Sana'a", fee: 700, enabled: true },
  { id: "aden", name: "عدن", nameEn: "Aden", fee: 1500, enabled: true },
  { id: "taiz", name: "تعز", nameEn: "Taiz", fee: 1500, enabled: true },
  { id: "hodeidah", name: "الحديدة", nameEn: "Al Hudaydah", fee: 1500, enabled: true },
  { id: "ibb", name: "إب", nameEn: "Ibb", fee: 1500, enabled: true },
  { id: "dhamar", name: "ذمار", nameEn: "Dhamar", fee: 1500, enabled: true },
  { id: "mukalla", name: "المكلا", nameEn: "Al Mukalla", fee: 1500, enabled: true },
  { id: "hadramout", name: "حضرموت", nameEn: "Hadramout", fee: 1500, enabled: true },
  { id: "marib", name: "مأرب", nameEn: "Marib", fee: 1500, enabled: true },
  { id: "sadah", name: "صعدة", nameEn: "Sa'dah", fee: 1500, enabled: true },
  { id: "hajjah", name: "حجة", nameEn: "Hajjah", fee: 1500, enabled: true },
  { id: "al-jawf", name: "الجوف", nameEn: "Al Jawf", fee: 1500, enabled: true },
  { id: "amran", name: "عمران", nameEn: "'Amran", fee: 1500, enabled: true },
  { id: "al-bayda", name: "البيضاء", nameEn: "Al Bayda", fee: 1500, enabled: true },
  { id: "al-dhalee", name: "الضالع", nameEn: "Al Dhale'e", fee: 1500, enabled: true },
  { id: "lahij", name: "لحج", nameEn: "Lahij", fee: 1500, enabled: true },
  { id: "abeen", name: "أبين", nameEn: "Abyan", fee: 1500, enabled: true },
  { id: "shabwah", name: "شبوة", nameEn: "Shabwah", fee: 1500, enabled: true },
  { id: "al-mahrah", name: "المهرة", nameEn: "Al Mahrah", fee: 1500, enabled: true },
  { id: "socotra", name: "سقطرى", nameEn: "Socotra", fee: 1500, enabled: true },
  { id: "raydah", name: "رداع", nameEn: "Rada'a", fee: 1500, enabled: true },
];

export const SHIPPING_STORAGE_KEY = "luminous-shipping-governorates";

export function loadGovernorates(): Governorate[] {
  if (typeof window === "undefined") return DEFAULT_GOVERNORATES;
  try {
    const raw = window.localStorage.getItem(SHIPPING_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_GOVERNORATES;
}

export function saveGovernorates(list: Governorate[]) {
  try {
    window.localStorage.setItem(SHIPPING_STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

