export interface Article {
  id: string;
  slug: string;
  title: string;
  titleAr: string;
  excerpt: string;
  excerptAr: string;
  content: string;
  contentAr: string;
  author: string;
  authorAr?: string;
  avatar?: string;
  category: string;
  categoryAr?: string;
  coverImage: string;
  publishDate: string;
  readTime: number;
  tags: string[];
  relatedProducts: string[];
  relatedArticles: string[];
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