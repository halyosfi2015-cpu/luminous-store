import 'server-only'

export type AssistantIntent =
  | 'product_search'
  | 'product_details'
  | 'product_comparison'
  | 'routine_guidance'
  | 'bundle_discovery'
  | 'category_discovery'
  | 'shipping_info'
  | 'campaign_info'
  | 'recommendations'
  | 'store_help'
  | 'general_question'
  | 'unclear'

export interface ClassifiedIntent {
  intent: AssistantIntent
  confidence: number
  entities: {
    productNames?: string[]
    categorySlugs?: string[]
    routineTypes?: string[]
    bundleSlugs?: string[]
    governorateNames?: string[]
    comparisonProducts?: string[]
  }
  needsClarification: boolean
  clarificationQuestion?: string
}

const INTENT_KEYWORDS: Record<AssistantIntent, { ar: string[]; en: string[] }> = {
  product_search: {
    ar: ['أبحث عن', 'أريد', 'ابحث', 'منتج', 'منتجات', 'أفضل', 'مناسب', 'للبشرة', 'للشعر', 'مكياج', 'عطر', 'بخور'],
    en: ['looking for', 'search', 'find', 'product', 'products', 'best', 'suitable', 'for skin', 'for hair', 'makeup', 'perfume', 'bakhoor']
  },
  product_details: {
    ar: ['سعر', 'كم سعر', 'مكونات', 'فوائد', 'طريقة استخدام', 'معلومات', 'تفاصيل', 'متوفر', 'متاح', 'متاحة'],
    en: ['price', 'how much', 'ingredients', 'benefits', 'how to use', 'info', 'details', 'available', 'in stock']
  },
  product_comparison: {
    ar: ['فرق', 'مقارنة', 'أفضل بين', 'أيهما', 'مقارنة بين', 'اختلاف'],
    en: ['compare', 'difference', 'vs', 'versus', 'better between', 'which is better']
  },
  routine_guidance: {
    ar: ['روتين', 'رعاية', 'خطوات', 'ترتيب', 'برنامج عناية', 'نظام عناية', 'أريد روتين', 'أحتاج روتين', 'روتين يومي', 'روتين أسبوعي'],
    en: ['routine', 'skincare routine', 'steps', 'order', 'care program', 'regimen', 'want routine', 'need routine', 'daily routine', 'weekly routine']
  },
  bundle_discovery: {
    ar: ['باقة', 'باقات', 'مجموعة', 'هدية', 'عرض', 'خصم باقة', 'باقات العرائس', 'باقات الخطوبة', 'باقات الصيف', 'باقة الخطوبة', 'باقة العروس', 'متاحة', 'متوفرة'],
    en: ['bundle', 'bundles', 'set', 'gift', 'offer', 'bundle discount', 'bridal bundles', 'engagement bundles', 'summer bundles', 'available']
  },
  category_discovery: {
    ar: ['فئة', 'تصنيف', 'أقسام', 'أنواع', 'ماذا يوجد في', 'فئات', 'أقسام المنتجات', 'تصنيفات', 'فئات المنتجات', 'ماذا يوجد', 'قائمة الفئات'],
    en: ['category', 'categories', 'section', 'types', 'what is in', 'product categories', 'categories list', 'list categories']
  },
  shipping_info: {
    ar: ['شحن', 'توصيل', 'رسوم', 'مدة', 'وصول', 'محافظة', 'مدينة', 'صنعاء', 'عدن', 'تعز', 'كم تكلفة الشحن', 'سعر الشحن', 'تكلفة التوصيل', 'رسوم التوصيل'],
    en: ['shipping', 'delivery', 'fee', 'cost', 'time', 'governorate', 'city', 'sana', 'aden', 'taiz', 'shipping cost', 'delivery fee', 'shipping price']
  },
  campaign_info: {
    ar: ['حملة', 'عروض', 'تخفيضات', 'خصومات', 'كوبون', 'كود خصم', 'عرض خاص'],
    en: ['campaign', 'offers', 'discounts', 'sale', 'coupon', 'promo code', 'special offer']
  },
  recommendations: {
    ar: ['اقتراح', 'تنصح', 'تنصحني', 'موصى به', 'مقترح', 'ماذا تنصح', 'رائج', 'الأكثر مبيعاً', 'تريند', 'توصيات', 'منتجات رائجة'],
    en: ['recommend', 'suggest', 'recommendation', 'what do you suggest', 'recommended', 'trending', 'best selling', 'trending products', 'recommendations']
  },
  store_help: {
    ar: ['مساعدة', 'كيف', 'أين', 'متى', 'سياسة', 'إرجاع', 'استبدال', 'دفع', 'حساب', 'طلبية'],
    en: ['help', 'how', 'where', 'when', 'policy', 'return', 'exchange', 'payment', 'account', 'order']
  },
  general_question: {
    ar: ['ما هو', 'ما هي', 'من أنتم', 'لومينوس', 'معلومات عن المتجر'],
    en: ['what is', 'who are', 'luminous', 'about store', 'store info']
  },
  unclear: {
    ar: [],
    en: []
  }
}

const CLARIFICATION_QUESTIONS: Record<AssistantIntent, string> = {
  product_search: 'ما نوع المنتج الذي تبحث عنه؟ (مثال: سيروم، مرطب، منظف، عطر...)',
  product_details: 'ما اسم المنتج الذي تريد معرفة معلومات عنه؟',
  product_comparison: 'ما هما المنتجان اللذان تريد مقارنتهما؟',
  routine_guidance: 'ما نوع الروتين الذي تبحث عنه؟ (يومي، أسبوعي، للبشرة الجافة، للدهنية...)',
  bundle_discovery: 'ما المناسبة أو نوع الباقة التي تبحث عنها؟ (عرائس، صيف، خطوبة...)',
  category_discovery: 'ما الفئة التي تريد استكشافها؟',
  shipping_info: 'إلى أي محافظة تريد معرفة معلومات الشحن؟',
  campaign_info: 'هل تبحث عن عرض معين أو عروض عامة؟',
  recommendations: 'ما نوع المنتجات التي تريد توصيات لها؟',
  store_help: 'كيف يمكنني مساعدتك؟ (شحن، إرجاع، دفع، حساب...)',
  general_question: 'ما الذي تريد معرفته عن متجر لومينوس؟',
  unclear: 'لم أفهم طلبك بوضوح. هل يمكنك إعادة صياغة سؤالك؟'
}

function normalizeText(text: string): string {
  return text.toLowerCase().trim()
}

function calculateKeywordScore(text: string, keywords: string[]): number {
  let score = 0
  const normalizedText = normalizeText(text)
  for (const keyword of keywords) {
    if (normalizedText.includes(normalizeText(keyword))) {
      score += keyword.length * 1.5
    }
  }
  return score
}

function extractEntities(text: string): ClassifiedIntent['entities'] {
  const entities: ClassifiedIntent['entities'] = {}
  
  // Extract potential product names (capitalized words or Arabic product-like patterns)
  const productMatches = text.match(/[A-Za-z]{3,}|[\u0600-\u06FF]{3,}/g) || []
  entities.productNames = productMatches.slice(0, 5)
  
  // Check for comparison patterns
  const vsMatch = text.match(/(.+?)\s+(?:vs| مقابل| ضد| أو)\s+(.+)/i)
  if (vsMatch) {
    entities.comparisonProducts = [vsMatch[1].trim(), vsMatch[2].trim()]
  }
  
  return entities
}

export function classifyIntent(userMessage: string): ClassifiedIntent {
  const normalized = normalizeText(userMessage)
  
  let bestIntent: AssistantIntent = 'unclear'
  let bestScore = 0
  const scores: Record<AssistantIntent, number> = {} as Record<AssistantIntent, number>
  
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    const arScore = calculateKeywordScore(normalized, keywords.ar)
    const enScore = calculateKeywordScore(normalized, keywords.en)
    const totalScore = arScore + enScore
    scores[intent as AssistantIntent] = totalScore
    
    if (totalScore > bestScore) {
      bestScore = totalScore
      bestIntent = intent as AssistantIntent
    }
  }
  
  // Check for explicit comparison patterns
  if (normalized.includes('vs') || normalized.includes('مقارنة') || normalized.includes('فرق')) {
    bestIntent = 'product_comparison'
    bestScore = Math.max(bestScore, 10)
  }

  // Boost bundle_discovery when bundle terms are present
  const bundleTerms = ['باقة', 'باقات', 'مجموعة', 'هدية', 'عرض', 'خصم باقة', 'باقة الخطوبة', 'باقة العروس', 'باقات العرائس']
  if (bundleTerms.some(term => normalized.includes(term)) && bestIntent !== 'bundle_discovery') {
    const bundleScore = calculateKeywordScore(normalized, INTENT_KEYWORDS.bundle_discovery.ar) + 
                        calculateKeywordScore(normalized, INTENT_KEYWORDS.bundle_discovery.en)
    if (bundleScore > bestScore * 0.8) {
      bestIntent = 'bundle_discovery'
      bestScore = Math.max(bestScore, bundleScore)
    }
  }
  
  const entities = extractEntities(userMessage)
  
  // Determine if clarification is needed
  const needsClarification = bestScore < 5 || bestIntent === 'unclear'
  const confidence = Math.min(bestScore / 20, 1)
  
  return {
    intent: bestIntent,
    confidence,
    entities,
    needsClarification,
    clarificationQuestion: needsClarification ? CLARIFICATION_QUESTIONS[bestIntent] : undefined
  }
}

export function isArabic(text: string): boolean {
  if (!text || typeof text !== 'string') return false
  return /[\u0600-\u06FF]/.test(text)
}

export function getSupportedLanguages(): { code: string; name: string; nativeName: string }[] {
  return [
    { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
    { code: 'en', name: 'English', nativeName: 'English' }
  ]
}