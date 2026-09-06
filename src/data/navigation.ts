import type { Navigation } from "@/src/types/navigation";
import { WHATSAPP_URL } from "@/src/data/siteConfig";

export const navigation: Navigation = {
  main: [
    {
      id: "nav-home",
      label: { ar: "الرئيسية", en: "Home" },
      href: "/",
    },
    {
      id: "nav-products",
      label: { ar: "المنتجات", en: "Products" },
      href: "/products",
      children: [
        {
          id: "nav-skincare",
          label: { ar: "العناية بالبشرة", en: "Skincare" },
          href: "/categories/skincare",
        },
        {
          id: "nav-haircare",
          label: { ar: "العناية بالشعر", en: "Haircare" },
          href: "/categories/haircare",
        },
        {
          id: "nav-bodycare",
          label: { ar: "العناية بالجسم", en: "Bodycare" },
          href: "/categories/bodycare",
        },
        {
          id: "nav-makeup",
          label: { ar: "المكياج", en: "Makeup" },
          href: "/categories/makeup",
        },
        {
          id: "nav-perfume",
          label: { ar: "العطور", en: "Perfume" },
          href: "/categories/perfume",
          children: [
            { id: "nav-perfume-women", label: { ar: "عطور نسائية", en: "Women's Perfume" }, href: "/categories/perfume-women" },
            { id: "nav-perfume-men", label: { ar: "عطور رجالية", en: "Men's Perfume" }, href: "/categories/perfume-men" },
            { id: "nav-perfume-musk", label: { ar: "المسك والتوزيعات", en: "Musk & Sprays" }, href: "/categories/perfume-musk" },
            { id: "nav-perfume-gift-sets", label: { ar: "مجموعات الهدايا", en: "Gift Sets" }, href: "/categories/perfume-gift-sets" },
          ],
        },
        {
          id: "nav-bakhoor",
          label: { ar: "البخور والعود", en: "Bakhoor & Oud" },
          href: "/categories/bakhoor",
          children: [
            { id: "nav-bakhoor-premium", label: { ar: "البخور الفاخر", en: "Premium Bakhoor" }, href: "/categories/bakhoor-premium" },
            { id: "nav-bakhoor-oud", label: { ar: "العود الطبيعي", en: "Natural Oud" }, href: "/categories/bakhoor-oud" },
            { id: "nav-bakhoor-dehn", label: { ar: "دهن العود", en: "Oud Oil" }, href: "/categories/bakhoor-dehn" },
            { id: "nav-bakhoor-burners", label: { ar: "المباخر", en: "Burners" }, href: "/categories/bakhoor-burners" },
            { id: "nav-bakhoor-charcoal", label: { ar: "فحم البخور", en: "Bakhoor Charcoal" }, href: "/categories/bakhoor-charcoal" },
            { id: "nav-bakhoor-home", label: { ar: "معطرات المنزل", en: "Home Fragrance" }, href: "/categories/bakhoor-home" },
            { id: "nav-bakhoor-occasions", label: { ar: "بخور المناسبات", en: "Occasion Bakhoor" }, href: "/categories/bakhoor-occasions" },
            { id: "nav-bakhoor-brides", label: { ar: "بخور العرائس", en: "Bridal Bakhoor" }, href: "/categories/bakhoor-brides" },
            { id: "nav-bakhoor-oils", label: { ar: "الزيوت العطرية", en: "Fragrance Oils" }, href: "/categories/bakhoor-oils" },
            { id: "nav-bakhoor-gift-sets", label: { ar: "مجموعات الهدايا", en: "Bakhoor Gift Sets" }, href: "/categories/bakhoor-gift-sets" },
          ],
        },
        {
          id: "nav-baby",
          label: { ar: "الأطفال والأمهات", en: "Baby & Mom" },
          href: "/categories/baby",
        },
        {
          id: "nav-supplements",
          label: { ar: "المكملات الغذائية", en: "Dietary Supplements" },
          href: "/categories/supplements",
        },
        {
          id: "nav-tools",
          label: { ar: "الأجهزة والملحقات", en: "Appliances & Accessories" },
          href: "/categories/tools",
          children: [
            { id: "nav-appliances-hair", label: { ar: "أجهزة العناية بالشعر", en: "Hair Appliances" }, href: "/categories/appliances-hair" },
            { id: "nav-appliances-shaving", label: { ar: "مستلزمات الحلاقة", en: "Shaving Supplies" }, href: "/categories/appliances-shaving" },
            { id: "nav-appliances-teeth", label: { ar: "العناية بالأسنان", en: "Oral Care" }, href: "/categories/appliances-teeth" },
            { id: "nav-tools-all", label: { ar: "الأدوات", en: "Tools" }, href: "/categories/tools" },
          ],
        },
      ],
    },
    {
      id: "nav-brands",
      label: { ar: "العلامات التجارية", en: "Brands" },
      href: "/brands",
    },
    {
      id: "nav-experts",
      label: { ar: "الخبراء والأطباء", en: "Experts" },
      href: "/experts",
    },
    {
      id: "nav-articles",
      label: { ar: "المقالات", en: "Articles" },
      href: "/articles",
    },
  ],
  footer: {
    company: [
      { id: "ft-about", label: { ar: "من نحن", en: "About Us" }, href: "/about" },
    ],
    customerService: [
      { id: "ft-contact", label: { ar: "اتصل بنا", en: "Contact Us" }, href: "/contact" },
      { id: "ft-faq", label: { ar: "الأسئلة الشائعة", en: "FAQ" }, href: "/faq" },
      { id: "ft-shipping", label: { ar: "الشحن والتوصيل", en: "Shipping" }, href: "/shipping" },
      { id: "ft-returns", label: { ar: "الإرجاع والاستبدال", en: "Returns" }, href: "/returns" },
      { id: "ft-tracking", label: { ar: "تتبع الطلب", en: "Track Order" }, href: "/account/orders" },
    ],
    categories: [
      { id: "ft-skincare", label: { ar: "العناية بالبشرة", en: "Skincare" }, href: "/categories/skincare" },
      { id: "ft-haircare", label: { ar: "العناية بالشعر", en: "Haircare" }, href: "/categories/haircare" },
      { id: "ft-bodycare", label: { ar: "العناية بالجسم", en: "Bodycare" }, href: "/categories/bodycare" },
      { id: "ft-makeup", label: { ar: "المكياج", en: "Makeup" }, href: "/categories/makeup" },
      { id: "ft-perfume", label: { ar: "العطور", en: "Perfume" }, href: "/categories/perfume" },
      { id: "ft-bakhoor", label: { ar: "البخور والعود", en: "Bakhoor & Oud" }, href: "/categories/bakhoor" },
      { id: "ft-baby", label: { ar: "الأطفال والأمهات", en: "Baby & Mom" }, href: "/categories/baby" },
      { id: "ft-supplements", label: { ar: "المكملات الغذائية", en: "Dietary Supplements" }, href: "/categories/supplements" },
      { id: "ft-tools", label: { ar: "الأجهزة والملحقات", en: "Appliances & Accessories" }, href: "/categories/tools" },
    ],
    brands: [
      { id: "ft-cosrx", label: { ar: "COSRX", en: "COSRX" }, href: "/brands/cosrx" },
      { id: "ft-the-ordinary", label: { ar: "The Ordinary", en: "The Ordinary" }, href: "/brands/the-ordinary" },
      { id: "ft-cetaphil", label: { ar: "Cetaphil", en: "Cetaphil" }, href: "/brands/cetaphil" },
      { id: "ft-la-roche-posay", label: { ar: "La Roche-Posay", en: "La Roche-Posay" }, href: "/brands/la-roche-posay" },
      { id: "ft-bioderma", label: { ar: "Bioderma", en: "Bioderma" }, href: "/brands/bioderma" },
      { id: "ft-vichy", label: { ar: "Vichy", en: "Vichy" }, href: "/brands/vichy" },
      { id: "ft-cerave", label: { ar: "CeraVe", en: "CeraVe" }, href: "/brands/cerave" },
      { id: "ft-medicube", label: { ar: "Medicube", en: "Medicube" }, href: "/brands/medicube" },
    ],
    social: [
      { id: "ft-instagram", label: { ar: "إنستغرام", en: "Instagram" }, href: "https://instagram.com/luminousderma", icon: "instagram" },
      { id: "ft-tiktok", label: { ar: "تيك توك", en: "TikTok" }, href: "https://tiktok.com/@luminousderma", icon: "tiktok" },
      { id: "ft-snapchat", label: { ar: "سناب شات", en: "Snapchat" }, href: "https://snapchat.com/add/luminousderma", icon: "snapchat" },
      { id: "ft-youtube", label: { ar: "يوتيوب", en: "YouTube" }, href: "https://youtube.com/@luminousderma", icon: "youtube" },
      { id: "ft-whatsapp", label: { ar: "واتساب", en: "WhatsApp" }, href: WHATSAPP_URL, icon: "whatsapp" },
    ],
  },
  mobile: [
    { id: "mob-home", label: { ar: "الرئيسية", en: "Home" }, href: "/" },
    { id: "mob-products", label: { ar: "المنتجات", en: "Products" }, href: "/products" },
    { id: "mob-categories", label: { ar: "الفئات", en: "Categories" }, href: "/categories" },
    { id: "mob-brands", label: { ar: "العلامات التجارية", en: "Brands" }, href: "/brands" },
    { id: "mob-experts", label: { ar: "الخبراء", en: "Experts" }, href: "/experts" },
    { id: "mob-articles", label: { ar: "المقالات", en: "Articles" }, href: "/articles" },
    { id: "mob-contact", label: { ar: "اتصل بنا", en: "Contact" }, href: "/contact" },
    { id: "mob-account", label: { ar: "حسابي", en: "My Account" }, href: "/account" },
    { id: "mob-wishlist", label: { ar: "قائمة الرغبات", en: "Wishlist" }, href: "/wishlist" },
    { id: "mob-cart", label: { ar: "السلة", en: "Cart" }, href: "/cart" },
  ],
};