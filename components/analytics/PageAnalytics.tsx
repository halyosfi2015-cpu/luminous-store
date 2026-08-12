"use client";

import { useEffect } from "react";
import { trackClient } from "@/src/lib/analytics/client";
import { ANALYTICS_EVENT_TYPES } from "@/src/lib/analytics/types";

export default function PageAnalytics({
  eventType,
  properties,
}: {
  eventType: (typeof ANALYTICS_EVENT_TYPES)[keyof typeof ANALYTICS_EVENT_TYPES];
  properties?: Record<string, unknown>;
}) {
  useEffect(() => {
    trackClient({
      event_type: eventType,
      properties,
    });
  }, [eventType, properties]);
  return null;
}
