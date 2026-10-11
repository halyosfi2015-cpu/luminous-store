/**
 * Dual-currency display (YER primary + SAR reference).
 *
 * Rate: 1 SAR = 140.2 YER — Sana'a market sell rate (Al-Karimi exchange)
 * published by pressbee.net/rate, updated 2026-10-01.
 * Store YER prices are set on the Sana'a market basis, so
 * SAR = YER / 140.2.
 */
export const SAR_YER_RATE = 140.2;

export const SAR_RATE_SOURCE = "pressbee.net/rate — سوق صنعاء (بيع), 2026-10-01";

/** Convert a YER amount to the reference SAR amount (rounded). */
export function yerToSar(yer: number): number {
  return Math.round(yer / SAR_YER_RATE);
}

/** Format the SAR reference amount with Arabic-Indic digits (site style). */
export function formatSar(yer: number): string {
  return yerToSar(yer).toLocaleString("ar-YE");
}

/** `≈ 180 ر.س` / `≈ 180 SAR` label for a YER amount. */
export function sarLabel(yer: number, isAr: boolean): string {
  return `≈ ${formatSar(yer)} ${isAr ? "ر.س" : "SAR"}`;
}
