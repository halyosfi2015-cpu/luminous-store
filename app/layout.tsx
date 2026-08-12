import type { Metadata } from "next";
import "./globals.css";
import { Suspense } from "react";
import Providers from "@/components/Providers";
import BackButton from "@/components/ui/BackButton";
import SearchOverlay from "@/components/search/SearchOverlay";
import { rootStructuredData, websiteStructuredData } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: { default: "Luminous Derma — العناية الفاخرة بالبشرة", template: "%s | Luminous Derma" },
  description: "منتجات العناية بالبشرة الأصلية من أفضل الماركات العالمية. تسوقي سيروم، مرطبات، واقي شمس وأكثر مع Luminous Derma — وجهتك الأولى للعناية بالبشرة في اليمن.",
  keywords: ["عناية بالبشرة", "منتجات تجميل", "سيروم", "مرطب", "واقي شمس", "Luminous Derma", "لومينوس ديرما", "skincare Yemen"],
  openGraph: {
    title: "Luminous Derma — العناية الفاخرة بالبشرة",
    description: "منتجات العناية بالبشرة الأصلية من أفضل الماركات العالمية",
    url: "https://luminousderma.com",
    siteName: "Luminous Derma",
    locale: "ar_YE",
    type: "website",
  },
  robots: { index: true, follow: true },
  metadataBase: new URL("https://luminousderma.com"),
  alternates: { canonical: "/" },
  icons: {
    icon: "/images/logo/luminous-derma-icon.svg",
    shortcut: "/favicon.ico",
    apple: "/images/logo/luminous-derma-icon.svg",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" className="h-full scroll-smooth">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(rootStructuredData) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteStructuredData) }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var l=window.localStorage.getItem("ld-lang");if(l==="en"){document.documentElement.lang="en";document.documentElement.dir="ltr";}else{document.documentElement.lang="ar";document.documentElement.dir="rtl";}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background font-sans text-foreground antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:end-2 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-white focus:shadow-lg"
        >
          تخطى إلى المحتوى الرئيسي
        </a>
        <Providers>
          <div id="main-content" className="flex-1">
            {children}
          </div>
          <Suspense fallback={null}>
            <BackButton />
          </Suspense>
          <Suspense fallback={null}>
            <SearchOverlay />
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}
