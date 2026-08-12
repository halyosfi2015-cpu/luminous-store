"use client";

import { useEffect, useRef } from "react";
import ProductImage from "@/components/product/ProductImage";
import type { ProductSummary } from "@/src/types/product";

type AutoProductStripProps = {
  products: ProductSummary[];
  speed?: number;
  itemClassName?: string;
  itemRounded?: string;
  gapClass?: string;
};

export default function AutoProductStrip({
  products,
  speed = 0.18,
  itemClassName = "w-28",
  itemRounded = "rounded-lg",
  gapClass = "me-3",
}: AutoProductStripProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const posRef = useRef(0);
  const pausedRef = useRef(false);
  const productsRef = useRef(products);

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  const dup = [...products, ...products];

  useEffect(() => {
    const el = trackRef.current;
    if (!el || productsRef.current.length === 0) return;
    posRef.current = 0;
    let rafId = 0;
    let last = performance.now();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const step = (now: number) => {
      const dt = Math.min(now - last, 50);
      last = now;
      if (!pausedRef.current && !reduced) {
        posRef.current -= speed * dt;
        const half = el.scrollWidth / 2;
        if (posRef.current <= -half) posRef.current += half;
      }
      el.style.transform = `translate3d(${posRef.current}px, 0, 0)`;
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [speed]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el || productsRef.current.length === 0) return;
    let isDown = false;
    let pointerId = 0;
    let startX = 0;
    let startPos = 0;
    let moved = false;
    let suppressTimer: ReturnType<typeof setTimeout> | null = null;

    const suppressClick = (ev: MouseEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
    };

    const onDown = (e: PointerEvent) => {
      isDown = true;
      moved = false;
      pointerId = e.pointerId;
      pausedRef.current = true;
      startX = e.pageX;
      startPos = posRef.current;
      try { el.setPointerCapture(e.pointerId); } catch {}
    };
    const onMove = (e: PointerEvent) => {
      if (!isDown) return;
      if (Math.abs(e.pageX - startX) > 6) moved = true;
      const half = el.scrollWidth / 2;
      const next = Math.max(-half, Math.min(0, startPos + (e.pageX - startX)));
      posRef.current = next;
      el.style.transform = `translate3d(${next}px, 0, 0)`;
    };
    const onUp = () => {
      isDown = false;
      pausedRef.current = false;
      if (pointerId) {
        try { el.releasePointerCapture(pointerId); } catch {}
      }
      if (moved) {
        window.addEventListener("click", suppressClick, true);
        suppressTimer = setTimeout(
          () => window.removeEventListener("click", suppressClick, true),
          600
        );
      }
    };

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (suppressTimer) clearTimeout(suppressTimer);
      window.removeEventListener("click", suppressClick, true);
    };
  }, []);

  if (products.length === 0) return null;

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        ref={trackRef}
        dir="ltr"
        className="flex h-full w-max items-center will-change-transform"
        style={{ touchAction: "pan-y" }}
      >
        {dup.map((p, i) =>
          p.gallery?.[0] ? (
            <div
              key={`${p.id}-${i}`}
              className={`relative h-full shrink-0 overflow-hidden ${itemClassName} ${itemRounded} ${gapClass}`}
            >
              <ProductImage
                src={p.gallery[0]}
                alt={p.name.ar}
                productId={p.id}
                variant="soft"
                hoverZoom={false}
                pedestal={false}
                className="absolute inset-0 h-full w-full"
                sizes="160px"
              />
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}
