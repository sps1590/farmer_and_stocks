"use client";

import { LazyMotion, MotionConfig } from "motion/react";

const loadFeatures = () => import("@/lib/motion-features").then((m) => m.default);

/** Shared spring used across the app: quick, with a little settle. */
export const SPRING = { type: "spring", stiffness: 420, damping: 34, mass: 0.9 } as const;

/**
 * Motion (motion.dev) setup for the whole app:
 *  - LazyMotion + `m.*` components keep the bundle small (`strict` forbids the full `motion.*`).
 *  - reducedMotion="user" turns off movement for people who ask their device for less motion.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user" transition={SPRING}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
