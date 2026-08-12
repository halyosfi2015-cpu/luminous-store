"use client";

import { useEffect } from "react";
import { trackClient } from "@/src/lib/analytics/client";
import { ANALYTICS_EVENT_TYPES } from "@/src/lib/analytics/types";

export default function ProductAnalytics({
  productId,
  categorySlug,
  slug,
}: {
  productId: string;
  categorySlug?: string | null;
  slug: string;
}) {
  useEffect(() => {
    trackClient({
      event_type: ANALYTICS_EVENT_TYPES.PRODUCT_VIEW,
      entity_type: "product",
      entity_id: productId,
      properties: {
        slug,
        category_slug: categorySlug ?? null,
      },
    });
  }, [productId, categorySlug, slug]);

  return null;
}
