import { useEffect, useRef, useCallback } from "react";

/**
 * Smart timer hook using requestAnimationFrame + Page Visibility API.
 * Automatically pauses when the tab is not visible to save resources.
 * Provides smooth 60FPS timing with configurable intervals.
 */
export function useHeroTimer(
  onTick: () => void,
  intervalMs: number = 9000, // 9 seconds default
  options?: { immediate?: boolean }
) {
  const frameRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const accumulatedRef = useRef<number>(0);
  const isVisibleRef = useRef<boolean>(true);
  const onTickRef = useRef(onTick);
  
  // Keep the callback ref updated
  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  // Page Visibility API handler
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;
      // Reset timing when tab becomes visible again
      if (isVisibleRef.current) {
        lastTickRef.current = performance.now();
        accumulatedRef.current = 0;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Initial check
    isVisibleRef.current = !document.hidden;
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Start timer effect
  useEffect(() => {
    if (options?.immediate) {
      onTickRef.current();
    }

    lastTickRef.current = performance.now();
    
    const tick = (now: number) => {
      if (!isVisibleRef.current) {
        frameRef.current = requestAnimationFrame(tick);
        return;
      }

      accumulatedRef.current += now - (lastTickRef.current || now);
      lastTickRef.current = now;

      if (accumulatedRef.current >= intervalMs) {
        accumulatedRef.current = 0;
        onTickRef.current();
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [intervalMs, options?.immediate]);

  // Expose a way to force a tick (for manual navigation)
  const forceTick = useCallback(() => {
    onTickRef.current();
  }, []);

  return { forceTick };
}

