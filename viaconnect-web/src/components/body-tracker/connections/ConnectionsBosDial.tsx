'use client';

import { PlasmaGauge } from '@/components/gauges/PlasmaGauge';
import {
  connectionsBosNumericScore,
  type ConnectionsBosDisplay,
} from '@/lib/body-tracker/wearable-tiles';

const HERO_MOBILE_SIZE = 200;
const HERO_DESKTOP_SIZE = 240;
const CLUSTER_SIZE = 80;

function BosPlasma({
  variant,
  size,
  score,
}: {
  variant: 'hero' | 'standard';
  size: number;
  score: number | null;
}) {
  if (score === null) {
    return (
      <PlasmaGauge
        metric="bioscore"
        variant={variant}
        size={size}
        empty
        ariaLabel="No score yet"
      />
    );
  }

  return (
    <PlasmaGauge
      metric="bioscore"
      variant={variant}
      size={size}
      value={score}
      ariaLabel={`Bio Optimization Score ${score}`}
    />
  );
}

export function ConnectionsBosDial({
  composite,
  size = 'hero',
}: {
  composite: ConnectionsBosDisplay;
  size?: 'hero' | 'cluster';
}) {
  const unknown = composite.band === 'UNKNOWN' || composite.value === '--';
  const score = connectionsBosNumericScore(composite);
  const empty = unknown || score === null;
  const shown = empty ? null : score;

  return (
    <div
      className={`flex flex-col items-center ${size === 'hero' ? 'mt-5' : ''}`}
      data-bos-composite={composite.band.toLowerCase()}
    >
      {size === 'cluster' ? (
        <BosPlasma variant="standard" size={CLUSTER_SIZE} score={shown} />
      ) : (
        <div className="relative h-[200px] w-[200px] sm:h-[240px] sm:w-[240px]">
          <div className="block sm:hidden">
            <BosPlasma variant="hero" size={HERO_MOBILE_SIZE} score={shown} />
          </div>
          <div className="hidden sm:block">
            <BosPlasma variant="hero" size={HERO_DESKTOP_SIZE} score={shown} />
          </div>
        </div>
      )}
    </div>
  );
}
