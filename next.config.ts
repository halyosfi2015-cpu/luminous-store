import type { NextConfig } from "next";
import { taxonomy } from "./src/data/taxonomy";

const legacyRedirects = (() => {
  const canonical = new Set(taxonomy.map((n) => n.slug));
  const seen = new Set<string>();
  const rules: { source: string; destination: string; statusCode: 301 }[] = [];
  for (const n of taxonomy) {
    for (const legacy of n.legacySlugs ?? []) {
      if (seen.has(legacy) || legacy === n.slug) continue;
      if (canonical.has(legacy)) continue;
      seen.add(legacy);
      rules.push({
        source: `/categories/${legacy}`,
        destination: `/categories/${n.slug}`,
        statusCode: 301,
      });
    }
  }
  return rules;
})();

const nextConfig: NextConfig = {
  async redirects() {
    return legacyRedirects;
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    unoptimized: false,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "yaqootstoreye.com",
        port: "",
        pathname: "/files/items/**",
      },
      {
        protocol: "https",
        hostname: "www.yaqootstoreye.com",
        port: "",
        pathname: "/files/items/**",
      },
      {
        protocol: "https",
        hostname: "cdn.shopify.com",
        port: "",
        pathname: "/s/files/**",
      },
    ],
  },
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
  productionBrowserSourceMaps: false,
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-XSS-Protection", value: "1; mode=block" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    },
    {
      source: "/static/(.*)",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ],
    },
  ],
};

export default nextConfig;