import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { categories } from '../src/data/categories';
import { categories as subCategories, products } from '../src/data/products';
import { brands } from '../src/data/brands';
import { experts } from '../src/data/experts';
import { articles } from '../src/data/articles';
import { bundles } from '../src/data/bundles';
import { DEFAULT_GOVERNORATES } from '../src/data/shipping';
import { testimonials } from '../src/data/testimonials';
import { faqs } from '../src/data/faqs';
import { reviewsByProductId } from '../src/data/reviews';
import { routines } from '../src/data/product-summaries';
import { DEFAULT_GIFT_OPTIONS } from '../src/data/bundles-admin';
import { siteConfig } from '../src/data/siteConfig';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ─── Env ──────────────────────────────────────────────────────────
const envRaw = readFileSync('.env.local', 'utf8').replace(/^\uFEFF/, '');
const env: Record<string, string> = {};
envRaw.split('\n').forEach(l => { const m = l.trim().match(/^(\w+)=(.*)$/); if (m && m[2]) env[m[1]] = m[2]; });

if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// ─── UUID ────────────────────────────────────────────────────────
function slugToUUID(slug: string): string {
  const h = createHash('md5').update('luminous:' + slug).digest('hex');
  return h.slice(0, 8) + '-' + h.slice(8, 12) + '-5' + h.slice(13, 16) + '-8' + h.slice(17, 20) + '-' + h.slice(20, 32);
}

// ─── Normalize ───────────────────────────────────────────────────
function normalizeForMatch(s: string): string {
  return s.toLowerCase().replace(/[''']/g, '').replace(/\./g, '').replace(/[éèêë]/g, 'e').replace(/[àâä]/g, 'a').replace(/&/g, 'and').replace(/\u200e/g, '').replace(/\u200f/g, '').replace(/[\s-]+/g, '-').replace(/[^a-z0-9\u0600-\u06FF-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

// ─── Helpers ─────────────────────────────────────────────────────
async function insertBatch(table: string, rows: Record<string, unknown>[]) {
  for (let i = 0; i < rows.length; i += 30) {
    const chunk = rows.slice(i, i + 30);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) {
      // Try one by one
      let ok = 0;
      for (const row of chunk) {
        const { error: e2 } = await supabase.from(table).insert(row);
        if (e2) {
          console.error(`  FAIL ${table}: ${e2.message.substring(0, 120)}`);
        } else {
          ok++;
        }
      }
      return ok;
    }
  }
  return rows.length;
}

// ─── Brand Maps ──────────────────────────────────────────────────
const brandSlugToUUID = new Map<string, string>();
const brandNameToUUID = new Map<string, string>();
for (const b of brands) {
  const uid = slugToUUID('brand:' + b.slug);
  brandSlugToUUID.set(b.slug, uid);
  brandNameToUUID.set(normalizeForMatch(b.name), uid);
}

function matchBrand(prodBrand: string): string | null {
  if (!prodBrand) return null;
  const sa = prodBrand.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\u0600-\u06FF-]/g, '');
  if (brandSlugToUUID.has(sa)) return brandSlugToUUID.get(sa)!;
  const nm = normalizeForMatch(prodBrand);
  if (brandNameToUUID.has(nm)) return brandNameToUUID.get(nm)!;
  return null;
}

function resolveParent(subSlug: string): string | null {
  const s = ['cleansers','toners','serums','moisturizers','sunscreen','eye-care','lip-care','masks','exfoliators'];
  const h = ['shampoo','conditioner','hair-oils'];
  const b = ['body-wash','body-lotion','body-oils'];
  const m = ['face-makeup','eye-makeup','lip-makeup'];
  const p = ['perfume-women','perfume-men','perfume-musk','perfume-gift-sets',
    'bakhoor-premium','bakhoor-oud','bakhoor-dehn','bakhoor-burners','bakhoor-charcoal',
    'bakhoor-home','bakhoor-occasions','bakhoor-brides','bakhoor-oils','bakhoor-gift-sets'];
  const sup = ['vitamins','collagen','immunity','hair-nails','kids-supplements','women-health'];
  const t = ['appliances-hair','appliances-shaving','appliances-teeth','tools'];
  if (s.includes(subSlug)) return 'skincare';
  if (h.includes(subSlug)) return 'haircare';
  if (b.includes(subSlug)) return 'bodycare';
  if (m.includes(subSlug)) return 'makeup';
  if (p.includes(subSlug)) return 'perfume';
  if (subSlug === 'baby-care') return 'baby';
  if (sup.includes(subSlug)) return 'supplements';
  if (t.includes(subSlug)) return 'tools';
  return null;
}

// ─── MAIN ────────────────────────────────────────────────────────
async function main() {
  const start = Date.now();
  console.log('Seeding Luminous Derma to Supabase...\n');

  // Cleanup first
  const cleanupOrder = ['routine_steps','routine_products','bundle_products','article_products',
    'expert_articles','expert_products','reviews','products','routines','bundles','articles',
    'experts','categories','brands','governorates','faqs','testimonials','gift_options','site_settings'];
  console.log('Cleaning...');
  for (const t of cleanupOrder) {
    const { count } = await supabase.from(t).select('*', { count: 'exact', head: true });
    if (count && count > 0) {
      const { error } = await supabase.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (!error) console.log('  ' + t + ': ' + count + ' rows removed');
    }
  }
  console.log('');

  // 1. Categories (top-level - 7 + supplements = 8)
  const topCatsList = [...categories];
  // Add supplements as it's needed as parent but not in the 7 top-level
  topCatsList.push({
    slug: 'supplements',
    name: { ar: 'المكملات الغذائية', en: 'Dietary Supplements' },
    description: { ar: 'مكملات غذائية للصحة والجمال', en: 'Nutritional supplements for health and beauty' },
    icon: 'pill', coverImage: null, sort_order: 7,
  });
  const topRows = topCatsList.map((c: any) => ({
    id: slugToUUID(c.slug), slug: c.slug, name: c.name, description: c.description,
    icon: c.icon, cover_image: c.coverImage || null, sort_order: c.sort_order || 0,
  }));
  for (const r of topRows) {
    await supabase.from('categories').insert(r);
  }
  console.log('1. Categories (top): ' + topRows.length);

  // 2. Subcategories (43)
  const subRows = subCategories.map((sc: any, i: number) => {
    const parentSlug = resolveParent(sc.slug);
    // Handle slug conflicts: if subcategory slug matches a top-level, append '-sub'
    let slug = sc.slug;
    if (categories.some((c: any) => c.slug === slug)) slug = sc.slug + '-sub';
    return {
      id: slugToUUID('sub:' + sc.slug), slug: slug,
      name: { ar: sc.nameAr, en: sc.name },
      description: { ar: sc.descriptionAr, en: sc.description },
      icon: sc.icon, cover_image: sc.coverImage || sc.image || null,
      parent_category_id: parentSlug ? slugToUUID(parentSlug) : null,
      product_count: sc.productCount || 0, sort_order: i + 1,
    };
  });
  for (const r of subRows) {
    await supabase.from('categories').insert(r);
  }
  console.log('2. Subcategories: ' + subRows.length);

  // 3. Brands
  const brandRows = brands.map((b: any) => ({
    id: slugToUUID('brand:' + b.slug), slug: b.slug, name: b.name, name_ar: b.nameAr,
    logo: b.logo, cover_image: b.coverImage, description: b.description,
    description_ar: b.descriptionAr, origin: b.origin, origin_ar: b.originAr,
    is_verified: b.isVerified || false, featured: b.featured || false,
    product_count: b.productCount || 0, seo_metadata: b.seoMetadata || {},
  }));
  await insertBatch('brands', brandRows);
  console.log('3. Brands: ' + brandRows.length);

  // 4. Products
  const unmatchedBrands = new Set<string>();
  const prodRows = products.map((p: any) => {
    const bid = matchBrand(p.brand);
    if (!bid) unmatchedBrands.add(p.brand);
    const cs = p.categorySlug || (p.category || '').toLowerCase().replace(/\s+/g, '-');
    return {
      id: slugToUUID('prod:' + p.id), legacy_id: p.id, slug: p.slug, sku: p.sku || null,
      name: p.name, description: p.description || {},
      category_id: slugToUUID('sub:' + cs),
      brand_id: bid || slugToUUID('brand:unknown'),
      pricing: p.pricing, discount: p.discount || 0,
      gallery: p.gallery || [], images: p.images || p.gallery || [],
      ingredients: p.ingredients || { ar: [], en: [] },
      usage_instructions: p.usageInstructions || { ar: '', en: '' },
      how_to_use: p.howToUse || [], how_to_use_ar: p.howToUseAr || [],
      skin_types: p.skinTypes || [], suitable_for: p.suitableFor || [],
      skin_concerns: p.skinConcerns || [], benefits: p.benefits || { ar: [], en: [] },
      stock: p.stock || p.stockQuantity || 0, in_stock: p.inStock !== false,
      stock_quantity: p.stockQuantity || p.stock || 0,
      rating: p.rating || 0, review_count: p.reviewCount || 0,
      is_featured: p.featured || p.isFeatured || false,
      is_new: p.new || p.isNew || false,
      is_best_seller: p.isBestSeller || false,
      is_doctor_recommended: p.isDoctorRecommended || false,
      tags: p.tags || [], seo_metadata: p.seoMetadata || {},
    };
  });
  if (unmatchedBrands.size > 0) console.log('  WARN: unmatched brands: ' + [...unmatchedBrands].join(', '));
  await insertBatch('products', prodRows);
  console.log('4. Products: ' + prodRows.length);

  // 5. Reviews
  const revRows: any[] = [];
  for (const [pid, reviews] of Object.entries(reviewsByProductId)) {
    for (const r of reviews as any[]) {
      revRows.push({
        id: slugToUUID('review:' + r.id), product_id: slugToUUID('prod:' + pid),
        customer_name: r.customerName, customer_name_ar: r.customerNameAr || null,
        avatar: r.avatar || null, rating: r.rating,
        comment: r.comment, comment_ar: r.commentAr || null,
        review_date: r.date, is_verified: r.isVerified || false,
        helpful_count: r.helpfulCount || 0,
      });
    }
  }
  await insertBatch('reviews', revRows);
  console.log('5. Reviews: ' + revRows.length);

  // 6. Experts
  const expRows = experts.map((e: any) => ({
    id: slugToUUID('expert:' + e.slug), slug: e.slug, name: e.name, name_ar: e.nameAr,
    title: e.title, title_ar: e.titleAr, specialty: e.specialty, specialty_ar: e.specialtyAr,
    bio: e.bio, bio_ar: e.bioAr, short_bio: e.shortBio || null, short_bio_ar: e.shortBioAr || null,
    profile_image: e.profileImage, cover_image: e.coverImage, avatar: e.avatar || null,
    gender: e.gender || 'male', languages: e.languages || [],
    consultation_types: e.consultationTypes || [], services: e.services || [],
    specialties_arr: e.specialties || [], specialties_ar: e.specialtiesAr || [],
    years_of_experience: e.yearsOfExperience || 0, is_verified: e.isVerified || false,
    available_for_consultation: e.availableForConsultation !== false,
    rating: e.rating || 0, review_count: e.reviewCount || 0,
    is_featured: e.isFeatured || false, city: e.city || null, city_ar: e.cityAr || null,
    social_links: e.socialLinks || [], seo_metadata: e.seoMetadata || {},
  }));
  await insertBatch('experts', expRows);
  console.log('6. Experts: ' + expRows.length);

  // 7. Articles
  const artRows = articles.map((a: any) => ({
    id: slugToUUID('article:' + a.slug), slug: a.slug, title: a.title, title_ar: a.titleAr,
    excerpt: a.excerpt, excerpt_ar: a.excerptAr, content: a.content, content_ar: a.contentAr,
    author: a.author, author_ar: a.authorAr || null, avatar: a.avatar || null,
    category: a.category, category_ar: a.categoryAr || null, cover_image: a.coverImage,
    publish_date: a.publishDate, read_time: a.readTime || 0,
    tags: a.tags || [], seo_metadata: a.seoMetadata || {},
  }));
  await insertBatch('articles', artRows);
  console.log('7. Articles: ' + artRows.length);

  // Junction inserts (AFTER articles are committed)
  const validProdIds = new Set(products.map((p: any) => p.id));
  const articleById = new Map(articles.map((a: any) => [a.id, a]));
  const expProd: any[] = [], expArt: any[] = [];
  for (const e of experts) {
    for (const pid of (e.products || [])) {
      if (validProdIds.has(pid)) {
        expProd.push({ expert_id: slugToUUID('expert:' + e.slug), product_id: slugToUUID('prod:' + pid) });
      }
    }
    for (const aid of (e.articles || [])) {
      const art = articleById.get(aid);
      if (art) {
        expArt.push({ expert_id: slugToUUID('expert:' + e.slug), article_id: slugToUUID('article:' + art.slug) });
      }
    }
  }
  await insertBatch('expert_products', expProd);
  await insertBatch('expert_articles', expArt);
  console.log('   expert_products: ' + expProd.length + ' | expert_articles: ' + expArt.length);

  // Article products junction
  const artProd: any[] = [];
  for (const a of articles) {
    for (const pid of (a.relatedProducts || [])) {
      if (validProdIds.has(pid)) {
        artProd.push({ article_id: slugToUUID('article:' + a.slug), product_id: slugToUUID('prod:' + pid) });
      }
    }
  }
  await insertBatch('article_products', artProd);
  console.log('   article_products: ' + artProd.length);

  // 8. Bundles
  const bdlRows = bundles.map((b: any) => ({
    id: slugToUUID('bundle:' + b.slug), slug: b.slug, name_ar: b.nameAr, name_en: b.nameEn,
    description_ar: b.descriptionAr, description_en: b.descriptionEn,
    occasions: b.occasion || [], image: b.image, badge: b.badge || null, badge_ar: b.badgeAr || null,
    original_price: b.originalPrice, bundle_price: b.bundlePrice, savings_percent: b.savingsPercent,
    gift_wrap: b.giftWrap || false, gift_card: b.giftCard || false,
  }));
  await insertBatch('bundles', bdlRows);
  console.log('8. Bundles: ' + bdlRows.length);

  const bdlProd: any[] = [];
  for (const b of bundles) {
    for (const pid of (b.productIds || [])) {
      bdlProd.push({ bundle_id: slugToUUID('bundle:' + b.slug), product_id: slugToUUID('prod:' + pid) });
    }
  }
  await insertBatch('bundle_products', bdlProd);
  console.log('   bundle_products: ' + bdlProd.length);

  // 9. Routines
  const rtRows = routines.map((r: any) => ({
    id: slugToUUID('routine:' + r.id), slug: r.id, name: r.name, name_ar: r.nameAr,
    description: r.description, description_ar: r.descriptionAr,
    routine_type: r.type, routine_type_ar: r.typeAr, routine_level: r.level || null,
    image: r.image || null, hero_image: r.heroImage || null,
    duration: r.duration, duration_en: r.durationEn,
    for_whom: r.forWhom || [], for_whom_en: r.forWhomEn || [],
    expected_results: r.expectedResults || [], expected_results_en: r.expectedResultsEn || [],
    rating: r.rating || 0, review_count: r.reviewCount || 0, buyers_count: r.buyersCount || 0,
    savings_percent: r.savingsPercent || 0, display_order: r.displayOrder || 0,
    why_chose_it: r.whyChoseIt || '', is_active: r.active !== false,
  }));
  await insertBatch('routines', rtRows);
  console.log('9. Routines: ' + rtRows.length);

  // Routine products + steps
  const rtProd: any[] = [], rtStep: any[] = [];
  for (const r of routines) {
    for (const pid of (r.products || [])) {
      rtProd.push({ routine_id: slugToUUID('routine:' + r.id), product_id: slugToUUID('prod:' + pid) });
    }
    let sn = 0;
    for (const s of (r.steps || [])) {
      sn++;
      rtStep.push({
        id: slugToUUID('rt-step:' + r.id + ':' + sn), routine_id: slugToUUID('routine:' + r.id),
        product_id: slugToUUID('prod:' + s.productId), step_number: sn,
        title_ar: s.titleAr, title_en: s.titleEn,
        description_ar: s.descriptionAr, description_en: s.descriptionEn, time_of_day: s.time,
      });
    }
  }
  await insertBatch('routine_products', rtProd);
  console.log('   routine_products: ' + rtProd.length);
  await insertBatch('routine_steps', rtStep);
  console.log('   routine_steps: ' + rtStep.length);

  // 10. Governorates
  const govRows = DEFAULT_GOVERNORATES.map((g: any) => ({
    id: slugToUUID('gov:' + g.id), legacy_id: g.id, name: g.name, name_en: g.nameEn,
    fee: g.fee, is_enabled: g.enabled,
  }));
  await insertBatch('governorates', govRows);
  console.log('10. Governorates: ' + govRows.length);

  // 11-13. Small tables
  const testRows = testimonials.map((t: any) => ({
    id: slugToUUID('testimonial:' + t.id), customer_name: t.name, customer_name_ar: t.nameAr,
    rating: t.rating, comment: t.text, comment_ar: t.textAr, is_verified: t.isVerified || false,
  }));
  await insertBatch('testimonials', testRows);

  const faqRows = faqs.map((f: any) => ({
    id: slugToUUID('faq:' + f.id),
    question: { ar: f.questionAr, en: f.question }, answer: { ar: f.answerAr, en: f.answer },
    category: f.category,
  }));
  await insertBatch('faqs', faqRows);

  const giftRows = DEFAULT_GIFT_OPTIONS.map((o: any) => ({
    id: slugToUUID('gift-opt:' + o.id),
    name: { ar: o.labelAr, en: o.labelEn },
    price: o.price, is_active: o.enabled,
  }));
  await insertBatch('gift_options', giftRows);

  await supabase.from('site_settings').insert({
    id: slugToUUID('site-config'), key: 'site_config', value: siteConfig,
  });

  console.log('11. Testimonials: ' + testRows.length);
  console.log('12. FAQs: ' + faqRows.length);
  console.log('13. Gift options: ' + giftRows.length);
  console.log('14. Site settings: 1');

  // ─── VERIFY ─────────────────────────────────────────────────────
  console.log('\n=== VERIFICATION ===');
  const expectedProducts = products.length;
  const expectedBrands = brands.length;
  const checks: [string, number][] = [
    ['categories', 59], ['brands', expectedBrands], ['products', expectedProducts], ['reviews', 53],
    ['routines', 23], ['routine_steps', 92], ['routine_products', 92],
    ['experts', 8], ['expert_products', expProd.length], ['expert_articles', expArt.length],
    ['articles', 8], ['article_products', artProd.length], ['bundles', 4],
    ['bundle_products', 16], ['governorates', 21], ['testimonials', 5],
    ['faqs', 5], ['gift_options', 4], ['site_settings', 1],
  ];

  let allOk = true;
  for (const [tbl, expected] of checks) {
    const { count, error } = await supabase.from(tbl).select('*', { count: 'exact', head: true });
    const ok = count === expected;
    if (!ok) allOk = false;
    console.log('  ' + (ok ? 'OK' : 'FAIL') + ' ' + tbl + ': ' + count + '/' + expected + (error ? ' ERR:' + error.message : ''));
  }

  console.log('\n' + (allOk ? 'ALL COUNTS MATCH' : 'SOME DIFFER') + ' | Time: ' + ((Date.now() - start) / 1000).toFixed(1) + 's');
}

main().catch(e => { console.error('FATAL:', e.message || e); process.exit(1); });
