export interface Category {
  id: string;
  slug: string;
  name: {
    ar: string;
    en: string;
  };
  description: {
    ar: string;
    en: string;
  };
  icon: string;
  coverImage: string;
  seoMetadata: {
    title: {
      ar: string;
      en: string;
    };
    description: {
      ar: string;
      en: string;
    };
    keywords: string[];
  };
}

export const categories: Category[] = [
  {
    id: "cat-001",
    slug: "skincare",
    name: {
      ar: "العناية بالبشرة",
      en: "Skincare"
    },
    description: {
      ar: "مجموعة كاملة من منتجات العناية بالبشرة والعناية الشخصية عالية الجودة.",
      en: "Complete range of high-quality skincare and personal care products."
    },
    icon: "Sparkles",
    coverImage: "/images/categories/skincare-cover.jpg",
    seoMetadata: {
      title: {
        ar: "العناية بالبشرة - منتجات العناية بالبشرة",
        en: "Skincare - Skincare Products"
      },
      description: {
        ar: "اكتشف مجموعتنا المختارة من منتجات العناية بالبشرة الأكثر فعالية.",
        en: "Discover our curated selection of the most effective skincare products."
      },
      keywords: ["skincare", "face care", "acne treatment", "moisturizer"]
    }
  },
  {
    id: "cat-002",
    slug: "haircare",
    name: {
      ar: "العناية بالشعر",
      en: "Haircare"
    },
    description: {
      ar: "منتجات متخصصة للعناية بالشعر، تعزيز نمو الشعر، وعلاج مشاكل فروة الرأس.",
      en: "Specialized products for hair care, hair growth enhancement, and scalp problem treatment."
    },
    icon: "Scissors",
    coverImage: "/images/categories/haircare-cover.jpg",
    seoMetadata: {
      title: {
        ar: "العناية بالشعر - منتجات العناية بالشعر",
        en: "Haircare - Hair Care Products"
      },
      description: {
        ar: "جميع منتجات العناية بالشعر الطبيعية والعضوية.",
        en: "All natural and organic hair care products."
      },
      keywords: ["haircare", "hair treatment", "scalp", "hair growth"]
    }
  },
  {
    id: "cat-003",
    slug: "bodycare",
    name: {
      ar: "العناية بالجسم",
      en: "Bodycare"
    },
    description: {
      ar: "منتجات العناية بالجسم الكاملة، من تنظيف الجسم إلى تقشير البشرة.",
      en: "Complete body care products, from body cleansing to skin exfoliation."
    },
    icon: "Scissors",
    coverImage: "/images/categories/bodycare-cover.jpg",
    seoMetadata: {
      title: {
        ar: "العناية بالجسم - منتجات العناية بالجسم",
        en: "Bodycare - Body Care Products"
      },
      description: {
        ar: "منتجات العناية بالجسم الغنية بتركيبات طبيعية لتنظيف عميق وترطيب.",
        en: "Body care products rich in natural formulas for deep cleansing and moisturizing."
      },
      keywords: ["bodycare", "body wash", "exfoliation", "moisturizer"]
    }
  },
  {
    id: "cat-004",
    slug: "makeup",
    name: {
      ar: "المكياج",
      en: "Makeup"
    },
    description: {
      ar: "مجموعة كاملة من منتجات المكياج والأدوات العصرية لجميع أذواق المكياج.",
      en: "Complete range of modern makeup products and tools for all makeup styles."
    },
    icon: "Palette",
    coverImage: "/images/categories/makeup-cover.jpg",
    seoMetadata: {
      title: {
        ar: "المكياج - منتجات المكياج",
        en: "Makeup - Makeup Products"
      },
      description: {
        ar: "منتجات مكياج عالية الجودة للحصول على إطلالة طبيعية ومشرقة.",
        en: "High-quality makeup products for a natural and radiant look."
      },
      keywords: ["makeup", "cosmetics", "foundation", "lipstick", "eyeshadow"]
    }
  },
  {
    id: "cat-005",
    slug: "perfume",
    name: {
      ar: "العطور",
      en: "Perfume"
    },
    description: {
      ar: "عطور فاخرة وعطور يومية لا تُنسى بتصاميم فريدة ومميزة.",
      en: "Luxury perfumes and daily fragrances with unique and distinctive designs."
    },
    icon: "FlaskRound",
    coverImage: "/images/categories/perfume-cover.jpg",
    seoMetadata: {
      title: {
        ar: "العطور - العطور والعطور اليومية",
        en: "Perfume - Luxury Perfumes and Daily Fragrances"
      },
      description: {
        ar: "مجموعة مختارة من أرقى العطور العالمية وتصاميم العطور اليومية.",
        en: "Curated selection of the world's finest perfumes and daily fragrances."
      },
      keywords: ["perfume", "fragrance", "luxury perfume", "daily fragrance"]
    }
  },
  {
    id: "cat-006",
    slug: "baby",
    name: {
      ar: "الأطفال والأمهات",
      en: "Baby & Mom"
    },
    description: {
      ar: "منتجات آمنة ولطيفة للعناية بالأطفال والأمهات، خالية من المواد الكيميائية القاسية.",
      en: "Safe and gentle products for baby and mom care, free from harsh chemicals."
    },
    icon: "Baby",
    coverImage: "/images/categories/baby-cover.jpg",
    seoMetadata: {
      title: {
        ar: "الأطفال والأمهات - منتجات العناية بالأطفال والأمهات",
        en: "Baby & Mom - Baby and Mom Care Products"
      },
      description: {
        ar: "منتجات العناية بالأطفال والأمهات الأكثر أمانًا والعناية الذاتية.",
        en: "Safest baby and mom care products and self-care items."
      },
      keywords: ["baby care", "mom care", "organic baby products", "gentle skincare"]
    }
  },
  {
    id: "cat-007",
    slug: "tools",
    name: {
      ar: "الأدوات والمستلزمات",
      en: "Tools & Accessories"
    },
    description: {
      ar: "جميع المعدات والأدوات ومستلزمات التجميل للوصول إلى الإطلالة المثالية.",
      en: "All tools, equipment, and beauty supplies for the perfect look."
    },
    icon: "Sofa",
    coverImage: "/images/categories/tools-cover.jpg",
    seoMetadata: {
      title: {
        ar: "الأدوات والمستلزمات - أدوات ومستلزمات التجميل",
        en: "Tools & Accessories - Beauty Tools and Supplies"
      },
      description: {
        ar: "جميع أدوات ومستلزمات التجميل للعناية المثالية بالبشرة والشعر.",
        en: "All beauty tools and supplies for perfect skin and hair care."
      },
      keywords: ["beauty tools", "makeup tools", "skincare tools", "accessories"]
    }
  }
];