"use client";

import Link from "next/link";
import ProductImage from "@/components/product/ProductImage";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import SectionTitle from "@/components/ui/SectionTitle";
import { ShoppingCart, Sparkles, Star, Package, Heart } from "lucide-react";
import { useEffect } from "react";
import { trackClient } from "@/src/lib/analytics/client";
import { ANALYTICS_EVENT_TYPES } from "@/src/lib/analytics/types";

interface RecommendationItem {
  product_id: string;
  name?: string;
  score: number;
  reason: string;
  type: "personalized" | "similar" | "complementary" | "trending" | "category_based" | "routine_based" | "bundle_based";
  source: "behavioral" | "rule" | "ai" | "manual" | "fallback";
  metadata?: Record<string, unknown>;
}

interface RecommendationDisplayProps {
  items: RecommendationItem[];
  title?: string;
  subtitle?: string;
  sourceLabel?: string;
  maxItems?: number;
  onItemClick?: (item: RecommendationItem, index: number) => void;
}

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  behavioral: <Sparkles size={10} className="text-blue-600" />,
  rule: <Package size={10} className="text-green-600" />,
  ai: <Sparkles size={10} className="text-purple-600" />,
  manual: <Heart size={10} className="text-orange-600" />,
  fallback: <Star size={10} className="text-gray-600" />,
} as const;

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  behavioral: { label: "سلوكي", color: "bg-blue-50 text-blue-700" },
  rule: { label: "قاعدة", color: "bg-green-50 text-green-700" },
  ai: { label: "ذكاء اصطناعي", color: "bg-purple-50 text-purple-700" },
  manual: { label: "يدوي", color: "bg-orange-50 text-orange-700" },
  fallback: { label: "افتراضي", color: "bg-gray-50 text-gray-700" },
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  personalized: <Heart size={10} className="text-pink-500" />,
  similar: <Package size={10} className="text-blue-500" />,
  complementary: <Sparkles size={10} className="text-amber-500" />,
  trending: <Sparkles size={10} className="text-red-500" />,
  category_based: <Package size={10} className="text-indigo-500" />,
  routine_based: <Package size={10} className="text-purple-500" />,
  bundle_based: <Sparkles size={10} className="text-amber-500" />,
} as const;

const TYPE_LABELS: Record<string, { label: string }> = {
  personalized: { label: "شخصي" },
  similar: { label: "مشابه" },
  complementary: { label: "مكمل" },
  trending: { label: "رائج" },
  category_based: { label: "فئة" },
  routine_based: { label: "روتين" },
  bundle_based: { label: "باقة" },
};

function formatPrice(amount: number): string {
  return amount.toLocaleString("ar-YE");
}

export default function RecommendationDisplay({
  items,
  title = "موصى بها لك",
  subtitle,
  sourceLabel,
  maxItems = 10,
  onItemClick,
}: RecommendationDisplayProps) {
  const displayItems = items.slice(0, maxItems);
  const recommendationType = displayItems[0]?.type ?? "personalized";

  useEffect(() => {
    if (displayItems.length > 0) {
      trackClient({
        event_type: ANALYTICS_EVENT_TYPES.RECOMMENDATION_IMPRESSION,
        properties: {
          type: recommendationType,
          product_ids: displayItems.map((i) => i.product_id),
          count: displayItems.length,
          sources: [...new Set(displayItems.map((i) => i.source))],
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recommendationType is derived from displayItems, so displayItems is sufficient
  }, [displayItems]);

  const handleClick = (item: RecommendationItem, index: number) => {
    trackClient({
      event_type: ANALYTICS_EVENT_TYPES.RECOMMENDATION_CLICK,
      entity_type: "product",
      entity_id: item.product_id,
      properties: {
        type: item.type,
        source: item.source,
        position: index + 1,
        score: item.score,
        reason: item.reason,
      },
    });
    if (onItemClick) onItemClick(item, index);
  };

  if (displayItems.length === 0) return null;

  const badgeContent: React.ReactNode = sourceLabel ? (
    <>
      {(SOURCE_ICONS[displayItems[0]?.source ?? "fallback"] ?? SOURCE_ICONS.fallback) as React.ReactNode}
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${SOURCE_LABELS[displayItems[0]?.source ?? "fallback"].color}`}>
        {sourceLabel ?? SOURCE_LABELS[displayItems[0]?.source ?? "fallback"].label}
      </span>
    </>
  ) : (
    <>
      {(TYPE_ICONS[recommendationType] ?? TYPE_ICONS.personalized) as React.ReactNode}
      <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
        {TYPE_LABELS[recommendationType].label}
      </span>
    </>
  );

  const recommendationItems = displayItems.map((item, index) => {
    const metadata = item.metadata as Record<string, unknown> | undefined;
    return (
      <Card key={item.product_id} hover padding="sm" className="flex flex-col gap-3 group">
        <Link
          href={`/products/${item.product_id}`}
          onClick={() => handleClick(item, index)}
          className="relative aspect-square w-full rounded-xl bg-muted-bg overflow-hidden"
        >
          {!!metadata?.discount && (
            <span className="absolute start-2 top-2 rounded-full bg-error px-2.5 py-0.5 text-[11px] font-semibold text-white z-10 shadow-card">
              -{String(metadata?.discount)}%
            </span>
          )}
          <ProductImage
            src={(metadata?.image as string) || ""}
            alt={item.name || item.product_id}
            productId={item.product_id}
            hoverZoom
            pedestal={false}
            className="absolute inset-0 h-full w-full"
            sizes="(max-width: 640px) 50vw, 25vw"
          />
        </Link>
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-medium text-primary">{(item.metadata?.brand as string) || ""}</p>
          <Link href={`/products/${item.product_id}`} onClick={() => handleClick(item, index)}>
            <p className="text-sm font-medium text-foreground line-clamp-2 transition-colors hover:text-primary">
              {item.name || item.product_id}
            </p>
          </Link>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-foreground">
              {item.metadata?.price ? formatPrice(item.metadata.price as number) + " ر.ي" : ""}
            </span>
            {SOURCE_LABELS[displayItems[0]?.source ?? "fallback"].label && (
              <Badge variant="neutral" className="text-[9px]">
                {(SOURCE_ICONS[displayItems[0]?.source ?? "fallback"] ?? SOURCE_ICONS.fallback) as React.ReactNode}
                {sourceLabel ?? SOURCE_LABELS[displayItems[0]?.source ?? "fallback"].label}
              </Badge>
            )}
          </div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-sm font-bold text-foreground">
              {item.metadata?.price ? formatPrice(item.metadata.price as number) + " ر.ي" : ""}
            </span>
            {!!metadata?.discount && !!item.metadata?.originalPrice && (
              <span className="text-xs text-muted line-through">
                {formatPrice(item.metadata.originalPrice as number)} ر.ي
              </span>
            )}
          </div>
        </div>
        <Button variant="outline" className="w-full gap-1.5 text-xs mt-auto" onClick={() => handleClick(item, index)}>
          <ShoppingCart size={13} />
          إضافة للسلة
        </Button>
      </Card>
    );
  });

  return (
    <section className="mt-12">
      <SectionTitle
        title={title}
        subtitle={subtitle}
        align="center"
        eyebrow={badgeContent}
      />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {recommendationItems}
      </div>
    </section>
  );
}

