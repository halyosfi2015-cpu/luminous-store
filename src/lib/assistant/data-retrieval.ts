import 'server-only'
import { createAdminClient } from '@/src/lib/supabase'

export interface VerifiedProduct {
  id: string
  slug: string
  nameAr: string
  nameEn: string
  brand: string
  brandAr: string
  category: string
  categoryAr: string
  price: number
  currency: string
  originalPrice?: number
  image: string
  inStock: boolean
  rating: number
  reviewCount: number
  isFeatured: boolean
  isNew: boolean
  isBestSeller: boolean
  isDoctorRecommended: boolean
  skinTypes: string[]
  suitableFor: string[]
  skinConcerns: string[]
  tags: string[]
  // Recommendation-specific fields
  score?: number
  reason?: string
  reasonAr?: string
  type?: string
}

export interface VerifiedRoutine {
  id: string
  slug?: string
  nameAr: string
  nameEn: string
  descriptionAr: string
  descriptionEn: string
  type: string
  typeAr: string
  level: string
  active: boolean
  displayOrder: number
  savingsPercent: number
  duration: string
  forWhom: string[]
  forWhomEn: string[]
  expectedResults: string[]
  expectedResultsEn: string[]
  image?: string
  heroImage?: string
  steps: Array<{
    productId: string
    time: 'morning' | 'evening' | 'both'
    titleAr: string
    titleEn: string
    descriptionAr: string
    descriptionEn: string
  }>
  products: VerifiedProduct[]
}

export interface VerifiedBundle {
  id: string
  slug: string
  nameAr: string
  nameEn: string
  descriptionAr?: string
  descriptionEn?: string
  image?: string
  badge?: string
  badgeAr?: string
  occasion: string[]
  productIds: string[]
  products: VerifiedProduct[]
  originalPrice: number
  bundlePrice: number
  discountPercent: number
  savingsPercent: number
  giftWrap: boolean
  giftWrapPrice: number
  giftCard: boolean
  servicePrice: number
  active: boolean
  displayOrder: number
}

export interface VerifiedShipping {
  governorates: Array<{
    id: string
    name: string
    nameEn: string
    fee: number
    enabled: boolean
  }>
}

export interface VerifiedCampaign {
  id: string
  slug: string
  nameAr: string
  nameEn: string
  descriptionAr?: string
  descriptionEn?: string
  type: string
  image?: string
  badge?: string
  badgeAr?: string
}

export interface VerifiedCategory {
  slug: string
  name: string
  nameAr: string
  description: string
  descriptionAr: string
  image?: string
  coverImage?: string
  icon?: string
  productCount: number
}

const SUBCATEGORY_TO_PARENT: Record<string, string> = {
  cleansers: "skincare", toners: "skincare", serums: "skincare", moisturizers: "skincare",
  sunscreen: "skincare", "eye-care": "skincare", "lip-care": "skincare", masks: "skincare",
  exfoliators: "skincare",
  shampoo: "haircare", "hair-oils": "haircare", "hair-creams": "haircare", conditioner: "haircare",
  "body-wash": "bodycare", "body-lotion": "bodycare", "body-oils": "bodycare",
  "face-makeup": "makeup", "eye-makeup": "makeup", "lip-makeup": "makeup",
  "perfume-women": "perfume", "perfume-men": "perfume", "perfume-musk": "perfume",
  "baby-care": "mother-baby", "teeth-cleansing": "oral-care", mouthwash: "oral-care",
  deodorants: "personal-care", shaving: "personal-care",
}

const CATEGORY_MAP: Record<string, { name: string; nameAr: string; slug: string }> = {
  skincare: { name: "Skincare", nameAr: "العناية بالبشرة", slug: "skincare" },
  haircare: { name: "Haircare", nameAr: "العناية بالشعر", slug: "haircare" },
  bodycare: { name: "Bodycare", nameAr: "العناية بالجسم", slug: "bodycare" },
  makeup: { name: "Makeup", nameAr: "المكياج", slug: "makeup" },
  perfume: { name: "Fragrances", nameAr: "العطور", slug: "perfume" },
  "oral-care": { name: "Oral Care", nameAr: "العناية بالفم والأسنان", slug: "oral-care" },
  "personal-care": { name: "Personal Care", nameAr: "العناية الشخصية", slug: "personal-care" },
  "contact-lenses": { name: "Contact Lenses", nameAr: "العدسات", slug: "contact-lenses" },
  "mother-baby": { name: "Mother & Baby", nameAr: "الأم والطفل", slug: "mother-baby" },
  "health-wellness": { name: "Health & Wellness", nameAr: "الصحة والعافية", slug: "health-wellness" },
  "appliances-tools": { name: "Appliances & Tools", nameAr: "الأجهزة والأدوات", slug: "appliances-tools" },
  "home-fragrance": { name: "Home Fragrance", nameAr: "عطور المنزل", slug: "home-fragrance" },
  accessories: { name: "Accessories", nameAr: "الإكسسوارات", slug: "accessories" },
}

function resolveCategory(tags: string[]): { category: string; categoryAr: string; categorySlug: string } {
  for (const tag of tags) {
    const parent = SUBCATEGORY_TO_PARENT[tag]
    if (parent) {
      const mapped = CATEGORY_MAP[parent]
      if (mapped) return { category: mapped.name, categoryAr: mapped.nameAr, categorySlug: mapped.slug }
    }
    const mapped = CATEGORY_MAP[tag]
    if (mapped) return { category: mapped.name, categoryAr: mapped.nameAr, categorySlug: mapped.slug }
  }
  return { category: "Other", categoryAr: "أخرى", categorySlug: "other" }
}

async function mapProductRow(p: any): Promise<VerifiedProduct> {
  const brand = p.brands ? { name: p.brands.name ?? '', nameAr: p.brands.name_ar ?? p.brands.name ?? '', slug: p.brands.slug ?? '' } : { name: '', nameAr: '', slug: '' }
  const tags = p.tags ?? []
  const { category, categoryAr, categorySlug } = resolveCategory(tags)
  const price = p.pricing?.price ?? 0
  const originalPrice = p.discount && p.discount > 0 ? Math.round(price / (1 - p.discount / 100)) : undefined
  const gallery = (p.gallery?.length ? p.gallery : p.images?.length ? p.images : []).filter(Boolean)
  const heroImage = p.hero_image ?? gallery[0] ?? ''

  return {
    id: p.legacy_id ?? p.id,
    slug: p.slug,
    nameAr: p.name?.ar ?? '',
    nameEn: p.name?.en ?? '',
    brand: brand.name,
    brandAr: brand.nameAr,
    category,
    categoryAr,
    price,
    currency: p.pricing?.currency ?? "YER",
    originalPrice,
    image: heroImage,
    inStock: p.in_stock ?? (p.stock ?? 0) > 0,
    rating: p.rating ?? 0,
    reviewCount: p.review_count ?? 0,
    isFeatured: p.is_featured ?? false,
    isNew: p.is_new ?? false,
    isBestSeller: p.is_best_seller ?? false,
    isDoctorRecommended: p.is_doctor_recommended ?? false,
    skinTypes: p.skin_types ?? [],
    suitableFor: p.suitable_for ?? p.skin_types ?? [],
    skinConcerns: p.skin_concerns ?? [],
    tags,
  }
}

export async function searchProducts(query: string, limit = 10): Promise<VerifiedProduct[]> {
  const supabase = createAdminClient()
  const normalizedQuery = query.toLowerCase()
  
  const { data: products } = await supabase
    .from("products")
    .select(`
      id, legacy_id, slug, name, brand_id, category_id, pricing, gallery, hero_image, images,
      skin_types, suitable_for, skin_concerns, stock, stock_quantity, in_stock,
      rating, review_count, is_featured, is_new, is_best_seller, is_doctor_recommended,
      tags, status, discount,
      brands:brand_id (id, name, name_ar, slug)
    `)
    .eq("status", "active")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .limit(100)

  if (!products) return []

  const mapped = await Promise.all(products.map(mapProductRow))
  return mapped.filter(p => 
    p.nameAr.toLowerCase().includes(normalizedQuery) ||
    p.nameEn.toLowerCase().includes(normalizedQuery) ||
    p.brand.toLowerCase().includes(normalizedQuery) ||
    p.brandAr.toLowerCase().includes(normalizedQuery) ||
    p.category.toLowerCase().includes(normalizedQuery) ||
    p.categoryAr.toLowerCase().includes(normalizedQuery) ||
    p.tags.some(t => t.toLowerCase().includes(normalizedQuery))
  ).slice(0, limit)
}

export async function getProductById(idOrSlug: string): Promise<VerifiedProduct | null> {
  const supabase = createAdminClient()
  const { data: product } = await supabase
    .from("products")
    .select(`
      id, legacy_id, slug, name, brand_id, category_id, pricing, gallery, hero_image, images,
      skin_types, suitable_for, skin_concerns, stock, stock_quantity, in_stock,
      rating, review_count, is_featured, is_new, is_best_seller, is_doctor_recommended,
      tags, status, discount,
      brands:brand_id (id, name, name_ar, slug)
    `)
    .or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`)
    .eq("status", "active")
    .eq("is_active", true)
    .maybeSingle()

  if (!product) return null
  return mapProductRow(product)
}

export async function getProductsByIds(ids: string[]): Promise<VerifiedProduct[]> {
  const supabase = createAdminClient()
  const { data: products } = await supabase
    .from("products")
    .select(`
      id, legacy_id, slug, name, brand_id, category_id, pricing, gallery, hero_image, images,
      skin_types, suitable_for, skin_concerns, stock, stock_quantity, in_stock,
      rating, review_count, is_featured, is_new, is_best_seller, is_doctor_recommended,
      tags, status, discount,
      brands:brand_id (id, name, name_ar, slug)
    `)
    .in("legacy_id", ids)
    .eq("status", "active")
    .eq("is_active", true)

  if (!products) return []
  return Promise.all(products.map(mapProductRow))
}

export async function compareProducts(productIds: string[]): Promise<VerifiedProduct[]> {
  return getProductsByIds(productIds)
}

async function mapRoutineRow(r: any, steps: any[], productMap: Map<string, VerifiedProduct>): Promise<VerifiedRoutine> {
  const routineProducts = (r.products ?? []).map((pid: string) => productMap.get(pid)).filter(Boolean) as VerifiedProduct[]
  
  return {
    id: r.id,
    slug: r.slug,
    nameAr: r.name_ar ?? '',
    nameEn: r.name ?? '',
    descriptionAr: r.description_ar ?? '',
    descriptionEn: r.description ?? '',
    type: r.routine_type ?? 'daily',
    typeAr: r.routine_type_ar ?? 'روتين يومي',
    level: r.routine_level ?? 'standard',
    active: r.is_active !== false,
    displayOrder: r.display_order ?? 0,
    savingsPercent: r.savings_percent ?? 0,
    duration: r.duration ?? '',
    forWhom: r.for_whom ?? [],
    forWhomEn: r.for_whom_en ?? [],
    expectedResults: r.expected_results ?? [],
    expectedResultsEn: r.expected_results_en ?? [],
    image: r.image,
    heroImage: r.hero_image,
    steps: steps.map(s => ({
      productId: s.productId,
      time: s.time_of_day ?? 'both',
      titleAr: s.title_ar ?? '',
      titleEn: s.title_en ?? '',
      descriptionAr: s.description_ar ?? '',
      descriptionEn: s.description_en ?? '',
    })),
    products: routineProducts,
  }
}

export async function getRoutines(): Promise<VerifiedRoutine[]> {
  const supabase = createAdminClient()
  const [routinesRes, rpRes, rsRes] = await Promise.all([
    supabase.from("routines").select("*").eq("is_active", true).order("display_order", { ascending: true }),
    supabase.from("routine_products").select("routine_id, product_id, products(legacy_id)"),
    supabase.from("routine_steps").select("*").order("step_number", { ascending: true }),
  ])

  if (routinesRes.error || !routinesRes.data) return []

  const rpData = rpRes.data as Array<{ routine_id: string; product_id: string; products: { legacy_id: string | null } | null }> ?? []
  const rsData = rsRes.data as Array<{ routine_id: string; product_id: string; step_number: number; time_of_day: string; title_ar: string | null; title_en: string | null; description_ar: string | null; description_en: string | null }> ?? []

  const uuidToLegacy = new Map<string, string>()
  for (const rp of rpData) {
    const rid = rp.routine_id
    const legacy = rp.products?.legacy_id ?? ''
    if (rid && legacy) uuidToLegacy.set(`${rid}:${rp.product_id}`, legacy)
  }

  const stepsByRoutine = new Map<string, typeof rsData>()
  for (const s of rsData) {
    const rid = s.routine_id
    const arr = stepsByRoutine.get(rid) ?? []
    arr.push(s)
    stepsByRoutine.set(rid, arr)
  }

  const allProductIds = Array.from(uuidToLegacy.values())
  const productMap = new Map<string, VerifiedProduct>()
  if (allProductIds.length > 0) {
    const products = await getProductsByIds(allProductIds)
    for (const p of products) productMap.set(p.id, p)
  }

  const routines = await Promise.all(
    (routinesRes.data as any[]).map(async (r: any) => {
      const rid = r.id
      const legacyIds: string[] = []
      for (const [key, legacy] of uuidToLegacy) {
        if (key.startsWith(`${rid}:`)) legacyIds.push(legacy)
      }
      const steps = (stepsByRoutine.get(rid) ?? []).map((s) => ({
        ...s,
        productId: uuidToLegacy.get(`${rid}:${s.product_id}`) ?? s.product_id,
      }))
      return mapRoutineRow(r, steps, productMap)
    })
  )

  return routines.filter(r => r.active)
}

export async function getRoutineById(id: string): Promise<VerifiedRoutine | null> {
  const routines = await getRoutines()
  return routines.find(r => r.id === id || r.slug === id) ?? null
}

export async function getRoutinesByType(type: string): Promise<VerifiedRoutine[]> {
  const routines = await getRoutines()
  return routines.filter(r => r.type === type)
}

async function mapBundleRow(b: any, productMap: Map<string, VerifiedProduct>): Promise<VerifiedBundle> {
  const uuids = (b.products ?? []).map((p: any) => p.product_id)
  const productIds = uuids.map((uuid: string) => productMap.get(uuid)?.id ?? uuid).filter(Boolean)
  const products = productIds.map((id: string) => productMap.get(id)).filter(Boolean) as VerifiedProduct[]
  
  const originalPrice = products.reduce((sum, p) => sum + p.price, 0)
  const discountPercent = b.discount_percent ?? 20
  const bundlePrice = Math.round(originalPrice * (1 - discountPercent / 100))
  
  return {
    id: b.slug ?? b.id,
    slug: b.slug,
    nameAr: b.name_ar ?? '',
    nameEn: b.name_en ?? '',
    descriptionAr: b.description_ar,
    descriptionEn: b.description,
    image: b.image,
    badge: b.badge_ar ?? b.badge,
    badgeAr: b.badge_ar ?? b.badge,
    occasion: Array.isArray(b.occasions) ? b.occasions : [],
    productIds,
    products,
    originalPrice,
    bundlePrice,
    discountPercent,
    savingsPercent: discountPercent,
    giftWrap: b.gift_wrap ?? false,
    giftWrapPrice: b.gift_wrap_price ?? 0,
    giftCard: b.gift_card ?? false,
    servicePrice: b.service_price ?? 0,
    active: b.is_active !== false,
    displayOrder: b.display_order ?? 0,
  }
}

export async function getBundles(): Promise<VerifiedBundle[]> {
  const supabase = createAdminClient()
  const [bundlesRes, bpRes] = await Promise.all([
    supabase.from("bundles").select("*").eq("is_active", true).order("display_order", { ascending: true }),
    supabase.from("bundle_products").select("bundle_id, product_id, products(legacy_id)"),
  ])

  if (bundlesRes.error || !bundlesRes.data) return []

  const bpData = bpRes.data as Array<{ bundle_id: string; product_id: string; products: { legacy_id: string | null } | null }> ?? []

  const productMap = new Map<string, VerifiedProduct>()
  const productUuids = Array.from(new Set(bpData.map((bp: any) => bp.products?.legacy_id).filter(Boolean)))
  if (productUuids.length > 0) {
    const products = await getProductsByIds(productUuids)
    for (const p of products) productMap.set(p.id, p)
  }

  const bundles = await Promise.all(
    (bundlesRes.data as any[]).map(async (b: any) => mapBundleRow(b, productMap))
  )
  return bundles
}

export async function getBundleBySlug(slug: string): Promise<VerifiedBundle | null> {
  const bundles = await getBundles()
  return bundles.find(b => b.slug === slug) ?? null
}

export async function getBundlesByOccasion(occasion: string): Promise<VerifiedBundle[]> {
  const bundles = await getBundles()
  if (occasion === 'all') return bundles
  return bundles.filter(b => b.occasion.includes(occasion))
}

export async function getShippingInfo(): Promise<VerifiedShipping> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from("governorates")
    .select("*")
    .order("name")

  const governorates = (data ?? []).map((r: any) => ({
    id: String(r.id ?? ""),
    name: String(r.name ?? ""),
    nameEn: String(r.nameEn ?? r.name_en ?? ""),
    fee: Number(r.fee ?? 0),
    enabled: r.enabled !== false,
  }))

  return { governorates }
}

export async function getShippingForGovernorate(governorateName: string): Promise<VerifiedShipping['governorates'][0] | null> {
  const shipping = await getShippingInfo()
  const normalized = governorateName.toLowerCase().trim()
  return shipping.governorates.find(g => 
    g.name.toLowerCase() === normalized ||
    g.nameEn.toLowerCase() === normalized ||
    g.id.toLowerCase() === normalized
  ) ?? null
}

export async function getCampaigns(): Promise<VerifiedCampaign[]> {
  const supabase = createAdminClient()
  const now = new Date().toISOString()
  const { data } = await supabase
    .from("campaigns")
    .select("id, slug, name, description, type, status, starts_at, ends_at")
    .eq("is_active", true)
    .in("status", ["running", "scheduled"])
    .order("created_at", { ascending: false })

  if (!data) return []

  return data
    .filter((c: any) => {
      const startsOk = !c.starts_at || c.starts_at <= now
      const endsOk = !c.ends_at || c.ends_at >= now
      return startsOk && endsOk
    })
    .map((c: any) => ({
      id: c.id,
      slug: c.slug,
      nameAr: typeof c.name === 'object' ? (c.name.ar ?? c.name.en ?? '') : (c.name ?? ''),
      nameEn: typeof c.name === 'object' ? (c.name.en ?? c.name.ar ?? '') : '',
      descriptionAr: typeof c.description === 'object' ? (c.description.ar ?? c.description.en ?? '') : (c.description ?? ''),
      descriptionEn: typeof c.description === 'object' ? (c.description.en ?? c.description.ar ?? '') : '',
      type: c.type ?? "promotion",
      image: undefined,
      badge: undefined,
      badgeAr: undefined,
    }))
}

export async function getCategories(): Promise<VerifiedCategory[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .is("parent_category_id", null)
    .order("sort_order")

  if (!data) return []

  return data.map((row: any) => ({
    slug: row.slug,
    name: row.name?.en ?? row.slug,
    nameAr: row.name?.ar ?? row.slug,
    description: row.description?.en ?? "",
    descriptionAr: row.description?.ar ?? "",
    image: row.image,
    coverImage: row.cover_image,
    icon: row.icon,
    productCount: row.product_count ?? 0,
  }))
}

export async function getCategoryBySlug(slug: string): Promise<VerifiedCategory | null> {
  const categories = await getCategories()
  return categories.find(c => c.slug === slug) ?? null
}

export async function getRecommendations(limit = 8, excludeIds: string[] = []): Promise<VerifiedProduct[]> {
  const supabase = createAdminClient()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: eventsRaw } = await supabase
    .from("customer_events")
    .select("entity_id")
    .gte("occurred_at", sevenDaysAgo)
    .eq("event_type", "product_view")
    .not("entity_id", "is", null)

  const events = (eventsRaw ?? []) as Array<{ entity_id: string | null }>

  if (events.length === 0) {
    const { data: featured } = await supabase
      .from("products")
      .select("id, legacy_id, slug, name, pricing, hero_image, gallery, is_featured, is_best_seller, rating, review_count, brands(name, name_ar, slug)")
      .eq("is_active", true)
      .eq("status", "active")
      .eq("is_featured", true)
      .order("display_order", { ascending: true })
      .limit(limit)

    const mapped = await Promise.all((featured ?? []).map(p => mapProductRow(p)))
    return mapped.filter(p => !excludeIds.includes(p.id)).slice(0, limit)
  }

  const viewCounts = new Map<string, number>()
  for (const evt of events) {
    const pid = evt.entity_id
    if (!pid || excludeIds.includes(pid)) continue
    viewCounts.set(pid, (viewCounts.get(pid) || 0) + 1)
  }

  const sorted = [...viewCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit + excludeIds.length)
    .map(([pid, count]) => ({ product_id: pid, view_count: count, score: count }))

  const productIds = sorted.map(s => s.product_id)
  const { data: productsRaw } = await supabase
    .from("products")
    .select("id, legacy_id, slug, name, pricing, hero_image, gallery, is_featured, is_best_seller, rating, review_count, brands(name, name_ar, slug)")
    .in("id", productIds)
    .eq("is_active", true)

  const products = await Promise.all((productsRaw ?? []).map(p => mapProductRow(p)))
  const productMap = new Map(products.map(p => [p.id, p]))

  return sorted
    .filter(s => productMap.has(s.product_id))
    .slice(0, limit)
    .map(s => {
      const p = productMap.get(s.product_id)!
      return {
        ...p,
        score: s.score,
        reason: "trending",
        reasonAr: "رائج هذا الأسبوع",
        type: "trending",
      }
    })
}

export async function getPersonalizationActions(pathname: string, cartItemCount: number, cartValue: number, userAgent: string): Promise<{ actions: unknown[]; matchedRules: unknown[] }> {
  return { actions: [], matchedRules: [] }
}