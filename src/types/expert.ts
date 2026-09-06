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
  isVerified: boolean;
  availableForConsultation: boolean;
  rating: number;
  reviewCount: number;
  isFeatured: boolean;
  city?: string;
  cityAr?: string;
  shortBio?: string;
  shortBioAr?: string;
  consultationFee?: number;
  availableSlots?: { day: string; from: string; to: string }[];
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

export interface ConsultationRequest {
  id: string;
  expertId: string;
  expertName: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  consultationType: "online" | "in-person";
  preferredDay: string;
  preferredTime: string;
  concern: string;
  concernDetails?: string;
  referralSource?: string;
  referralExpertId?: string;
  status: "pending" | "approved" | "rejected" | "completed";
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpertEnrollment {
  id: string;
  name: string;
  nameAr: string;
  email: string;
  phone: string;
  specialty: string;
  specialtyAr: string;
  bio: string;
  bioAr: string;
  consultationTypes: string[];
  city: string;
  cityAr: string;
  status: "pending" | "approved" | "rejected";
  adminNotes?: string;
  createdAt: string;
}