import { normalizeAr } from './normalize';
import type { SizeValue, SizeMatchResult } from './types';

export function extractSizes(text: string): SizeValue[] {
  const s = normalizeAr(text);
  const out: SizeValue[] = [];
  let m: RegExpMatchArray | null;

  m = s.match(/(\d+(?:[.,]\d+)?)\s*(مل|ml|ملي|ملليلتر)/);
  if (m) out.push({ value: parseFloat(m[1].replace(',', '.')), unit: 'ml' });

  m = s.match(/(\d+(?:[.,]\d+)?)\s*fl\s*\.?\s*oz/);
  if (m) out.push({ value: Math.round(parseFloat(m[1].replace(',', '.')) * 29.5735), unit: 'ml' });

  m = s.match(/(\d+(?:[.,]\d+)?)\s*(جرام|جم|غ|g)\b/);
  if (m) out.push({ value: parseFloat(m[1].replace(',', '.')), unit: 'g' });

  m = s.match(/(\d+(?:[.,]\d+)?)\s*(كجم|kg)/);
  if (m) out.push({ value: parseFloat(m[1].replace(',', '.')) * 1000, unit: 'g' });

  m = s.match(/(\d+(?:[.,]\d+)?)\s*(ملجم|mg)/);
  if (m) out.push({ value: parseFloat(m[1].replace(',', '.')), unit: 'mg' });

  m = s.match(/(\d+)\s*(كبسوله|كبسولات|قرص|اقراص|تابلت|قطه|قطع|تحريه|tab|caps|pcs|piece)/);
  if (!m) m = s.match(/\b(\d+)\s*(كبسول|كبسولات|قرص|اقراص)/);
  if (m) out.push({ value: parseInt(m[1], 10), unit: 'count' });

  m = s.match(/(\d{1,2})\s*[x×]\s*(\d{1,4})/);
  if (m) out.push({ value: parseInt(m[1], 10) * parseInt(m[2], 10), unit: 'count', pack: [parseInt(m[1], 10), parseInt(m[2], 10)] });

  m = s.match(/\bspf\s*(\d{2,3})\b/);
  if (m) out.push({ value: parseInt(m[1], 10), unit: 'spf' });

  return out;
}

export function sizeMatch(a: SizeValue[], b: SizeValue[]): SizeMatchResult {
  if (!a.length || !b.length) return 'unknown';
  for (const sa of a) {
    for (const sb of b) {
      if (sa.unit === sb.unit) {
        const diff = Math.abs(sa.value - sb.value);
        if (diff < 0.5) return 'exact';
        if (diff / Math.max(sa.value, sb.value) < 0.10) return 'close';
        if (diff / Math.max(sa.value, sb.value) < 0.30) return 'partial';
        return 'mismatch';
      }
    }
  }
  // ml <-> g rough comparison
  for (const sa of a) {
    for (const sb of b) {
      if ((sa.unit === 'ml' && sb.unit === 'g') || (sa.unit === 'g' && sb.unit === 'ml')) {
        const diff = Math.abs(sa.value - sb.value);
        if (diff < 5) return 'partial';
      }
    }
  }
  return 'unknown';
}
