"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  Eye,
  Gem,
  Handshake,
  Headset,
  Heart,
  HeartHandshake,
  LayoutGrid,
  Quote,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import Container from "@/components/ui/Container";
import { useLang } from "@/lib/use-lang";

const BRAND_LOGOS = [
  "/images/brands/eucerin.svg",
  "/images/brands/garnier.svg",
  "/images/brands/nivea.svg",
  "/images/brands/vaseline.svg",
  "/images/brands/sebamed.svg",
  "/images/brands/uriage.svg",
  "/images/brands/essence.svg",
  "/images/brands/mixsoon.svg",
  "/images/brands/the-elf.svg",
  "/images/brands/qv.svg",
  "/images/brands/some-by-mi.svg",
  "/images/brands/purito.svg",
];

type Bilingual = { ar: string; en: string };

const STORY: { lead: Bilingual; body: Bilingual[] } = {
  lead: {
    ar: "لم نبدأ بفكرة إنشاء متجر إلكتروني فحسب، بل بدأنا برؤية واضحة؛ أن يجد كل من يبحث عن منتجات أصلية، وتجربة موثوقة، وخدمة احترافية، مكانًا واحدًا يلبي جميع احتياجاته بثقة وراحة.",
    en: "We didn't simply start with the idea of an e-commerce store; we began with a clear vision — that anyone seeking authentic products, a trustworthy experience, and professional service finds one place that meets all their needs with confidence and ease.",
  },
  body: [
    {
      ar: "في سوق تتعدد فيه الخيارات ويصعب أحيانًا التمييز بين المنتج الأصلي والمنتج غير الموثوق، جاءت Luminous Derma لتكون الوجهة التي تمنح عملاءها راحة البال قبل الشراء، والثقة بعده.",
      en: "In a market full of options where it is sometimes hard to tell the authentic from the untrustworthy, Luminous Derma came to be the destination that gives its customers peace of mind before purchase and confidence after it.",
    },
    {
      ar: "جمعنا أفضل العلامات العالمية، والروتينات الذكية، والباقات المختارة بعناية، والعروض الموسمية، والخدمات المستقبلية في منصة واحدة، لتصبح رحلة العناية بالبشرة أكثر سهولة، وأكثر أمانًا، وأكثر متعة.",
      en: "We brought together the world's finest brands, smart routines, carefully curated bundles, seasonal offers, and future services in one platform — making the skincare journey easier, safer, and more enjoyable.",
    },
    {
      ar: "ولأننا نؤمن أن الجمال الحقيقي يبدأ بالثقة، فإننا لا نعرض أي منتج إلا بعد اختياره بعناية، ولا نعتبر علاقتنا مع العميل تنتهي عند إتمام الطلب، بل تبدأ من تلك اللحظة، من خلال المتابعة، والدعم، وخدمة ما بعد البيع.",
      en: "Because we believe true beauty begins with trust, we never offer a product without careful selection, and we don't consider our relationship with the customer to end at checkout — it begins from that moment, through follow-up, support, and after-sales care.",
    },
  ],
};

const VISION: Bilingual = {
  ar: "أن تصبح Luminous Derma الوجهة الأولى في اليمن لكل من يبحث عن منتجات أصلية وتجربة شراء احترافية، تجمع بين المتجر الإلكتروني والمتجر الفعلي، وتوفر كل ما يحتاجه العميل للعناية بالبشرة والجمال في مكان واحد. نطمح إلى بناء علامة تجارية يمنية تضاهي أفضل العلامات العالمية، يكون اسمها مرادفًا للثقة، والجودة، والأصالة.",
  en: "To make Luminous Derma the first destination in Yemen for anyone seeking authentic products and a professional shopping experience — combining an online store with a physical store, providing everything the customer needs for skincare and beauty in one place. We aspire to build a Yemeni brand that rivals the best global brands, a name synonymous with trust, quality, and authenticity.",
};

const MISSION: Bilingual = {
  ar: "رسالتنا ليست بيع المنتجات فحسب، بل بناء علاقة طويلة مع كل عميل، تقوم على الثقة، والصدق، والاهتمام الحقيقي. نسعى إلى تقديم تجربة متكاملة تبدأ من اختيار المنتج المناسب، وتمتد إلى خدمة ما بعد البيع، لأننا نؤمن أن رضا العميل لا يتحقق عند الشراء فقط، بل فيما بعده أيضًا.",
  en: "Our mission is not just to sell products, but to build a lasting relationship with every customer built on trust, honesty, and genuine care. We strive to deliver a complete experience that starts with choosing the right product and extends to after-sales service, because we believe customer satisfaction isn't achieved at purchase alone, but long after.",
};

const VALUES: { icon: React.ElementType; title: Bilingual; desc: Bilingual }[] = [
  {
    icon: ShieldCheck,
    title: { ar: "الثقة", en: "Trust" },
    desc: {
      ar: "نبني كل قرار نتخذه على احترام ثقة عملائنا، لأنها أثمن ما نملك.",
      en: "We build every decision we make on honoring our customers' trust, because it is the most valuable thing we own.",
    },
  },
  {
    icon: Gem,
    title: { ar: "الأصالة", en: "Authenticity" },
    desc: {
      ar: "نلتزم بتوفير منتجات أصلية من مصادر موثوقة، لأن الجودة ليست ميزة إضافية، بل أساس كل تجربة ناجحة.",
      en: "We are committed to providing authentic products from trusted sources, because quality is not an extra feature — it is the foundation of every successful experience.",
    },
  },
  {
    icon: HeartHandshake,
    title: { ar: "الاهتمام", en: "Care" },
    desc: {
      ar: "كل عميل له احتياجات مختلفة، لذلك نهتم بالتفاصيل التي تصنع الفرق، ونساعده على اختيار ما يناسبه بثقة.",
      en: "Every customer has different needs, so we care about the details that make the difference and help them choose what suits them with confidence.",
    },
  },
  {
    icon: Rocket,
    title: { ar: "الابتكار", en: "Innovation" },
    desc: {
      ar: "نطوّر منصتنا باستمرار لنقدم تجربة حديثة وسهلة تواكب أفضل المتاجر العالمية.",
      en: "We constantly develop our platform to deliver a modern, easy experience on par with the world's best stores.",
    },
  },
];

const TRUST_POINTS: { icon: React.ElementType; title: Bilingual; desc: Bilingual }[] = [
  {
    icon: BadgeCheck,
    title: { ar: "منتجات أصلية بعناية", en: "Carefully Authentic Products" },
    desc: {
      ar: "لا نضيف أي منتج إلى مجموعتنا إلا بعد التأكد من جودته ومصدره، لأننا نؤمن أن ما نثق باستخدامه لأنفسنا هو فقط ما يستحق أن يصل إليك.",
      en: "We never add a product to our collection without verifying its quality and source, because we believe only what we trust for ourselves deserves to reach you.",
    },
  },
  {
    icon: LayoutGrid,
    title: { ar: "كل ما تحتاجه... في مكان واحد", en: "Everything You Need... In One Place" },
    desc: {
      ar: "جمعنا أفضل العلامات العالمية، والروتينات، والهدايا، والباقات، والعروض، والخدمات، لتجد كل ما تحتاجه للعناية بالبشرة والجمال داخل منصة واحدة، دون الحاجة للبحث بين عشرات المتاجر.",
      en: "We've gathered the world's finest brands, routines, gifts, bundles, offers, and services so you find everything you need for skincare and beauty in one platform — no need to search across dozens of stores.",
    },
  },
  {
    icon: Headset,
    title: { ar: "خدمة ما بعد البيع", en: "After-Sales Service" },
    desc: {
      ar: "اهتمامنا لا ينتهي عند إتمام الطلب. فريقنا موجود دائمًا للإجابة عن استفساراتك، ومساعدتك في اختيار الأنسب، ومتابعة تجربتك، لأن العلاقة مع العميل تبدأ بعد الشراء، وليس قبله.",
      en: "Our care doesn't end when the order is placed. Our team is always here to answer your questions, help you choose what's right, and follow up on your experience — because the relationship begins after purchase, not before.",
    },
  },
  {
    icon: Handshake,
    title: { ar: "تجربة تستحق الثقة", en: "An Experience Worth Trusting" },
    desc: {
      ar: "من أول زيارة للموقع وحتى استلام طلبك، نحرص أن تكون كل خطوة واضحة، مريحة، وآمنة، لتشعر أنك تتعامل مع علامة تجارية تحترم ثقتك وتقدّر اختيارك.",
      en: "From the first visit to the site to receiving your order, we ensure every step is clear, comfortable, and safe — so you feel you're dealing with a brand that respects your trust and values your choice.",
    },
  },
];

const PROMISE: Bilingual = {
  ar: "قد تنسى اسم المنتج الذي اشتريته... لكننا نريدك أن تتذكر دائمًا الشعور الذي رافق تجربتك معنا. أن تشعر بأن هناك من اختار لك الأفضل، واحترم ثقتك، وكان إلى جانبك قبل الشراء وبعده. لن نبيعك منتجًا لا نثق به، ولن نعدك بما لا نستطيع تقديمه. وعدنا لك أن تبقى الجودة، والأصالة، والاهتمام، والثقة أساس كل ما نقدمه.",
  en: "You may forget the name of the product you bought... but we want you to always remember the feeling that accompanied your experience with us — the feeling that someone chose the best for you, honored your trust, and stood by your side before and after purchase. We won't sell you a product we don't trust, and we won't promise what we can't deliver. Our promise to you is that quality, authenticity, care, and trust remain the foundation of everything we offer.",
};

export default function AboutPageClient() {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const t = (b: Bilingual) => (isAr ? b.ar : b.en);
  const Arrow = isAr ? ArrowLeft : ArrowRight;

  return (
    <main dir={isAr ? "rtl" : "ltr"} className="min-h-screen overflow-hidden bg-background">
      {/* ==================================================================== */}
      {/* HERO — strong image + short message                                  */}
      {/* ==================================================================== */}
      <section className="relative w-full overflow-hidden bg-gradient-to-b from-[#FFF7F2] via-[#f8f4fc] to-[#f2edf8]">
        <div className="absolute inset-0" aria-hidden="true">
          <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#D4AF37]/10 blur-3xl" />
          <div className="absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-[#6B3FA0]/10 blur-3xl" />
          <div className="absolute left-1/3 top-1/4 h-48 w-48 rounded-full bg-[#4A306F]/5 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: "radial-gradient(circle, #4A306F 1px, transparent 1px)", backgroundSize: "28px 28px" }}
          />
        </div>

        <Container className="relative z-10 py-8 sm:py-10 lg:py-12">
          <nav aria-label={isAr ? "التنقل" : "Breadcrumb"} className="mb-4">
            <ol className="flex items-center gap-1.5 text-xs text-muted sm:text-sm">
              <li>
                <Link href="/" className="transition-colors hover:text-[#4A306F]">
                  {isAr ? "الرئيسية" : "Home"}
                </Link>
              </li>
              <ChevronRight size={13} className={isAr ? "" : "rotate-180"} />
              <li className="font-medium text-[#322144]">{isAr ? "من نحن" : "About Us"}</li>
            </ol>
          </nav>

          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-pill border border-[#D4AF37]/50 bg-[#D4AF37]/10 px-3.5 py-1 text-xs font-semibold tracking-wider text-[#4A306F]">
              <Sparkles size={13} className="text-[#D4AF37]" />
              {isAr ? "أول منصة يمنية متخصصة" : "The First Specialized Yemeni Platform"}
            </span>

            {/* Brand name — exactly like the logo */}
            <h1 className="mt-4">
              <span className="block bg-gradient-to-r from-[#322144] via-[#6B3FA0] to-[#D4AF37] bg-clip-text font-serif text-3xl font-bold leading-tight text-transparent sm:text-4xl lg:text-5xl">
                Luminous
              </span>
              <span className="mt-2 flex items-center gap-3">
                <span className="flex flex-col gap-[3px]" aria-hidden="true">
                  <span className="h-px w-5 bg-[#D4AF37]" />
                  <span className="h-px w-5 bg-[#D4AF37]" />
                </span>
                <span className="bg-gradient-to-r from-[#D4AF37] to-[#F7D98C] bg-clip-text font-sans text-sm font-semibold uppercase tracking-[0.3em] text-transparent sm:text-base">
                  Derma
                </span>
                <span className="flex flex-col gap-[3px]" aria-hidden="true">
                  <span className="h-px w-5 bg-[#D4AF37]" />
                  <span className="h-px w-5 bg-[#D4AF37]" />
                </span>
              </span>
            </h1>

            <p className="mt-2 text-sm leading-relaxed text-muted sm:text-base">
              {isAr
                ? "نلتقي بالعناية بالبشرة والجمال... في مكان واحد"
                : "Where skincare & beauty meet... in one place"}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-4">
              <Link
                href="/products"
                className="group inline-flex items-center gap-2 rounded-button bg-[#D4AF37] px-7 py-3 text-sm font-bold text-[#322144] shadow-card transition-all duration-300 ease-out-smooth hover:bg-[#F7D98C] hover:shadow-xl active:scale-95"
              >
                <Sparkles size={14} />
                {isAr ? "اكتشف منتجاتنا" : "Discover Our Products"}
                <Arrow size={14} className="transition-transform duration-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
              </Link>
              <Link
                href="/quiz"
                className="inline-flex items-center gap-2 rounded-button border border-[#4A306F]/30 bg-white/60 px-7 py-3 text-sm font-bold text-[#4A306F] transition-all duration-300 hover:border-[#4A306F]/60 hover:bg-[#4A306F]/5 active:scale-95"
              >
                {isAr ? "ابدأ رحلتك معنا" : "Start Your Journey"}
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* ==================================================================== */}
      {/* OUR STORY — text + brand wall                                        */}
      {/* ==================================================================== */}
      <section className="relative py-10 sm:py-14">
        <div className="absolute inset-0" aria-hidden="true">
          <div className="absolute -right-40 top-24 h-96 w-96 rounded-full bg-[#6B3FA0]/5 blur-3xl" />
          <div className="absolute -left-32 bottom-10 h-80 w-80 rounded-full bg-[#D4AF37]/5 blur-3xl" />
        </div>

        <Container className="relative">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Text */}
            <div>
              <SectionEyebrow>{isAr ? "قصتنا" : "Our Story"}</SectionEyebrow>
              <h2 className="mt-4 font-serif text-3xl font-bold leading-tight text-[#322144] sm:text-4xl">
                {isAr ? "رحلة بدأت برؤية... واستمرّت بثقة" : "A journey that began with a vision... and continues with trust"}
              </h2>

              <p className="mt-6 border-r-4 border-[#D4AF37] pr-4 font-serif text-lg font-medium leading-relaxed text-[#4A306F] sm:text-xl">
                {t(STORY.lead)}
              </p>

              <div className="mt-6 space-y-4">
                {STORY.body.map((p, i) => (
                  <p key={i} className="text-sm leading-relaxed text-muted sm:text-base">
                    {t(p)}
                  </p>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                {[
                  { icon: ShieldCheck, text: isAr ? "100% أصالة" : "100% Authentic" },
                  { icon: Star, text: isAr ? "علامات عالمية" : "Global Brands" },
                  { icon: Headset, text: isAr ? "دعم مستمر" : "Always Supported" },
                ].map((chip, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-2 rounded-pill border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground shadow-card"
                  >
                    <chip.icon size={14} className="text-[#D4AF37]" />
                    {chip.text}
                  </span>
                ))}
              </div>
            </div>

            {/* Brand wall */}
            <div className="relative">
              <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-[#D4AF37]/30 via-transparent to-[#4A306F]/15 blur-sm" aria-hidden="true" />
              <div className="relative overflow-hidden rounded-[2rem] border border-[#D4AF37]/40 bg-gradient-to-b from-[#f8f4fc] to-[#f2edf8] p-6 shadow-elevated sm:p-8">
                <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest text-[#4A306F]">
                  <span className="h-0.5 w-6 rounded-pill bg-[#D4AF37]" />
                  {isAr ? "علامات عالمية نثق بها" : "Global Brands We Trust"}
                </span>
                <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {BRAND_LOGOS.map((src, i) => (
                    <div
                      key={i}
                      className="relative aspect-[2/1] overflow-hidden rounded-xl border border-[#e9def5] bg-white"
                    >
                      <Image src={src} alt="" fill className="object-contain p-1.5" sizes="150px" />
                    </div>
                  ))}
                </div>
                <p className="mt-5 text-center text-xs font-semibold text-[#4A306F]">
                  {isAr ? "+ أكثر من 100 علامة عالمية موثوقة" : "+ 100 more trusted global brands"}
                </p>
              </div>

              {/* Floating quote card */}
              <div className="absolute -bottom-6 start-4 end-4 sm:start-auto sm:end-8 sm:w-80">
                <div className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/30 bg-white/95 p-5 text-[#322144] shadow-elevated backdrop-blur">
                  <Quote size={28} className="absolute -top-2 end-3 text-[#D4AF37]/40" />
                  <p className="text-sm font-medium leading-relaxed">
                    {isAr
                      ? "الجمال الحقيقي يبدأ بالثقة... والثقة تبدأ من المكان الصحيح."
                      : "True beauty begins with trust... and trust begins at the right place."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ==================================================================== */}
      {/* VISION & MISSION — two cards                                         */}
      {/* ==================================================================== */}
      <section className="bg-white py-10 sm:py-14">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <SectionEyebrow>{isAr ? "ما الذي يحرّكنا" : "What Drives Us"}</SectionEyebrow>
            <h2 className="mt-4 font-serif text-3xl font-bold leading-tight text-[#322144] sm:text-4xl">
              {isAr ? "رؤيتنا ورسالتنا" : "Our Vision & Mission"}
            </h2>
          </div>

          <div className="mx-auto mt-8 grid max-w-5xl grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Vision */}
            <div className="group relative overflow-hidden rounded-card border border-[#e9def5] bg-gradient-to-b from-[#f8f4fc]/70 to-card p-8 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated sm:p-10">
              <div className="absolute -end-16 -top-16 h-48 w-48 rounded-full bg-[#D4AF37]/10 blur-2xl" aria-hidden="true" />
              <div className="relative">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#F7D98C] text-white shadow-primary">
                  <Eye size={26} />
                </span>
                <h3 className="mt-6 flex items-center gap-2 text-xl font-bold text-[#322144] sm:text-2xl">
                  {isAr ? "رؤيتنا" : "Our Vision"}
                  <span aria-hidden="true">🌍</span>
                </h3>
                <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">
                  {t(VISION)}
                </p>
              </div>
            </div>

            {/* Mission */}
            <div className="group relative overflow-hidden rounded-card border border-[#e9def5] bg-gradient-to-b from-[#f8f4fc]/70 to-card p-8 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated sm:p-10">
              <div className="absolute -end-16 -top-16 h-48 w-48 rounded-full bg-[#6B3FA0]/10 blur-2xl" aria-hidden="true" />
              <div className="relative">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4A306F] to-[#322144] text-white shadow-primary">
                  <Heart size={26} />
                </span>
                <h3 className="mt-6 flex items-center gap-2 text-xl font-bold text-[#322144] sm:text-2xl">
                  {isAr ? "رسالتنا" : "Our Mission"}
                  <span aria-hidden="true">💜</span>
                </h3>
                <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">
                  {t(MISSION)}
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ==================================================================== */}
      {/* OUR VALUES — luxury icons                                            */}
      {/* ==================================================================== */}
      <section className="relative py-10 sm:py-14">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <SectionEyebrow>{isAr ? "قيمنا" : "Our Values"}</SectionEyebrow>
            <h2 className="mt-4 font-serif text-3xl font-bold leading-tight text-[#322144] sm:text-4xl">
              {isAr ? "مبادئ نلتزم بها في كل خطوة" : "Principles We Honor at Every Step"}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm text-muted sm:text-base">
              {isAr
                ? "أربع قيم تشكّل أساس كل قرار نتخذه، وكل منتج نعرضه، وكل عميل نخدمه."
                : "Four values form the foundation of every decision we make, every product we offer, and every customer we serve."}
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((value, i) => (
              <div
                key={i}
                className="group relative overflow-hidden rounded-card border border-[#e9def5] bg-card p-7 shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:border-[#D4AF37]/50 hover:shadow-elevated"
              >
                <div
                  className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  aria-hidden="true"
                />
                <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-[#D4AF37]/40 bg-gradient-to-br from-[#D4AF37]/20 to-[#F7D98C]/10 transition-all duration-300 group-hover:scale-110 group-hover:-rotate-6">
                  <value.icon size={28} className="text-[#4A306F]" />
                </span>
                <h3 className="mt-6 text-lg font-bold text-[#322144]">{t(value.title)}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-muted">{t(value.desc)}</p>
                <span className="pointer-events-none absolute -bottom-4 -end-2 select-none font-serif text-8xl font-bold text-[#4A306F]/5">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ==================================================================== */}
      {/* WHY TRUST US — four cards                                            */}
      {/* ==================================================================== */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#f8f4fc] to-[#f2edf8] py-10 sm:py-14">
        <div className="absolute inset-0" aria-hidden="true">
          <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-[#D4AF37]/10 blur-3xl" />
          <div className="absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-[#6B3FA0]/10 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: "radial-gradient(circle, #4A306F 1px, transparent 1px)", backgroundSize: "26px 26px" }}
          />
        </div>

        <Container className="relative">
          <div className="mx-auto max-w-2xl text-center">
            <SectionEyebrow>
              {isAr ? "لماذا يثق بنا عملاؤنا؟" : "Why Our Customers Trust Us"}
            </SectionEyebrow>
            <h2 className="mt-4 font-serif text-3xl font-bold leading-tight text-[#322144] sm:text-4xl">
              {isAr ? "أسباب تجعلنا وجهتك الأولى" : "Reasons That Make Us Your First Choice"}
            </h2>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST_POINTS.map((point, i) => (
              <div
                key={i}
                className="group flex flex-col rounded-2xl border border-[#e9def5] bg-white p-7 shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:border-[#D4AF37]/50 hover:shadow-elevated"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#D4AF37]/15 text-[#4A306F] transition-transform duration-300 group-hover:scale-110">
                  <point.icon size={24} />
                </span>
                <h3 className="mt-5 text-base font-bold leading-snug text-[#322144]">{t(point.title)}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{t(point.desc)}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ==================================================================== */}
      {/* OUR PROMISE — elegant banner                                         */}
      {/* ==================================================================== */}
      <section className="relative py-10 sm:py-14">
        <Container>
          <div className="relative overflow-hidden rounded-[2.5rem] border border-[#D4AF37]/30 bg-gradient-to-br from-[#f8f4fc] via-white to-[#f2edf8] px-6 py-14 shadow-elevated sm:px-14 sm:py-20">
            <div className="absolute inset-0" aria-hidden="true">
              <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[#D4AF37]/10 blur-3xl" />
              <div className="absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-[#6B3FA0]/10 blur-3xl" />
              <div
                className="absolute inset-0 opacity-[0.03]"
                style={{ backgroundImage: "radial-gradient(circle, #4A306F 1px, transparent 1px)", backgroundSize: "22px 22px" }}
              />
            </div>

            <div className="relative mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-pill border border-[#D4AF37]/50 bg-[#D4AF37]/10 px-4 py-1.5 text-xs font-semibold tracking-wider text-[#4A306F]">
                <HeartHandshake size={14} className="text-[#D4AF37]" />
                {isAr ? "وعدنا لك" : "Our Promise To You"}
              </span>

              <blockquote className="mt-8">
                <p className="text-lg font-medium leading-relaxed text-[#322144] sm:text-2xl">
                  {isAr ? "قد تنسى اسم المنتج الذي اشتريته..." : "You may forget the product you bought..."}
                </p>
                <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
                  {t(PROMISE)}
                </p>
              </blockquote>

              <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/products"
                  className="group inline-flex items-center gap-2 rounded-button bg-[#D4AF37] px-8 py-3.5 text-sm font-bold text-[#322144] shadow-card transition-all duration-300 hover:bg-[#F7D98C] hover:shadow-xl active:scale-95"
                >
                  <Sparkles size={15} className="text-[#4A306F]" />
                  {isAr ? "اكتشف منتجاتنا" : "Discover Our Products"}
                  <Arrow size={15} className="transition-transform duration-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-button border border-[#4A306F]/30 bg-white/60 px-8 py-3.5 text-sm font-bold text-[#4A306F] transition-all duration-300 hover:border-[#4A306F]/60 hover:bg-[#4A306F]/5 active:scale-95"
                >
                  {isAr ? "تواصل معنا" : "Contact Us"}
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ==================================================================== */}
      {/* CLOSING CTA                                                          */}
      {/* ==================================================================== */}
      <section className="pb-12 sm:pb-16">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <p className="inline-block text-center">
              <span className="block bg-gradient-to-r from-[#322144] via-[#6B3FA0] to-[#D4AF37] bg-clip-text font-serif text-3xl font-bold leading-relaxed text-transparent sm:text-4xl">
                Luminous
              </span>
              <span className="mt-1 flex items-center justify-center gap-3">
                <span className="flex flex-col gap-[3px]" aria-hidden="true">
                  <span className="h-px w-5 bg-[#D4AF37]" />
                  <span className="h-px w-5 bg-[#D4AF37]" />
                </span>
                <span className="bg-gradient-to-r from-[#D4AF37] to-[#F7D98C] bg-clip-text font-sans text-xs font-semibold uppercase tracking-[0.3em] text-transparent sm:text-sm">
                  Derma
                </span>
                <span className="flex flex-col gap-[3px]" aria-hidden="true">
                  <span className="h-px w-5 bg-[#D4AF37]" />
                  <span className="h-px w-5 bg-[#D4AF37]" />
                </span>
              </span>
            </p>
            <p className="mt-3 text-base leading-relaxed text-muted sm:text-lg">
              {isAr
                ? "لأن الجمال الحقيقي يبدأ بالثقة... والثقة تبدأ من المكان الصحيح."
                : "Because true beauty begins with trust... and trust begins at the right place."}
            </p>
            <Link
              href="/products"
              className="group mt-8 inline-flex items-center gap-2 rounded-button bg-[#4A306F] px-10 py-4 text-sm font-bold text-white shadow-primary transition-all duration-300 ease-out-smooth hover:bg-[#6B3FA0] hover:shadow-elevated active:scale-95"
            >
              {isAr ? "ابدأ رحلتك معنا" : "Start Your Journey With Us"}
              <Arrow size={16} className="transition-transform duration-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
            </Link>
          </div>
        </Container>
      </section>
    </main>
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest text-[#4A306F]">
      <span className="h-0.5 w-6 rounded-pill bg-[#D4AF37]" />
      {children}
    </span>
  );
}
