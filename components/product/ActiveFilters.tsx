import { X, RotateCcw } from "lucide-react";
import { OTHER_BRAND } from "@/components/product/FilterSidebar";
import type { FilterState, SkinType, SkinConcern } from "@/types/product";

type ActiveFiltersProps = {
  filters: FilterState;
  onRemove: (key: keyof FilterState, value: string | number) => void;
  onClear: () => void;
};

const skinTypeLabels: Record<SkinType, string> = {
  dry: "جافة", oily: "دهنية", combination: "مختلطة", sensitive: "حساسة", normal: "عادية", all: "جميع الأنواع",
};

const skinConcernLabels: Record<SkinConcern, string> = {
  acne: "حبوب الشباب", dryness: "الجفاف", pigmentation: "التصبغات", aging: "الشيخوخة",
  redness: "الاحمرار", large_pores: "المسام الواسعة", uneven_texture: "الملمس غير المتجانس",
  dark_circles: "الهالات السوداء", oiliness: "اللمعة الزائدة", sensitivity: "الحساسية",
};

const priceRangeLabels: Record<string, string> = {
  "0-5000": "أقل من 5,000 ر.ي",
  "5000-10000": "5,000 - 10,000 ر.ي",
  "10000-15000": "10,000 - 15,000 ر.ي",
  "15000+": "أكثر من 15,000 ر.ي",
};

type ChipProps = {
  label: string;
  onRemove: () => void;
};

function Chip({ label, onRemove }: ChipProps) {
  return (
    <span className="inline-flex animate-fade-in items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`إزالة فلتر ${label}`}
        className="rounded-full p-0.5 transition-colors hover:bg-primary/10"
      >
        <X size={12} />
      </button>
    </span>
  );
}

export default function ActiveFilters({ filters, onRemove, onClear }: ActiveFiltersProps) {
  const chips: { key: keyof FilterState; label: string; value: string | number }[] = [];

  filters.brands.forEach((b) => chips.push({ key: "brands", label: b === OTHER_BRAND ? "أخرى" : b, value: b }));
  filters.skinTypes.forEach((t) => chips.push({ key: "skinTypes", label: skinTypeLabels[t as SkinType], value: t }));
  filters.skinConcerns.forEach((c) => chips.push({ key: "skinConcerns", label: skinConcernLabels[c as SkinConcern], value: c }));
  filters.priceRanges.forEach((r) => chips.push({ key: "priceRanges", label: priceRangeLabels[r] || r, value: r }));
  filters.ratings.forEach((r) => chips.push({ key: "ratings", label: `${r}+ نجوم`, value: String(r) }));

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted">الفلاتر النشطة:</span>
      {chips.map((chip) => (
        <Chip
          key={`${chip.key}-${chip.value}`}
          label={chip.label}
          onRemove={() => onRemove(chip.key, chip.value)}
        />
      ))}
      <button
        type="button"
        onClick={onClear}
        className="flex items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-foreground"
      >
        <RotateCcw size={12} />
        إزالة الكل
      </button>
    </div>
  );
}
