/**
 * Seed SQL Generator — Phase 6.3
 * Reads all src/data/*.ts files and generates db/seed.sql
 * Run: npx tsx db/generate-seed.ts
 */
import { createHash } from 'crypto';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { categories } from '@/src/data/categories';
import { categories as subCategories, products } from '@/src/data/products';
import { brands } from '@/src/data/brands';
import { experts } from '@/src/data/experts';
import { articles } from '@/src/data/articles';
import { bundles } from '@/src/data/bundles';
import { DEFAULT_GOVERNORATES } from '@/src/data/shipping';
import { testimonials } from '@/src/data/testimonials';
import { faqs } from '@/src/data/faqs';
import { reviewsByProductId } from '@/src/data/reviews';
import { routines } from '@/src/data/product-summaries';
import { DEFAULT_GIFT_OPTIONS } from '@/src/data/bundles-admin';
import { siteConfig } from '@/src/data/siteConfig';

function slugToUUID(slug: string): string {
  const h = createHash('md5').update(`luminous:${slug}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function esc(text: unknown): string {
  if (text === null || text === undefined) return 'NULL';
  const s = String(text).replace(/'/g, "''");
  return `'${s}'`;
}

function jsonb(obj: unknown): string {
  if (obj === null || obj === undefined) return "'{}'::jsonb";
  const s = JSON.stringify(obj).replace(/'/g, "''");
  return `'${s}'::jsonb`;
}

type InsertRow = { table: string; data: Record<string, unknown> };

const allLines: string[] = [];

function emitHeader() {
  allLines.push(
    `-- ============================================================================
-- Luminous Derma — Seed Data
-- Auto-generated from src/data/*.ts — ${new Date().toISOString().split('T')[0]}
-- Run AFTER db/schema.sql
-- ============================================================================

BEGIN;
`
  );
}

function emitInsert(row: InsertRow) {
  const cols = Object.keys(row.data).filter((k) => k !== 'id');
  const vals = cols.map((c) => {
    const v = row.data[c];
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    if (typeof v === 'number') return String(v);
    if (typeof v === 'string') return esc(v);
    if (typeof v === 'object') return jsonb(v);
    return esc(v);
  });
  allLines.push(
    `INSERT INTO ${row.table} (id, ${cols.join(', ')}) VALUES (${esc(row.data.id)}, ${vals.join(', ')});`
  );
}

function emitFooter() {
  allLines.push('\nCOMMIT;');
}

// ─── MAIN ────────────────────────────────────────────────────────────────

emitHeader();

// 1. Categories (top-level, 7)
for (const cat of categories) {
  emitInsert({
    table: 'categories',
    data: {
      id: slugToUUID(cat.slug),
      slug: cat.slug,
      name: cat.name,
      description: cat.description,
      icon: cat.icon,
      cover_image: cat.coverImage,
      sort_order: 0,
    },
  });
}

// 2. Subcategories (43 CategoryInfo entries from products.ts)
for (let i = 0; i < subCategories.length; i++) {
  const sc = subCategories[i];
  const parentSlug = resolveParentCategory(sc.slug);
  emitInsert({
    table: 'categories',
    data: {
      id: slugToUUID(`sub:${sc.slug}`),
      slug: sc.slug,
      name: { ar: sc.nameAr, en: sc.name },
      description: { ar: sc.descriptionAr, en: sc.description },
      icon: sc.icon,
      cover_image: sc.coverImage || sc.image,
      parent_category_id: parentSlug ? slugToUUID(parentSlug) : null,
      product_count: sc.productCount || 0,
      sort_order: i + 1,
    },
  });
}

function resolveParentCategory(subSlug: string): string | null {
  if (
    [
      'cleansers', 'toners', 'serums', 'moisturizers', 'sunscreen',
      'eye-care', 'lip-care', 'masks', 'exfoliators',
    ].includes(subSlug)
  )
    return 'skincare';
  if (['shampoo', 'conditioner', 'hair-oils'].includes(subSlug)) return 'haircare';
  if (['body-wash', 'body-lotion', 'body-oils'].includes(subSlug)) return 'bodycare';
  if (['face-makeup', 'eye-makeup', 'lip-makeup'].includes(subSlug)) return 'makeup';
  if (['perfume-women', 'perfume-men', 'perfume-musk', 'perfume-gift-sets'].includes(subSlug))
    return 'perfume';
  if (
    [
      'bakhoor-premium', 'bakhoor-oud', 'bakhoor-dehn', 'bakhoor-burners',
      'bakhoor-charcoal', 'bakhoor-home', 'bakhoor-occasions', 'bakhoor-brides',
      'bakhoor-oils', 'bakhoor-gift-sets',
    ].includes(subSlug)
  )
    return 'perfume';
  if (['baby-care'].includes(subSlug)) return 'baby';
  if (
    [
      'vitamins', 'collagen', 'immunity', 'hair-nails',
      'kids-supplements', 'women-health',
    ].includes(subSlug)
  )
    return 'supplements';
  if (['appliances-hair', 'appliances-shaving', 'appliances-teeth', 'tools'].includes(subSlug))
    return 'tools';
  return null;
}

// 3. Brands (109)
for (const brand of brands) {
  emitInsert({
    table: 'brands',
    data: {
      id: slugToUUID(`brand:${brand.slug}`),
      slug: brand.slug,
      name: brand.name,
      name_ar: brand.nameAr,
      logo: brand.logo,
      cover_image: brand.coverImage,
      description: brand.description,
      description_ar: brand.descriptionAr,
      origin: brand.origin,
      origin_ar: brand.originAr,
      is_verified: brand.isVerified,
      featured: brand.featured,
      product_count: brand.productCount,
      seo_metadata: brand.seoMetadata,
    },
  });
}

// Fallback unknown brand for products with unmatched brand names
emitInsert({
  table: 'brands',
  data: {
    id: slugToUUID('brand:unknown'),
    slug: 'unknown',
    name: { ar: 'غير معروف', en: 'Unknown' },
    description: { ar: 'علامة تجارية غير محددة', en: 'Unidentified brand' },
    is_verified: false,
    featured: false,
    product_count: 0,
    seo_metadata: { title: { ar: 'غير معروف', en: 'Unknown' }, description: { ar: 'منتج غير مصنف', en: 'Unclassified product' }, keywords: [] },
  },
});

// 4. Products
function normalizeForMatch(s: string): string {
  if (typeof s !== 'string') return '';
  return s
    .toLowerCase()
    .replace(/[''']/g, '')
    .replace(/\./g, '')
    .replace(/[éèêë]/g, 'e')
    .replace(/[àâä]/g, 'a')
    .replace(/&/g, 'and')
    .replace(/\u200e/g, '')
    .replace(/\u200f/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/[^a-z0-9\u0600-\u06FF-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const brandSlugToUUID = new Map<string, string>();
const brandNameToUUID = new Map<string, string>();
for (const b of brands) {
  const uid = slugToUUID(`brand:${b.slug}`);
  brandSlugToUUID.set(b.slug, uid);
  const brandNameStr = typeof b.name === 'string' ? b.name : (b.nameEn || b.nameAr || '');
  brandNameToUUID.set(normalizeForMatch(brandNameStr), uid);
}

function matchBrand(prodBrand: string): string | null {
  if (!prodBrand) return null;
  const slugAttempt = prodBrand.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\u0600-\u06FF-]/g, '');
  if (brandSlugToUUID.has(slugAttempt)) return brandSlugToUUID.get(slugAttempt)!;
  const normAttempt = normalizeForMatch(prodBrand);
  if (brandNameToUUID.has(normAttempt)) return brandNameToUUID.get(normAttempt)!;
  return null;
}

  const unmatchedBrands = new Set<string>();

for (const prod of products) {
  const brandUUID = matchBrand(prod.brand || '');
  if (!brandUUID) {
    unmatchedBrands.add(prod.brand || 'UNKNOWN');
  }
  const catSlug = prod.categorySlug || prod.category?.toLowerCase()?.replace(/\s+/g, '-') || '';
  const catUUID = slugToUUID(`sub:${catSlug}`);
  emitInsert({
    table: 'products',
    data: {
      id: slugToUUID(`prod:${prod.id}`),
      legacy_id: prod.id,
      slug: prod.slug,
      sku: prod.sku,
      name: prod.name,
      description: prod.description,
      category_id: catUUID,
      brand_id: brandUUID || slugToUUID('brand:unknown'),
      pricing: prod.pricing,
      discount: prod.discount || 0,
      gallery: prod.gallery || [],
      images: prod.images || prod.gallery || [],
      ingredients: prod.ingredients || { ar: [], en: [] },
      usage_instructions: prod.usageInstructions || { ar: '', en: '' },
      how_to_use: prod.howToUse || [],
      how_to_use_ar: prod.howToUseAr || [],
      skin_types: prod.skinTypes || [],
      suitable_for: prod.suitableFor || [],
      skin_concerns: prod.skinConcerns || [],
      benefits: prod.benefits || { ar: [], en: [] },
      stock: prod.stock || prod.stockQuantity || 0,
      in_stock: prod.inStock !== false,
      stock_quantity: prod.stockQuantity || prod.stock || 0,
      rating: prod.rating || 0,
      review_count: prod.reviewCount || 0,
      is_featured: prod.featured || prod.isFeatured || false,
      is_new: prod.new || prod.isNew || false,
      is_best_seller: prod.isBestSeller || false,
      is_doctor_recommended: prod.isDoctorRecommended || false,
      tags: prod.tags || [],
      seo_metadata: prod.seoMetadata || {},
    },
  });
}

// 5. Reviews
let reviewCount = 0;
for (const [productId, reviewList] of Object.entries(reviewsByProductId)) {
  for (const review of reviewList) {
    emitInsert({
      table: 'reviews',
      data: {
        id: slugToUUID(`review:${review.id}`),
        product_id: slugToUUID(`prod:${productId}`),
        customer_name: review.customerName,
        customer_name_ar: review.customerNameAr || null,
        avatar: review.avatar || null,
        rating: review.rating,
        comment: review.comment,
        comment_ar: review.commentAr || null,
        review_date: review.date,
        is_verified: review.isVerified || false,
        helpful_count: review.helpfulCount || 0,
      },
    });
    reviewCount++;
  }
}

// 6. Routines
for (const routine of routines) {
  emitInsert({
    table: 'routines',
    data: {
      id: slugToUUID(`routine:${routine.id}`),
      slug: routine.id,
      name: routine.name,
      name_ar: routine.nameAr,
      description: routine.description,
      description_ar: routine.descriptionAr,
      routine_type: routine.type,
      routine_type_ar: routine.typeAr,
      routine_level: routine.level || null,
      image: routine.image || null,
      hero_image: routine.heroImage || null,
      duration: routine.duration,
      duration_en: routine.durationEn,
      for_whom: routine.forWhom,
      for_whom_en: routine.forWhomEn,
      expected_results: routine.expectedResults,
      expected_results_en: routine.expectedResultsEn,
      rating: routine.rating,
      review_count: routine.reviewCount,
      buyers_count: routine.buyersCount,
      savings_percent: routine.savingsPercent,
      display_order: routine.displayOrder,
      why_chose_it: routine.whyChoseIt,
      is_active: routine.active,
    },
  });

  // Routine products (junction)
  for (const pid of routine.products) {
    emitInsert({
      table: 'routine_products',
      data: {
        id: slugToUUID(`rt-prod:${routine.id}:${pid}`),
        routine_id: slugToUUID(`routine:${routine.id}`),
        product_id: slugToUUID(`prod:${pid}`),
      },
    });
  }

  // Routine steps
  let stepNum = 0;
  for (const step of routine.steps) {
    stepNum++;
    emitInsert({
      table: 'routine_steps',
      data: {
        id: slugToUUID(`rt-step:${routine.id}:${stepNum}`),
        routine_id: slugToUUID(`routine:${routine.id}`),
        product_id: slugToUUID(`prod:${step.productId}`),
        step_number: stepNum,
        title_ar: step.titleAr,
        title_en: step.titleEn,
        description_ar: step.descriptionAr,
        description_en: step.descriptionEn,
        time_of_day: step.time,
      },
    });
  }
}

// 7. Experts (8)
for (const exp of experts) {
  emitInsert({
    table: 'experts',
    data: {
      id: slugToUUID(`expert:${exp.slug}`),
      slug: exp.slug,
      name: exp.name,
      name_ar: exp.nameAr,
      title: exp.title,
      title_ar: exp.titleAr,
      specialty: exp.specialty,
      specialty_ar: exp.specialtyAr,
      bio: exp.bio,
      bio_ar: exp.bioAr,
      short_bio: exp.shortBio,
      short_bio_ar: exp.shortBioAr,
      profile_image: exp.profileImage,
      cover_image: exp.coverImage,
      avatar: exp.avatar,
      gender: exp.gender || 'male',
      languages: exp.languages || [],
      consultation_types: exp.consultationTypes || [],
      services: exp.services || [],
      specialties_arr: exp.specialties || [],
      specialties_ar: exp.specialtiesAr || [],
      years_of_experience: exp.yearsOfExperience || 0,
      is_verified: exp.isVerified || false,
      available_for_consultation: exp.availableForConsultation !== false,
      rating: exp.rating || 0,
      review_count: exp.reviewCount || 0,
      is_featured: exp.isFeatured || false,
      city: exp.city,
      city_ar: exp.cityAr,
      social_links: exp.socialLinks || [],
      seo_metadata: exp.seoMetadata || {},
    },
  });

  // Junction: expert_products
  for (const pid of exp.products || []) {
    emitInsert({
      table: 'expert_products',
      data: {
        id: slugToUUID(`exp-prod:${exp.slug}:${pid}`),
        expert_id: slugToUUID(`expert:${exp.slug}`),
        product_id: slugToUUID(`prod:${pid}`),
      },
    });
  }

  // Junction: expert_articles
  for (const aid of exp.articles || []) {
    emitInsert({
      table: 'expert_articles',
      data: {
        id: slugToUUID(`exp-art:${exp.slug}:${aid}`),
        expert_id: slugToUUID(`expert:${exp.slug}`),
        article_id: slugToUUID(`article:${aid}`),
      },
    });
  }
}

// 8. Articles (8)
for (const art of articles) {
  emitInsert({
    table: 'articles',
    data: {
      id: slugToUUID(`article:${art.slug}`),
      slug: art.slug,
      title: art.title,
      title_ar: art.titleAr,
      excerpt: art.excerpt,
      excerpt_ar: art.excerptAr,
      content: art.content,
      content_ar: art.contentAr,
      author: art.author,
      author_ar: art.authorAr,
      avatar: art.avatar,
      category: art.category,
      category_ar: art.categoryAr,
      cover_image: art.coverImage,
      publish_date: art.publishDate,
      read_time: art.readTime || 0,
      tags: art.tags || [],
      seo_metadata: art.seoMetadata || {},
    },
  });

  // Junction: article_products
  for (const pid of art.relatedProducts || []) {
    emitInsert({
      table: 'article_products',
      data: {
        id: slugToUUID(`art-prod:${art.slug}:${pid}`),
        article_id: slugToUUID(`article:${art.slug}`),
        product_id: slugToUUID(`prod:${pid}`),
      },
    });
  }
}

// 9. Bundles (4)
for (const bdl of bundles) {
  emitInsert({
    table: 'bundles',
    data: {
      id: slugToUUID(`bundle:${bdl.slug}`),
      slug: bdl.slug,
      name_ar: bdl.nameAr,
      name_en: bdl.nameEn,
      description_ar: bdl.descriptionAr,
      description_en: bdl.descriptionEn,
      occasions: bdl.occasion || [],
      image: bdl.image,
      badge: bdl.badge,
      badge_ar: bdl.badgeAr,
      original_price: bdl.originalPrice,
      bundle_price: bdl.bundlePrice,
      savings_percent: bdl.savingsPercent,
      gift_wrap: bdl.giftWrap,
      gift_card: bdl.giftCard,
    },
  });

  for (const pid of bdl.productIds || []) {
    emitInsert({
      table: 'bundle_products',
      data: {
        id: slugToUUID(`bdl-prod:${bdl.slug}:${pid}`),
        bundle_id: slugToUUID(`bundle:${bdl.slug}`),
        product_id: slugToUUID(`prod:${pid}`),
      },
    });
  }
}

// 10. Gift options
for (const opt of DEFAULT_GIFT_OPTIONS) {
  emitInsert({
    table: 'gift_options',
    data: {
      id: slugToUUID(`gift-opt:${opt.id}`),
      bundle_id: null,
      name: { ar: opt.labelAr, en: opt.labelEn },
      description: { ar: opt.descAr, en: opt.descEn },
      price: opt.price,
      is_active: opt.enabled,
    },
  });
}

// 11. Governorates (21)
for (const gov of DEFAULT_GOVERNORATES) {
  emitInsert({
    table: 'governorates',
    data: {
      id: slugToUUID(`gov:${gov.id}`),
      legacy_id: gov.id,
      name: gov.name,
      name_en: gov.nameEn,
      fee: gov.fee,
      is_enabled: gov.enabled,
    },
  });
}

// 12. Testimonials (~12)
for (const t of testimonials) {
  emitInsert({
    table: 'testimonials',
    data: {
      id: slugToUUID(`testimonial:${t.id}`),
      customer_name: t.name,
      customer_name_ar: t.nameAr,
      rating: t.rating,
      comment: t.text,
      comment_ar: t.textAr,
      is_verified: t.isVerified,
    },
  });
}

// 13. FAQs (~30)
for (const f of faqs) {
  emitInsert({
    table: 'faqs',
    data: {
      id: slugToUUID(`faq:${f.id}`),
      question: { ar: f.questionAr, en: f.question },
      answer: { ar: f.answerAr, en: f.answer },
      category: f.category,
    },
  });
}

// 14. Site settings
emitInsert({
  table: 'site_settings',
  data: {
    id: slugToUUID(`site-config`),
    key: 'site_config',
    value: siteConfig,
  },
});

emitFooter();

// Write to file
const outputPath = join(__dirname, 'seed.sql');
writeFileSync(outputPath, allLines.join('\n'), 'utf8');

// ─── Stats ───────────────────────────────────────────────────────────────
console.log(`Done — wrote ${allLines.length} lines to ${outputPath}`);
console.log(`Products: ${products.length} (matched: ${products.length - unmatchedBrands.size}, unmatched: ${unmatchedBrands.size})`);
if (unmatchedBrands.size > 0) {
  console.log(`  Unmatched brands: ${[...unmatchedBrands].join(', ')}`);
}
console.log(`Reviews: ${reviewCount}`);
console.log(`Routines: ${routines.length}`);
console.log(`Gift options: ${DEFAULT_GIFT_OPTIONS.length}`);
console.log(`Site settings: 1`);
