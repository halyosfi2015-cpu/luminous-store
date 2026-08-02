export type Brand = {
  id: string;
  slug: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  logo: string;
  coverImage: string;
  origin: string;
  originAr: string;
  isVerified: boolean;
  featured?: boolean;
  productCount?: number;
};

export type Expert = {
  id: string;
  slug: string;
  name: string;
  nameAr: string;
  title: string;
  titleAr: string;
  avatar: string;
  coverImage?: string;
  bio: string;
  bioAr: string;
  specialties: string[];
  specialtiesAr: string[];
  yearsOfExperience: number;
  isVerified: boolean;
  rating?: number;
  reviewCount?: number;
  availableForConsultation?: boolean;
};

export type Article = {
  id: string;
  slug: string;
  title: string;
  titleAr: string;
  excerpt: string;
  excerptAr: string;
  content: string;
  contentAr: string;
  coverImage: string;
  author: string;
  authorAr: string;
  authorAvatar?: string;
  category: string;
  categoryAr: string;
  publishedAt: string;
  readTime: number;
  tags?: string[];
  relatedProductIds?: string[];
};

export type Review = {
  id: string;
  customerName: string;
  customerNameAr?: string;
  avatar?: string;
  rating: number;
  comment: string;
  commentAr?: string;
  date: string;
  isVerified: boolean;
  helpfulCount: number;
};

export type FAQ = {
  id: string;
  question: string;
  questionAr: string;
  answer: string;
  answerAr: string;
  category?: string;
  categoryAr?: string;
};

export type Testimonial = {
  id: string;
  name: string;
  nameAr: string;
  avatar?: string;
  rating: number;
  text: string;
  textAr: string;
  title?: string;
  titleAr?: string;
  isVerified: boolean;
};
