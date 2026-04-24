// Prompt #124 P4: Feature-flag chip.
//
// Renders a single mismatch flag from a determination. Uses icon + text.

import { AlertTriangle, Hash } from 'lucide-react';

export interface FeatureFlagChipProps {
  flag: string;
  severity?: 'critical' | 'normal';
}

const CRITICAL_FLAGS: ReadonlySet<string> = new Set([
  'hologram_absent',
  'expected_origin_text_missing',
  'unexpected_origin_text_present',
  'label_origin_mismatch',
]);

export default function FeatureFlagChip({ flag, severity }: FeatureFlagChipProps) {
  const isCritical = severity === 'critical' || CRITICAL_FLAGS.has(flag);
  const Icon = isCritical ? AlertTriangle : Hash;
  const color = isCritical
    ? 'bg-red-500/10 border-red-400/30 text-red-200'
    : 'bg-amber-500/10 border-amber-400/25 text-amber-200';
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${color}`}>
      <Icon className="w-3 h-3" strokeWidth={1.5} aria-hidden />
      <span className="font-mono">{flag}</span>
    </span>
  );
}
