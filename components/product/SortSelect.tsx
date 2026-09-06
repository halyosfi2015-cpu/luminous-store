"use client";

import { ArrowUpDown } from "lucide-react";
import Select from "@/components/ui/Select";
import type { SortOption } from "@/types/product";

type SortSelectProps = {
  value: SortOption;
  onChange: (value: SortOption) => void;
};

const options: { value: SortOption; label: string }[] = [
  { value: "smart", label: "الترتيب الذكي" },
  { value: "popular", label: "الأكثر مبيعاً" },
  { value: "newest", label: "الأحدث" },
  { value: "price_asc", label: "السعر: من الأقل للأعلى" },
  { value: "price_desc", label: "السعر: من الأعلى للأقل" },
  { value: "rating", label: "الأعلى تقييماً" },
  { value: "name_asc", label: "الترتيب الأبجدي" },
];

export default function SortSelect({ value, onChange }: SortSelectProps) {
  return (
    <div className="flex items-center gap-2">
      <ArrowUpDown size={16} className="shrink-0 text-muted" />
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
        aria-label="ترتيب حسب"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
