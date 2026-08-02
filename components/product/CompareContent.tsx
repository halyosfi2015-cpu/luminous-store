"use client";

import { Scale, Star, Check, X, ShoppingCart, Trash2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useCompare } from "@/context/CompareContext";
import { products } from "@/src/data/products";
import Button from "@/components/ui/Button";
import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import CompareButton from "@/components/product/CompareButton";
import type { SkinType, SkinConcern } from "@/types/product";

function formatPrice(amount: number): string {
  return amount.toLocaleString("ar-YE");
}

const skinTypeLabels: Record<SkinType, string> = {
  dry: "جافة", oily: "دهنية", combination: "مختلطة", sensitive: "حساسة", normal: "عادية", all: "جميع الأنواع",
};

const skinConcernLabels: Record<SkinConcern, string> = {
  acne: "حبوب الشباب", dryness: "الجفاف", pigmentation: "التصبغات", aging: "الشيخوخة",
  redness: "الاحمرار", large_pores: "المسام الواسعة", uneven_texture: "الملمس غير المتجانس",
  dark_circles: "الهالات السوداء", oiliness: "اللمعة الزائدة", sensitivity: "الحساسية",
};

type RowProps = {
  label: string;
  cells: React.ReactNode[];
};

function CompareRow({ label, cells }: RowProps) {
  return (
    <tr className="border-b border-border">
      <td className="sticky end-0 bg-card px-4 py-3.5 text-sm font-medium text-foreground whitespace-nowrap min-w-[120px] border-e border-border">
        {label}
      </td>
      {cells.map((cell, i) => (
        <td key={i} className="px-4 py-3.5 text-sm text-muted text-center min-w-[180px]">
          {cell}
        </td>
      ))}
    </tr>
  );
}

export default function CompareContent() {
  const { items, clear, count } = useCompare();
  const compared = products.filter((p) => items.includes(p.id));

  if (compared.length === 0) {
    return (
      <Container className="py-16">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-card bg-muted-bg mb-6">
            <Scale size={48} className="text-border-strong" />
          </div>
          <p className="text-xl font-bold text-foreground">لم تختر منتجات للمقارنة</p>
          <p className="mt-2 text-sm text-muted max-w-sm">
            أضيفي منتجات إلى المقارنة لترى الفروقات بينها بسهولة
          </p>
          <Link
            href="/categories/skincare"
            className="mt-8 inline-flex items-center rounded-button bg-primary px-8 py-3 text-sm font-medium text-white shadow-card transition-all duration-200 hover:bg-primary-700 hover:shadow-card-hover active:scale-95"
          >
            تصفح المنتجات
          </Link>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-8">
      <div className="flex items-center justify-between mb-6">
        <SectionTitle
          title="مقارنة المنتجات"
          subtitle={`${count} من 4 منتجات`}
        />
        <button
          type="button"
          onClick={clear}
          className="flex items-center gap-1.5 rounded-button border border-border px-4 py-2 text-xs font-medium text-muted transition-all duration-200 hover:border-secondary-200 hover:bg-secondary-50 hover:text-secondary-500"
        >
          <Trash2 size={14} />
          مسح الكل
        </button>
      </div>

      <div className="overflow-x-auto rounded-card border border-border bg-card shadow-card">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-border bg-card">
              <th className="sticky end-0 bg-card px-4 py-4 min-w-[120px]" />
              {compared.map((product) => (
                <th key={product.id} className="px-4 py-4 text-center min-w-[200px]">
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative aspect-square w-28 rounded-xl bg-muted-bg overflow-hidden">
                      {product.gallery[0] && (
                        <Image
                          src={product.gallery[0]}
                          alt={product.name.ar}
                          fill
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="flex gap-1">
                      <CompareButton productId={product.id} iconOnly size={14} />
                    </div>
                    <Link
                      href={`/products/${product.slug}`}
                      className="text-sm font-semibold text-foreground transition-colors hover:text-primary line-clamp-2"
                    >
                      {product.name.ar}
                    </Link>
                    <p className="text-[11px] text-primary font-medium">{product.brand}</p>
                    <div className="flex items-center gap-1">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star
                            key={i}
                            size={11}
                            className={
                              i < Math.floor(product.rating)
                                ? "fill-accent text-accent"
                                : "text-border-strong"
                            }
                          />
                        ))}
                      </div>
                      <span className="text-[11px] text-muted">
                        ({product.reviewCount ?? product.rating})
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className="text-base font-bold text-foreground">
                        {formatPrice(product.pricing.price)} ر.ي
                      </span>
                      {product.pricing.originalPrice && (
                        <span className="text-xs text-muted line-through">
                          {formatPrice(product.pricing.originalPrice)} ر.ي
                        </span>
                      )}
                    </div>
                    <Button variant="primary" size="sm" className="w-full gap-1.5">
                      <ShoppingCart size={14} />
                      أضف إلى السلة
                    </Button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <CompareRow
              label="السعر"
              cells={compared.map((p) => (
                <span key={p.id} className="font-bold text-foreground">{formatPrice(p.pricing.price)} ر.ي</span>
              ))}
            />
            <CompareRow
              label="الخصم"
              cells={compared.map((p) =>
                p.discount ? (
                  <span key={p.id} className="inline-flex rounded-full bg-error-soft border border-error-border px-2 py-0.5 text-xs font-semibold text-error-fg">
                    -{p.discount}%
                  </span>
                ) : (
                  <span key={p.id} className="text-muted">—</span>
                )
              )}
            />
            <CompareRow
              label="التقييم"
              cells={compared.map((p) => (
                <div key={p.id} className="flex items-center justify-center gap-1">
                  <Star size={14} className="fill-accent text-accent" />
                  <span className="font-medium text-foreground">{p.rating}</span>
                  <span className="text-muted">/5</span>
                </div>
              ))}
            />
            <CompareRow
              label="الوصف"
              cells={compared.map((p) => (
                <span key={p.id} className="text-xs leading-relaxed">{p.description.ar}</span>
              ))}
            />
            <CompareRow
              label="المناسب لأنواع البشرة"
              cells={compared.map((p) => (
                <div key={p.id} className="flex flex-wrap justify-center gap-1">
                  {(p.skinTypes ?? p.suitableFor ?? []).length > 0 ? (p.skinTypes ?? p.suitableFor ?? []).map((t) => (
                    <span key={t} className="inline-flex rounded-full bg-success-soft border border-success-border px-2 py-0.5 text-[11px] font-medium text-success-fg">
                      {skinTypeLabels[t as SkinType] ?? t}
                    </span>
                  )) : (
                    <span className="text-[11px] text-muted">جميع الأنواع</span>
                  )}
                </div>
              ))}
            />
            <CompareRow
              label="مشاكل البشرة"
              cells={compared.map((p) => (
                <div key={p.id} className="flex flex-wrap justify-center gap-1">
                  {(p.skinConcerns ?? []).map((c) => (
                    <span key={c} className="inline-flex rounded-full bg-primary/5 border border-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      {skinConcernLabels[c as SkinConcern] ?? c}
                    </span>
                  ))}
                </div>
              ))}
            />
            <CompareRow
              label="المكونات الرئيسية"
              cells={compared.map((p) => (
                <ul key={p.id} className="space-y-1 text-xs">
                  {p.ingredients.ar.slice(0, 4).map((ingName, i) => (
                    <li key={i} className="text-muted">
                      {ingName}
                    </li>
                  ))}
                  {p.ingredients.ar.length > 4 && (
                    <li className="text-[11px] text-primary">+{p.ingredients.ar.length - 4} أخرى</li>
                  )}
                </ul>
              ))}
            />
            <CompareRow
              label="متوفر"
              cells={compared.map((p) =>
                p.stock > 0 ? (
                  <div key={p.id} className="flex items-center justify-center gap-1">
                    <Check size={16} className="text-success" />
                    <span className="text-xs text-success-fg">متوفر</span>
                  </div>
                ) : (
                  <div key={p.id} className="flex items-center justify-center gap-1">
                    <X size={16} className="text-border-strong" />
                    <span className="text-xs text-muted">غير متوفر</span>
                  </div>
                )
              )}
            />
          </tbody>
        </table>
      </div>
    </Container>
  );
}