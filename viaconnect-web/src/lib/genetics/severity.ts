// Prompt 204g (2026-06-19): the single source of truth for clinical severity
// COLOR on the genetics surface. Severity is the High / Moderate / Low score a
// variant earns from the validated per-genotype source (see variantSeverity.ts);
// this module owns only how that tier is colored, so no component ever inlines a
// severity hex or borrows a brand token for severity.
//
// The traffic-light palette lives in CSS as the --severity-* custom properties
// (src/app/globals.css), defined as space separated RGB channels so the class
// strings below can apply alpha through Tailwind arbitrary values, for example
// rgb(var(--severity-high)/0.15). High red, Moderate yellow, Low green, with Deep
// Navy #1A2744 text on the solid activated fill (navy on each fill clears WCAG
// AA). The class strings are FULL and STATIC (never built from a variable) so the
// Tailwind JIT can see and generate them.
//
// Standing rules honored: severity color only through these tokens, never the
// brand Orange or Teal; no inline severity hex (the hex lives once in globals.css
// as a comment beside the channel values); navy text token on solid fills; no em
// or en dashes; TypeScript strict (no any).

export type SeverityTier = 'high' | 'moderate' | 'low';

export interface SeverityTokenClasses {
  /** Resting row badge and unselected filter: translucent fill, matching text and border. */
  badge: string;
  /** Activated filter pill: solid fill, Deep Navy text, soft static glow. */
  pillActive: string;
  /** Left accent edge (width plus color) for an expanded Full Report variant. */
  accent: string;
}

// Full static class strings per tier. Each references only the --severity-* token
// for its tier (plus the navy and white non-severity surface/text tokens). Static
// so Tailwind generates them; do not template these from the tier.
//
// Prompt 204i: the alpha values use the spaced "_/_" arbitrary-value form so the
// generated CSS is rgb(R G B / A), the unambiguous CSS Color 4 syntax. And the
// active pill (pillActive) is a DARK fill with a tier-colored border and WHITE
// text, NOT a solid tier fill: a solid fill plus light text washed the label out,
// so the readable treatment is a dark navy surface, a tier outline, and white
// text. The border color and the row badge color for a tier read the same token,
// so the active outline and the row badge match.
const SEVERITY_CLASSES: Record<SeverityTier, SeverityTokenClasses> = {
  high: {
    badge:
      'border-[rgb(var(--severity-high)_/_0.45)] bg-[rgb(var(--severity-high)_/_0.15)] text-[rgb(var(--severity-high))]',
    pillActive:
      'border-[rgb(var(--severity-high))] bg-[#1A2744] text-white shadow-[0_0_10px_rgb(var(--severity-high)_/_0.4)]',
    accent: 'border-l-2 border-l-[rgb(var(--severity-high))]',
  },
  moderate: {
    badge:
      'border-[rgb(var(--severity-moderate)_/_0.45)] bg-[rgb(var(--severity-moderate)_/_0.15)] text-[rgb(var(--severity-moderate))]',
    pillActive:
      'border-[rgb(var(--severity-moderate))] bg-[#1A2744] text-white shadow-[0_0_10px_rgb(var(--severity-moderate)_/_0.4)]',
    accent: 'border-l-2 border-l-[rgb(var(--severity-moderate))]',
  },
  low: {
    badge:
      'border-[rgb(var(--severity-low)_/_0.45)] bg-[rgb(var(--severity-low)_/_0.15)] text-[rgb(var(--severity-low))]',
    pillActive:
      'border-[rgb(var(--severity-low))] bg-[#1A2744] text-white shadow-[0_0_10px_rgb(var(--severity-low)_/_0.4)]',
    accent: 'border-l-2 border-l-[rgb(var(--severity-low))]',
  },
};

/** The only way a component reads severity color. Reuse, do not inline hex. */
export function severityToken(tier: SeverityTier): SeverityTokenClasses {
  return SEVERITY_CLASSES[tier];
}

const SEVERITY_LABELS: Record<SeverityTier, string> = {
  high: 'HIGH',
  moderate: 'MODERATE',
  low: 'LOW',
};

/** The uppercase text label, always rendered so severity is never color alone. */
export function severityLabel(tier: SeverityTier): string {
  return SEVERITY_LABELS[tier];
}
