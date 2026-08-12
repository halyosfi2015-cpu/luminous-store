"use client";

import { useEffect } from "react";
import { trackView } from "@/components/home/RecentlyViewed";

export default function ProductViewTracker({ productId }: { productId: string }) {
  useEffect(() => {
    trackView(productId);
  }, [productId]);
  return null;
}

