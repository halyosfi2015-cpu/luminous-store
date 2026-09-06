import { tokenize, jaccard, containment, normalizeAr } from './normalize';
import { resolveBrandMatch, extractBrandFromText } from './brand-resolver';
import { detectTypes, typeMatch, variantConflict as checkVariantConflict } from './product-type';
import { extractSizes, sizeMatch } from './size-extract';
import { computeScore } from './scoring';
import type { MatchRecord, ProductIdentity, SizeValue } from './types';

interface LuminousProduct {
  id: string;
  brand?: string;
  brandAr?: string;
  name?: { ar?: string; en?: string };
  categorySlug?: string;
  category?: string;
  sku?: string;
}

interface OutletProduct {
  url: string;
  nameAr: string;
  brand?: string;
  description?: string;
  benefits?: string | string[];
  usage?: string;
}

function decomposeLuminous(p: LuminousProduct): ProductIdentity {
  const nameAr = p.name?.ar ?? '';
  const brand = p.brand ?? extractBrandFromText(nameAr);
  const types = detectTypes(nameAr + ' ' + (p.categorySlug ?? '') + ' ' + (p.category ?? ''));
  const size = extractSizes(nameAr + ' ' + (p.sku ?? ''));
  const brandTokens = brand ? tokenize(brand) : [];
  const sizeTokens: string[] = [];
  for (const s of size) sizeTokens.push(String(s.value), s.unit);
  const allTokens = tokenize(nameAr);
  const tokens = allTokens.filter(t => !brandTokens.includes(t) && !sizeTokens.includes(t) && !types.some(ty => normalizeAr(ty) === t));
  return { brand, productLine: tokens.join(' '), productType: types, variant: null, size, tokens };
}

function decomposeOutlet(p: OutletProduct): ProductIdentity {
  const nameAr = p.nameAr ?? '';
  const brand = extractBrandFromText(nameAr);
  const types = detectTypes(nameAr + ' ' + (p.description ?? ''));
  const size = extractSizes(nameAr + ' ' + (p.description ?? ''));
  const brandTokens = brand ? tokenize(brand) : [];
  const sizeTokens: string[] = [];
  for (const s of size) sizeTokens.push(String(s.value), s.unit);
  const allTokens = tokenize(nameAr);
  const tokens = allTokens.filter(t => !brandTokens.includes(t) && !sizeTokens.includes(t) && !types.some(ty => normalizeAr(ty) === t));
  return { brand, productLine: tokens.join(' '), productType: types, variant: null, size, tokens };
}

function nameSimilarityScore(aTokens: string[], bTokens: string[]): number {
  const jac = jaccard(aTokens, bTokens);
  const cont = containment(aTokens, bTokens);
  return Math.max(jac, cont);
}

function productLineScore(lineA: string | null, lineB: string | null): number {
  if (!lineA || !lineB) return 0;
  const tA = tokenize(lineA);
  const tB = tokenize(lineB);
  if (!tA.length || !tB.length) return 0;
  const jac = jaccard(tA, tB);
  const cont = containment(tA, tB);
  const best = Math.max(jac, cont);
  if (best >= 0.7) return 2;
  if (best >= 0.4) return 1;
  return 0;
}

export function matchProducts(
  luminous: LuminousProduct[],
  outlet: OutletProduct[],
): MatchRecord[] {
  const candidates: (MatchRecord & { _score: number })[] = [];

  for (const lum of luminous) {
    const lumId = lum.id;
    const lumIdentity = decomposeLuminous(lum);

    // Find candidates by brand
    const lumBrand = lumIdentity.brand;
    const outletIndices: number[] = [];
    if (lumBrand) {
      for (let i = 0; i < outlet.length; i++) {
        const oBrand = extractBrandFromText(outlet[i].nameAr);
        if (oBrand && oBrand === lumBrand) outletIndices.push(i);
      }
    }
    // Also try brand from text
    if (!outletIndices.length && lumBrand) {
      const lumBrandNorm = normalizeAr(lum.brandAr ?? lum.brand ?? '');
      if (lumBrandNorm.length >= 3) {
        for (let i = 0; i < outlet.length; i++) {
          const oNorm = normalizeAr(outlet[i].nameAr);
          if (oNorm.startsWith(lumBrandNorm) || oNorm.includes(' ' + lumBrandNorm + ' ')) {
            outletIndices.push(i);
          }
        }
      }
    }

    let bestRecord: (MatchRecord & { _score: number }) | null = null;

    for (const oi of outletIndices) {
      const op = outlet[oi];
      const oIdentity = decomposeOutlet(op);

      // Brand match
      const brandResult = resolveBrandMatch(lum.brand ?? '', op.brand ?? extractBrandFromText(op.nameAr) ?? '');

      // Name similarity
      const nameSim = nameSimilarityScore(lumIdentity.tokens, oIdentity.tokens);

      // Product type
      const tm = typeMatch(lumIdentity.productType, oIdentity.productType);
      const typeScore = tm === 'exact' ? 2 : tm === 'related' ? 1 : 0;

      // Size match
      const sm = sizeMatch(lumIdentity.size, oIdentity.size);

      // Product line
      const plScore = productLineScore(lumIdentity.productLine, oIdentity.productLine);

      // Variant conflict
      const vConflict = checkVariantConflict(lumIdentity.productType, oIdentity.productType);

      const scoreResult = computeScore({
        brandMatch: brandResult.score,
        nameSimilarity: nameSim,
        productTypeScore: typeScore,
        sizeMatchResult: sm,
        productLineScore: plScore,
        imageMatch: null,
        variantConflict: vConflict,
      });

      if (scoreResult.decision !== 'REJECT') {
        const record: MatchRecord & { _score: number } = {
          luminous_id: lumId,
          outlet_reference: op.url,
          outlet_nameAr: op.nameAr,
          brandMatch: brandResult.score,
          nameSimilarity: Math.round(nameSim * 100) / 100,
          productLineMatch: plScore > 0 ? plScore / 2 : null,
          variantMatch: !vConflict && typeScore === 2,
          variantConflict: vConflict,
          sizeMatch: sm,
          imageMatch: null,
          decision: scoreResult.decision,
          confidence: scoreResult.confidence,
          reason: scoreResult.reason,
          signals: {
            jaccard: Math.round(jaccard(lumIdentity.tokens, oIdentity.tokens) * 100) / 100,
            containment: Math.round(containment(lumIdentity.tokens, oIdentity.tokens) * 100) / 100,
            composite_score: scoreResult.baseScore,
            brand_token: brandResult.canonicalA ?? 'unknown',
            type_luminous: lumIdentity.productType,
            type_outlet: oIdentity.productType,
            size_luminous: lumIdentity.size,
            size_outlet: oIdentity.size,
          },
          _score: scoreResult.baseScore,
        };

        if (!bestRecord || record._score > bestRecord._score) {
          bestRecord = record;
        }
      }
    }

    if (bestRecord) candidates.push(bestRecord);
  }

  // Greedy 1:1 dedup
  candidates.sort((a, b) => b._score - a._score);
  const matchedL = new Set<string>();
  const matchedO = new Set<string>();
  const results: MatchRecord[] = [];
  for (const c of candidates) {
    if (matchedL.has(c.luminous_id) || matchedO.has(c.outlet_reference)) continue;
    matchedL.add(c.luminous_id);
    matchedO.add(c.outlet_reference);
    const { _score, ...record } = c;
    results.push(record);
  }
  return results;
}
