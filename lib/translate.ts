export type Lang = "ar" | "en";

export function getLang(): Lang {
  return "ar";
}

export function isRTL(): boolean {
  return getLang() === "ar";
}

export function getDir(): "rtl" | "ltr" {
  return isRTL() ? "rtl" : "ltr";
}

export function t(ar: string, en: string): string {
  return isRTL() ? ar : en;
}
