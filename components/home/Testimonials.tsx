import { Star, BadgeCheck, MessageCircle } from "lucide-react";
import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import { testimonials } from "@/lib/content";

export default function Testimonials() {
  return (
    <section className="w-full bg-card py-16 sm:py-20 lg:py-24">
      <Container>
        <SectionTitle
          eyebrow="آراء عملائنا"
          title="ماذا قالوا عنا"
          subtitle="ثقة آلاف العميلات هي أساس نجاحنا - تابعي تجاربهن الحقيقية"
          align="center"
        />
        <div
          dir="rtl"
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {testimonials.slice(0, 3).map((testimonial) => (
            <figure
              key={testimonial.id}
              className="relative flex flex-col gap-4 rounded-card border border-border bg-background p-6 shadow-card transition-all duration-300 ease-out-smooth hover:-translate-y-1 hover:border-secondary/30 hover:shadow-card-hover hover:shadow-secondary/20"
            >
              <MessageCircle size={28} className="absolute end-6 top-6 text-secondary/30" />
              <div className="flex items-center gap-1" aria-label={`تقييم ${testimonial.rating} من 5`}>
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    size={15}
                    className={i < testimonial.rating ? "fill-accent text-accent" : "text-border-strong"}
                  />
                ))}
              </div>
              <blockquote className="text-sm leading-relaxed text-foreground/80">
                {testimonial.textAr}
              </blockquote>
              <figcaption className="mt-auto flex items-center gap-3 border-t border-border pt-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-sm font-bold text-white">
                  {testimonial.nameAr.charAt(0)}
                </span>
                <div>
                  <p className="text-sm font-bold text-foreground">{testimonial.nameAr}</p>
                  <p className="flex items-center gap-1 text-[11px] text-muted">
                    {testimonial.isVerified && <BadgeCheck size={12} className="text-success" />}
                    {testimonial.titleAr}
                  </p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </Container>
    </section>
  );
}
