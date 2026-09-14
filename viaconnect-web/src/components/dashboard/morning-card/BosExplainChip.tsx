'use client';

import { Info } from 'lucide-react';
import {
  buildBosExplainLines,
  shouldShowBosExplainChip,
  type BosBandLabel,
} from '@/lib/dashboard/morning-card/glance';
import { CONSUMER_HANNAH_CHIP } from '@/lib/ui/consumerChrome';

export function BosExplainChip({
  score,
  chips,
  band = null,
  topDriverChip = null,
}: {
  score: number | null;
  chips: readonly string[];
  band?: BosBandLabel | null;
  topDriverChip?: string | null;
}) {
  if (!shouldShowBosExplainChip(score, chips)) return null;
  const lines = buildBosExplainLines({ score, chips, band, topDriverChip });
  if (lines.length === 0) return null;

  return (
    <aside
      data-bos-explain-chip="true"
      aria-label="Explain Bio Optimization Score"
      className={`${CONSUMER_HANNAH_CHIP} max-w-md flex-col items-start gap-1 text-left`}
    >
      <span className="inline-flex items-center gap-1.5">
        <Info className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
        <span className="text-sm font-medium text-white/90">Explain</span>
      </span>
      {lines.map((line) => (
        <p key={line} className="text-sm leading-relaxed text-white/90">
          {line}
        </p>
      ))}
    </aside>
  );
}
