import { FlaskConical } from 'lucide-react';

/**
 * Inline badge for Tier-3 / emerging research content.
 * Visually distinct from validated (teal) answers: amber outline treatment.
 * Lucide icon strokeWidth 1.5 only. No emoji. Accessible via aria-label.
 */
export function EmergingBadge(): JSX.Element {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium align-middle"
      style={{
        background: 'rgba(183, 94, 24, 0.10)',
        borderColor: 'rgba(183, 94, 24, 0.35)',
        color: '#B75E18',
      }}
      aria-label="Emerging research - not yet fully validated"
      role="img"
    >
      <FlaskConical className="w-3 h-3 flex-shrink-0" strokeWidth={1.5} />
      <span>Emerging</span>
    </span>
  );
}
