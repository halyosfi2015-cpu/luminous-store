import type { Bundle, BundleOccasion } from "@/src/types/bundle";
import { publishedProductSummaries as productSummaries } from "@/src/data/product-summaries";
import type { ProductSummary } from "@/src/types/product";

function calcOriginalPrice(productIds: string[]): number {
  return productIds.reduce((sum, id) => {
    const p = productSummaries.find((x) => x.id === id);
    return sum + (p?.pricing?.price ?? 0);
  }, 0);
}

function calcBundlePrice(productIds: string[]): number {
  const original = calcOriginalPrice(productIds);
  return Math.round(original * 0.8);
}

export const bundles: Bundle[] = [
  {
    id: "bundle-engagement",
    slug: "bundle-engagement",
    nameAr: "باقة الخطوبة المتألقة",
    nameEn: "Glowing Engagement Bundle",
    descriptionAr: "تشكيلة فاخرة من منتجات العناية بالبشرة والمكياج لتألقي في ليلة الخطوبة",
    descriptionEn: "Luxury skincare & makeup selection for your glowing engagement night",
    occasion: ["bride", "engagement"],
    image: productSummaries.find((p) => p.slug === "yq-629")?.gallery?.[0] || "/images/products/yq-629.png",
    badge: "HOT",
    badgeAr: "مميز",
    productIds: ["yq-629", "yq-129", "yq-1660", "yq-2312"],
    get originalPrice() { return calcOriginalPrice(this.productIds); },
    get bundlePrice() { return calcBundlePrice(this.productIds); },
    savingsPercent: 20,
    giftWrap: true,
    giftWrapPrice: 1500,
    servicePrice: 500,
    giftCard: true,
  },
  {
    id: "bundle-wedding",
    slug: "bundle-wedding",
    nameAr: "باقة العروس الملكية",
    nameEn: "Royal Bridal Bundle",
    descriptionAr: "مجموعة كاملة للعناية بالبشرة والشعر والعطور لتكوني الأجمل في ليلة زفافك",
    descriptionEn: "Complete skincare, hair & fragrance collection for your most beautiful wedding night",
    occasion: ["bride", "wedding"],
    image: productSummaries.find((p) => p.slug === "yq-1261")?.gallery?.[0] || "/images/products/yq-1261.png",
    badge: "PREMIUM",
    badgeAr: "فاخرة",
    productIds: ["yq-1261", "yq-1784", "yq-1067", "yq-754", "yq-2308"],
    get originalPrice() { return calcOriginalPrice(this.productIds); },
    get bundlePrice() { return calcBundlePrice(this.productIds); },
    savingsPercent: 20,
    giftWrap: true,
    giftWrapPrice: 1500,
    servicePrice: 500,
    giftCard: true,
  },
  {
    id: "bundle-valentine",
    slug: "bundle-valentine",
    nameAr: "هدية عيد الحب",
    nameEn: "Valentine's Day Gift",
    descriptionAr: "هدية رومانسية فاخرة مع عطر ومستحضرات تجميل مميزة",
    descriptionEn: "Luxury romantic gift with signature fragrance & beauty essentials",
    occasion: ["valentine", "holidays"],
    image: productSummaries.find((p) => p.slug === "yq-1262")?.gallery?.[0] || "/images/products/yq-1262.png",
    badge: "NEW",
    badgeAr: "جديد",
    productIds: ["yq-1262", "yq-2308", "yq-1457"],
    get originalPrice() { return calcOriginalPrice(this.productIds); },
    get bundlePrice() { return calcBundlePrice(this.productIds); },
    savingsPercent: 20,
    giftWrap: true,
    giftWrapPrice: 1500,
    servicePrice: 500,
    giftCard: true,
  },
  {
    id: "bundle-summer",
    slug: "bundle-summer",
    nameAr: "تشكيلة الصيف المشرقة",
    nameEn: "Bright Summer Collection",
    descriptionAr: "حماية وعناية متكاملة للبشرة والجسم في فصل الصيف",
    descriptionEn: "Complete skin & body protection care for summer season",
    occasion: ["summer"],
    image: productSummaries.find((p) => p.slug === "yq-1660")?.gallery?.[0] || "/images/products/yq-1660.png",
    badge: "-20%",
    badgeAr: "خصم",
    productIds: ["yq-1660", "yq-1775", "yq-1067", "yq-306"],
    get originalPrice() { return calcOriginalPrice(this.productIds); },
    get bundlePrice() { return calcBundlePrice(this.productIds); },
    savingsPercent: 20,
    giftWrap: false,
    giftWrapPrice: 0,
    servicePrice: 0,
    giftCard: false,
  },
];

export function getBundleBySlug(slug: string): Bundle | undefined {
  return bundles.find((b) => b.slug === slug);
}

export function getBundlesByOccasion(occasion: string): Bundle[] {
  if (occasion === "all") return bundles;
  return bundles.filter((b) => b.occasion.includes(occasion as BundleOccasion));
}

export function getBundleProducts(bundle: Bundle): ProductSummary[] {
  return bundle.productIds
    .map((id) => productSummaries.find((p) => p.id === id))
    .filter((p): p is ProductSummary => Boolean(p));
}
