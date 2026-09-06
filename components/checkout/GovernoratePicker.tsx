"use client";

import { useState, useRef, useEffect } from "react";
import { MapPin, ChevronDown, Search, Check, Truck } from "lucide-react";
import { loadGovernorates, fetchGovernoratesFromAPI, type Governorate } from "@/src/data/shipping";

type Props = {
  value: Governorate | null;
  onChange: (g: Governorate) => void;
};

export default function GovernoratePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [list, setList] = useState<Governorate[]>(() =>
    loadGovernorates().filter((g) => g.enabled)
  );
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchGovernoratesFromAPI().then((apiGovs) => {
      const enabled = apiGovs.filter((g) => g.enabled);
      if (enabled.length > 0) setList(enabled);
    });
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const filtered = list.filter((g) => g.name.includes(search.trim()));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`flex w-full items-center gap-3 rounded-input border bg-card px-4 py-3 text-start transition-all duration-200 ${
          open ? "border-primary ring-2 ring-primary/15" : "border-border hover:border-primary/40"
        }`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MapPin size={16} />
        </span>
        <span className="flex-1">
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted">
            محافظة التوصيل
          </span>
          <span className="block text-sm font-bold text-foreground">
            {value ? value.name : "اختر محافظة التوصيل"}
          </span>
        </span>
        {value && (
          <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success animate-fade-in">
            {value.fee === 0 ? "مجاني" : `${value.fee.toLocaleString("ar-YE")} ر.ي`}
          </span>
        )}
        <ChevronDown size={16} className={`text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full z-30 mt-2 w-full overflow-hidden rounded-card border border-gray-100 bg-card shadow-xl shadow-primary/10 animate-slide-down">
          <div className="relative border-b border-border/60 bg-muted-bg/40 p-2">
            <Search size={14} className="absolute start-4 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن محافظتك..."
              className="w-full rounded-input border border-border bg-card py-2 pe-3 ps-9 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1.5">
            {filtered.length === 0 && (
              <p className="px-3 py-6 text-center text-xs text-muted">لا توجد نتائج</p>
            )}
            {filtered.map((g) => {
              const active = value?.id === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(g);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 ${
                    active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted-bg"
                  }`}
                >
                  <Truck size={14} className={active ? "text-primary" : "text-muted"} />
                  <span className="flex-1 font-semibold">{g.name}</span>
                  <span className="text-xs font-bold text-muted">
                    {g.fee === 0 ? "مجاني" : `${g.fee.toLocaleString("ar-YE")} ر.ي`}
                  </span>
                  {active && <Check size={14} className="shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
