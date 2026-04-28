'use client';

import { Check, X, Star, Users } from 'lucide-react';
import type { MembershipTier, TierId } from '@/types/pricing';
import { formatPriceFromCents } from '@/lib/pricing/format';
import { cn } from '@/lib/utils';

interface TierCardProps {
  tier: MembershipTier;
  billingCycle: 'monthly' | 'annual';
  isCurrentTier?: boolean;
  isRecommended?: boolean;
  onSelect?: (tierId: TierId) => void;
  includedFeatures: string[];
  excludedFeatures?: string[];
  className?: string;
}

export function TierCard({
  tier,
  billingCycle,
  isCurrentTier,
  isRecommended,
  onSelect,
  includedFeatures,
  excludedFeatures = [],
  className,
}: TierCardProps) {
  const priceCents = billingCycle === 'monthly' ? tier.monthly_price_cents : tier.annual_price_cents;
  const displayPrice = formatPriceFromCents(priceCents);
  const priceLabel = billingCycle === 'monthly' ? '/month' : '/year';
  const savings = tier.annual_savings_cents ?? 0;

  return (
    <div
      className={cn(
        'relative rounded-2xl border bg-[#1E3054]/75 backdrop-blur-md p-6 sm:p-7',
        'flex flex-col transition-all',
        isRecommended
          ? 'border-[#2DA5A0]/60 ring-2 ring-[#2DA5A0]/20 shadow-xl shadow-[#2DA5A0]/10'
          : 'border-white/[0.08]',
        isCurrentTier && 'bg-white/[0.04]',
        className,
      )}
    >
      {isRecommended && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-[#B87333] text-white px-3 py-1 text-[11px] font-semibold">
          <Star className="h-3 w-3" strokeWidth={1.5} fill="currentColor" />
          Recommended
        </span>
      )}

      {tier.is_family_tier && (
        <Users className="mb-3 h-6 w-6 text-[#2DA5A0]" strokeWidth={1.5} />
      )}

      <h3 className="text-xl sm:text-2xl font-semibold text-white">{tier.display_name}</h3>

      {tier.description && (
        <p className="mt-2 text-sm text-white/60 leading-relaxed min-h-[5rem]">
          {tier.description}
        </p>
      )}

      <div className="mt-6">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl sm:text-5xl font-bold text-white">{displayPrice}</span>
          {priceCents > 0 && <span className="text-sm text-white/50">{priceLabel}</span>}
        </div>
        {billingCycle === 'annual' && savings > 0 && (
          <p className="mt-1 text-sm text-[#2DA5A0]">
            Save {formatPriceFromCents(savings)} vs monthly
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => onSelect?.(tier.id as TierId)}
        disabled={isCurrentTier}
        className={cn(
          'mt-6 w-full rounded-xl px-4 py-2.5 text-sm font-semibold min-h-[44px] transition-all',
          isCurrentTier
            ? 'bg-white/[0.04] text-white/50 border border-white/[0.1] cursor-not-allowed'
            : 'bg-white/[0.06] text-white border border-white/[0.12] hover:bg-white/[0.12]',
        )}
      >
        {isCurrentTier ? 'Current plan' : tier.id === 'free' ? 'Start free' : `Choose ${tier.display_name}`}
      </button>

      <div className="mt-7 space-y-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Includes</p>
        {includedFeatures.map((feature) => (
          <div key={feature} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 text-[#2DA5A0] shrink-0" strokeWidth={1.5} />
            <span className="text-sm text-white/75 leading-snug">{feature}</span>
          </div>
        ))}
        {excludedFeatures.length > 0 && (
          <>
            {excludedFeatures.map((feature) => (
              <div key={feature} className="flex items-start gap-2 opacity-40">
                <X className="mt-0.5 h-4 w-4 text-white/50 shrink-0" strokeWidth={1.5} />
                <span className="text-sm text-white/60 line-through leading-snug">{feature}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
