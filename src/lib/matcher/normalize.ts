const STOPWORDS = new Set([
  'من', 'مع', 'لل', 'الى', 'على', 'في', 'و', 'او', 'ل', 'ب', 'كما', 'يوميا', 'يوما',
  'عبوه', 'علبه', 'عبوه', 'حجم', 'the', 'for', 'with', 'and', 'of', 'by', 'new', 'pack',
  'from', 'with', 'size', 'pack',
]);

export function normalizeAr(s: string): string {
  return String(s || '')
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}\s%+.×x]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeEn(s: string): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export function tokenize(s: string): string[] {
  return normalizeAr(s)
    .split(' ')
    .map(t => t.replace(/^ال/, ''))
    .filter(t => t.length >= 2 && !STOPWORDS.has(t) && !/^\d+$/.test(t));
}

export function tokenizeEn(s: string): string[] {
  return normalizeEn(s)
    .split(/\s+/)
    .filter(t => t.length >= 2);
}

export function jaccard(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let inter = 0;
  for (const t of setA) if (setB.has(t)) inter++;
  return inter / (setA.size + setB.size - inter);
}

export function containment(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const setB = new Set(b);
  let matched = 0;
  for (const t of a) if (setB.has(t)) matched++;
  return matched / a.length;
}
