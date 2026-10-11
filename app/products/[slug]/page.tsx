import type { Metadata } from "next";
import Container from "@/components/ui/Container";
import ProductBreadcrumb from "@/components/product/ProductBreadcrumb";
import ProductGallery from "@/components/product/ProductGallery";
import ProductInfo from "@/components/product/ProductInfo";
import ProductPurchase from "@/components/product/ProductPurchase";
import ProductTabs from "@/components/product/ProductTabs";

import RelatedProducts from "@/components/product/RelatedProducts";
import ProductAnalytics from "@/components/analytics/ProductAnalytics";

import { notFound } from "next/navigation";
import { isPublished } from "@/src/lib/publication";
import { getCanonicalProductBySlug } from "@/src/lib/product-dal";
import { products as staticProducts, getProductBySlug as getStaticProductBySlug } from "@/src/data/products";
import { getServerProducts } from "@/src/lib/server-products";
import { safeRatingDisplay, safeReviewCountDisplay } from "@/lib/ratings";
import type { ProductSummary } from "@/src/types/product";

export async function generateStaticParams() {
  // Keep product pages on-demand so the build does not materialize thousands
  // of catalog pages in memory. Deep links are still served by the dynamic
  // params path and are validated against the canonical DAL at request time.
  return [];
}

export const revalidate = 60;
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = (await getCanonicalProductBySlug(slug)) ?? getStaticProductBySlug(slug);
  if (!product) return {};
  return {
    title: `${product.name.ar} - Luminous Derma`,
    description: product.description.ar,
    alternates: { canonical: `https://luminousderma.com/products/${product.slug}` },
    openGraph: { title: product.name.ar, description: product.description.ar, images: [{ url: product.gallery[0], width: 600, height: 600 }] },
  };
}

/**
 * Product page component for Luminous Derma storefront.
 * Displays product details, gallery, purchase info, and cheaper alternatives.
 */
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Canonical commerce truth (price/stock/active) with static identity fallback.
  const product = (await getCanonicalProductBySlug(slug)) ?? getStaticProductBySlug(slug);
  if (!product || !isPublished(product)) notFound();

  // Related products — tiered relevance, never random:
  // 1) same-product alternatives  2) same category  3) same family
  // 4) same-goal companions. Hides when nothing relevant.
  const CATEGORY_FAMILY: Record<string, string> = {
    skincare: "care", bodycare: "care", haircare: "care", "oral-care": "care",
    "personal-care": "care", "mother-baby": "care", "health-wellness": "care",
    makeup: "beauty", perfume: "beauty", "contact-lenses": "beauty",
    accessories: "beauty", "appliances-tools": "beauty", "home-fragrance": "beauty",
  };
  // الدقيقة ← الأب (الستاتيك يستخدم perfume-men والسيرفر يستخدم perfume)
  const FINE_TO_PARENT: Record<string, string> = {
    cleansers: "skincare", exfoliators: "skincare", "eye-care": "skincare", "lip-care": "skincare",
    masks: "skincare", moisturizers: "skincare", serums: "skincare", sunscreen: "skincare", toners: "skincare",
    conditioner: "haircare", "hair-creams": "haircare", "hair-dyes": "haircare", "hair-masks": "haircare",
    "hair-oils": "haircare", "hair-styling": "haircare", "hair-treatments": "haircare", shampoo: "haircare", haircare: "haircare",
    "body-care": "bodycare", "body-lotion": "bodycare", "body-oils": "bodycare", "body-scrubs": "bodycare",
    "body-wash": "bodycare", "foot-care": "bodycare", "hand-care": "bodycare", "nail-care": "bodycare",
    "eye-makeup": "makeup", "face-makeup": "makeup", "lip-makeup": "makeup", makeup: "makeup", "makeup-tools": "makeup",
    perfume: "perfume", "perfume-gift-sets": "perfume", "perfume-men": "perfume", "perfume-musk": "perfume",
    "perfume-women": "perfume", "bakhoor-oud": "perfume", "bakhoor-premium": "perfume",
    "oral-care": "oral-care", "appliances-teeth": "oral-care",
    deodorants: "personal-care", "appliances-shaving": "personal-care",
    "contact-lenses": "contact-lenses", "baby-care": "mother-baby", vitamins: "health-wellness",
    "appliances-hair": "appliances-tools", "beauty-tools": "appliances-tools", "hair-tools": "appliances-tools", tools: "appliances-tools",
  };
  const parentOf = (s: string | undefined) => {
    if (!s) return "other";
    if (CATEGORY_FAMILY[s]) return s;
    return FINE_TO_PARENT[s] ?? "other";
  };
  // بديل المنتج: نفس النوع من أي ماركة (مرطب فيتشي ← كل المرطبات)
  const TYPE_KEYWORDS = [
    "مرطب", "غسول", "منظف", "واقي شمس", "واقي", "شامبو", "بلسم", "سيروم",
    "كريم", "لوشن", "عطر", "مسك", "ماسك", "تونر", "معجون", "مزيل عرق",
    "مقشر", "زيت شعر", "صابون", "غسول فم", "ماسكرا", "أحمر شفاه", "روج",
    "فاونديشن", "بودرة", "شفر", "ماكينة", "عدسات", "حفاض", "صبغة", "حناء",
    "كحل", "برايمر", "مثبت", "مزيل مكياج", "مخمري", "بخور", "عود",
  ];
  const GOAL_COMPANIONS: { match: string[]; want: string[] }[] = [
    { match: ["حلاق", "شفر", "موس", "ذقن", "لحية"], want: ["شفر", "موس", "ماكين", "حلاق", "ما بعد الحلاقة", "رغوة", "جل حلاقة"] },
    { match: ["صبغ", "لون الشعر", "حناء"], want: ["أوكسجين", "مظهر", "صبغ", "حناء", "فرشاة", "قفاز"] },
    { match: ["عدس"], want: ["محلول", "عدس"] },
    { match: ["أساس", "فاونديشن", "مكياج", "ماسكرا", "أحمر شفاه", "روج"], want: ["فرش", "اسفنج", "برايمر", "مثبت", "مزيل مكياج"] },
    { match: ["عطر", "مسك", "بخور", "عود"], want: ["مسك", "مخمرية", "بخور", "عود", "معطر"] },
    { match: ["أسنان", "معجون"], want: ["فرشاة", "خيط", "غسول فم", "معجون"] },
    { match: ["طفل", "رضيع", "حفاض"], want: ["حفاض", "مناديل", "أطفال"] },
    { match: ["شامبو", "شعر"], want: ["بلسم", "ماسك", "زيت شعر", "سيروم"] },
    { match: ["بشرة", "وجه", "كريم"], want: ["غسول", "تونر", "سيروم", "مرطب", "واقي شمس"] },
  ];
  // مطابقة بالكلمة الكاملة: "عطر" لا يطابق "معطرة"/"معطر"
  const BROKEN_PLURALS: Record<string, string[]> = {
    "عطر": ["عطور"], "مسك": ["مسوك"], "عود": ["أعواد"],
  };
  const tokensOf = (s: string) =>
    (s || "")
      .replace(/[أإآ]/g, "ا")
      .split(/[^ء-غف-ي0-9a-zA-Z]+/)
      .filter(Boolean);
  const stemTok = (t: string) => {
    let w = t.replace(/^ال/, "");
    const pl = Object.entries(BROKEN_PLURALS).find(([, forms]) => forms.includes(w));
    if (pl) return pl[0];
    w = w.replace(/(ات|ون|ين)$/, "").replace(/ة$/, "");
    return w;
  };
  const hasWord = (hay: string, kw: string) => {
    const kws = kw.split(/\s+/).map(stemTok).filter(Boolean);
    const toks = tokensOf(hay).map(stemTok);
    return kws.length > 0 && kws.every((k) => toks.includes(k));
  };
  let related: ProductSummary[] = [];
  try {
    const liveCatalog = await getServerProducts();
    const pool = (liveCatalog.products.length > 0 ? liveCatalog.products : staticProducts) as unknown as ProductSummary[];
    const picked: ProductSummary[] = [];
    const take = (list: ProductSummary[]) => {
      for (const p of list) {
        if (picked.length >= 8) break;
        if (p.id !== product.id && !picked.some((x) => x.id === p.id)) picked.push(p);
      }
    };
    const hayOf = (p: ProductSummary) => `${p.name?.ar ?? ""} ${(p as { tags?: string[] }).tags?.join(" ") ?? ""}`;
    const haySelf = hayOf(product as unknown as ProductSummary);
    // 1) بديل نفس المنتج: نفس النوع من ماركات مختلفة أولاً ثم الباقي —
    // وداخلها أولوية لنفس التصنيف ثم نفس الجنس (رجالي ← رجالي) حتى لا يزاحم كريم اليد عطراً
    const typeHit = TYPE_KEYWORDS.find((t) => hasWord(haySelf, t));
    if (typeHit) {
      // استبعاد النفي: "بدون عطر" ليس عطراً
      const notNegated = (p: ProductSummary) => {
        const n = p.name?.ar ?? "";
        return !/(بدون|خالي|خالية|خالٍ|بلا|من غير)/.test(n) || !hasWord(n, typeHit);
      };
      const GENDER: Record<string, string[]> = {
        men: ["رجالي", "للرجال", "رجال", "men"],
        women: ["نسائي", "للنساء", "نساء", "حريمي", "women"],
        kids: ["أطفال", "اطفال", "ولادي", "بناتي"],
      };
      const genderToks = (s: string) => tokensOf(s).map((t) => t.replace(/^ال/, ""));
      const selfToks = genderToks(haySelf);
      const selfGender = Object.keys(GENDER).find((g) => GENDER[g].some((w) => selfToks.includes(w)));
      const candGender = (p: ProductSummary) => {
        const t = genderToks(p.name?.ar ?? "");
        return Object.keys(GENDER).find((g) => GENDER[g].some((w) => t.includes(w)));
      };
      const isAlt = (p: ProductSummary) => hasWord(hayOf(p), typeHit) && notNegated(p);
      const sameCat = (p: ProductSummary) => parentOf(p.categorySlug) === parentOf(product.categorySlug);
      const diffBrand = (p: ProductSummary) => p.brand !== product.brand;
      const sameGender = (p: ProductSummary) => !selfGender || candGender(p) === selfGender;
      const noGender = (p: ProductSummary) => !candGender(p);
      take(pool.filter((p) => isAlt(p) && sameCat(p) && diffBrand(p) && sameGender(p)));
      take(pool.filter((p) => isAlt(p) && sameCat(p) && diffBrand(p) && noGender(p)));
      take(pool.filter((p) => isAlt(p) && sameCat(p) && diffBrand(p)));
      take(pool.filter((p) => isAlt(p) && sameCat(p)));
      take(pool.filter((p) => isAlt(p) && diffBrand(p)));
      take(pool.filter((p) => isAlt(p)));
    }
    // 2) نفس التصنيف (مقارناً بالأب)
    if (picked.length < 8) {
      take(pool.filter((p) => parentOf(p.categorySlug) === parentOf(product.categorySlug)));
    }
    // 3) نفس العائلة (عناية/تجميل)
    const fam = CATEGORY_FAMILY[parentOf(product.categorySlug ?? "")];
    if (picked.length < 8 && fam) {
      take(pool.filter((p) => CATEGORY_FAMILY[parentOf(p.categorySlug ?? "")] === fam));
    }
    // 4) مكملات نفس الهدف
    if (picked.length < 8) {
      const wants = GOAL_COMPANIONS.filter((g) => g.match.some((m) => hasWord(haySelf, m))).flatMap((g) => g.want);
      if (wants.length > 0) {
        take(pool.filter((p) => wants.some((w) => hasWord(hayOf(p), w))));
      }
    }
    // 5) شبكة أمان أخيرة: أي منتجات من الكتالوج حتى لا يظهر القسم فارغاً أبداً
    if (picked.length === 0) {
      take(pool);
    }
    related = picked.slice(0, 8);
  } catch {
    try {
      related = (staticProducts as unknown as ProductSummary[])
        .filter((p) => (p as unknown as { id: unknown }).id !== (product as unknown as { id: unknown }).id)
        .slice(0, 8);
    } catch {
      related = [];
    }
  }

  return (
    <div dir="rtl" className="w-full pb-24 sm:pb-16">
      <ProductAnalytics productId={product.id} categorySlug={product.categorySlug} slug={product.slug} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name.ar,
            description: product.description.ar,
            image: product.gallery,
            brand: { "@type": "Brand", name: product.brand },
            offers: {
              "@type": "Offer",
              price: product.pricing.price,
              priceCurrency: "YER",
              availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            },
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: safeRatingDisplay(product),
              reviewCount: safeReviewCountDisplay(product),
            },
          }),
        }}
      />
      <Container>
        <ProductBreadcrumb category={product.categoryAr ?? product.category} categorySlug={product.categorySlug ?? product.category} productName={product.name.ar} />
        <div className="mt-6 grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
          <ProductGallery images={product.gallery} name={product.name.ar} />
          <div className="flex flex-col gap-6">
            <ProductInfo product={product} />
            <ProductPurchase product={product} />
          </div>
        </div>
        <ProductTabs product={product} />

        {related.length > 0 && <RelatedProducts products={related} />}
      </Container>
    </div>
  );
}