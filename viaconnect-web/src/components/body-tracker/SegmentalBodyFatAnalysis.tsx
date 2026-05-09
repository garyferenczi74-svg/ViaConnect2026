'use client';

// Prompt #153 MT-09: composes the body figure, the 13 segment pills,
// and the optional dev-only debug grid into a single panel. Pills
// only render for segments whose status is provided in the
// segmentStatuses partial map; segments without data simply do not
// render a pill, letting the bare body figure show through.
//
// The wrapper div locks the aspect ratio at 1:2 so the figure and
// the pills stay perfectly registered at every breakpoint, with
// max-w-[400px] capping the panel width on very wide screens.
// Mobile and desktop are served by the same code path; no
// breakpoint-specific overrides beyond the existing Tailwind
// responsive utilities are required.

import { ALL_SEGMENTS, type SegmentId, type SegmentStatus, type Sex } from '@/lib/body-tracker/segments';
import { COORDINATES_BY_SEX } from '@/lib/body-tracker/segmentCoordinates';
import { BodyFigureSvg } from './BodyFigureSvg';
import { SegmentPill } from './SegmentPill';
import { DebugSegmentGrid } from './DebugSegmentGrid';

interface SegmentalBodyFatAnalysisProps {
  sex: Sex;
  segmentStatuses: Partial<Record<SegmentId, SegmentStatus>>;
  showDebugGrid?: boolean;
  className?: string;
}

export function SegmentalBodyFatAnalysis({
  sex,
  segmentStatuses,
  showDebugGrid = false,
  className,
}: SegmentalBodyFatAnalysisProps) {
  const map = COORDINATES_BY_SEX[sex];
  const debugEnabled = showDebugGrid && process.env.NODE_ENV === 'development';

  return (
    <div
      className={`relative mx-auto aspect-[1/2] w-full max-w-[400px] ${className ?? ''}`}
      data-testid="segmental-body-fat-analysis"
    >
      <BodyFigureSvg sex={sex} className="h-full w-full">
        {ALL_SEGMENTS.map((id) => {
          const status = segmentStatuses[id];
          if (!status) return null;
          return (
            <SegmentPill
              key={id}
              coordinate={map[id]}
              status={status}
              testId={`segment-pill-${id}`}
            />
          );
        })}
        {debugEnabled && <DebugSegmentGrid sex={sex} />}
      </BodyFigureSvg>
    </div>
  );
}
