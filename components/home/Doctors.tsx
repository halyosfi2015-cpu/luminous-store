"use client"

import Link from "next/link"
import { ArrowLeft, BadgeCheck } from "lucide-react"
import Container from "@/components/ui/Container"
import SectionTitle from "@/components/ui/SectionTitle"
import HorizontalCarousel from "@/components/ui/HorizontalCarousel"
import { experts } from "@/lib/content"
import { useLang } from "@/lib/use-lang"
import Image from "next/image"

export default function Doctors() {
  const { lang } = useLang()
  const isAr = lang === "ar"
  const t = (ar: string, en: string) => (isAr ? ar : en)

  return (
    <section className="w-full bg-background py-16 sm:py-20 lg:py-24">
      <Container>
        <SectionTitle
          eyebrow={t("خبراء موثوقون", "Trusted Experts")}
          title={t("أطباؤنا المتخصصون", "Our Specialist Doctors")}
          subtitle={t(
            "أطباء يمنيون معتمدون يقدمون لكِ أفضل العناية بالبشرة",
            "Certified Yemeni doctors offering premium skincare expertise"
          )}
          action={
            <Link
              href="/experts"
              className="group inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-semibold text-primary transition-all duration-200 hover:border-primary/40 hover:bg-primary/5"
            >
              {t("عرض الكل", "View All")}
              <ArrowLeft
                size={15}
                className={`transition-transform duration-200 group-hover:-translate-x-0.5 ${isAr ? "" : "rotate-180"}`}
              />
            </Link>
          }
        />

        <HorizontalCarousel ariaLabel={t("الأطباء", "Doctors")}>
          {experts.map((expert) => (
            <Link
              key={expert.id}
              href={`/experts/${expert.slug}`}
              className="group relative flex w-60 shrink-0 flex-col overflow-hidden rounded-card border border-border bg-card shadow-card transition-all duration-300 ease-out-smooth hover:-translate-y-1 hover:border-accent/30 hover:shadow-card-hover"
            >
               <div className="relative h-52 w-full overflow-hidden">
                <Image
                  src={expert.profileImage || "/images/experts/dr-default.svg"}
                  alt={isAr ? expert.nameAr : expert.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {expert.isVerified && (
                  <span className="absolute bottom-2 end-2 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-accent text-white">
                    <BadgeCheck size={11} />
                  </span>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-serif text-sm font-bold text-foreground">
                  {isAr ? expert.nameAr : expert.name}
                </h3>
                <p className="mt-0.5 text-xs text-accent">
                  {isAr ? expert.titleAr : expert.title}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {isAr ? expert.specialtyAr : expert.specialty}
                </p>
                {expert.city && (
                  <p className="mt-0.5 text-[10px] text-muted">
                    {isAr ? expert.cityAr : expert.city}
                  </p>
                )}
                <p className="mt-2 line-clamp-2 text-[10px] leading-tight text-muted">
                  {isAr ? expert.shortBioAr || expert.bioAr : expert.shortBio || expert.bio}
                </p>
                <button
                  type="button"
                  className="mt-2 w-full cursor-pointer rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-primary opacity-0 shadow-sm transition-all duration-300 group-hover:opacity-100 hover:bg-accent/90"
                >
                  {t("احجزي استشارة", "Book Consultation")}
                </button>
              </div>
            </Link>
          ))}
        </HorizontalCarousel>
      </Container>
    </section>
  )
}
