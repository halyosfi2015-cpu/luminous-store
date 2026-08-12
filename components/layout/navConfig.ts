export interface NavCategory {
  id: string;
  slug: string;
  labelAr: string;
  labelEn: string;
  iconName: string;
  color: string;
  descriptionAr?: string;
  descriptionEn?: string;
  children?: NavCategory[];
}

/*
 * Three-level category tree modeled on yaqootstoreye.com (ياقوت ستور).
 * Leaves are the REAL category slugs used by products (see categories[] in
 * src/data/products.ts) so /categories/{slug} keeps working. Branches that
 * have no deeper real categories stay at two levels (اللي ما الها خلص).
 */
export const categoryTree: NavCategory[] = [
  {
    id: "skincare",
    slug: "skincare",
    labelAr: "العناية بالبشرة",
    labelEn: "Skincare",
    iconName: "sparkles",
    color: "from-primary to-secondary",
    descriptionAr: "روتينات عناية كاملة بالبشرة لكل الاهتمامات",
    descriptionEn: "Complete skincare routines for every concern",
    children: [
      {
        id: "face-care",
        slug: "face-care",
        labelAr: "العناية بالوجه",
        labelEn: "Face Care",
        iconName: "droplets",
        color: "from-primary/20 to-secondary/20",
        children: [
          { id: "cleansers", slug: "cleansers", labelAr: "غسول الوجه", labelEn: "Face Cleanser", iconName: "droplets", color: "from-primary/30 to-secondary/30" },
          { id: "toners", slug: "toners", labelAr: "تونر الوجه", labelEn: "Face Toner", iconName: "spray", color: "from-primary/30 to-secondary/30" },
          { id: "serums", slug: "serums", labelAr: "سيروم الوجه", labelEn: "Face Serum", iconName: "droplet", color: "from-primary/30 to-secondary/30" },
          { id: "moisturizers", slug: "moisturizers", labelAr: "مرطب الوجه", labelEn: "Face Moisturizer", iconName: "droplet", color: "from-primary/30 to-secondary/30" },
          { id: "masks", slug: "masks", labelAr: "قناع الوجه", labelEn: "Face Mask", iconName: "sparkles", color: "from-primary/30 to-secondary/30" },
          { id: "exfoliators", slug: "exfoliators", labelAr: "مقشر الوجه", labelEn: "Exfoliator", iconName: "scrub", color: "from-primary/30 to-secondary/30" },
        ],
      },
      { id: "sunscreen", slug: "sunscreen", labelAr: "واقي الشمس", labelEn: "Sunscreen", iconName: "sun", color: "from-primary/25 to-secondary/25" },
      { id: "eye-care", slug: "eye-care", labelAr: "العناية بالعين", labelEn: "Eye Care", iconName: "eye", color: "from-primary/25 to-secondary/25" },
      { id: "lip-care", slug: "lip-care", labelAr: "العناية بالشفاه", labelEn: "Lip Care", iconName: "heart", color: "from-primary/25 to-secondary/25" },
    ],
  },
  {
    id: "haircare",
    slug: "haircare",
    labelAr: "العناية بالشعر",
    labelEn: "Haircare",
    iconName: "flower",
    color: "from-secondary to-primary",
    descriptionAr: "أساسيات العناية بالشعر المغذية",
    descriptionEn: "Nourishing hair care essentials",
    children: [
      {
        id: "hair-cleaning",
        slug: "hair-cleaning",
        labelAr: "شامبو وبلسم",
        labelEn: "Shampoo & Conditioner",
        iconName: "shower",
        color: "from-secondary/20 to-primary/20",
        children: [
          { id: "shampoo", slug: "shampoo", labelAr: "الشامبو", labelEn: "Shampoo", iconName: "shower", color: "from-secondary/20 to-primary/20" },
          { id: "conditioner", slug: "conditioner", labelAr: "البلسم", labelEn: "Conditioner", iconName: "droplet", color: "from-secondary/20 to-primary/20" },
        ],
      },
      { id: "hair-oils", slug: "hair-oils", labelAr: "زيت الشعر", labelEn: "Hair Oil", iconName: "wind", color: "from-secondary/20 to-primary/20" },
    ],
  },
  {
    id: "bodycare",
    slug: "bodycare",
    labelAr: "العناية بالجسم",
    labelEn: "Bodycare",
    iconName: "shower",
    color: "from-accent to-accent/80",
    descriptionAr: "منتجات فاخرة للعناية بالجسم",
    descriptionEn: "Luxurious body care products",
    children: [
      { id: "body-wash", slug: "body-wash", labelAr: "غسول الجسم", labelEn: "Body Wash", iconName: "shower", color: "from-accent/20 to-accent/10" },
      { id: "body-lotion", slug: "body-lotion", labelAr: "لوشن الجسم", labelEn: "Body Lotion", iconName: "droplet", color: "from-accent/20 to-accent/10" },
      { id: "body-oils", slug: "body-oils", labelAr: "زيوت الجسم", labelEn: "Body Oils", iconName: "droplet", color: "from-accent/20 to-accent/10" },
    ],
  },
  {
    id: "makeup",
    slug: "makeup",
    labelAr: "المكياج",
    labelEn: "Makeup",
    iconName: "palette",
    color: "from-primary/80 to-secondary/80",
    descriptionAr: "مكياج مذهل لكل المناسبات",
    descriptionEn: "Stunning makeup for every occasion",
    children: [
      { id: "face-makeup", slug: "face-makeup", labelAr: "مكياج الوجه", labelEn: "Face Makeup", iconName: "palette", color: "from-primary/30 to-secondary/30" },
      { id: "eye-makeup", slug: "eye-makeup", labelAr: "مكياج العيون", labelEn: "Eye Makeup", iconName: "eye", color: "from-primary/30 to-secondary/30" },
      { id: "lip-makeup", slug: "lip-makeup", labelAr: "مكياج الشفاه", labelEn: "Lip Makeup", iconName: "heart", color: "from-primary/30 to-secondary/30" },
    ],
  },
  {
    id: "perfume",
    slug: "perfume",
    labelAr: "العطور",
    labelEn: "Perfume",
    iconName: "sparkles",
    color: "from-accent/80 to-primary/60",
    descriptionAr: "عطور فاخرة للنساء والرجال",
    descriptionEn: "Luxury fragrances for men and women",
    children: [
      { id: "perfume-women", slug: "perfume-women", labelAr: "عطور نسائية", labelEn: "Women's Perfume", iconName: "flower", color: "from-accent/20 to-primary/10" },
      { id: "perfume-men", slug: "perfume-men", labelAr: "عطور رجالية", labelEn: "Men's Perfume", iconName: "user-round", color: "from-accent/20 to-primary/10" },
      { id: "perfume-musk", slug: "perfume-musk", labelAr: "المسك والتوزيعات", labelEn: "Musk & Sprays", iconName: "sparkles", color: "from-accent/20 to-primary/10" },
      { id: "perfume-gift-sets", slug: "perfume-gift-sets", labelAr: "مجموعات الهدايا", labelEn: "Gift Sets", iconName: "gift", color: "from-accent/20 to-primary/10" },
    ],
  },
  {
    id: "bakhoor",
    slug: "bakhoor",
    labelAr: "البخور والعود",
    labelEn: "Bakhoor & Oud",
    iconName: "flame",
    color: "from-amber-500 to-orange-600",
    descriptionAr: "بخور فاخر وعود أصيل",
    descriptionEn: "Premium bakhoor and authentic oud",
    children: [
      { id: "bakhoor-premium", slug: "bakhoor-premium", labelAr: "البخور الفاخر", labelEn: "Premium Bakhoor", iconName: "flame", color: "from-amber-500/20 to-orange-600/20" },
      { id: "bakhoor-oud", slug: "bakhoor-oud", labelAr: "العود الطبيعي", labelEn: "Natural Oud", iconName: "tree-deciduous", color: "from-amber-500/20 to-orange-600/20" },
      { id: "bakhoor-dehn", slug: "bakhoor-dehn", labelAr: "دهن العود", labelEn: "Oud Oil", iconName: "droplet", color: "from-amber-500/20 to-orange-600/20" },
      { id: "bakhoor-burners", slug: "bakhoor-burners", labelAr: "المباخر", labelEn: "Burners", iconName: "lamp", color: "from-amber-500/20 to-orange-600/20" },
      { id: "bakhoor-charcoal", slug: "bakhoor-charcoal", labelAr: "فحم البخور", labelEn: "Bakhoor Charcoal", iconName: "fire", color: "from-amber-500/20 to-orange-600/20" },
      { id: "bakhoor-home", slug: "bakhoor-home", labelAr: "معطرات المنزل", labelEn: "Home Fragrance", iconName: "home", color: "from-amber-500/20 to-orange-600/20" },
      { id: "bakhoor-gift-sets", slug: "bakhoor-gift-sets", labelAr: "مجموعات الهدايا", labelEn: "Gift Sets", iconName: "gift", color: "from-amber-500/20 to-orange-600/20" },
    ],
  },
  {
    id: "baby",
    slug: "baby",
    labelAr: "الأم والطفل",
    labelEn: "Baby & Mom",
    iconName: "baby",
    color: "from-secondary/80 to-primary/80",
    descriptionAr: "عناية لطيفة للأم والطفل",
    descriptionEn: "Gentle care for mother and baby",
    children: [
      { id: "baby-care", slug: "baby-care", labelAr: "العناية بالأطفال", labelEn: "Baby Care", iconName: "baby", color: "from-secondary/20 to-primary/20" },
    ],
  },
  {
    id: "supplements",
    slug: "supplements",
    labelAr: "المكملات الغذائية",
    labelEn: "Dietary Supplements",
    iconName: "pill",
    color: "from-emerald-500 to-teal-600",
    descriptionAr: "مكملات غذائية للصحة والجمال",
    descriptionEn: "Nutritional supplements for health and beauty",
    children: [
      { id: "vitamins", slug: "vitamins", labelAr: "الفيتامينات والمكملات", labelEn: "Vitamins & Supplements", iconName: "pill", color: "from-emerald-500/20 to-teal-600/20" },
      { id: "collagen", slug: "collagen", labelAr: "الكولاجين", labelEn: "Collagen", iconName: "droplet", color: "from-emerald-500/20 to-teal-600/20" },
      { id: "immunity", slug: "immunity", labelAr: "المناعة والفيتامينات", labelEn: "Immunity & Vitamins", iconName: "pill", color: "from-emerald-500/20 to-teal-600/20" },
      { id: "hair-nails", slug: "hair-nails", labelAr: "صحة الشعر والأظافر", labelEn: "Hair & Nails", iconName: "flower", color: "from-emerald-500/20 to-teal-600/20" },
      { id: "kids-supplements", slug: "kids-supplements", labelAr: "مكملات الأطفال", labelEn: "Kids Supplements", iconName: "baby", color: "from-emerald-500/20 to-teal-600/20" },
      { id: "women-health", slug: "women-health", labelAr: "صحة المرأة", labelEn: "Women's Health", iconName: "heart", color: "from-emerald-500/20 to-teal-600/20" },
    ],
  },
  {
    id: "tools",
    slug: "tools",
    labelAr: "الأجهزة والملحقات",
    labelEn: "Appliances & Accessories",
    iconName: "wrench",
    color: "from-neutral-400 to-slate-400",
    descriptionAr: "أجهزة وأدوات العناية الشخصية",
    descriptionEn: "Personal care appliances and tools",
    children: [
      { id: "appliances-hair", slug: "appliances-hair", labelAr: "أجهزة العناية بالشعر", labelEn: "Hair Appliances", iconName: "wind", color: "from-neutral-400/20 to-slate-400/20" },
      { id: "appliances-shaving", slug: "appliances-shaving", labelAr: "مستلزمات الحلاقة", labelEn: "Shaving Supplies", iconName: "scissors", color: "from-neutral-400/20 to-slate-400/20" },
      { id: "appliances-teeth", slug: "appliances-teeth", labelAr: "العناية بالأسنان", labelEn: "Oral Care", iconName: "smile", color: "from-neutral-400/20 to-slate-400/20" },
      { id: "tools", slug: "tools", labelAr: "الأدوات", labelEn: "Tools", iconName: "wrench", color: "from-neutral-400/20 to-slate-400/20" },
    ],
  },
];
