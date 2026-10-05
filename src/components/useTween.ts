"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Smoothly animates a number whenever it changes (e.g. the temperature when a
 * different day is tapped, or a margin when a slider moves). The first render
 * shows the real value immediately, so there is no flash on page load, and
 * the animation is skipped for people who prefer reduced motion.
 */
export function useTween(value: number, durationMs = 450): number {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const start = from.current;
    if (start === value) return;
    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      from.current = value;
      frame.current = requestAnimationFrame(() => setShown(value));
      return () => {
        if (frame.current !== null) cancelAnimationFrame(frame.current);
      };
    }
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / durationMs);
      const eased = 1 - (1 - p) ** 3; // ease-out cubic
      const v = start + (value - start) * eased;
      from.current = v;
      setShown(v);
      if (p < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [value, durationMs]);

  return shown;
}
