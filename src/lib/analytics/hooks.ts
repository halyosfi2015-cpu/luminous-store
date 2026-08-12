"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackClient } from "@/src/lib/analytics/client";
import { ANALYTICS_EVENT_TYPES } from "@/src/lib/analytics/types";

export function usePageView(): void {
  const pathname = usePathname();
  const search = useSearchParams();
  const first = useRef(true);
  useEffect(() => {
    if (!pathname) return;
    if (first.current) {
      first.current = false;
    }
    trackClient({
      event_type: ANALYTICS_EVENT_TYPES.PAGE_VIEW,
      properties: {
        path: pathname,
        query: search ? Object.fromEntries(search.entries()) : {},
      },
    });
  }, [pathname, search]);
}

export function useTrackEvent(
  eventType: (typeof ANALYTICS_EVENT_TYPES)[keyof typeof ANALYTICS_EVENT_TYPES],
  payload?: Record<string, unknown>,
  deps: unknown[] = [],
): void {
  const ref = useRef(false);
  useEffect(() => {
    if (ref.current) return;
    ref.current = true;
    trackClient({
      event_type: eventType,
      properties: payload,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller-controlled deps; ref guard ensures the event is tracked only once
  }, deps);
}
