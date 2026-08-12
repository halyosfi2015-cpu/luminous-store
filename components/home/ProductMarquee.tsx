"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import ProductImage from "@/components/product/ProductImage";
import { useLang } from "@/lib/use-lang";
import type { ProductSummary } from "@/src/types/product";

interface ProductMarqueeProps {
  products: ProductSummary[];
  entering: boolean;
  sceneKey: number;
}

const ITEM_WIDTH = 240;
const ITEM_GAP = 36;
const PIXELS_PER_SECOND = 95;

export default function ProductMarquee({
  products,
  entering,
  sceneKey,
}: ProductMarqueeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const offsetRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartXRef = useRef<number>(0);
  const pausedRef = useRef<boolean>(false);
  const [isVisible, setIsVisible] = useState(false);
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const { lang } = useLang();
  const isRTL = lang === "ar";

  /* Duplicate for seamless loop */
  const displayedProducts = [...products, ...products];

  /* Measure track width for seamless loop */
  useEffect(() => {
    if (!trackRef.current || products.length === 0) return;

    const item = trackRef.current.children[0] as HTMLElement;
    const itemWidth = item ? item.offsetWidth : ITEM_WIDTH;
    const computedGap =
      item ? parseFloat(getComputedStyle(item).marginInlineEnd) || ITEM_GAP : ITEM_GAP;
    const measured = (itemWidth + computedGap) * products.length;
    setMeasuredWidth(measured);
  }, [products]);

  /* IntersectionObserver — pause RAF when off-screen */
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 },
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  /* RAF-based continuous marquee using translate3d for GPU acceleration */
  useEffect(() => {
    if (!isVisible || measuredWidth === 0) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reducedMotion) return;

    const animate = (timestamp: number) => {
      if (!trackRef.current || pausedRef.current || isDraggingRef.current) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const elapsed = timestamp - lastTimeRef.current;
      offsetRef.current += (elapsed * PIXELS_PER_SECOND) / 1000;

      if (offsetRef.current >= measuredWidth) {
        offsetRef.current = 0;
      }

      trackRef.current.style.transform = `translate3d(${isRTL ? offsetRef.current : -offsetRef.current}px, 0, 0)`;
      lastTimeRef.current = timestamp;
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
      lastTimeRef.current = 0;
    };
  }, [isVisible, measuredWidth, isRTL]);

  /* Hover — do NOT pause (keep marquee moving) */
  const handleMouseEnter = useCallback(() => {
    /* intentionally empty — marquee keeps moving on hover */
  }, []);

  const handleMouseLeave = useCallback(() => {
    pausedRef.current = false;
  }, []);

  /* Drag support */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true;
    pausedRef.current = true;
    dragStartXRef.current = e.clientX;
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDraggingRef.current || !trackRef.current) return;
      const deltaX = e.clientX - dragStartXRef.current;
      dragStartXRef.current = e.clientX;
      const newOffset = offsetRef.current - deltaX;
      offsetRef.current =
        ((newOffset % measuredWidth) + measuredWidth) % measuredWidth;
      trackRef.current.style.transform = `translate3d(${isRTL ? offsetRef.current : -offsetRef.current}px, 0, 0)`;
    },
    [measuredWidth, isRTL],
  );

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    pausedRef.current = false;
  }, []);

  /* Touch drag support */
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    isDraggingRef.current = true;
    pausedRef.current = true;
    if (e.touches[0]) dragStartXRef.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDraggingRef.current || !trackRef.current || !e.touches[0]) return;
      const deltaX = e.touches[0].clientX - dragStartXRef.current;
      dragStartXRef.current = e.touches[0].clientX;
      const newOffset = offsetRef.current - deltaX;
      offsetRef.current =
        ((newOffset % measuredWidth) + measuredWidth) % measuredWidth;
      trackRef.current.style.transform = `translate3d(${isRTL ? offsetRef.current : -offsetRef.current}px, 0, 0)`;
    },
    [measuredWidth, isRTL],
  );

  const handleTouchEnd = useCallback(() => {
    isDraggingRef.current = false;
    pausedRef.current = false;
  }, []);

  if (!products || products.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden py-3 sm:py-5"
    >
      {/* Edge fade gradients — subtle, professional */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-20 bg-gradient-to-r from-[var(--hero-bg)] to-transparent z-10"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-20 bg-gradient-to-l from-[var(--hero-bg)] to-transparent z-10"
        aria-hidden="true"
      />

      <div
        ref={trackRef}
        className="
          flex items-center
          will-change-transform
        "
        style={{ gap: `${ITEM_GAP}px` }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {displayedProducts.map((product, index) => (
          <MarqueeItem
            key={`${product.id}-${index}-${sceneKey}`}
            product={product}
            itemIndex={index}
            entering={entering}
            sceneKey={sceneKey}
          />
        ))}
      </div>
    </div>
  );
}

 interface MarqueeItemProps {
  product: ProductSummary;
  itemIndex: number;
  entering: boolean;
  sceneKey: number;
}

function MarqueeItem({
  product,
  itemIndex,
  entering,
  sceneKey,
}: MarqueeItemProps) {
  const enterDelay = `${Math.min(sceneKey * 80, 160) + itemIndex * 24}ms`;

  return (
    <div
      className="
        relative flex-shrink-0
        group
      "
      style={{ width: ITEM_WIDTH, height: ITEM_WIDTH }}
    >
      {/* Pure product image — no container, no glow, no overlay */}
      <div
        className={`
          relative h-full w-full
          transition-transform duration-[250ms]
          ease-[cubic-bezier(0.22,1,0.36,1)]
          ${entering ? "scene-enter-item" : ""}
        `}
        style={{ animationDelay: enterDelay }}
      >
        {/* Gentle floating animation — subtle life */}
        <div
          className="
            h-full w-full
            animate-float
          "
          style={{ animationDelay: `${itemIndex * 0.25}s` }}
        >
          <Link
            href={`/products/${product.slug}`}
            className="relative block h-full w-full"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("luminous:trackView", {
                    detail: { productId: product.id, product },
                  }),
                );
              }
            }}
          >
            {product.gallery[0] ? (
              <ProductImage
                src={product.gallery[0]}
                alt={product.name.en}
                productId={product.id}
                sizes={`${ITEM_WIDTH}px`}
                className="object-contain w-full h-full"
              />
            ) : null}
          </Link>
        </div>

        {/* Section-aware badges — colors match each section's identity */}
        {product.discount && (
          <span
            className={`
              absolute top-1.5 start-1.5
              inline-flex items-center justify-center rounded-full
              bg-[var(--error)] text-[var(--card)]
              px-1.5 py-0.5 text-[8px] font-bold
            `}
          >
            -{product.discount}%
          </span>
        )}
        {product.isNew && (
          <span
            className={`
              absolute top-1.5 end-1.5
              inline-flex items-center justify-center rounded-full
              bg-[var(--accent)] text-[var(--card)]
              px-1.5 py-0.5 text-[8px] font-bold
            `}
          >
            NEW
          </span>
        )}
      </div>
    </div>
  );
}
