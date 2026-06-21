import { ShieldCheck, Shield, FlaskConical } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { EvidenceTier } from './evidenceTierMeta';
import { evidenceTierMeta } from './evidenceTierMeta';

// Re-export so consumers can import everything from this single file.
export type { EvidenceTier } from './evidenceTierMeta';
export { evidenceTierMeta } from './evidenceTierMeta';

/**
 * Evidence tier badge for protocol recommendations.
 *
 * Tier 1 - Strong evidence: teal solid treatment.
 * Tier 2 - Moderate evidence: soft slate outline treatment.
 * Tier 3 - Emerging evidence: amber outline treatment (matches EmergingBadge).
 *
 * Lucide strokeWidth 1.5 only. No emoji. No em/en-dashes. Accessible via aria-label.
 */

type Tone = 'strong' | 'moderate' | 'emerging';

const TONE_STYLES: Record<Tone, CSSProperties> = {
  strong: {
    background: 'rgba(20, 184, 166, 0.12)',
    borderColor: 'rgba(20, 184, 166, 0.40)',
    color: '#14B8A6',
  },
  moderate: {
    background: 'rgba(148, 163, 184, 0.10)',
    borderColor: 'rgba(148, 163, 184, 0.30)',
    color: '#94A3B8',
  },
  emerging: {
    background: 'rgba(183, 94, 24, 0.10)',
    borderColor: 'rgba(183, 94, 24, 0.35)',
    color: '#B75E18',
  },
};

const ARIA_SUFFIX: Record<Tone, string> = {
  strong: 'well-established research',
  moderate: 'established research with some limitations',
  emerging: 'promising but not yet fully validated',
};

export function EvidenceTierBadge({ tier }: { tier: EvidenceTier }): JSX.Element {
  const meta = evidenceTierMeta(tier);
  const { tone, label } = meta;

  let icon: JSX.Element;
  if (tone === 'strong') {
    icon = <ShieldCheck className="w-3 h-3 flex-shrink-0" strokeWidth={1.5} />;
  } else if (tone === 'moderate') {
    icon = <Shield className="w-3 h-3 flex-shrink-0" strokeWidth={1.5} />;
  } else {
    icon = <FlaskConical className="w-3 h-3 flex-shrink-0" strokeWidth={1.5} />;
  }

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium align-middle"
      style={TONE_STYLES[tone]}
      aria-label={`${label}: ${ARIA_SUFFIX[tone]}`}
      role="img"
    >
      {icon}
      <span>{label}</span>
    </span>
  );
}
