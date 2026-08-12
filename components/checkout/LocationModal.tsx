"use client";

import { useState, useCallback } from "react";
import { X, MapPin, LocateFixed, ExternalLink, Check } from "lucide-react";
import Button from "@/components/ui/Button";

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (location: string) => void;
  defaultQuery?: string;
};

function sanitize(q: string) {
  return encodeURIComponent(q.replace(/\s+/g, " ").trim() || "اليمن");
}

export default function LocationModal({ open, onClose, onSave, defaultQuery = "اليمن" }: Props) {
  const [query, setQuery] = useState(defaultQuery);
  const [location, setLocation] = useState("");
  const [error, setError] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const src = coords
    ? `https://maps.google.com/maps?q=${coords.lat},${coords.lng}&z=15&output=embed`
    : `https://maps.google.com/maps?q=${sanitize(query)}&z=8&output=embed`;

  const useMyLocation = useCallback(() => {
    setError("");
    if (!("geolocation" in navigator)) {
      setError("المتصفح لا يدعم تحديد الموقع — أدخلي عنوانك يدوياً");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        setLocation(`خط العرض: ${latitude.toFixed(5)}, خط الطول: ${longitude.toFixed(5)}`);
      },
      () => setError("تعذّر تحديد الموقع — أدخلي عنوانك يدوياً"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  if (!open) return null;

  const handleSave = () => {
    if (!location.trim()) {
      setError("أدخلي عنوانك أو حدّدي موقعك أولاً");
      return;
    }
    onSave(location.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-card bg-card shadow-2xl animate-slide-down">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
            <MapPin size={18} className="text-primary" />
            تحديد الموقع
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-all hover:bg-muted-bg hover:text-foreground"
            aria-label="إغلاق"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="mb-3 overflow-hidden rounded-input border border-border">
            <iframe
              title="خريطة الموقع"
              src={src}
              className="h-52 w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          <button
            type="button"
            onClick={useMyLocation}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-input border border-primary/20 bg-primary/5 py-2.5 text-sm font-bold text-primary transition-all hover:bg-primary/10 active:scale-[0.98]"
          >
            <LocateFixed size={15} />
            تحديد موقعي الحالي
          </button>

          <label className="mb-1.5 block text-xs font-semibold text-foreground">
            عنوان التوصيل
          </label>
          <input
            value={location}
            onChange={(e) => {
              setLocation(e.target.value);
              if (error) setError("");
            }}
            placeholder="مثال: شارع حدة، حي السعادة، صنعاء"
            className="w-full rounded-input border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted/70 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15"
          />

          <div className="mt-3 flex items-center gap-2 rounded-input border border-dashed border-border bg-muted-bg/40 px-3 py-2.5">
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCoords(null);
              }}
              placeholder="ابحثي عن منطقة لعرضها على الخريطة"
              className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted/60"
            />
            <a
              href={`https://maps.google.com/maps?q=${sanitize(query)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex shrink-0 items-center gap-1 text-xs font-bold text-primary hover:underline"
            >
              <ExternalLink size={12} />
              فتح في خرائط جوجل
            </a>
          </div>

          {error && (
            <p className="mt-2 text-xs font-medium text-error animate-fade-in">{error}</p>
          )}
        </div>

        <div className="border-t border-border p-4">
          <Button type="button" className="w-full" onClick={handleSave}>
            <Check size={16} />
            حفظ الموقع
          </Button>
        </div>
      </div>
    </div>
  );
}
