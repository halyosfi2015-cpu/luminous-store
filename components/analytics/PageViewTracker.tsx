"use client";

import { usePageView } from "@/src/lib/analytics/hooks";

export default function PageViewTracker() {
  usePageView();
  return null;
}
