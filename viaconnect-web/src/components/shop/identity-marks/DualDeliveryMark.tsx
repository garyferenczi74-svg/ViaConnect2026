// Prompt #103 Phase 4: Dual Delivery Technology two-circle mark.
//
// Applied to Advanced Formulas, Women's Health, SNP Support, and
// Functional Mushrooms. Rendered with per-SKU hex colors on per-SKU
// palette categories, or the category's hex on single-palette
// categories. The ™ symbol is mandatory and is rendered textually so
// screen readers announce it.

import * as React from 'react';

interface Props {
  primaryHex: string;
  outlineHex: string;
  size?: number;
  showTm?: boolean;
  ariaLabel?: string;
}

export function DualDeliveryMark({
  primaryHex,
  outlineHex,
  size = 48,
  showTm = true,
  ariaLabel = 'Dual Delivery Technology',
}: Props): React.ReactElement {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={ariaLabel}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 60 40"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
      >
        <title>{ariaLabel}</title>
        <circle cx="20" cy="20" r="15" fill={primaryHex} stroke={outlineHex} strokeWidth="1.5" />
        <circle cx="40" cy="20" r="15" fill="none" stroke={outlineHex} strokeWidth="1.5" />
      </svg>
      {showTm && <sup className="text-[0.5em] align-super">™</sup>}
    </span>
  );
}
