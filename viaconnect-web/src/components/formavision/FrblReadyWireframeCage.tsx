'use client';

import {
  FRBL_WIREFRAME_CYAN,
  polylineToPath,
  type FrblWireframeCageSpec,
} from '@/lib/formavision/viewer/frblWireframeCage';

export interface FrblReadyWireframeCageProps {
  spec: FrblWireframeCageSpec;
  className?: string;
}

export function FrblReadyWireframeCage({ spec, className }: FrblReadyWireframeCageProps) {
  const voidPath = spec.voidSpans
    .map((span) => `M ${span.x0} ${span.y} L ${span.x1} ${span.y}`)
    .join(' ');

  return (
    <svg
      data-testid="formavision-frbl-ready-wireframe"
      data-cage-rings={spec.ringCount}
      data-cage-meridians={spec.meridianCount}
      data-cage-tubes={spec.tubeCount}
      viewBox={`0 0 ${spec.width} ${spec.height}`}
      preserveAspectRatio="xMidYMid meet"
      className={className ?? 'absolute inset-0 z-[1] h-full w-full'}
      role="img"
      aria-label="Wireframe from your Ready photo"
    >
      <rect width={spec.width} height={spec.height} fill="#070b12" />
      {voidPath ? (
        <path
          d={voidPath}
          stroke="#0B1520"
          strokeWidth={1.15}
          fill="none"
          opacity={0.96}
        />
      ) : null}
      {spec.polylines
        .filter((line) => line.layer === 'far')
        .map((line, index) => (
          <path
            key={`far-${index}`}
            d={polylineToPath(line.points)}
            fill="none"
            stroke={FRBL_WIREFRAME_CYAN}
            strokeWidth={0.7}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.28}
          />
        ))}
      {spec.polylines
        .filter((line) => line.layer === 'near')
        .map((line, index) => (
          <path
            key={`near-${index}`}
            d={polylineToPath(line.points)}
            fill="none"
            stroke={FRBL_WIREFRAME_CYAN}
            strokeWidth={0.95}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.92}
          />
        ))}
    </svg>
  );
}
