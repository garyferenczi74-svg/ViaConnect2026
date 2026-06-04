"use client";

// =============================================================================
// Shared Continue button surface for every interstitial.
//
// Patched 2026-06-04 per Gary (round 2): the button class string is now an
// EXACT mirror of the FeaturePreviewCard surface on the same interstitial,
// so the two read as one piece of design glass:
//
//   FeaturePreviewCard: bg-white/10 backdrop-blur-md border border-white/15
//                       shadow-lg shadow-black/10
//   InterstitialContinueButton: same surface, white text, compact pill.
//
// The earlier rounds added supports-[not(backdrop-filter)] +
// prefers-reduced-transparency + prefers-contrast:more overrides that
// flipped the button to solid #1E3054 while the card stayed translucent.
// On macOS or iOS with Reduce Transparency on (or a browser that reports
// no backdrop-filter support) the button ended up a different color than
// the card. The overrides are REMOVED so the button degrades the same way
// the card does. If we ever need to recover the WCAG safety net for the
// white-on-translucent label, the right move is to apply it to the
// FeaturePreviewCard at the same time so the two surfaces stay matched.
//
// Compact pill, 44 by 44 CSS pixel mobile tappable area guaranteed by the
// min-h + min-w utilities. INTERSTITIAL_BUTTON_TINT_OPACITY is the single
// named source of truth for the bg-white/<N> opacity; a compile-time guard
// ties it to the literal Tailwind class string so they cannot drift.
//
// Tap-anywhere advance lives on the InterstitialScreen wrapper; we
// stopPropagation here so the wrapper's onClick does not double-fire.
// =============================================================================

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { INTERSTITIAL_BUTTON_TINT_OPACITY } from "@/config/caq-interstitial-advance";

// Compile-time mirror guard: the Tailwind class string below hardcodes
// "bg-white/10" because JIT cannot pick up template literals. If a future
// tuning pass changes INTERSTITIAL_BUTTON_TINT_OPACITY, update the
// "bg-white/<NEW>" class string to match (and update the
// FeaturePreviewCard surface too so they stay aligned).
const LOCKED_TINT_FOR_CLASS_STRING = 10 as const;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _tintMirrorGuard: typeof LOCKED_TINT_FOR_CLASS_STRING extends typeof INTERSTITIAL_BUTTON_TINT_OPACITY ? true : never = true;

export interface InterstitialContinueButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  // Show the small chevron on the right of the label. On by default
  // because the button always reads as a forward step.
  withChevron?: boolean;
}

export function InterstitialContinueButton({
  children = "Continue",
  withChevron = true,
  className = "",
  type = "button",
  onClick,
  ...rest
}: InterstitialContinueButtonProps) {
  return (
    <button
      type={type}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      className={[
        // Touch target shim per 173d Section 2: visual is compact but the
        // tappable area stays >= 44 by 44 CSS pixels on mobile.
        "min-h-[44px] min-w-[44px]",
        // Compact hug-content sizing.
        "inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2",
        // Label: white, matching the FeaturePreviewCard body color on the
        // same screen.
        "text-sm font-medium text-white",
        // Matched-card surface: bg-white/10 + backdrop-blur-md + the same
        // hairline border and soft drop shadow the FeaturePreviewCard uses.
        // The override branches that used to flip this to solid #1E3054
        // (supports-[not(backdrop-filter)], prefers-reduced-transparency,
        // prefers-contrast:more) were removed in round 2 so the button
        // degrades the same way the card does and the two surfaces always
        // match. If a WCAG safety net is needed for the white label on
        // low-tint backgrounds, apply it to the card at the same time.
        "bg-white/10 backdrop-blur-md border border-white/15 shadow-lg shadow-black/10",
        // Focus + press feedback. Teal ring visible against bright or dark
        // hero frames.
        "transition-all duration-150 ease-out",
        "hover:bg-white/[0.15] active:scale-[0.98]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]",
        // Disabled state.
        "disabled:bg-white/[0.05] disabled:text-white/40 disabled:cursor-not-allowed",
        className,
      ].join(" ")}
      {...rest}
    >
      <span>{children}</span>
      {withChevron ? (
        <ChevronRight className="h-4 w-4 text-white" strokeWidth={1.5} aria-hidden="true" />
      ) : null}
    </button>
  );
}

export default InterstitialContinueButton;
