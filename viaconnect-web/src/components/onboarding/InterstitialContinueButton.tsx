"use client";

// =============================================================================
// Prompt 173d Sections 2 + 3 (2026-06-04): shared Continue button surface.
// Patched 2026-06-04 per Gary: the button surface + label now match the
// FeaturePreviewCard on the same interstitial (bg-white/10 + white text +
// border-white/15 + shadow-lg shadow-black/10) so the two surfaces read as
// one design family. This overrides 173d Section 3's earlier navy-on-light
// glass treatment.
//
// Compact, hugs its label per 173d Section 2: inline-flex, content-width
// rounded pill, ~ 44 by 44 CSS pixel tappable area on mobile guaranteed by
// the min-h + min-w utilities below.
//
// White-on-translucent contrast posture:
//   * supports-[backdrop-filter] is the happy path: bg-white/10 over a
//     blurred hero video reads as a soft frosted lens. White text holds
//     contrast against the dark navy that dominates the underlying frame.
//   * supports-[not(backdrop-filter)] fallback drops to a solid Card token
//     (#1E3054) so the white label never sits over a near-clear surface.
//   * prefers-reduced-transparency + iOS Reduce Transparency: same solid
//     Card surface, no blur.
//   * prefers-contrast:more: same solid Card surface, no blur.
//
// INTERSTITIAL_BUTTON_TINT_OPACITY is the single named source of truth for
// the bg-white/<N> opacity; a compile-time guard ties it to the Tailwind
// class string so a future tuning pass cannot drift one without the other.
//
// Tap-anywhere advance lives on the InterstitialScreen wrapper; we
// stopPropagation here so the wrapper's onClick does not double-fire with
// this button's own onClick.
// =============================================================================

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { INTERSTITIAL_BUTTON_TINT_OPACITY } from "@/config/caq-interstitial-advance";

// Compile-time mirror guard: the Tailwind class string below hardcodes
// "bg-white/10" because JIT cannot pick up template literals. If a future
// tuning pass changes INTERSTITIAL_BUTTON_TINT_OPACITY, update the
// "supports-[backdrop-filter]:bg-white/<NEW>" class to match.
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
        "bg-white/10 backdrop-blur-md border border-white/15 shadow-lg shadow-black/10",
        // Engines without backdrop-filter: drop to a solid Card token so
        // white text never sits over a near-transparent surface.
        "supports-[not(backdrop-filter)]:bg-[#1E3054]",
        // Reduce-transparency / iOS Reduce Transparency: solid Card surface,
        // no blur. The ! prefix wins over the bg-white/10 base above.
        "[@media(prefers-reduced-transparency:reduce)]:!bg-[#1E3054] [@media(prefers-reduced-transparency:reduce)]:!backdrop-blur-none",
        "contrast-more:!bg-[#1E3054] contrast-more:!backdrop-blur-none",
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
