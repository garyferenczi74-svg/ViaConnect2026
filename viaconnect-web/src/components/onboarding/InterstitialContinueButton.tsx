"use client";

// =============================================================================
// Prompt 173d Sections 2 + 3 (2026-06-04): shared Continue button surface.
//
// Compact, hugs its label per 173d Section 2: inline-flex, content-width
// rounded pill, ~ 44 by 44 CSS pixel tappable area on mobile guaranteed by
// the min-h + min-w utilities below. Visual reads as small without
// shrinking the actual hit area.
//
// White frosted glass per 173d Section 3: bg-white/45 backdrop-blur-md with
// the navy label fixed at #1A2744. The tint opacity is tracked in ONE
// named constant in caq-interstitial-advance.ts; the Tailwind class string
// mirrors that value. Tailwind JIT requires literal class strings so the
// constant + the class are updated together when Kelsey raises the tint.
//
// Accessibility safeguards:
//   * supports-[backdrop-filter] fallback: engines without backdrop-filter
//     get bg-white/80 base instead so the button is never an unreadable
//     transparent pane.
//   * prefers-reduced-transparency + iOS Reduce Transparency: tint jumps
//     to bg-white/90 and the blur drops.
//   * prefers-contrast:more: same bump so high-contrast users get a
//     legible solid surface.
//   * focus-visible: Teal #2DA5A0 ring (2px) sits cleanly on bright + dark
//     hero frames.
//   * Tap-anywhere advance on the InterstitialScreen wrapper is preserved
//     by stopPropagation here, so the wrapper does not double-fire when
//     the user taps the button itself.
// =============================================================================

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { INTERSTITIAL_BUTTON_TINT_OPACITY } from "@/config/caq-interstitial-advance";

// Compile-time guard: the Tailwind class string below hardcodes
// "bg-white/45" because JIT cannot pick up template literals. If Kelsey
// raises INTERSTITIAL_BUTTON_TINT_OPACITY in a follow-up, update the
// "supports-[backdrop-filter]:bg-white/<NEW>" class to match. This check
// surfaces the dependency to anyone editing the constant in isolation.
const LOCKED_TINT_FOR_CLASS_STRING = 45 as const;
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
        // Tap-anywhere advance lives on the InterstitialScreen wrapper. We
        // stopPropagation here so the wrapper does not also fire and call
        // onContinue twice in quick succession.
        e.stopPropagation();
        onClick?.(e);
      }}
      className={[
        // Touch target shim per 173d Section 2: visual is compact but the
        // tappable area stays >= 44 by 44 CSS pixels on mobile.
        "min-h-[44px] min-w-[44px]",
        // Compact hug-content sizing.
        "inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2",
        // Label: Deep Navy #1A2744, Instrument Sans inherited from the page.
        "text-sm font-medium text-[#1A2744]",
        // Base: bg-white/80 is the supports-[not(backdrop-filter)] floor
        // so engines without backdrop-filter never serve an unreadable
        // transparent pane.
        "bg-white/80",
        // Glass surface when the engine supports backdrop-filter. Mirrors
        // INTERSTITIAL_BUTTON_TINT_OPACITY = 45 (see top-of-file note on
        // the class string + the constant moving together).
        "supports-[backdrop-filter]:bg-white/45 supports-[backdrop-filter]:backdrop-blur-md",
        // Subtle frosted border + small shadow.
        "border border-white/40 shadow-sm",
        // Reduce transparency / contrast-more: raise tint, drop blur so
        // high-contrast + reduced-transparency users get a legible solid
        // surface. The ! prefix wins over the supports-modifier branch.
        "[@media(prefers-reduced-transparency:reduce)]:!bg-white/90 [@media(prefers-reduced-transparency:reduce)]:!backdrop-blur-none",
        "contrast-more:!bg-white/90 contrast-more:!backdrop-blur-none",
        // Focus + press feedback. Teal ring visible against bright or dark
        // hero frames.
        "transition-all duration-150 ease-out",
        "hover:bg-white/[0.92] active:scale-[0.98]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]",
        // Disabled state.
        "disabled:bg-white/30 disabled:text-[#1A2744]/50 disabled:cursor-not-allowed",
        className,
      ].join(" ")}
      {...rest}
    >
      <span>{children}</span>
      {withChevron ? (
        <ChevronRight className="h-4 w-4 text-[#1A2744]" strokeWidth={1.5} aria-hidden="true" />
      ) : null}
    </button>
  );
}

export default InterstitialContinueButton;
