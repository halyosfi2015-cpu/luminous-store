import { createHash } from 'crypto'
import { createServerSupabaseClient } from './supabase-server'
import type { Product, CategoryInfo, Routine, RoutineLevel, RoutineStep } from '@/src/types/product'
import type { Brand } from '@/src/data/brands'
import type { Expert } from '@/src/types/expert'
import type { Article } from '@/src/types/article'
import type { Bundle, BundleOccasion } from '@/src/types/bundle'
import type { Order, OrderStatus } from '@/types/cart'
import type { Governorate } from '@/src/data/shipping'
import type { HeroOverride } from '@/src/engine/hero/types'
import type { GiftOption } from '@/src/data/bundles-admin'
import type {
  AdminBanner,
  AdminCoupon,
  AdminCustomer,
  AdminReview,
  AdminReviewStatus,
  AdminStats,
  HomepageSettings,
} from '../admin/types'

import { products } from '@/src/data/products'
import { listCategories, saveCategoryLocal, removeCategoryLocal } from '../admin/adapters/local/categories'
import { listBrands, saveBrandLocal, removeBrandLocal } from '../admin/adapters/local/brands'
import { listOrders, saveOrders, updateOrderStatus } from '../admin/adapters/local/orders'
import { listCustomers } from '../admin/adapters/local/customers'
import {
  listExperts,
  saveExpertLocal,
  removeExpertLocal,
} from '../admin/adapters/local/experts'
import { loadExperts } from '@/src/data/experts-admin'
import { articles as canonicalArticles } from '@/src/data/articles'
import { listArticles } from '../admin/adapters/local/articles'
import {
  listRoutines,
  saveRoutineLocal,
  removeRoutineLocal,
} from '../admin/adapters/local/routines'
import { listBundles, removeBundleLocal, removeGiftOptionLocal, listGiftOptions } from '../admin/adapters/local/bundles'
import { heroAdapter } from '../admin/adapters/local/hero'
import { loadGovernorates, saveGovernorates } from '@/src/data/shipping'
import { listBanners, saveBanners } from '../admin/adapters/local/banners'
import { listCoupons, saveCoupons } from '../admin/adapters/local/coupons'
import { listReviews, setReviewStatus as setReviewStatusLocal } from '../admin/adapters/local/reviews'
import { loadHomepageSettings, saveHomepageSettings } from '../admin/adapters/local/homepage'
import { computeStats } from '../admin/adapters/local/stats'
import { DEFAULT_GIFT_OPTIONS, loadBundles, saveGiftOptions } from '@/src/data/bundles-admin'

function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

async function trySupabase<T>(
  tableName: string,
  queryFn: () => Promise<T>,
  fallbackFn: () => T,
): Promise<T> {
  if (!isSupabaseConfigured()) return fallbackFn()
  try {
    const result = await queryFn()
    if (result !== null && result !== undefined) return result
    return fallbackFn()
  } catch (error) {
    console.warn(
      `[Admin-Supabase] ${tableName}: Supabase unavailable, using localStorage fallback:`,
      (error as Error).message,
    )
    return fallbackFn()
  }
}

async function dualWrite(
  tableName: string,
  localFn: () => void,
  supabaseFn: () => Promise<void>,
): Promise<void> {
  localFn()
  if (!isSupabaseConfigured()) return
  try {
    await supabaseFn()
  } catch (error) {
    console.warn(
      `[Admin-Supabase] ${tableName}: Supabase write failed, data saved to localStorage only:`,
      (error as Error).message,
    )
  }
}

// ─── Products ─────────────────────────────────────────────────────────────────

export async function supabaseGetProducts(): Promise<Product[]> {
  return trySupabase(
    'products',
    async () => {
      const supabase = await createServerSupabaseClient()
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Product[]
    },
    () => products,
  )
}

export async function supabaseGetProduct(id: string): Promise<Product | null> {
  return trySupabase(
    'products',
    async () => {
      const supabase = await createServerSupabaseClient()
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return (data as Product) ?? null
    },
    () => products.find((p) => p.id === id) ?? null,
  )
}

export async function supabaseSaveProduct(product: Product): Promise<void> {
  await dualWrite(
    'products',
    () => { try { const existing = JSON.parse(window.localStorage.getItem('luminous-products') || '[]'); const idx = existing.findIndex((p: Product) => p.id === product.id); if (idx >= 0) existing[idx] = product; else existing.push(product); window.localStorage.setItem('luminous-products', JSON.stringify(existing)); } catch {} },
    async () => {
      const supabase = await createServerSupabaseClient()

      // Resolve brand name → brand_id
      const catSlug = product.categorySlug || product.category?.toLowerCase().replace(/\s+/g, '-')
      const brandSlug = product.brand?.toLowerCase().replace(/\s+/g, '-')

      const { data: brands } = await supabase.from('brands').select('id').eq('slug', brandSlug).limit(1)
      if (!brands || brands.length === 0) throw new Error(`Brand not found: ${product.brand}`)
      const brandId = (brands[0] as { id: string }).id

      const { data: cats } = await supabase.from('categories').select('id').eq('slug', catSlug).limit(1)
      if (!cats || cats.length === 0) throw new Error(`Category not found: ${product.category}`)
      const catId = (cats[0] as { id: string }).id

      const row = {
        id: product.id,
        legacy_id: product.id,
        slug: product.slug,
        sku: product.sku,
        name: product.name,
        description: product.description,
        category_id: catId,
        brand_id: brandId,
        pricing: product.pricing,
        discount: product.discount || 0,
        gallery: product.gallery || [],
        images: product.images || [],
        ingredients: product.ingredients || { ar: [], en: [] },
        usage_instructions: product.usageInstructions || { ar: '', en: '' },
        how_to_use: product.howToUse || [],
        how_to_use_ar: product.howToUseAr || [],
        skin_types: product.skinTypes || [],
        suitable_for: product.suitableFor || [],
        skin_concerns: product.skinConcerns || [],
        benefits: product.benefits || { ar: [], en: [] },
        stock: product.stock || product.stockQuantity || 0,
        in_stock: product.inStock !== false,
        stock_quantity: product.stockQuantity || product.stock || 0,
        rating: product.rating || 0,
        review_count: product.reviewCount || 0,
        is_featured: product.featured || product.isFeatured || false,
        is_new: product.new || product.isNew || false,
        is_best_seller: product.isBestSeller || false,
        is_doctor_recommended: product.isDoctorRecommended || false,
        tags: product.tags || [],
        seo_metadata: product.seoMetadata || {},
      }

      // Check for duplicate slug (exclude current product)
      const { data: dup } = await supabase.from('products').select('id').eq('slug', product.slug).neq('id', product.id).limit(1)
      if (dup && dup.length > 0) throw new Error(`Duplicate slug: ${product.slug} (already used by product ${(dup[0] as { id: string }).id})`)

      // Upsert
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('products') as any).upsert(row, { onConflict: 'id' })
      if (error) throw error
    },
  )
}

export async function supabaseDeleteProduct(id: string): Promise<void> {
  await dualWrite(
    'products',
    () => { try { const existing = JSON.parse(window.localStorage.getItem('luminous-products') || '[]'); window.localStorage.setItem('luminous-products', JSON.stringify(existing.filter((p: Product) => p.id !== id))); } catch {} },
    async () => {
      const supabase = await createServerSupabaseClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('products') as any).update({ is_active: false }).eq('id', id)
      if (error) throw error
    },
  )
}

// ─── Categories ───────────────────────────────────────────────────────────────

type CategoryRow = {
  id: string
  slug: string
  name: { ar: string; en: string } | null
  description: { ar?: string; en?: string } | null
  image?: string | null
  cover_image?: string | null
  icon?: string | null
  parent_category_id?: string | null
  product_count?: number | null
  sort_order?: number | null
  seo_metadata?: unknown
  is_active?: boolean | null
}

// Mirrors db/seed-apply.ts: leaf category slugs that collide with a top-level
// section slug (e.g. "tools") get a '-sub' suffix in the database.
const TOP_LEVEL_SLUGS = ['skincare', 'haircare', 'bodycare', 'makeup', 'perfume', 'baby', 'tools', 'supplements']

function slugToUUID(slug: string): string {
  const h = createHash('md5').update('luminous:' + slug).digest('hex')
  return h.slice(0, 8) + '-' + h.slice(8, 12) + '-5' + h.slice(13, 16) + '-8' + h.slice(17, 20) + '-' + h.slice(20, 32)
}

function mapCategoryRow(row: CategoryRow): CategoryInfo {
  return {
    slug: row.slug,
    name: row.name?.en ?? row.slug,
    nameAr: row.name?.ar ?? row.slug,
    description: row.description?.en ?? '',
    descriptionAr: row.description?.ar ?? '',
    image: row.image ?? undefined,
    coverImage: row.cover_image ?? undefined,
    icon: row.icon ?? undefined,
    productCount: row.product_count ?? 0,
  }
}

export async function supabaseGetCategories(): Promise<CategoryInfo[]> {
  return trySupabase(
    'categories',
    async () => {
      const supabase = await createServerSupabaseClient()
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      if (error) throw error
      return ((data ?? []) as CategoryRow[])
        .filter((row) => row.parent_category_id != null)
        .map(mapCategoryRow)
    },
    () => listCategories(),
  )
}

export async function supabaseSaveCategory(category: CategoryInfo): Promise<void> {
  await dualWrite(
    'categories',
    () => saveCategoryLocal(category),
    async () => {
      const supabase = await createServerSupabaseClient()
      const { data: existing } = await supabase
        .from('categories')
        .select('id, parent_category_id, sort_order, seo_metadata')
        .eq('slug', category.slug)
        .limit(1)
      const row = {
        id: existing && existing.length > 0 ? (existing[0] as { id: string }).id : slugToUUID('sub:' + category.slug),
        slug: TOP_LEVEL_SLUGS.includes(category.slug) ? category.slug + '-sub' : category.slug,
        name: { ar: category.nameAr, en: category.name },
        description: { ar: category.descriptionAr || '', en: category.description || '' },
        image: category.image || null,
        cover_image: category.coverImage || null,
        icon: category.icon || null,
        parent_category_id: existing && existing.length > 0 ? (existing[0] as { parent_category_id: string | null }).parent_category_id : null,
        product_count: category.productCount ?? 0,
        sort_order: existing && existing.length > 0 ? (existing[0] as { sort_order: number }).sort_order : 0,
        seo_metadata: existing && existing.length > 0 ? (existing[0] as { seo_metadata: unknown }).seo_metadata : {},
        is_active: true,
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('categories') as any).upsert(row, { onConflict: 'id' })
      if (error) throw error
    },
  )
}

export async function supabaseDeleteCategory(slug: string): Promise<void> {
  await dualWrite(
    'categories',
    () => removeCategoryLocal(slug),
    async () => {
      const supabase = await createServerSupabaseClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('categories') as any).update({ is_active: false }).eq('slug', slug)
      if (error) throw error
    },
  )
}

// ─── Brands ───────────────────────────────────────────────────────────────────

type BrandRow = {
  id: string
  slug: string
  name: string
  name_ar?: string | null
  logo?: string | null
  cover_image?: string | null
  description?: string | null
  description_ar?: string | null
  origin?: string | null
  origin_ar?: string | null
  is_verified?: boolean | null
  featured?: boolean | null
  product_count?: number | null
  seo_metadata?: unknown
  is_active?: boolean | null
}

function mapBrandRow(row: BrandRow): Brand {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    nameAr: row.name_ar ?? row.name,
    logo: row.logo ?? '',
    coverImage: row.cover_image ?? '',
    description: row.description ?? '',
    descriptionAr: row.description_ar ?? '',
    origin: row.origin ?? '',
    originAr: row.origin_ar ?? '',
    isVerified: row.is_verified ?? false,
    featured: row.featured ?? false,
    productCount: row.product_count ?? 0,
    seoMetadata: (row.seo_metadata as Brand['seoMetadata']) ?? { title: { ar: '', en: '' }, description: { ar: '', en: '' }, keywords: [] as string[] },
  }
}

export async function supabaseGetBrands(): Promise<Brand[]> {
  return trySupabase(
    'brands',
    async () => {
      const supabase = await createServerSupabaseClient()
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return (data ?? []).map(mapBrandRow)
    },
    () => listBrands(),
  )
}

export async function supabaseSaveBrand(brand: Brand): Promise<void> {
  await dualWrite(
    'brands',
    () => saveBrandLocal(brand),
    async () => {
      const supabase = await createServerSupabaseClient()
      const { data: existing } = await supabase
        .from('brands')
        .select('id')
        .eq('slug', brand.slug)
        .limit(1)
      const row = {
        id: existing && existing.length > 0 ? (existing[0] as { id: string }).id : slugToUUID('brand:' + brand.slug),
        slug: brand.slug,
        name: brand.name,
        name_ar: brand.nameAr,
        logo: brand.logo || null,
        cover_image: brand.coverImage || null,
        description: brand.description || null,
        description_ar: brand.descriptionAr || null,
        origin: brand.origin || null,
        origin_ar: brand.originAr || null,
        is_verified: brand.isVerified || false,
        featured: brand.featured || false,
        product_count: brand.productCount || 0,
        seo_metadata: brand.seoMetadata || {},
        is_active: true,
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('brands') as any).upsert(row, { onConflict: 'id' })
      if (error) throw error
    },
  )
}

export async function supabaseDeleteBrand(slug: string): Promise<void> {
  await dualWrite(
    'brands',
    () => removeBrandLocal({ id: slug, slug }),
    async () => {
      const supabase = await createServerSupabaseClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('brands') as any).update({ is_active: false }).eq('slug', slug)
      if (error) throw error
    },
  )
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export async function supabaseGetOrders(): Promise<Order[]> {
  return trySupabase(
    'orders',
    async () => {
      const supabase = await createServerSupabaseClient()
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data as Order[]) ?? null
    },
    () => listOrders(),
  )
}

export async function supabaseCreateOrder(order: Order): Promise<void> {
  await dualWrite(
    'orders',
    () => saveOrders([...listOrders(), order]),
    async () => {
      const supabase = await createServerSupabaseClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('orders') as any).insert(order)
      if (error) throw error
    },
  )
}

export async function supabaseUpdateOrderStatus(
  id: string,
  status: OrderStatus,
): Promise<void> {
  await dualWrite(
    'orders',
    () => updateOrderStatus(id, status),
    async () => {
      const supabase = await createServerSupabaseClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('orders') as any)
        .update({ status })
        .eq('id', id)
      if (error) throw error
    },
  )
}

// ─── Customers ────────────────────────────────────────────────────────────────

export async function supabaseGetCustomers(): Promise<AdminCustomer[]> {
  return trySupabase(
    'customers',
    async () => {
      const supabase = await createServerSupabaseClient()
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as AdminCustomer[]
    },
    () => listCustomers(),
  )
}

// ─── Experts ──────────────────────────────────────────────────────────────────

type ExpertRow = {
  id: string
  slug: string
  name: string
  name_ar: string
  title?: string | null
  title_ar?: string | null
  specialty?: string | null
  specialty_ar?: string | null
  bio?: string | null
  bio_ar?: string | null
  short_bio?: string | null
  short_bio_ar?: string | null
  profile_image?: string | null
  cover_image?: string | null
  avatar?: string | null
  gender?: string | null
  languages?: string[] | null
  consultation_types?: string[] | null
  services?: string[] | null
  specialties_arr?: string[] | null
  specialties_ar?: string[] | null
  years_of_experience?: number | null
  is_verified?: boolean | null
  available_for_consultation?: boolean | null
  rating?: number | null
  review_count?: number | null
  is_featured?: boolean | null
  city?: string | null
  city_ar?: string | null
  social_links?: { platform: string; url: string; icon?: string }[] | null
  seo_metadata?: Expert['seoMetadata'] | null
}

function mapExpertRow(row: ExpertRow): Expert {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    nameAr: row.name_ar ?? row.name,
    title: row.title ?? '',
    titleAr: row.title_ar ?? '',
    specialty: row.specialty ?? '',
    specialtyAr: row.specialty_ar ?? '',
    bio: row.bio ?? '',
    bioAr: row.bio_ar ?? '',
    shortBio: row.short_bio ?? undefined,
    shortBioAr: row.short_bio_ar ?? undefined,
    profileImage: row.profile_image ?? '',
    coverImage: row.cover_image ?? '',
    avatar: row.avatar ?? undefined,
    gender: row.gender === 'female' ? 'female' : 'male',
    languages: row.languages ?? [],
    consultationTypes: row.consultation_types ?? [],
    services: row.services ?? [],
    products: [],
    articles: [],
    specialties: row.specialties_arr ?? [],
    specialtiesAr: row.specialties_ar ?? [],
    yearsOfExperience: row.years_of_experience ?? 0,
    isVerified: row.is_verified ?? false,
    availableForConsultation: row.available_for_consultation ?? true,
    rating: row.rating ?? 0,
    reviewCount: row.review_count ?? 0,
    isFeatured: row.is_featured ?? false,
    city: row.city ?? undefined,
    cityAr: row.city_ar ?? undefined,
    socialLinks: row.social_links ?? [],
    seoMetadata: row.seo_metadata ?? {
      title: { ar: '', en: '' },
      description: { ar: '', en: '' },
      keywords: [],
    },
  }
}

function toExpertRow(expert: Expert): ExpertRow {
  return {
    id: slugToUUID('expert:' + expert.slug),
    slug: expert.slug,
    name: expert.name,
    name_ar: expert.nameAr,
    title: expert.title || null,
    title_ar: expert.titleAr || null,
    specialty: expert.specialty || null,
    specialty_ar: expert.specialtyAr || null,
    bio: expert.bio || null,
    bio_ar: expert.bioAr || null,
    short_bio: expert.shortBio || null,
    short_bio_ar: expert.shortBioAr || null,
    profile_image: expert.profileImage || null,
    cover_image: expert.coverImage || null,
    avatar: expert.avatar || null,
    gender: expert.gender || 'male',
    languages: expert.languages || [],
    consultation_types: expert.consultationTypes || [],
    services: expert.services || [],
    specialties_arr: expert.specialties || [],
    specialties_ar: expert.specialtiesAr || [],
    years_of_experience: expert.yearsOfExperience || 0,
    is_verified: expert.isVerified || false,
    available_for_consultation: expert.availableForConsultation !== false,
    rating: expert.rating || 0,
    review_count: expert.reviewCount || 0,
    is_featured: expert.isFeatured || false,
    city: expert.city || null,
    city_ar: expert.cityAr || null,
    social_links: expert.socialLinks || [],
    seo_metadata: expert.seoMetadata || {},
  }
}

export async function supabaseGetExperts(): Promise<Expert[]> {
  return trySupabase(
    'experts',
    async () => {
      const supabase = await createServerSupabaseClient()
      const { data, error } = await supabase
        .from('experts')
        .select('*')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return ((data ?? []) as ExpertRow[]).map(mapExpertRow)
    },
    () => listExperts(),
  )
}

async function syncExpertRelations(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, expert: Expert, expertId: string) {
  // expert_products: expert.products holds legacy product ids (pXXX).
  const productIds = (expert.products || []).filter(Boolean)
  let validProductIds: string[] = []
  if (productIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows } = await (supabase.from('products') as any)
      .select('id')
      .in('legacy_id', productIds)
    validProductIds = ((rows ?? []) as { id: string }[]).map((r) => r.id)
  }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: delProdErr } = await (supabase.from('expert_products') as any)
    .delete()
    .eq('expert_id', expertId)
  if (delProdErr) throw delProdErr
  if (validProductIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insProdErr } = await (supabase.from('expert_products') as any).insert(
      validProductIds.map((product_id) => ({ expert_id: expertId, product_id })),
    )
    if (insProdErr) throw insProdErr
  }

  // expert_articles: expert.articles holds canonical article ids (art-XXX) that
  // map 1:1 to article slugs, which determine the article UUID in the DB.
  const articleIds = (expert.articles || []).filter(Boolean)
  let validArticleIds: string[] = []
  if (articleIds.length > 0) {
    const slugs = articleIds
      .map((id) => canonicalArticles.find((a) => a.id === id)?.slug)
      .filter((s): s is string => Boolean(s))
    if (slugs.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rows } = await (supabase.from('articles') as any)
        .select('id')
        .in('slug', slugs)
      validArticleIds = ((rows ?? []) as { id: string }[]).map((r) => r.id)
    }
  }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: delArtErr } = await (supabase.from('expert_articles') as any)
    .delete()
    .eq('expert_id', expertId)
  if (delArtErr) throw delArtErr
  if (validArticleIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insArtErr } = await (supabase.from('expert_articles') as any).insert(
      validArticleIds.map((article_id) => ({ expert_id: expertId, article_id })),
    )
    if (insArtErr) throw insArtErr
  }
}

export async function supabaseSaveExpert(expert: Expert): Promise<void> {
  await dualWrite(
    'experts',
    () => saveExpertLocal(expert),
    async () => {
      const supabase = await createServerSupabaseClient()
      const row = toExpertRow(expert)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('experts') as any).upsert(row, {
        onConflict: 'id',
      })
      if (error) throw error
      await syncExpertRelations(supabase, expert, row.id)
    },
  )
}

export async function supabaseDeleteExpert(slug: string): Promise<void> {
  await dualWrite(
    'experts',
    () => {
      const stored = loadExperts()
      const match = stored.find((e) => e.slug === slug)
      removeExpertLocal(match ? match.id : slug)
    },
    async () => {
      const supabase = await createServerSupabaseClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('experts') as any)
        .update({ is_active: false })
        .eq('slug', slug)
      if (error) throw error
    },
  )
}

// ─── Articles ─────────────────────────────────────────────────────────────────

export async function supabaseGetArticles(): Promise<Article[]> {
  return trySupabase(
    'articles',
    async () => {
      const supabase = await createServerSupabaseClient()
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .order('published_at', { ascending: false })
      if (error) throw error
      return (data as Article[]) ?? null
    },
    () => listArticles(),
  )
}

// ─── Routines ─────────────────────────────────────────────────────────────────

type RoutineRow = {
  id: string
  slug: string
  name: string
  name_ar: string
  description?: string | null
  description_ar?: string | null
  routine_type: string
  routine_type_ar?: string | null
  routine_level?: string | null
  image?: string | null
  hero_image?: string | null
  duration: string
  duration_en: string
  for_whom?: string[] | null
  for_whom_en?: string[] | null
  expected_results?: string[] | null
  expected_results_en?: string[] | null
  rating?: number | null
  review_count?: number | null
  buyers_count?: number | null
  savings_percent?: number | null
  display_order?: number | null
  why_chose_it?: string | null
  is_active?: boolean | null
}

type RoutineStepRow = {
  id: string
  routine_id: string
  product_id: string | null
  step_number: number
  title_ar: string
  title_en: string
  description_ar?: string | null
  description_en?: string | null
  time_of_day?: string | null
}

function mapRoutineRow(row: RoutineRow, productIds: string[], steps: RoutineStep[]): Routine {
  return {
    id: row.slug,
    name: row.name,
    nameAr: row.name_ar ?? row.name,
    description: row.description ?? '',
    descriptionAr: row.description_ar ?? '',
    products: productIds,
    image: row.image ?? undefined,
    type: row.routine_type,
    typeAr: row.routine_type_ar ?? row.routine_type,
    level: (row.routine_level as RoutineLevel) || undefined,
    active: row.is_active !== false,
    displayOrder: row.display_order ?? 0,
    savingsPercent: row.savings_percent ?? 0,
    duration: row.duration ?? '',
    durationEn: row.duration_en ?? '',
    forWhom: row.for_whom ?? [],
    forWhomEn: row.for_whom_en ?? [],
    expectedResults: row.expected_results ?? [],
    expectedResultsEn: row.expected_results_en ?? [],
    rating: row.rating ?? 0,
    reviewCount: row.review_count ?? 0,
    buyersCount: row.buyers_count ?? 0,
    heroImage: row.hero_image ?? undefined,
    steps,
    whyChoseIt: row.why_chose_it ?? '',
  }
}

function toRoutineRow(routine: Routine): RoutineRow {
  return {
    id: slugToUUID('routine:' + routine.id),
    slug: routine.id,
    name: routine.name,
    name_ar: routine.nameAr,
    description: routine.description || null,
    description_ar: routine.descriptionAr || null,
    routine_type: routine.type,
    routine_type_ar: routine.typeAr || null,
    routine_level: routine.level || null,
    image: routine.image || null,
    hero_image: routine.heroImage || null,
    duration: routine.duration,
    duration_en: routine.durationEn,
    for_whom: routine.forWhom || [],
    for_whom_en: routine.forWhomEn || [],
    expected_results: routine.expectedResults || [],
    expected_results_en: routine.expectedResultsEn || [],
    rating: routine.rating || 0,
    review_count: routine.reviewCount || 0,
    buyers_count: routine.buyersCount || 0,
    savings_percent: routine.savingsPercent || 0,
    display_order: routine.displayOrder || 0,
    why_chose_it: routine.whyChoseIt || null,
    is_active: routine.active !== false,
  }
}

export async function supabaseGetRoutines(): Promise<Routine[]> {
  return trySupabase(
    'routines',
    async () => {
      const supabase = await createServerSupabaseClient()
      const { data, error } = await supabase
        .from('routines')
        .select('*')
        .eq('is_active', true)
        .order('display_order')
      if (error) throw error
      const rows = ((data ?? []) as RoutineRow[]).filter((r) => r.slug)
      if (rows.length === 0) return []
      const routineIds = rows.map((r) => r.id)

      // routine_products: routine_id -> resolved product legacy ids
      const productLegacyByRoutine: Record<string, string[]> = {}
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: prodRows } = await (supabase.from('routine_products') as any)
          .select('routine_id, product_id')
          .in('routine_id', routineIds)
        const links = (prodRows ?? []) as { routine_id: string; product_id: string }[]
        const productUuids = [...new Set(links.map((l) => l.product_id))]
        const legacyById: Record<string, string> = {}
        if (productUuids.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: prods } = await (supabase.from('products') as any)
            .select('id, legacy_id')
            .in('id', productUuids)
          for (const p of (prods ?? []) as { id: string; legacy_id: string }[]) {
            legacyById[p.id] = p.legacy_id
          }
        }
        for (const l of links) {
          const legacy = legacyById[l.product_id]
          if (legacy) {
            productLegacyByRoutine[l.routine_id] = [
              ...(productLegacyByRoutine[l.routine_id] || []),
              legacy,
            ]
          }
        }
      }

      // routine_steps: rebuild steps preserving step_number order
      const stepsByRoutine: Record<string, RoutineStep[]> = {}
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: stepRows } = await (supabase.from('routine_steps') as any)
          .select('*')
          .in('routine_id', routineIds)
          .order('step_number')
        const stepUuids = [
          ...new Set(
            ((stepRows ?? []) as RoutineStepRow[])
              .map((s) => s.product_id)
              .filter((p): p is string => Boolean(p)),
          ),
        ]
        const legacyById: Record<string, string> = {}
        if (stepUuids.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: prods } = await (supabase.from('products') as any)
            .select('id, legacy_id')
            .in('id', stepUuids)
          for (const p of (prods ?? []) as { id: string; legacy_id: string }[]) {
            legacyById[p.id] = p.legacy_id
          }
        }
        for (const s of (stepRows ?? []) as RoutineStepRow[]) {
          const productId = s.product_id ? (legacyById[s.product_id] ?? s.product_id) : ''
          const step: RoutineStep = {
            productId,
            time: (s.time_of_day as RoutineStep['time']) || 'both',
            titleAr: s.title_ar ?? '',
            titleEn: s.title_en ?? '',
            descriptionAr: s.description_ar ?? '',
            descriptionEn: s.description_en ?? '',
          }
          stepsByRoutine[s.routine_id] = [...(stepsByRoutine[s.routine_id] || []), step]
        }
      }

      return rows.map((row) =>
        mapRoutineRow(row, productLegacyByRoutine[row.id] || [], stepsByRoutine[row.id] || []),
      )
    },
    () => listRoutines(),
  )
}

async function syncRoutineRelations(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  routine: Routine,
  routineId: string,
) {
  // routine_products: routine.products holds legacy product ids (yq-XXX).
  const productIds = (routine.products || []).filter(Boolean)
  let validProductIds: string[] = []
  if (productIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows } = await (supabase.from('products') as any)
      .select('id')
      .in('legacy_id', productIds)
    validProductIds = ((rows ?? []) as { id: string }[]).map((r) => r.id)
  }
  {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: delProdErr } = await (supabase.from('routine_products') as any)
      .delete()
      .eq('routine_id', routineId)
    if (delProdErr) throw delProdErr
  }
  if (validProductIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insProdErr } = await (supabase.from('routine_products') as any).insert(
      validProductIds.map((product_id) => ({ routine_id: routineId, product_id })),
    )
    if (insProdErr) throw insProdErr
  }

  // routine_steps: steps hold legacy product ids; store time_of_day + texts.
  const stepProductIds = [
    ...new Set((routine.steps || []).map((s) => s.productId).filter(Boolean)),
  ]
  const stepUuidById: Record<string, string> = {}
  if (stepProductIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows } = await (supabase.from('products') as any)
      .select('id, legacy_id')
      .in('legacy_id', stepProductIds)
    for (const r of (rows ?? []) as { id: string; legacy_id: string }[]) {
      stepUuidById[r.legacy_id] = r.id
    }
  }
  {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: delStepErr } = await (supabase.from('routine_steps') as any)
      .delete()
      .eq('routine_id', routineId)
    if (delStepErr) throw delStepErr
  }
  const stepRows = (routine.steps || [])
    .filter((s) => stepUuidById[s.productId])
    .map((s, n) => ({
      id: slugToUUID('rt-step:' + routine.id + ':' + (n + 1)),
      routine_id: routineId,
      product_id: stepUuidById[s.productId],
      step_number: n + 1,
      title_ar: s.titleAr || '',
      title_en: s.titleEn || '',
      description_ar: s.descriptionAr || '',
      description_en: s.descriptionEn || '',
      time_of_day: s.time,
    }))
  if (stepRows.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insStepErr } = await (supabase.from('routine_steps') as any).insert(stepRows)
    if (insStepErr) throw insStepErr
  }
}

export async function supabaseSaveRoutine(routine: Routine): Promise<void> {
  await dualWrite(
    'routines',
    () => saveRoutineLocal(routine),
    async () => {
      const supabase = await createServerSupabaseClient()
      const row = toRoutineRow(routine)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('routines') as any).upsert(row, {
        onConflict: 'id',
      })
      if (error) throw error
      await syncRoutineRelations(supabase, routine, row.id)
    },
  )
}

export async function supabaseDeleteRoutine(id: string): Promise<void> {
  await dualWrite(
    'routines',
    () => removeRoutineLocal(id),
    async () => {
      const supabase = await createServerSupabaseClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('routines') as any)
        .update({ is_active: false })
        .eq('slug', id)
      if (error) throw error
    },
  )
}

// ─── Bundles ──────────────────────────────────────────────────────────────────

type BundleRow = {
  id: string
  slug: string
  name_ar: string
  name_en: string
  description_ar?: string | null
  description_en?: string | null
  occasions?: unknown[] | null
  image?: string | null
  badge?: string | null
  badge_ar?: string | null
  original_price: number
  bundle_price: number
  savings_percent?: number | null
  gift_wrap?: boolean | null
  gift_wrap_price?: number | null
  gift_card?: boolean | null
  service_price?: number | null
  placeholder?: boolean | null
}

function mapBundleRow(row: BundleRow): Bundle {
  return {
    id: row.id,
    slug: row.slug,
    nameAr: row.name_ar,
    nameEn: row.name_en,
    descriptionAr: row.description_ar ?? '',
    descriptionEn: row.description_en ?? '',
    occasion: (row.occasions ?? []) as BundleOccasion[],
    image: row.image ?? '',
    badge: row.badge ?? undefined,
    badgeAr: row.badge_ar ?? undefined,
    productIds: [],
    originalPrice: row.original_price,
    bundlePrice: row.bundle_price,
    savingsPercent: row.savings_percent ?? 0,
    giftWrap: row.gift_wrap ?? false,
    giftWrapPrice: row.gift_wrap_price ?? 0,
    giftCard: row.gift_card ?? false,
    placeholder: row.placeholder ?? false,
    servicePrice: row.service_price ?? 0,
  }
}

export async function supabaseGetBundles(): Promise<Bundle[]> {
  return trySupabase(
    'bundles',
    async () => {
      const supabase = await createServerSupabaseClient()
      const { data, error } = await supabase
        .from('bundles')
        .select('*')
        .eq('is_active', true)
        .order('slug')
      if (error) throw error
      const rows = ((data ?? []) as BundleRow[]).filter((r) => r.slug)
      if (rows.length === 0) return []
      const bundleIds = rows.map((r) => r.id)

      const productIdsByBundle: Record<string, string[]> = {}
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: linkRows } = await (supabase.from('bundle_products') as any)
          .select('bundle_id, product_id')
          .in('bundle_id', bundleIds)
        const links = (linkRows ?? []) as { bundle_id: string; product_id: string }[]
        const productUuids = [...new Set(links.map((l) => l.product_id))]
        const legacyById: Record<string, string> = {}
        if (productUuids.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: prods } = await (supabase.from('products') as any)
            .select('id, legacy_id')
            .in('id', productUuids)
          for (const p of (prods ?? []) as { id: string; legacy_id: string }[]) {
            legacyById[p.id] = p.legacy_id
          }
        }
        for (const l of links) {
          const legacy = legacyById[l.product_id]
          if (legacy) {
            productIdsByBundle[l.bundle_id] = [
              ...(productIdsByBundle[l.bundle_id] || []),
              legacy,
            ]
          }
        }
      }

      return rows.map((row) => ({
        ...mapBundleRow(row),
        productIds: productIdsByBundle[row.id] || [],
      }))
    },
    () => listBundles(),
  )
}

function toBundleRow(bundle: Bundle) {
  return {
    id: slugToUUID('bundle:' + bundle.slug),
    slug: bundle.slug,
    name_ar: bundle.nameAr,
    name_en: bundle.nameEn,
    description_ar: bundle.descriptionAr || null,
    description_en: bundle.descriptionEn || null,
    occasions: bundle.occasion || [],
    image: bundle.image || null,
    badge: bundle.badge || null,
    badge_ar: bundle.badgeAr || null,
    original_price: bundle.originalPrice,
    bundle_price: bundle.bundlePrice,
    savings_percent: bundle.savingsPercent ?? 0,
    gift_wrap: bundle.giftWrap || false,
    gift_wrap_price: bundle.giftWrapPrice ?? 0,
    gift_card: bundle.giftCard || false,
    service_price: bundle.servicePrice ?? 0,
    placeholder: bundle.placeholder || false,
  }
}

async function syncBundleProducts(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  bundleId: string,
  productIds: string[],
) {
  const ids = (productIds || []).filter(Boolean)
  if (ids.length === 0) return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows } = await (supabase.from('products') as any)
    .select('id')
    .in('legacy_id', ids)
  const validProductIds = ((rows ?? []) as { id: string }[]).map((r) => r.id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: delErr } = await (supabase.from('bundle_products') as any)
    .delete()
    .eq('bundle_id', bundleId)
  if (delErr) throw delErr
  if (validProductIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insErr } = await (supabase.from('bundle_products') as any).insert(
      validProductIds.map((product_id) => ({ bundle_id: bundleId, product_id })),
    )
    if (insErr) throw insErr
  }
}

export async function supabaseSaveBundles(list: Bundle[]): Promise<void> {
  await dualWrite(
    'bundles',
    () => { try { window.localStorage.setItem('luminous-bundles', JSON.stringify(list)) } catch {} },
    async () => {
      const supabase = await createServerSupabaseClient()
      for (const bundle of list) {
        if (!bundle?.slug) continue
        const row = toBundleRow(bundle)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('bundles') as any).upsert(row, {
          onConflict: 'id',
        })
        if (error) throw error
        await syncBundleProducts(supabase, row.id, bundle.productIds)
      }
    },
  )
}

export async function supabaseDeleteBundle(slug: string): Promise<void> {
  await dualWrite(
    'bundles',
    () => {
      const stored = loadBundles()
      const match = stored.find((b) => b.slug === slug)
      removeBundleLocal(match ? match.id : slug)
    },
    async () => {
      const supabase = await createServerSupabaseClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('bundles') as any)
        .update({ is_active: false })
        .eq('slug', slug)
      if (error) throw error
    },
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

export async function supabaseGetHero(): Promise<HeroOverride | null> {
  return trySupabase(
    'hero_campaigns',
    async () => {
      const supabase = await createServerSupabaseClient()
      const { data, error } = await supabase
        .from('hero_campaigns')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .single()
      if (error) throw error
      return (data as HeroOverride) ?? null
    },
    () => heroAdapter.load(),
  )
}

export async function supabaseSaveHero(override: HeroOverride): Promise<void> {
  await dualWrite(
    'hero_campaigns',
    () => heroAdapter.save(override),
    async () => {
      const supabase = await createServerSupabaseClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('hero_campaigns') as any).upsert(override)
      if (error) throw error
    },
  )
}

// ─── Shipping ─────────────────────────────────────────────────────────────────

export async function supabaseGetGovernorates(): Promise<Governorate[]> {
  return trySupabase(
    'governorates',
    async () => {
      const supabase = await createServerSupabaseClient()
      const { data, error } = await supabase
        .from('governorates')
        .select('*')
        .order('name')
      if (error) throw error
      return (data as Governorate[]) ?? null
    },
    () => loadGovernorates(),
  )
}

export async function supabaseSaveGovernorates(list: Governorate[]): Promise<void> {
  await dualWrite(
    'governorates',
    () => saveGovernorates(list),
    async () => {
      const supabase = await createServerSupabaseClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('governorates') as any).upsert(list)
      if (error) throw error
    },
  )
}

// ─── Banners ──────────────────────────────────────────────────────────────────

export async function supabaseGetBanners(): Promise<AdminBanner[]> {
  return trySupabase(
    'banners',
    async () => {
      const supabase = await createServerSupabaseClient()
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .order('sort_order')
      if (error) throw error
      return (data as AdminBanner[]) ?? null
    },
    () => listBanners(),
  )
}

export async function supabaseSaveBanners(list: AdminBanner[]): Promise<void> {
  await dualWrite(
    'banners',
    () => saveBanners(list),
    async () => {
      const supabase = await createServerSupabaseClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('banners') as any).upsert(list)
      if (error) throw error
    },
  )
}

// ─── Coupons ──────────────────────────────────────────────────────────────────

export async function supabaseGetCoupons(): Promise<AdminCoupon[]> {
  return trySupabase(
    'coupons',
    async () => {
      const supabase = await createServerSupabaseClient()
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data as AdminCoupon[]) ?? null
    },
    () => listCoupons(),
  )
}

export async function supabaseSaveCoupons(list: AdminCoupon[]): Promise<void> {
  await dualWrite(
    'coupons',
    () => saveCoupons(list),
    async () => {
      const supabase = await createServerSupabaseClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('coupons') as any).upsert(list)
      if (error) throw error
    },
  )
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

export async function supabaseGetReviews(): Promise<AdminReview[]> {
  return trySupabase(
    'reviews',
    async () => {
      const supabase = await createServerSupabaseClient()
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('date', { ascending: false })
      if (error) throw error
      return (data as AdminReview[]) ?? null
    },
    () => listReviews(),
  )
}

export async function supabaseUpdateReviewStatus(
  id: string,
  status: AdminReviewStatus,
): Promise<void> {
  await dualWrite(
    'reviews',
    () => setReviewStatusLocal(id, status),
    async () => {
      const supabase = await createServerSupabaseClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('reviews') as any)
        .update({ status })
        .eq('id', id)
      if (error) throw error
    },
  )
}

// ─── Homepage ─────────────────────────────────────────────────────────────────

export async function supabaseGetHomepageSettings(): Promise<HomepageSettings> {
  return trySupabase(
    'homepage_sections',
    async () => {
      const supabase = await createServerSupabaseClient()
      const { data, error } = await supabase
        .from('homepage_sections')
        .select('*')
      if (error) throw error
      const rows = (data ?? []) as HomepageSettings[]
      if (rows.length > 0) return rows[0]
      throw new Error('No homepage settings in Supabase')
    },
    () => loadHomepageSettings(),
  )
}

export async function supabaseSaveHomepageSettings(settings: HomepageSettings): Promise<void> {
  await dualWrite(
    'homepage_sections',
    () => saveHomepageSettings(settings),
    async () => {
      const supabase = await createServerSupabaseClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('homepage_sections') as any).upsert(settings)
      if (error) throw error
    },
  )
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function supabaseGetStats(): Promise<AdminStats> {
  return trySupabase(
    'stats',
    async () => {
      const supabase = await createServerSupabaseClient()
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
      if (productsError) throw productsError
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
      const { data: brandsData } = await supabase
        .from('brands')
        .select('*')
      const { data: articlesData } = await supabase
        .from('articles')
        .select('*')
      const { data: routinesData } = await supabase
        .from('routines')
        .select('*')
      const { data: bundlesData } = await supabase
        .from('bundles')
        .select('*')
      const { data: expertsData } = await supabase
        .from('experts')
        .select('*')
      const { data: heroData } = await supabase
        .from('hero_campaigns')
        .select('*')
        .eq('is_active', true)
      const { data: governoratesData } = await supabase
        .from('governorates')
        .select('*')

      const allProducts = (productsData as Record<string, unknown>[]) ?? []
      const stockOf = (p: Record<string, unknown>) =>
        (p.stockQuantity as number) ?? (p.stock as number) ?? 0
      const lowStock = allProducts.filter((p) => {
        const qty = stockOf(p)
        return ((p.inStock as boolean) ?? qty > 0) && qty > 0 && qty <= 10
      }).length
      const outOfStock = allProducts.filter(
        (p) => (p.inStock as boolean) === false || stockOf(p) <= 0,
      ).length

      return {
        productTotal: allProducts.length,
        featuredProducts: allProducts.filter(
          (p) => (p.isFeatured as boolean) || (p.featured as boolean),
        ).length,
        newProducts: allProducts.filter(
          (p) => (p.isNew as boolean) || (p.new as boolean),
        ).length,
        bestSellers: allProducts.filter((p) => (p.isBestSeller as boolean)).length,
        lowStock,
        outOfStock,
        categoryCount: ((categoriesData as unknown[]) ?? []).length,
        brandCount: ((brandsData as unknown[]) ?? []).length,
        routinesCount: ((routinesData as unknown[]) ?? []).length,
        bundlesCount: ((bundlesData as unknown[]) ?? []).length,
        expertsCount: ((expertsData as unknown[]) ?? []).length,
        articlesCount: ((articlesData as unknown[]) ?? []).length,
        offersEngine: null,
        heroActive: ((heroData as unknown[]) ?? []).length > 0,
        enabledGovernorates: ((governoratesData as Governorate[]) ?? []).filter(
          (g) => g.enabled,
        ).length,
      }
    },
    () => computeStats(),
  )
}

// ─── Gift Options ─────────────────────────────────────────────────────────────

type GiftOptionRow = {
  id?: string
  code?: string | null
  name: { ar?: string; en?: string } | null
  description?: { ar?: string; en?: string } | null
  price: number
  image?: string | null
  is_active?: boolean | null
}

/**
 * Deterministic row id derived from the canonical option id (mirrors
 * db/seed-apply.ts slugToUUID). Same option id always yields the same UUID,
 * so upsert(onConflict: 'id') overwrites instead of duplicating rows.
 */
function giftOptionRowId(optionId: string): string {
  return slugToUUID('gift-opt:' + optionId)
}

// camelCase model → snake_case database row (deterministic + symmetric).
function giftOptionToRow(option: GiftOption): GiftOptionRow {
  return {
    id: giftOptionRowId(option.id),
    code: option.id,
    name: { ar: option.labelAr, en: option.labelEn },
    description: { ar: option.descAr, en: option.descEn },
    price: option.price,
    is_active: option.enabled,
  }
}

// Legacy rows (pre-migration, no `code`) are recovered via their canonical name.
function canonicalGiftOptionForRow(row: GiftOptionRow): GiftOption | undefined {
  if (row.code) return DEFAULT_GIFT_OPTIONS.find((option) => option.id === row.code)
  return DEFAULT_GIFT_OPTIONS.find(
    (option) => option.labelAr === row.name?.ar || option.labelEn === row.name?.en,
  )
}

// snake_case database row → camelCase model.
function rowToGiftOption(row: GiftOptionRow): GiftOption {
  const canonical = canonicalGiftOptionForRow(row)
  return {
    id: row.code ?? canonical?.id ?? `gift-${(row.id ?? '').replace(/-/g, '').slice(0, 16)}`,
    labelAr: row.name?.ar ?? '',
    labelEn: row.name?.en ?? '',
    price: row.price ?? 0,
    descAr: row.description?.ar ?? canonical?.descAr ?? '',
    descEn: row.description?.en ?? canonical?.descEn ?? '',
    enabled: row.is_active !== false,
  }
}

export async function supabaseGetGiftOptions(): Promise<GiftOption[]> {
  return trySupabase(
    'gift_options',
    async () => {
      const supabase = await createServerSupabaseClient()
      const { data, error } = await supabase
        .from('gift_options')
        .select('*')
        .order('id')
      if (error) throw error
      return ((data ?? []) as GiftOptionRow[]).map(rowToGiftOption)
    },
    () => listGiftOptions(),
  )
}

export async function supabaseSaveGiftOptions(list: GiftOption[]): Promise<void> {
  await dualWrite(
    'gift_options',
    () => saveGiftOptions(list),
    async () => {
      const supabase = await createServerSupabaseClient()
      const rows = list.map(giftOptionToRow)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('gift_options') as any).upsert(rows, {
        onConflict: 'id',
      })
      if (error) throw error
    },
  )
}

export async function supabaseDeleteGiftOption(optionId: string): Promise<void> {
  await dualWrite(
    'gift_options',
    () => removeGiftOptionLocal(optionId),
    async () => {
      const supabase = await createServerSupabaseClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('gift_options') as any)
        .delete()
        .eq('id', giftOptionRowId(optionId))
      if (error) throw error
    },
  )
}

// ─── Offers ───────────────────────────────────────────────────────────────────

export type OfferRow = {
  id?: string
  title?: { ar?: string; en?: string } | null
  month: number
  year: number
  week: number
  products: unknown[] | null
  start_date?: string | null
  end_date?: string | null
  is_active?: boolean
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

export async function supabaseGetOffers(
  year?: number,
  month?: number,
): Promise<OfferRow[]> {
  return trySupabase(
    'offers',
    async () => {
      const supabase = await createServerSupabaseClient()
      let query = supabase.from('offers').select('*').order('week')
      if (year !== undefined) query = query.eq('year', year)
      if (month !== undefined) query = query.eq('month', month)
      const { data, error } = await query
      if (error) throw error
      return (data as OfferRow[]) ?? []
    },
    () => [],
  )
}

export async function supabaseSaveOffers(rows: OfferRow[]): Promise<void> {
  if (!rows || rows.length === 0) return
  const supabase = await createServerSupabaseClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('offers') as any).upsert(rows, {
    onConflict: 'id',
  })
  if (error) throw error
}

export async function supabaseDeleteOffers(
  year?: number,
  month?: number,
): Promise<void> {
  const supabase = await createServerSupabaseClient()
  let query = supabase.from('offers').delete()
  if (year !== undefined) query = query.eq('year', year)
  if (month !== undefined) query = query.eq('month', month)
  if (year === undefined && month === undefined) {
    // PostgREST requires a WHERE clause — use an always-true filter to clear all
    query = query.neq('id', '00000000-0000-0000-0000-000000000000')
  }
  const { error } = await query
  if (error) throw error
}
