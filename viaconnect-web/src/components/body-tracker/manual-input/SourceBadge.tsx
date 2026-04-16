'use client';

import { Pencil, Smartphone, Upload, RefreshCw, Star } from 'lucide-react';
import {
  SOURCE_BADGES,
  getDataSource,
  confidenceStars,
  type SourceBadgeKind,
  type DataSourceId,
} from '@/lib/body-tracker/manual-input';

interface SourceBadgeProps {
  source: string | null | undefined;
  manualSourceId?: string | null;
  showStars?: boolean;
  size?: 'sm' | 'md';
}

function resolveKind(source: string | null | undefined): SourceBadgeKind {
  if (source === 'device') return 'device';
  if (source === 'api') return 'api';
  if (source === 'import') return 'import';
  return 'manual';
}

export function SourceBadge({ source, manualSourceId, showStars = false, size = 'sm' }: SourceBadgeProps) {
  const kind = resolveKind(source);
  const cfg = SOURCE_BADGES[kind];
  const Icon =
    kind === 'manual' ? Pencil :
    kind === 'device' ? Smartphone :
    kind === 'import' ? Upload : RefreshCw;

  const dims = size === 'md' ? 'text-xs px-2 py-1' : 'text-[10px] px-1.5 py-0.5';
  const iconDim = size === 'md' ? 'h-3.5 w-3.5' : 'h-3 w-3';

  const manualSrc = kind === 'manual' && manualSourceId
    ? getDataSource(manualSourceId as DataSourceId)
    : null;
  const stars = manualSrc ? confidenceStars(manualSrc.confidence) : 0;

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`inline-flex items-center gap-1 rounded-full font-medium ${dims}`}
        style={{
          backgroundColor: `${cfg.color}1F`,
          color: cfg.color,
          border: `1px solid ${cfg.color}4D`,
        }}
      >
        <Icon className={iconDim} strokeWidth={1.5} />
        {manualSrc ? manualSrc.label.replace(' (manual read)', '') : cfg.label}
      </span>
      {showStars && stars > 0 && (
        <span className="inline-flex items-center gap-0.5" aria-label={`${stars} of 5 confidence`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-2.5 w-2.5 ${i < stars ? 'fill-[#E8803A] text-[#E8803A]' : 'text-white/20'}`}
              strokeWidth={1.5}
            />
          ))}
        </span>
      )}
    </span>
  );
}
