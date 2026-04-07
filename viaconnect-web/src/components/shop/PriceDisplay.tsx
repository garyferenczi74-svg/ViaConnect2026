'use client';

// PriceDisplay — tier-aware price renderer for shop product cards.
// Consumer = white price only. Practitioner = white price + Teal "Practitioner
// Price" sub-label. Naturopath = white price + Orange "Naturopath Price"
// sub-label. When no price exists at any tier, renders italic "Contact for
// Pricing" gray text.

import { type PricingTier, formatPriceCents } from '@/utils/pricingTiers';

interface PriceDisplayProps {
  /** Resolved price in cents, or null when no pricing exists. */
  priceCents: number | null;
  /** The tier the price was resolved for. */
  tier: PricingTier;
  /** Show the small tier label below the price. Default true for non-consumer. */
  showTierLabel?: boolean;
  /** Optional consumer price in cents — when present and lower-than-shown,
      renders a "Save XX%" badge. */
  consumerPriceCents?: number | null;
  /** Visual size. */
  size?: 'sm' | 'md' | 'lg';
  /** Add right-padding spacing for inline use in card footers. */
  className?: string;
}

const TIER_LABEL: Record<PricingTier, { label: string; color: string }> = {
  consumer: { label: 'Consumer Price', color: '#FFFFFF' },
  practitioner: { label: 'Practitioner Price', color: '#2DA5A0' },
  naturopath: { label: 'Naturopath Price', color: '#B75E18' },
};

const SIZE: Record<
  NonNullable<PriceDisplayProps['size']>,
  { price: string; label: string; gap: string }
> = {
  sm: { price: 'text-sm font-semibold', label: 'text-[9px]', gap: 'mt-0' },
  md: { price: 'text-base font-bold', label: 'text-[10px]', gap: 'mt-0.5' },
  lg: { price: 'text-lg font-bold', label: 'text-xs', gap: 'mt-0.5' },
};

export function PriceDisplay({
  priceCents,
  tier,
  showTierLabel,
  consumerPriceCents,
  size = 'md',
  className = '',
}: PriceDisplayProps) {
  const sizes = SIZE[size];

  if (priceCents == null) {
    return (
      <p
        className={`italic text-[rgba(255,255,255,0.40)] ${sizes.price} ${className}`}
      >
        Contact for Pricing
      </p>
    );
  }

  const tierInfo = TIER_LABEL[tier];
  const showLabel = showTierLabel ?? tier !== 'consumer';

  // Compute optional savings
  const showSavings =
    tier !== 'consumer' &&
    typeof consumerPriceCents === 'number' &&
    consumerPriceCents > priceCents;
  const savingsPercent = showSavings
    ? Math.round(((consumerPriceCents! - priceCents) / consumerPriceCents!) * 100)
    : 0;

  return (
    <div className={className}>
      <div className="flex items-baseline gap-2">
        <p className={`text-white ${sizes.price}`}>{formatPriceCents(priceCents)}</p>
        {showSavings && (
          <span className="inline-flex items-center rounded-full border border-[rgba(34,197,94,0.30)] bg-[rgba(34,197,94,0.12)] px-1.5 py-0.5 text-[9px] font-semibold text-[#22C55E]">
            Save {savingsPercent}%
          </span>
        )}
      </div>
      {showLabel && tier !== 'consumer' && (
        <p
          className={`${sizes.label} ${sizes.gap} font-medium`}
          style={{ color: tierInfo.color }}
        >
          {tierInfo.label}
        </p>
      )}
    </div>
  );
}
