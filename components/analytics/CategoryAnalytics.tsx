"use client";

import { useEffect } from "react";
import { trackClient } from "@/src/lib/analytics/client";
import { ANALYTICS_EVENT_TYPES } from "@/src/lib/analytics/types";

export default function CategoryAnalytics({
  slug,
  name,
  productCount,
}: {
  slug: string;
  name: string;
  productCount: number;
}) {
  useEffect(() => {
    trackClient({
      event_type: ANALYTICS_EVENT_TYPES.CATEGORY_VIEW,
      properties: { slug, name, product_count: productCount },
    });
  }, [slug, name, productCount]);
  return null;
}
