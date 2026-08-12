export const categoryProductImages: Record<string, string> = {
  skincare: "/images/products/yq-629.png",
  haircare: "/images/products/yq-1784.png",
  bodycare: "/images/products/yq-1775.png",
  makeup: "/images/products/yq-2312.png",
  perfume: "/images/products/yq-1261.png",
  bakhoor: "/images/products/yq-1652.png",
  baby: "/images/products/yq-404.png",
  supplements: "/images/products/yq-2170.png",
  tools: "/images/products/yq-435.png",

  "face-care": "/images/products/yq-629.png",
  "body-care": "/images/products/yq-1775.png",

  cleansers: "/images/products/yq-754.png",
  toners: "/images/products/yq-1051.png",
  serums: "/images/products/yq-629.png",
  moisturizers: "/images/products/yq-129.png",
  sunscreen: "/images/products/yq-1660.png",
  "eye-care": "/images/products/yq-306.png",
  "lip-care": "/images/products/yq-1457.png",
  masks: "/images/products/yq-748.png",
  exfoliators: "/images/products/yq-821.png",

  shampoo: "/images/products/yq-1784.png",
  conditioner: "/images/products/yq-1402.png",
  "hair-oils": "/images/products/yq-2400.png",

  "body-wash": "/images/products/yq-1775.png",
  "body-lotion": "/images/products/yq-1067.png",
  "body-oils": "/images/products/yq-1487.png",

  "face-makeup": "/images/products/yq-2312.png",
  "eye-makeup": "/images/products/yq-216.png",
  "lip-makeup": "/images/products/yq-2308.png",

  foundation: "/images/products/yq-2312.png",
  concealer: "/images/products/yq-2312.png",
  powder: "/images/products/yq-2312.png",
  highlighter: "/images/products/yq-2312.png",
  blush: "/images/products/yq-2312.png",

  mascara: "/images/products/yq-216.png",
  eyeliner: "/images/products/yq-216.png",
  eyeshadow: "/images/products/yq-216.png",
  eyebrow: "/images/products/yq-216.png",

  lipstick: "/images/products/yq-2308.png",
  "lip-gloss": "/images/products/yq-2308.png",
  "lip-oil": "/images/products/yq-2308.png",

  "perfume-women": "/images/products/yq-1261.png",
  "perfume-men": "/images/products/yq-1262.png",
  "perfume-musk": "/images/products/yq-1409.png",
  "perfume-gift-sets": "/images/products/yq-1264.png",

  "bakhoor-premium": "/images/products/yq-1652.png",
  "bakhoor-oud": "/images/products/yq-1964.png",
  "bakhoor-dehn": "/images/products/yq-1652.png",
  "bakhoor-burners": "/images/products/yq-1652.png",
  "bakhoor-charcoal": "/images/products/yq-1652.png",
  "bakhoor-home": "/images/products/yq-1652.png",
  "bakhoor-occasions": "/images/products/yq-1652.png",
  "bakhoor-brides": "/images/products/yq-1652.png",
  "bakhoor-oils": "/images/products/yq-1652.png",
  "bakhoor-gift-sets": "/images/products/yq-1652.png",

  "baby-care": "/images/products/yq-404.png",
  vitamins: "/images/products/yq-2170.png",

  "appliances-hair": "/images/products/yq-435.png",
  "appliances-shaving": "/images/products/yq-2000.png",
  "appliances-teeth": "/images/products/yq-436.png",
};

export function getCategoryProductImage(slug: string): string | null {
  return categoryProductImages[slug] || null;
}

