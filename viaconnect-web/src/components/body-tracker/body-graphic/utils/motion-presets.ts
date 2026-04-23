// Prompt #118 — Framer Motion presets. Each preset honors
// prefers-reduced-motion at the component level by swapping in
// `initial={false}` + `transition={{ duration: 0 }}`.

import type { Transition } from "framer-motion";

const EASE_OUT_STANDARD: readonly [number, number, number, number] = [0.4, 0, 0.2, 1];

export const motionPresets = {
  genderSwap: {
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1 },
    exit:    { opacity: 0, scale: 1.02 },
    transition: { duration: 0.3, ease: EASE_OUT_STANDARD } as Transition,
  },
  viewFlip: {
    initial: { rotateY: -180, opacity: 0 },
    animate: { rotateY: 0, opacity: 1 },
    exit:    { rotateY: 180, opacity: 0 },
    transition: { duration: 0.5, ease: EASE_OUT_STANDARD } as Transition,
  },
  regionSelect: {
    initial: { scale: 1 },
    animate: { scale: 1.02 },
    transition: { duration: 0.2, ease: "easeOut" } as Transition,
  },
  panelSlideIn: {
    initial: { x: "100%", opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit:    { x: "100%", opacity: 0 },
    transition: { duration: 0.25, ease: EASE_OUT_STANDARD } as Transition,
  },
  panelSlideUp: {
    initial: { y: "100%", opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit:    { y: "100%", opacity: 0 },
    transition: { duration: 0.25, ease: EASE_OUT_STANDARD } as Transition,
  },
};

export const REDUCED_MOTION: Transition = { duration: 0 };
