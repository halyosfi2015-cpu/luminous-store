import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/cart", "/checkout", "/account/"],
    },
    sitemap: "https://luminousderma.com/sitemap.xml",
  };
}
