"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "motion";

/**
 * Smoothly animates a number whenever it changes (e.g. the temperature when a
 * different day is tapped, or a margin when a slider moves), using Motion's
 * `animate`. The first render shows the real value immediately, so there is
 * no flash on page load; people who prefer reduced motion get the value at once.
 */
export function useTween(value: number, durationSec = 0.45): number {
  const [shown, setShown] = useState(value);
  const current = useRef(value);

  useEffect(() => {
    if (current.current === value) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const controls = animate(current.current, value, {
      duration: reduce ? 0 : durationSec,
      ease: [0.2, 0.8, 0.2, 1],
      onUpdate: (v) => {
        current.current = v;
        setShown(v);
      },
    });
    return () => controls.stop();
  }, [value, durationSec]);

  return shown;
}
