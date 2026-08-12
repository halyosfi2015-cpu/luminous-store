export interface Expert {
  id: string;
  slug: string;
  name: string;
  nameAr: string;
  title: string;
  titleAr: string;
  specialty: string;
  specialtyAr: string;
  bio: string;
  bioAr: string;
  profileImage: string;
  coverImage: string;
  avatar?: string;
  gender: "male" | "female";
  languages: string[];
  consultationTypes: string[];
  services: string[];
  products: string[];
  articles: string[];
  specialties: string[];
  specialtiesAr: string[];
  yearsOfExperience: number;
  isVerified: boolean;
  availableForConsultation: boolean;
  rating: number;
  reviewCount: number;
  isFeatured: boolean;
  city?: string;
  cityAr?: string;
  shortBio?: string;
  shortBioAr?: string;
  socialLinks: {
    platform: string;
    url: string;
    icon?: string;
  }[];
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