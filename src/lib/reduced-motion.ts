"use client";

import { useSyncExternalStore } from "react";

// prefers-reduced-motion, tracked live. framer-motion's useReducedMotion reads it once at
// mount, which leaves a running canvas loop going if the setting flips mid-visit.
const QUERY = "(prefers-reduced-motion: reduce)";
const subscribe = (cb: () => void) => {
  const mq = matchMedia(QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

export function useReducedMotionLive(): boolean {
  return useSyncExternalStore(subscribe, () => matchMedia(QUERY).matches, () => false);
}
