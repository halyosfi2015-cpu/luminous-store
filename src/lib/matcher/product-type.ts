import { normalizeAr } from './normalize';

const TYPE_KEYWORDS: Record<string, string[]> = {
  cleanser: ['غسول', 'غسال', 'منظف', 'cleanser', 'face wash', 'cleans', 'فوم'],
  cream: ['كريم', 'cream'],
  serum: ['سيروم', 'serum', 'امبول'],
  moisturizer: ['مرطب', 'ترطيب', 'moisturiz', 'لوشن', 'lotion', 'هيدرا'],
  shampoo: ['شامبو', 'shampoo'],
  sunscreen: ['واقي شمس', 'شمس', 'sunscreen', 'spf', 'sun protect', 'حمايه من الشمس', 'سن سكرين'],
  deodorant: ['مزيل عرق', 'deodorant', 'antiperspirant', 'ديودورانت', 'رول اون'],
  fragrance: ['عطر', 'perfume', 'eau de', 'cologne', 'oud', 'عود', 'مسك', 'بخور', 'بارفان', 'او دي بارفان', 'او دي تواليت'],
  lipstick: ['حمرة', 'احمر شفاه', 'lipstick', 'gloss', 'قلم شفاه', 'كلوز'],
  mascara: ['ماسكرا', 'mascara', 'رموش'],
  foundation: ['فاونديشن', 'foundation', 'makeup base'],
  powder: ['بودرة', 'powder', 'بودره'],
  eyeshadow: ['ظلال', 'eyeshadow', 'كحل', 'eyeliner'],
  body_lotion: ['لوشن للجسم', 'body lotion', 'لوشن الجسم'],
  soap: ['صابون', 'soap'],
  scrub: ['مقشر', 'scrub', 'تقشير', 'peeling', 'سكرب'],
  mask: ['ماسك', 'mask', 'قناع'],
  oil: ['زيت', 'oil'],
  toothpaste: ['معجون اسنان', 'معجون', 'toothpaste'],
  mouthwash: ['غسول فم', 'mouthwash', 'غسول الفم'],
  supplement: ['مكمل', 'supplement', 'فيتامين', 'vitamin', 'حبوب', 'كبسول', 'قرص'],
  baby: ['اطفال', 'طفل', 'baby', 'infant', 'رضاع', 'حليب اطفال', 'رضاعه', 'حفاض'],
  hair: ['شعر', 'hair', 'بلسم'],
  hand: ['يدين', 'hand', 'كريم يد', 'كريم يدين'],
  foot: ['قدم', 'foot', 'كريمقدمين'],
  eye_cream: ['كريم عيون', 'eye cream'],
  gel: ['جل', 'gel'],
  spray: ['سبراي', 'بخاخ', 'spray'],
  wipes: ['مناديل', 'وايبس', 'wipes'],
  razor: ['شفره', 'شفرات', 'ماكينه حلاقه', 'موس', 'razor'],
};

const RELATED_TYPES: Record<string, string[]> = {
  cleanser: ['scrub', 'mask'],
  cream: ['moisturizer', 'body_lotion', 'hand', 'foot', 'eye_cream'],
  moisturizer: ['cream', 'body_lotion'],
  serum: ['oil', 'cream'],
  shampoo: ['hair'],
  sunscreen: ['cream', 'moisturizer'],
  deodorant: [],
  fragrance: [],
  lipstick: ['powder', 'foundation'],
  mascara: ['eyeshadow'],
  foundation: ['powder'],
  body_lotion: ['cream', 'moisturizer', 'oil'],
  soap: ['cleanser'],
  supplement: [],
  baby: [],
  toothpaste: ['mouthwash'],
  mouthwash: ['toothpaste'],
  eye_cream: ['cream', 'serum'],
  oil: ['serum', 'moisturizer'],
  gel: ['moisturizer', 'cream'],
  spray: [],
  wipes: [],
  razor: [],
};

export function detectTypes(text: string): string[] {
  const n = normalizeAr(text);
  const types: string[] = [];
  for (const [type, keywords] of Object.entries(TYPE_KEYWORDS)) {
    for (const kw of keywords) {
      if (n.includes(normalizeAr(kw))) {
        types.push(type);
        break;
      }
    }
  }
  return types;
}

export function typeMatch(a: string[], b: string[]): 'exact' | 'related' | 'none' {
  if (!a.length || !b.length) return 'none';
  for (const ta of a) {
    for (const tb of b) {
      if (ta === tb) return 'exact';
      if (RELATED_TYPES[ta]?.includes(tb)) return 'related';
      if (RELATED_TYPES[tb]?.includes(ta)) return 'related';
    }
  }
  return 'none';
}

export function variantConflict(a: string[], b: string[]): boolean {
  if (!a.length || !b.length) return false;
  const INCOMPATIBLE: [string, string][] = [
    ['cream', 'cleanser'],
    ['cream', 'toner'],
    ['serum', 'cleanser'],
    ['moisturizer', 'cleanser'],
    ['shampoo', 'cream'],
    ['fragrance', 'cream'],
    ['fragrance', 'moisturizer'],
    ['deodorant', 'cream'],
    ['supplement', 'cream'],
    ['supplement', 'serum'],
    ['baby', 'cream'],
    ['toothpaste', 'cream'],
  ];
  for (const ta of a) {
    for (const tb of b) {
      for (const [x, y] of INCOMPATIBLE) {
        if ((ta === x && tb === y) || (ta === y && tb === x)) return true;
      }
    }
  }
  return false;
}
