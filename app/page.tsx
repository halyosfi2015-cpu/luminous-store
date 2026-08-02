import TopBar from "@/components/layout/TopBar";
import Header from "@/components/layout/Header";
import Navbar from "@/components/layout/Navbar";
import CategorySidebar from "@/components/layout/CategorySidebar";
import dynamic from "next/dynamic";
import Footer from "@/components/layout/Footer";

const Hero = dynamic(() => import("@/components/home/Hero"));
const DiscoverCollection = dynamic(() => import("@/components/home/DiscoverCollection"));
const FeaturedCollections = dynamic(() => import("@/components/home/FeaturedCollections"));
const Products = dynamic(() => import("@/components/home/Products"));
const WeeklyOffers = dynamic(() => import("@/components/home/WeeklyOffers"));
const Brands = dynamic(() => import("@/components/home/Brands"));
const Doctors = dynamic(() => import("@/components/home/Doctors"));

export const metadata = {
  title: "Luminous Derma — العناية الفاخرة بالبشرة",
  description: "منتجات العناية بالبشرة الأصلية من أفضل الماركات العالمية. تسوقي سيروم، مرطبات، واقي شمس وأكثر مع Luminous Derma — وجهتك الأولى للعناية بالبشرة في اليمن.",
  keywords: ["عناية بالبشرة", "منتجات تجميل", "سيروم", "مرطب", "واقي شمس", "Luminous Derma", "لومينوس ديرما", "skincare Yemen"],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Luminous Derma",
            url: "https://luminousderma.com",
            description: "منتجات العناية بالبشرة الأصلية من أفضل الماركات العالمية",
            potentialAction: {
              "@type": "SearchAction",
              target: "https://luminousderma.com/search?q={search_term_string}",
              "query-input": "required name=search_term_string",
            },
          }),
        }}
      />
      <TopBar />
      <div className="sticky top-0 z-50 bg-background">
        <Header />
        <Navbar />
      </div>
      <main id="main-content">
        <div className="mx-auto w-full max-w-[1800px] px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:items-start">
            <div className="lg:row-start-1 lg:h-[680px] lg:max-h-[680px]">
              <CategorySidebar />
            </div>
            <div className="min-w-0 lg:row-start-1">
              <Hero />
            </div>
          </div>
        </div>
        <DiscoverCollection />
        <FeaturedCollections />
        <Products />
        <WeeklyOffers />
        <Brands />
        <Doctors />
      </main>
      <Footer />
    </>
  );
}
