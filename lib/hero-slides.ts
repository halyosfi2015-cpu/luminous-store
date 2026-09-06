/*
 * Luminous Stage — Promotional Banner Slides
 *
 * Each slide: decorative background + product images from that category.
 * No product names — just images.
 * To add a new slide, copy any object and change the values.
 */

export interface HeroSlide {
  id: string;
  headlineAr: string;
  headlineEn: string;
  subAr?: string;
  subEn?: string;
  ctaAr: string;
  ctaEn: string;
  ctaHref: string;
  accent: string;
  categorySlug: string;
  bg: string;
  shape1: string;
  shape2: string;
  shape3: string;
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: "skincare-sale",
    headlineAr: "خصومات تصل إلى 50%",
    headlineEn: "Up to 50% Off",
    subAr: "غسول ومرطب وواقي شمس وتونر من أفضل الماركات",
    subEn: "Cleanser, moisturizer, sunscreen & toner from top brands",
    ctaAr: "تسوقي الآن",
    ctaEn: "Shop Now",
    ctaHref: "/categories/skincare",
    accent: "#b8960c",
    categorySlug: "cleansers",
    bg: "linear-gradient(160deg, #fefcf3 0%, #fdf6e3 40%, #f5edd6 100%)",
    shape1: "absolute -top-20 -end-20 w-[400px] h-[400px] rounded-full opacity-[0.07]",
    shape2: "absolute -bottom-32 -start-32 w-[500px] h-[500px] rounded-full opacity-[0.05]",
    shape3: "absolute top-1/2 start-1/3 w-[200px] h-[200px] rounded-full opacity-[0.04] blur-2xl",
  },
  {
    id: "moisturizers",
    headlineAr: "ترطيب مكثف لبشرتك",
    headlineEn: "Intense Moisturizing",
    subAr: "كريمات مرطبة من الماركات العالمية",
    subEn: "Moisturizers from world-leading brands",
    ctaAr: "اكتشفي المزيد",
    ctaEn: "Discover More",
    ctaHref: "/categories/moisturizers",
    accent: "#2563eb",
    categorySlug: "moisturizers",
    bg: "linear-gradient(160deg, #f0f7ff 0%, #e0efff 40%, #d0e4f9 100%)",
    shape1: "absolute -top-16 -start-16 w-[350px] h-[350px] rounded-full opacity-[0.08]",
    shape2: "absolute -bottom-24 -end-24 w-[450px] h-[450px] rounded-full opacity-[0.06]",
    shape3: "absolute top-1/3 end-1/4 w-[180px] h-[180px] rounded-full opacity-[0.05] blur-2xl",
  },
  {
    id: "haircare-offer",
    headlineAr: "عناية متكاملة لشعرك",
    headlineEn: "Complete Hair Care",
    subAr: "شامبوهات وبلسم وعلاجات من الماركات العالمية",
    subEn: "Shampoos, conditioners & treatments from international brands",
    ctaAr: "تسوقي العروض",
    ctaEn: "Shop Offers",
    ctaHref: "/categories/haircare",
    accent: "#b45309",
    categorySlug: "shampoo",
    bg: "linear-gradient(160deg, #fefbf3 0%, #fdf3dc 40%, #f5e8c4 100%)",
    shape1: "absolute -top-24 end-10 w-[380px] h-[380px] rounded-full opacity-[0.07]",
    shape2: "absolute bottom-10 -start-20 w-[420px] h-[420px] rounded-full opacity-[0.05]",
    shape3: "absolute top-1/2 start-1/2 w-[220px] h-[220px] rounded-full opacity-[0.04] blur-2xl",
  },
  {
    id: "makeup-collection",
    headlineAr: "تشكيلة المكياج الجديدة",
    headlineEn: "New Makeup Collection",
    subAr: "أحمر شفاه و ظل عيون و كريم أساس",
    subEn: "Lipstick, eyeshadow & foundation",
    ctaAr: "تسوقي المكياج",
    ctaEn: "Shop Makeup",
    ctaHref: "/categories/makeup",
    accent: "#be185d",
    categorySlug: "face-makeup",
    bg: "linear-gradient(160deg, #fef0f5 0%, #fce0ec 40%, #f8cde0 100%)",
    shape1: "absolute -top-20 start-10 w-[360px] h-[360px] rounded-full opacity-[0.08]",
    shape2: "absolute -bottom-28 -end-16 w-[440px] h-[440px] rounded-full opacity-[0.06]",
    shape3: "absolute top-1/3 start-1/4 w-[190px] h-[190px] rounded-full opacity-[0.04] blur-2xl",
  },
  {
    id: "fragrance-picks",
    headlineAr: "أرقى العطور العالمية",
    headlineEn: "Finest International Fragrances",
    subAr: "عطور نسائية ورجالية لكل المناسبات",
    subEn: "Sophisticated fragrances for every occasion",
    ctaAr: "اكتشفي العطور",
    ctaEn: "Discover Scents",
    ctaHref: "/categories/perfume",
    accent: "#991b1b",
    categorySlug: "perfume-women",
    bg: "linear-gradient(160deg, #fef5f3 0%, #fce8e4 40%, #f8d4cc 100%)",
    shape1: "absolute -top-16 -end-12 w-[370px] h-[370px] rounded-full opacity-[0.07]",
    shape2: "absolute -bottom-20 -start-24 w-[460px] h-[460px] rounded-full opacity-[0.05]",
    shape3: "absolute top-2/3 end-1/3 w-[200px] h-[200px] rounded-full opacity-[0.04] blur-2xl",
  },
];
