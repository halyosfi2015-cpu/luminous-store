import TopBar from "@/components/layout/TopBar";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/home/Hero";
import RoutinesSection from "@/components/home/RoutinesSection";
import Products from "@/components/home/Products";
import WeeklyOffers from "@/components/home/WeeklyOffers";
import Brands from "@/components/home/Brands";
import ProblemSolutions from "@/components/home/ProblemSolutions";
import Experts from "@/components/home/Experts";
import TrendingNow from "@/components/home/TrendingNow";
import PremiumServicesAndBundles from "@/components/home/PremiumServicesAndBundles";
import NewArrivals from "@/components/home/NewArrivals";
import SmartRecommendations from "@/components/home/SmartRecommendations";

export const metadata = {
  title: "Luminous Derma — العناية الفاخرة بالبشرة",
  description: "منتجات العناية بالبشرة الأصلية من أفضل الماركات العالمية. تسوقي سيروم، مرطبات، واقي شمس وأكثر مع Luminous Derma — وجهتك الأولى للعناية بالبشرة في اليمن.",
  keywords: ["عناية بالبشرة", "منتجات تجميل", "سيروم", "مرطب", "واقي شمس", "Luminous Derma", "لومينوس ديرما", "skincare Yemen"],
  alternates: { canonical: "https://luminousderma.com/" },
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
      </div>
      <main id="main-content">
        <div className="mx-auto w-full max-w-[1800px] px-4 sm:px-6 lg:px-8">
          <Hero />
        </div>
        <TrendingNow />
        <RoutinesSection />
        <ProblemSolutions />
        <Experts />
        <Brands />
        <PremiumServicesAndBundles />
        <Products />
        <NewArrivals />
        <SmartRecommendations />
        <WeeklyOffers />
      </main>
      <Footer />
    </>
  );
}