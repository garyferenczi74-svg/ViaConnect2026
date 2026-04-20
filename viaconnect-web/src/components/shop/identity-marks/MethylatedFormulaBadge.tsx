// Prompt #103 Phase 4: Methylated Formula 7-dot hexagonal badge.
//
// Applied to Base Formulas and Children's Methylated Formulas.
// Seven dots in the honeycomb molecular pattern: 6 around a center.

import * as React from 'react';

interface Props {
  fillHex: string;
  size?: number;
  ariaLabel?: string;
}

export function MethylatedFormulaBadge({
  fillHex,
  size = 48,
  ariaLabel = 'Methylated Formula',
}: Props): React.ReactElement {
  const dots: Array<[number, number]> = [
    [30, 30],  // center
    [30, 10], [47, 20], [47, 40], [30, 50], [13, 40], [13, 20], // six outer
  ];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={ariaLabel}
    >
      <title>{ariaLabel}</title>
      {dots.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="4.5" fill={fillHex} />
      ))}
    </svg>
  );
}
