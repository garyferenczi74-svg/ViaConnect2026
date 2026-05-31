'use client';

// DistributionPatternPicker  the first-view pattern chooser for users whose sex
// is non-binary / intersex / prefer-not-to-say (ViaConnect Prompt #169e(a),
// Section 5.1), and the same control reused in settings for transgender users on
// hormone therapy (Section 5.2). Offers Male / Female / Averaged (recommended) /
// Skip. The choice is stored in the overlay pref and is NEVER shown to
// practitioners (it only affects the consumer's own visualization). No dashes,
// no emojis, ASCII only.

import type { DistributionPattern } from '@/lib/body-tracker/regional-distribution-ratios';

interface DistributionPatternPickerProps {
  value: DistributionPattern | null;
  /** A pattern picks that band; null = Skip (derive from sex / use averaged). */
  onChange: (next: DistributionPattern | null) => void;
  className?: string;
}

const OPTIONS: Array<{ id: DistributionPattern | 'skip'; label: string; recommended?: boolean }> = [
  { id: 'male', label: 'Male pattern' },
  { id: 'female', label: 'Female pattern' },
  { id: 'averaged', label: 'Averaged', recommended: true },
  { id: 'skip', label: 'Skip' },
];

export function DistributionPatternPicker({
  value,
  onChange,
  className = '',
}: DistributionPatternPickerProps) {
  const selectedId: DistributionPattern | 'skip' = value ?? 'skip';
  return (
    <div className={className}>
      <p className="text-[11px] leading-relaxed text-white/55">
        Choose the distribution pattern to estimate your regional composition. This affects only how
        your avatar is shaded; it is private and never shared with a practitioner.
      </p>
      <div
        className="mt-2 flex flex-wrap gap-1.5"
        role="radiogroup"
        aria-label="Regional distribution pattern"
      >
        {OPTIONS.map((o) => {
          const selected = selectedId === o.id;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(o.id === 'skip' ? null : (o.id as DistributionPattern))}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium min-h-[36px] ${
                selected
                  ? 'border-[#2DA5A0]/50 bg-[#2DA5A0]/15 text-[#2DA5A0]'
                  : 'border-white/[0.08] bg-white/[0.03] text-white/65'
              }`}
            >
              {o.label}
              {o.recommended && (
                <span className="ml-1 text-[10px] text-white/40">recommended</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
