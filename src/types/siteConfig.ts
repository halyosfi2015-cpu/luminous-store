export interface SiteConfig {
  name: {
    ar: string;
    en: string;
  };
  tagline: {
    ar: string;
    en: string;
  };
  description: {
    ar: string;
    en: string;
  };
  logo: string;
  favicon: string;
  contact: {
    phone: string;
    email: string;
    address: {
      ar: string;
      en: string;
    };
  };
  socialLinks: {
    platform: string;
    url: string;
    icon: string;
  }[];
  businessHours: {
    ar: string;
    en: string;
  };
  seo: {
    siteName: string;
    title: {
      ar: string;
      en: string;
    };
    description: {
      ar: string;
      en: string;
    };
    keywords: string[];
    ogImage: string;
  };
  currency: string;
  currencySymbol: string;
  deliveryInfo: {
    ar: string;
    en: string;
  };
  paymentMethods: string[];
}