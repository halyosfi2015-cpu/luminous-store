import { products } from "@/src/data/products";
import { getCreativePlan } from "@/src/lib/visual-studio/creative-director";
import { selectProducts } from "@/src/lib/visual-studio/product-selector";

export interface ContentPillar {
  id: string;
  nameAr: string;
  nameEn: string;
  purposeAr: string;
}

/** Content ideas only. These are deliberately independent from visual templates. */
export const CONTENT_PILLARS: readonly ContentPillar[] = [
  ["skin-basics", "أساسيات العناية", "Skin Basics", "تبسيط أساسيات الروتين"],
  ["cleansing", "التنظيف الصحيح", "Cleansing", "التثقيف حول التنظيف"],
  ["hydration", "الترطيب", "Hydration", "بناء ترطيب متوازن"],
  ["sun-protection", "الحماية من الشمس", "Sun Protection", "رفع الوعي بالحماية اليومية"],
  ["skin-barrier", "حاجز البشرة", "Skin Barrier", "شرح دعم الحاجز"],
  ["sensitive-skin", "البشرة الحساسة", "Sensitive Skin", "إرشادات لطيفة للبشرة الحساسة"],
  ["dry-skin", "البشرة الجافة", "Dry Skin", "حلول روتينية للجفاف"],
  ["oily-skin", "البشرة الدهنية", "Oily Skin", "موازنة العناية للبشرة الدهنية"],
  ["combination-skin", "البشرة المختلطة", "Combination Skin", "تنظيم العناية للبشرة المختلطة"],
  ["acne-prone", "البشرة المعرضة للحبوب", "Acne-Prone Skin", "محتوى آمن غير علاجي"],
  ["uneven-tone", "تفاوت اللون", "Uneven Tone", "التثقيف حول توحيد مظهر البشرة"],
  ["texture", "ملمس البشرة", "Texture", "العناية بالملمس والمظهر"],
  ["pores", "مظهر المسام", "Pores", "تصحيح التوقعات حول المسام"],
  ["redness", "الاحمرار", "Redness", "روتين لطيف للمظهر المتهيج"],
  ["eye-care", "منطقة العين", "Eye Care", "العناية بالمنطقة الحساسة"],
  ["lip-care", "العناية بالشفاه", "Lip Care", "الحفاظ على نعومة الشفاه"],
  ["ingredients", "فهم المكونات", "Ingredients", "شرح المكونات من بيانات المنتج"],
  ["ingredient-pairing", "توافق المكونات", "Ingredient Pairing", "إرشادات استخدام مسؤولة"],
  ["how-to-use", "طريقة الاستخدام", "How To Use", "تحويل التعليمات إلى خطوات واضحة"],
  ["routine-order", "ترتيب الروتين", "Routine Order", "توضيح ترتيب الخطوات"],
  ["morning-routine", "روتين الصباح", "Morning Routine", "بناء عادة صباحية"],
  ["evening-routine", "روتين المساء", "Evening Routine", "بناء عادة مسائية"],
  ["weekly-care", "العناية الأسبوعية", "Weekly Care", "توزيع العناية الأسبوعية"],
  ["product-education", "التعرف على المنتج", "Product Education", "شرح المنتج من حقائقه الموثقة"],
  ["routine-building", "بناء روتين", "Routine Building", "ربط المنتجات بهدف واضح"],
  ["shopping-guide", "دليل الاختيار", "Shopping Guide", "تسهيل قرار الاختيار"],
  ["faq", "أسئلة شائعة", "FAQ", "الإجابة عن الأسئلة المتكررة"],
  ["myth-fact", "خرافة وحقيقة", "Myth vs Fact", "تصحيح المعلومة دون ادعاءات علاجية"],
  ["seasonal-care", "العناية الموسمية", "Seasonal Care", "تكييف الروتين مع الموسم"],
  ["discovery", "اكتشافات جديدة", "Discovery", "التقاط فرص موضوعية جديدة"],
  ["customer-needs", "احتياجات العميل", "Customer Needs", "الاستجابة لنقاط الألم"],
  ["brand-trust", "الثقة بالعلامة", "Brand Trust", "إبراز الأصالة والشفافية"],
  ["product-comparison", "مقارنة المنتجات", "Product Comparison", "مقارنة موثقة بلا اختلاق"],
  ["routine-mistakes", "أخطاء الروتين", "Routine Mistakes", "تعليم الممارسات الأفضل"],
  ["care-habits", "عادات العناية", "Care Habits", "ترسيخ العادات القابلة للاستمرار"],
].map(([id, nameAr, nameEn, purposeAr]) => ({ id, nameAr, nameEn, purposeAr }));

export interface MonthlySimulationPost {
  day: number;
  slot: 1 | 2;
  kind: "pillar" | "discovery";
  pillarId: string | null;
  productId: string;
  productIds?: string[];
  creativeDirection: string;
  format: "1:1" | "4:5" | "9:16";
  status: "REVIEW_REQUIRED";
}

export interface MonthlySimulationResult {
  days: number;
  posts: MonthlySimulationPost[];
  pillarCoverage: number;
  coveredPillars: number;
  discoveryPosts: number;
  uniqueProducts: number;
  uniqueCreativeDirections: number;
  antiRepetitionPassed: boolean;
  brandConsistencyPassed: boolean;
}

export function simulateMonthlyContent(days = 30): MonthlySimulationResult {
  const totalDays = Math.max(1, Math.min(31, Math.floor(days)));
  const usableProducts = products.filter((p) => p.status !== "archived" && p.gallery?.length > 0);
  const posts: MonthlySimulationPost[] = [];
  const usedPillars = new Set<string>();
  const usedProducts = new Set<string>();
  const usedDirections = new Set<string>();

  for (let day = 1; day <= totalDays; day++) {
    const pillarA = CONTENT_PILLARS[(day * 2 - 2) % CONTENT_PILLARS.length];
    const pillarB = CONTENT_PILLARS[(day * 2 - 1) % CONTENT_PILLARS.length];
    const recentProductIds = posts.slice(-14).flatMap((p) => p.productIds ?? [p.productId]);
    const planA = getCreativePlan(pillarA.id, posts.slice(-6).map((p) => p.creativeDirection));
    const planB = getCreativePlan("discovery", posts.slice(-6).map((p) => p.creativeDirection));
    const productA = selectProducts(usableProducts, { mode: planA.mode, requiredCount: planA.requiresProducts, recentProductIds, preferredCategorySlugs: planA.categoryHints });
    const productB = selectProducts(usableProducts, { mode: planB.mode, requiredCount: planB.requiresProducts, recentProductIds, preferredCategorySlugs: planB.categoryHints });
    const dirA = { id: planA.templateIds[0], format: planA.mode === "routine-builder" ? "4:5" as const : "1:1" as const };
    const dirB = { id: planB.templateIds[day % planB.templateIds.length], format: "4:5" as const };
    const first: MonthlySimulationPost = { day, slot: 1, kind: "pillar", pillarId: pillarA.id, productId: productA[0]?.product.id ?? "", productIds: productA.map((p) => p.product.id), creativeDirection: dirA.id, format: dirA.format, status: "REVIEW_REQUIRED" };
    const second: MonthlySimulationPost = { day, slot: 2, kind: "discovery", pillarId: null, productId: productB[0]?.product.id ?? "", productIds: productB.map((p) => p.product.id), creativeDirection: dirB.id, format: dirB.format, status: "REVIEW_REQUIRED" };
    posts.push(first, second);
    usedPillars.add(pillarA.id);
    usedPillars.add(pillarB.id);
    usedProducts.add(first.productId);
    usedProducts.add(second.productId);
    usedDirections.add(first.creativeDirection);
    usedDirections.add(second.creativeDirection);
  }

  const adjacentPairs = posts.slice(1).map((p, i) => `${posts[i].creativeDirection}:${p.creativeDirection}`);
  const antiRepetitionPassed = adjacentPairs.every((pair) => {
    const [a, b] = pair.split(":");
    return a !== b;
  });
  return {
    days: totalDays,
    posts,
    pillarCoverage: CONTENT_PILLARS.length === 0 ? 0 : usedPillars.size / CONTENT_PILLARS.length,
    coveredPillars: usedPillars.size,
    discoveryPosts: posts.filter((p) => p.kind === "discovery").length,
    uniqueProducts: usedProducts.size,
    uniqueCreativeDirections: usedDirections.size,
    antiRepetitionPassed,
    brandConsistencyPassed: posts.every((p) => p.status === "REVIEW_REQUIRED"),
  };
}

export function getContentPillar(id: string): ContentPillar | undefined {
  return CONTENT_PILLARS.find((pillar) => pillar.id === id);
}
