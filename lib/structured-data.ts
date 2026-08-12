import { siteConfig } from "@/src/data/siteConfig";

export const rootStructuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteConfig.name.en,
  url: "https://luminousderma.com",
  logo: "https://luminousderma.com/images/logo/luminous-derma-icon-transparent.png",
  sameAs: [
    "https://instagram.com/luminousderma",
    "https://www.facebook.com/luminousderma",
    "https://www.tiktok.com/@luminousderma",
    "https://www.youtube.com/@luminousderma",
  ],
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: siteConfig.contact.phone,
      email: siteConfig.contact.email,
      contactType: "Customer Service",
      areaServed: "YE",
    },
  ],
  address: {
    "@type": "PostalAddress",
    addressLocality: siteConfig.contact.address.en,
    addressCountry: "YE",
  },
};

export const websiteStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteConfig.seo.siteName,
  url: "https://luminousderma.com",
  description: siteConfig.description.en,
  inLanguage: ["en-US", "ar-YE"],
  potentialAction: {
    "@type": "SearchAction",
    target: "https://luminousderma.com/search?q={search_term_string}",
    "query-input": "required name=search_term_string",
  },
};
