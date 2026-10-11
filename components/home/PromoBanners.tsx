import Link from "next/link";
import { BadgePercent, Sparkles, Truck, ArrowLeft } from "lucide-react";
import Container from "@/components/ui/Container";

const banners = [
  {
    icon: BadgePercent,
    titleAr: "عروض الأسبوع",
    subtitleAr: "خصومات تصل إلى 30% على مختارات العناية بالبشرة",
    ctaAr: "اكتشفي العروض",
    href: "/#offers",
    gradient: "from-primary-800 via-primary to-primary-light",
    chip: "bg-accent text-primary-950",
  },
  {
    icon: Sparkles,
    titleAr: "روتينات متكاملة",
    subtitleAr: "تصفحي روتيناتنا المتكاملة واشتري روتين كامل بسهولة",
    ctaAr: "تصفحي الروتينات",
    href: "/#routines",
    gradient: "from-secondary-600 via-secondary to-secondary-300",
    chip: "bg-primary text-white",
  },
  {
    icon: Truck,
    titleAr: "شحن سريع",
    subtitleAr: "توصيل لجميع المحافظات مع تتبع لحظي للطلب",
    ctaAr: "ابدئي التسوق",
    href: "/products",
    gradient: "from-primary-950 via-primary-700 to-primary-500",
    chip: "bg-secondary text-primary-950",
  },
];

export default function PromoBanners() {
  return (
    <section className="w-full bg-background pb-2">
      <Container>
        <div dir="rtl" className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4 max-sm:flex max-sm:snap-x max-sm:snap-mandatory max-sm:gap-3 max-sm:overflow-x-auto max-sm:pb-2">
          {banners.map((banner) => (
            <Link
              key={banner.titleAr}
              href={banner.href}
              className={`magic-autoshine luminous-shine group relative overflow-hidden rounded-card bg-gradient-to-br ${banner.gradient} p-4 shadow-card transition-all duration-300 ease-out-smooth hover:-translate-y-1 hover:shadow-card-hover sm:p-6 max-sm:min-w-[80vw] max-sm:snap-start`}
            >
              <div className="absolute inset-0 bg-[url('/images/pattern-dots.svg')] bg-repeat opacity-[0.05]" />
              <div className="pointer-events-none absolute -end-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl transition-all duration-500 ease-out-smooth group-hover:scale-150" />
              <div className="relative flex flex-col gap-2 sm:gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-button bg-white/15 text-white backdrop-blur-sm transition-transform duration-300 ease-spring group-hover:-rotate-6 group-hover:scale-110 sm:h-11 sm:w-11">
                  <banner.icon size={18} className="sm:hidden" />
                  <banner.icon size={20} className="hidden sm:block" />
                </span>
                <div>
                  <h3 className="font-sans text-base font-bold text-white sm:text-lg">{banner.titleAr}</h3>
                  <p className="mt-0.5 text-xs leading-[1.8] text-white/90 sm:mt-1 sm:text-sm">{banner.subtitleAr}</p>
                </div>
                <span className={`inline-flex w-fit items-center gap-1.5 rounded-pill px-4 py-2.5 min-h-[36px] text-[13px] font-bold ${banner.chip}`}>
                  {banner.ctaAr}
                  <ArrowLeft size={13} className="transition-transform duration-200 ease-out-smooth group-hover:-translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
