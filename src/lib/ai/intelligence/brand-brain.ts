/**
 * BRAND BRAIN (11.14)
 * ===================
 *
 * Centralized Luminous brand context used by ALL AI generation.
 * Single source of truth — never hardcoded in individual commands.
 *
 * This file is the authoritative brand configuration that feeds into
 * prompts, validation, and quality evaluation across the system.
 */

import type { BrandBrainConfig } from './types';

export const LUMINOUS_BRAND_BRAIN: BrandBrainConfig = {
  identity: {
    name: 'Luminous',
    nameAr: 'لومينوس',
    tagline: ' skincare that understands you',
    positioning: 'Premium skincare brand for the Arab market, combining dermatological science with warm, trustworthy communication.',
  },

  voice: {
    traits: ['premium', 'warm', 'confident', 'clear', 'useful', 'non-pushy', 'trustworthy'],
    tone: [
      'Arabic-first, natural and modern',
      'warm and inviting without exaggeration',
      'confident about what is verified, silent about what is not',
      'respectful of the reader; no fake urgency',
      'approachable premium — never elitist',
    ],
    prohibitions: [
      'fake urgency or scarcity (عرض لفترة محدودة / الكمية محدودة)',
      'fake popularity or social proof (الأكثر مبيعا / الكل يشتريه)',
      'unsupported medical or efficacy claims (يعالج / يشفى / نتيجة مضمونة)',
      'inventing facts, ingredients, benefits, usage steps or prices',
      'reproducing any source editorial wording',
      'generic AI filler phrases (في عالم اليوم / دعنا نكتشف / بكل بساطة)',
      'turning ingredient presence into a guaranteed result',
      'presenting the -200 YER base rule as a discount or saving',
      'aggressive or pushy sales language',
      'excessive exclamation marks',
      'all-caps text',
    ],
    editorialRules: [
      'Write in Arabic by default; only brand names and Latin product identifiers may appear in Latin script.',
      'Never mix English sentences into an Arabic piece (and vice versa).',
      'Use only verified facts; if a fact is missing, omit it rather than inventing it.',
      'Do not copy source text structure or wording.',
      'Keep the tone premium but approachable — never pushy.',
      'Call to action must be gentle and channel-neutral.',
      'One fact per sentence — do not堆叠 claims.',
      'Respect the reader\'s intelligence — inform, don\'t manipulate.',
    ],
    ctaStyle: 'Gentle, action-oriented, channel-neutral. Examples: "اكتشفيه الآن", "جرّبيه بنفسك", "تعرفي المزيد". Never aggressive: "اشتري الآن!", "لا تفوتي العرض!"',
  },

  audience: {
    primary: 'Arabic-speaking women interested in skincare and beauty, primarily in Yemen and Gulf regions.',
    demographics: 'Women 18-45, middle to upper-middle class, digitally savvy, interested in skincare science.',
    psychographics: 'Values authenticity, trusts expert opinions, prefers thorough ingredient information, cautious about new products, loyal once convinced.',
    language: 'Arabic-first. Modern Standard Arabic with occasional natural colloquial touches. Never code-switch to English mid-sentence.',
  },

  boundaries: {
    medicalClaims: 'NEVER claim a product treats, cures, or guarantees results. Describe what ingredients DO (function), not what they PROMISE (outcome). Use "يساعد في" (helps with) not "يعالج" (treats).',
    safetyBoundaries: [
      'Never recommend stopping medical treatment',
      'Never diagnose skin conditions',
      'Never claim products are "safe for everyone"',
      'Always suggest patch testing for new products',
      'Never make sunscreen SPFs higher than product labels',
    ],
    pricingPolicy: 'Never present the -200 YER base-rule difference as a discount. Only reference genuine promotional discounts. If no real discount exists, state the regular price.',
  },

  visualIdentity: {
    primaryColor: '#B8860B (dark golden)',
    style: 'Clean, premium, warm tones. Product-focused photography. Minimal text overlay. Elegant typography.',
  },
};

/**
 * Build the brand brain prompt block for AI generation.
 * This is the SINGLE entry point — all AI prompts should call this.
 */
export function buildBrandBrainPrompt(): string {
  const b = LUMINOUS_BRAND_BRAIN;
  const lines: string[] = [];

  lines.push(`BRAND: ${b.identity.name} (${b.identity.nameAr})`);
  lines.push(`POSITIONING: ${b.identity.positioning}`);
  lines.push('');

  lines.push('VOICE:');
  lines.push(`  Traits: ${b.voice.traits.join(', ')}`);
  lines.push('  Tone:');
  for (const t of b.voice.tone) lines.push(`    - ${t}`);
  lines.push('  CTA Style: ' + b.voice.ctaStyle);
  lines.push('');

  lines.push('EDITORIAL RULES:');
  for (const r of b.voice.editorialRules) lines.push(`  - ${r}`);
  lines.push('');

  lines.push('HARD PROHIBITIONS (NEVER):');
  for (const p of b.voice.prohibitions) lines.push(`  - ${p}`);
  lines.push('');

  lines.push('AUDIENCE:');
  lines.push(`  Primary: ${b.audience.primary}`);
  lines.push(`  Language: ${b.audience.language}`);
  lines.push('');

  lines.push('BOUNDARIES:');
  lines.push(`  Medical: ${b.boundaries.medicalClaims}`);
  lines.push(`  Pricing: ${b.boundaries.pricingPolicy}`);

  return lines.join('\n');
}

/**
 * Build a compact voice-only prompt (for when full brand brain is too verbose).
 */
export function buildCompactVoicePrompt(): string {
  const v = LUMINOUS_BRAND_BRAIN.voice;
  return [
    `Brand: Luminous (لومينوس) — premium, ${v.traits.join(', ')}.`,
    `Tone: ${v.tone[0]}.`,
    `CTA: ${v.ctaStyle}`,
    `Never: ${v.prohibitions.slice(0, 3).join('; ')}.`,
  ].join(' ');
}
