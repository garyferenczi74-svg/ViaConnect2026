// Prompt 204g (2026-06-19): the shared severity score pill. It is the SAME
// component on Your Variants and on the Full Report cards, so a given variant
// reads the identical tier and styling on both surfaces (joined by rsID upstream).
//
// The uppercase text label is ALWAYS present, so severity is never communicated by
// color alone (WCAG). Color comes only from severityToken(); this component never
// inlines a severity hex. When the variant has no validated tier yet (the source
// ships empty until the clinical content pass), it renders a neutral "Unscored"
// chip, never a fabricated tier and never an alarm color.
//
// Standing rules honored: severity color only through severityToken(), Instrument
// Sans inherited, no emojis, no em or en dashes, TypeScript strict (no any).

import type { SeverityTier } from '@/lib/genetics/severity';
import { severityToken, severityLabel } from '@/lib/genetics/severity';

interface SeverityPillProps {
  tier: SeverityTier | null;
  className?: string;
}

const BASE =
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide';

// Neutral, non-alarm styling for a variant with no validated severity yet. A
// muted grey, deliberately not a severity color and not the brand tokens.
const UNSCORED = 'border-white/15 bg-white/[0.06] text-white/55';

export function SeverityPill({ tier, className }: SeverityPillProps) {
  const tone = tier ? severityToken(tier).badge : UNSCORED;
  const label = tier ? severityLabel(tier) : 'UNSCORED';
  return <span className={`${BASE} ${tone} ${className ?? ''}`}>{label}</span>;
}

export default SeverityPill;
