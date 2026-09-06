export const WHATSAPP_NUMBER = "967780015305";
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;
export const WHATSAPP_PHONE_DISPLAY = "+967 780 015 305";

export const siteConfig = {
  name: {
    ar: "لومينوس ديرما",
    en: "Luminous Derma",
  },
  tagline: {
    ar: "الاختيار الصحيح",
    en: "The Right Choice",
  },
  description: {
    ar: "وجهة موثوقة للعناية بالبشرة والجمال في اليمن. منتجات أصلية من أشهر العلامات التجارية العالمية، مختارة بعناية لتناسب احتياجات بشرتك.",
    en: "A trusted destination for skincare and beauty in Yemen. Authentic products from the world's leading brands, carefully selected to suit your skin's needs.",
  },
  logo: "/images/logo/luminous-derma-full-logo.svg",
  favicon: "/favicon.ico",
  contact: {
    phone: WHATSAPP_PHONE_DISPLAY,
    email: "hello@luminousderma.com",
    address: {
      ar: "صنعاء، اليمن",
      en: "Sana'a, Yemen",
    },
  },
  socialLinks: [
    { platform: "instagram", url: "https://www.instagram.com/luminousderma.ye/", icon: "instagram" },
    { platform: "facebook", url: "https://www.facebook.com/luminousderma.ye", icon: "facebook" },
    { platform: "tiktok", url: "https://tiktok.com/@luminousderma", icon: "tiktok" },
    { platform: "youtube", url: "https://youtube.com/@luminousderma", icon: "youtube" },
    { platform: "whatsapp", url: WHATSAPP_URL, icon: "whatsapp" },
  ],
  businessHours: {
    ar: "الأحد - الخميس: 9 صباحاً - 10 مساءً",
    en: "Sunday - Thursday: 9 AM - 10 PM",
  },
  seo: {
    siteName: "Luminous Derma",
    title: {
      ar: "لومينوس ديرما - وجهتك الموثوقة للعناية بالبشرة والجمال",
      en: "Luminous Derma - Your Trusted Skincare and Beauty Destination",
    },
    description: {
      ar: "منتجات أصلية من أشهر العلامات التجارية العالمية، مختارة بعناية لتناسب احتياجات بشرتك في اليمن.",
      en: "Authentic products from the world's leading brands, carefully selected to suit your skin's needs in Yemen.",
    },
    keywords: [
      "skincare",
      "beauty",
      "cosmetics",
      "Yemen",
      "luminous derma",
      "authentic products",
      "premium skincare",
    ],
    ogImage: "/images/og-image.svg",
  },
  currency: "YER",
  currencySymbol: "ر.ي",
  deliveryInfo: {
    ar: "توصيل لجميع محافظات اليمن",
    en: "Delivery to all Yemen governorates",
  },
  paymentMethods: ["Cash On Delivery", "Krimi", "Flosuk", "Yemen Wallet", "Jib", "Bank Transfer"],
};