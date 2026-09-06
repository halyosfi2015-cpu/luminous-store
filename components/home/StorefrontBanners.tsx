"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import Container from "@/components/ui/Container";

type StorefrontBanner = {
  id: string;
  titleAr: string;
  titleEn: string;
  image: string;
  link: string;
  position: string;
  active: boolean;
};

export default function StorefrontBanners() {
  const [banners, setBanners] = useState<StorefrontBanner[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/content/banners", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setBanners(data.filter((b: StorefrontBanner) => b.active));
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  if (banners.length === 0) return null;

  return (
    <section className="w-full bg-background py-2">
      <Container>
        <div dir="rtl" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {banners.map((banner) => (
            <Link
              key={banner.id}
              href={banner.link || "/"}
              className="group relative overflow-hidden rounded-2xl bg-gray-100 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              {banner.image ? (
                <div className="relative aspect-[16/7] w-full overflow-hidden">
                  <Image
                    src={banner.image}
                    alt={banner.titleAr || banner.titleEn || ""}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 start-0 p-4">
                    <h3 className="text-sm font-bold text-white drop-shadow-md">
                      {banner.titleAr || banner.titleEn}
                    </h3>
                  </div>
                </div>
              ) : (
                <div className="flex aspect-[16/7] w-full items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                  <span className="text-sm font-bold text-primary">
                    {banner.titleAr || banner.titleEn}
                  </span>
                </div>
              )}
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
