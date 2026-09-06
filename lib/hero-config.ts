import { publishedProductSummaries as productSummaries, routines } from "@/src/data/product-summaries";
import { getRoutines, resolveRoutineProducts } from "@/src/data/routines-store";
import { getTaxonomySummariesForNode } from "@/src/lib/taxonomy";
import type { ProductSummary } from "@/src/types/product";

export interface HeroSectionConfig {
  id: string;
  labelAr: string;
  labelEn: string;
  categorySlugs: string[];
  gradientVar: string;
  copyKeys: (keyof typeof HERO_COPY)[];
  minProducts: number;
  maxProductes: number;
  heroProductRatio: number;
  enabled: boolean;
  sortOrder: number;
  targetUrl: string;
}

export function getDailyKey(): string {
  return new Date().toISOString().split("T")[0];
}

export function getSessionId(): string {
  return "luminous-derma";
}

export function getHeroSeed(): number {
  const combined = `${getSessionId()}-${getDailyKey()}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash) + combined.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function createRNG(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | 0)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getRoutineProducts(): ProductSummary[] {
  if (typeof window !== "undefined") {
    return getRoutines().flatMap(r => resolveRoutineProducts(r, productSummaries));
  }
  return routines.flatMap(r =>
    r.products.map(id => productSummaries.find(p => p.id === id)).filter(Boolean)
  ) as ProductSummary[];
}

export const HERO_SECTIONS: HeroSectionConfig[] = [
  {
    id: "skincare",
    labelAr: "العناية بالبشرة",
    labelEn: "Skincare",
    categorySlugs: ["skincare", "bodycare"],
    gradientVar: "hero-grad-skincare",
    copyKeys: ["skincare"],
    minProducts: 5,
    maxProductes: 7,
    heroProductRatio: 0.38,
    enabled: true,
    sortOrder: 1,
    targetUrl: "/categories/skincare",
  },
  {
    id: "makeup",
    labelAr: "المكياج",
    labelEn: "Makeup",
    categorySlugs: ["makeup"],
    gradientVar: "hero-grad-makeup",
    copyKeys: ["makeup"],
    minProducts: 4,
    maxProductes: 6,
    heroProductRatio: 0.4,
    enabled: true,
    sortOrder: 2,
    targetUrl: "/categories/makeup",
  },
  {
    id: "haircare",
    labelAr: "العناية بالشعر",
    labelEn: "Haircare",
    categorySlugs: ["haircare", "appliances-tools"],
    gradientVar: "hero-grad-haircare",
    copyKeys: ["haircare"],
    minProducts: 4,
    maxProductes: 6,
    heroProductRatio: 0.4,
    enabled: true,
    sortOrder: 3,
    targetUrl: "/categories/haircare",
  },
  {
    id: "fragrance",
    labelAr: "العطور والروائح",
    labelEn: "Fragrance",
    categorySlugs: ["perfume", "home-fragrance"],
    gradientVar: "hero-grad-fragrance",
    copyKeys: ["fragrance"],
    minProducts: 4,
    maxProductes: 6,
    heroProductRatio: 0.35,
    enabled: true,
    sortOrder: 4,
    targetUrl: "/categories/perfume",
  },
  {
    id: "routines",
    labelAr: "الروتينات",
    labelEn: "Routines",
    categorySlugs: [],
    gradientVar: "hero-grad-routines",
    copyKeys: ["routines"],
    minProducts: 5,
    maxProductes: 7,
    heroProductRatio: 0.35,
    enabled: true,
    sortOrder: 5,
    targetUrl: "/products",
  },
];

export const HERO_COPY: Record<string, string[]> = {
  skincare: [
    "لأن الإشراقة الحقيقية تبدأ من العناية الصحيحة. ليس كل ما يناسب الآخرين... يناسب بشرتك.",
    "كل بشرة تروي قصة. الروتين الذكي يجعل النتيجة تتحدث.",
    "الجمال لا يُبنى في يوم... بل بعناية تتكرر كل يوم.",
    "بشرتك ليست غلافًا... هي الصفحة الأولى لذاتكِ.",
    "تفاصيلٌ صغيرة على دربٍ طويل. ابدئيه بوعي.",
    "الوقاية أجمل من العلاج. راقبي بشرتكِ قبل أن تطلبيه.",
    "المعرفة + العناية = إشراقةٌ لا تُرى، بل تُشعر.",
    "خطوة واحدة اليوم... تُغيّركِ الأسبوع القادم.",
  ],
  makeup: [
    "الجمال الحقيقي لا يغطّي. يبرز ما كان مخفيًا.",
    "الألوان التي تنسجم معك... ما تُختار. تُكتشف.",
    "لمسة واحدة... ثقةٌ تدوم طوال اليوم.",
    "مكياجك لا يُغيّر شخصيتك. يُبرزها.",
    "الثقة ليست مكياجًا. لكن المكياج يساعدها على التحدّث.",
    "أناقة التفاصيل الصغيرة... تصنع الفرق الكبير.",
    "كل لمسةٍ خيّرة... تحكي جزءًا من قصتكِ.",
    "الواقعية جميلة. الخيال؟ أجمل. امزجي بينهما.",
  ],
  haircare: [
    "الشعر الصحي يبدأ من الجذر. العناية الصحيحة تُغيّر كل شيء.",
    "كل خصلة تستحق عناية. ليس عنايةً لكل الشعر...",
    "الجذور قوية، فالنهاية أنيقة. البداية الصحيحة = النهاية المميزة.",
    "الشعر اللي يرشّحه ريح البحر، ما يقدر يوصف بوصف.",
    "نعومةٌ حقيقية ما تُقلب من التكسر. تُصنع من الداخل.",
    "العناية ليست ماسكًا. هي احترامٌ لكل خصلة.",
    "التغذية لا تنتهي برشٍّ واحد. الاستمرارية هي المفتاح.",
    "الشعر اللي ينعكس... يعكس جمال صاحبته.",
  ],
  fragrance: [
    "العطر ليس رائحةً. هو أولُ انطباعٍ يبقى.",
    "بعض الروائح... تُصبح ذكريات. اختاري التي تُعاد.",
    "عطرك ليس توقيعًا. إنه صوتك حين تمرّ.",
    "الفخامة ما تُرى. تُشعر. والرائحة؟ هي بصمتها.",
    "العطر الصحيح يُختاره ذوقك... ولا يسألك عن المنتج.",
    "رائحة تشبه نفسك ما تُنسى. تُذكّري بها كل مرة.",
    "بعض العطور تقول «مرحبًا». وبعضها يقول «مرحبًا بكِ مرة ثانية».",
    "التوقيع العطري... ليس اسمًا. إنه إحساس.",
  ],
  routines: [
    "الروتين ما يعني روتينًا. يعني نيةً ذكيّة في كل خطوة.",
    "كل خطوةٍ مررتيها... صنعتِ اليوم الذي تعيشينه الآن.",
    "الاستمرارية ليست مهمة. إنها ذكاءٌ بسيط.",
    "الروتين الصحيح... ما ينتظر. يبدأ.",
    "لا تبحثي عن «أفضل روتين». ابحثي عن «روتينك».",
    "الوقت ما يكفي؟ الروتين الذكي يوفره لك.",
    "الوقاية أجمل من العلاج. الروتين وقايةٌ ذكية.",
    "التكرار ما يهم. النية تغيّر كل مرة.",
  ],
  global: [
    "Luminous ليست ماركة. إنها طريقة تفكير.",
    "ما نبيع منتجات. نقدّم حلولًا.",
    "الجمال الحقيقي ما يُقاس. يُشعر.",
    "ببساطةٍ أفضل. هذا كل ما نطلبه.",
    "الذوق ليس مزاجًا. إنه اختيارٌ مدروس.",
    "الجودة ما تُعلن. تُلمس.",
    "التميّز في التفاصيل... التي تتلمّحينها لو كلّفكِ الأمر.",
    "Luminous. ليست للجميع. لأنها لكِ أنتِ.",
    "ما نتبع الربيع. نصنع العصر.",
    "البساطة أنيقة. والأناقة بسيطة.",
  ],
};

// المجموع: 8 + 8 + 8 + 8 + 8 + 10 = 50 رسالة
export const totalMessages = 50;

export function getProductCount(): number {
  return 6;
}

function getSessionProducts(sectionId: string): ProductSummary[] {
  if (typeof window === "undefined") return [];
  const stored = sessionStorage.getItem("luminous-hero-products");
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as { seed: number; sectionId: string; products: ProductSummary[] };
      if (
        parsed &&
        parsed.seed === getHeroSeed() &&
        parsed.sectionId === sectionId &&
        Array.isArray(parsed.products)
      ) {
        return parsed.products;
      }
    } catch {}
  }
  return [];
}

function setSessionProducts(sectionId: string, products: ProductSummary[]): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      "luminous-hero-products",
      JSON.stringify({ seed: getHeroSeed(), sectionId, products }),
    );
  } catch {}
}

export function getProductsForSection(sectionId: string, count: number, sceneKey: number = 0): ProductSummary[] {
  const section = HERO_SECTIONS.find(s => s.id === sectionId);
  if (!section) return [];

  // Client rotation scenes (sceneKey > 0) reuse the cached set for a stable marquee.
  // Initial render (sceneKey === 0) NEVER reads the cache so the client computes the
  // exact same deterministic products as the server during hydration.
  const cached = getSessionProducts(sectionId);
  if (cached && cached.length === count && sceneKey > 0) {
    return cached;
  }

  const pool: ProductSummary[] = [];

  if (section.id === "routines") {
    const routineProducts = getRoutineProducts();
    pool.push(...routineProducts);
  } else {
    const seen = new Set<string>();
    for (const slug of section.categorySlugs) {
      const matched = getTaxonomySummariesForNode(productSummaries, slug);
      for (const p of matched) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          pool.push(p);
        }
      }
    }
  }

  if (pool.length === 0) return [];

  /* Use sceneKey alongside seed to produce different selections each scene */
  const rng = createRNG(getHeroSeed() + section.sortOrder + sceneKey * 137);

  /* Shuffle the pool for variety */
  const shuffled = [...pool].sort(() => rng() - 0.5);

  /* Select first N products */
  const result = shuffled.slice(0, count);

  /* Cache the initial mount set (sceneKey === 0) so rotation scenes stay stable on the client */
  if (sceneKey === 0) {
    setSessionProducts(sectionId, result);
  }

  return result;
}

// خريطة لتذكر آخر رسالة معروضة لكل قسم حتى لا تتكرر نفس الرسالة
const lastCopyMap = new Map<string, string>();

export function getHeroCopy(sectionId: string): string {
  const section = HERO_SECTIONS.find(s => s.id === sectionId);
  if (!section) return "";

  // جمع كل رسائل الأقسام المحددة للقسم الحالي
  const allMessages = section.copyKeys.flatMap(key => HERO_COPY[key] || []);

  if (allMessages.length === 0) return "";

  const rng = createRNG(getHeroSeed() + allMessages.length);

  // Server: deterministic — no mutable module state, so SSR matches client hydration
  if (typeof window === "undefined") {
    return allMessages[Math.floor(rng() * allMessages.length)];
  }

  // Client: avoid repeating the last shown message (lastCopyMap is empty on first mount → matches server)
  const lastIndex = allMessages.findIndex(m => m === lastCopyMap.get(sectionId));
  let idx: number;

  if (allMessages.length === 1) {
    idx = 0;
  } else if (lastIndex >= 0) {
    // استبعاد آخر رسالة معروضة
    const available = allMessages.filter((_, i) => i !== lastIndex);
    idx = allMessages.indexOf(available[Math.floor(rng() * available.length)]);
  } else {
    idx = Math.floor(rng() * allMessages.length);
  }

  const message = allMessages[idx];
  lastCopyMap.set(sectionId, message);
  return message;
}

export function getEnabledSections(): HeroSectionConfig[] {
  return [...HERO_SECTIONS]
    .filter(s => s.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
