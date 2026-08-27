'use client';

import { PlasmaGauge } from '@/components/gauges/PlasmaGauge';
import {
  connectionsBosNumericScore,
  type ConnectionsBosDisplay,
} from '@/lib/body-tracker/wearable-tiles';

const HERO_MOBILE_SIZE = 200;
const HERO_DESKTOP_SIZE = 240;
const CLUSTER_SIZE = 80;

function UnknownWell({ size }: { size: 'hero' | 'cluster' }) {
  const box =
    size === 'cluster'
      ? 'relative h-20 w-20'
      : 'relative h-[200px] w-[200px] sm:h-[240px] sm:w-[240px]';
  const valueClass =
    size === 'cluster'
      ? 'text-lg text-white/20'
      : 'text-5xl font-bold text-white/40 sm:text-6xl';

  return (
    <div className={box}>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={valueClass} aria-label="No score yet">
          --
        </span>
      </div>
    </div>
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
  const showPlasma = !unknown && score !== null;

  return (
    <div
      className={`flex flex-col items-center ${size === 'hero' ? 'mt-5' : ''}`}
      data-bos-composite={composite.band.toLowerCase()}
    >
      {showPlasma && score !== null ? (
        size === 'cluster' ? (
          <PlasmaGauge
            metric="bioscore"
            variant="standard"
            size={CLUSTER_SIZE}
            value={score}
            ariaLabel={`Bio Optimization Score ${score}`}
          />
        ) : (
          <div className="relative h-[200px] w-[200px] sm:h-[240px] sm:w-[240px]">
            <div className="block sm:hidden">
              <PlasmaGauge
                metric="bioscore"
                variant="hero"
                size={HERO_MOBILE_SIZE}
                value={score}
                ariaLabel={`Bio Optimization Score ${score}`}
              />
            </div>
            <div className="hidden sm:block">
              <PlasmaGauge
                metric="bioscore"
                variant="hero"
                size={HERO_DESKTOP_SIZE}
                value={score}
                ariaLabel={`Bio Optimization Score ${score}`}
              />
            </div>
          </div>
        )
      ) : (
        <UnknownWell size={size} />
      )}
    </div>
  );
}
