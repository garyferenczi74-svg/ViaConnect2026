'use client';

import { TrendingDown, Star } from 'lucide-react';
import type { DiscountCalculationResult } from '@/types/pricing';
import { formatPriceFromCents } from '@/lib/pricing/format';
import { cn } from '@/lib/utils';

interface DiscountDisplayProps {
  result: DiscountCalculationResult;
  compact?: boolean;
  className?: string;
}

const RULE_LABELS: Record<string, string> = {
  subscription_base: 'Auto-ship subscription',
  genex360_member: 'GeneX360 member',
  full_precision: 'Full precision (Complete + active protocol)',
  annual_prepay_bonus: 'Annual prepay',
};

export function DiscountDisplay({ result, compact, className }: DiscountDisplayProps) {
  const hasDiscount = result.appliedDiscountPercent > 0;

  if (compact) {
    return (
      <div className={cn('inline-flex items-center gap-2', className)}>
        {hasDiscount ? (
          <>
            <span className="text-lg font-bold text-white">{formatPriceFromCents(result.finalPriceCents)}</span>
            <span className="text-sm text-white/50 line-through">{formatPriceFromCents(result.originalPriceCents)}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#2DA5A0]/15 border border-[#2DA5A0]/30 px-2 py-0.5 text-[11px] font-semibold text-[#2DA5A0]">
              <TrendingDown className="h-2.5 w-2.5" strokeWidth={1.5} />
              {result.appliedDiscountPercent}% off
            </span>
          </>
        ) : (
          <span className="text-lg font-bold text-white">{formatPriceFromCents(result.originalPriceCents)}</span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-md p-4 space-y-2', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-white/60">MSRP</span>
        <span className={cn('text-sm', hasDiscount && 'line-through text-white/50')}>
          {formatPriceFromCents(result.originalPriceCents)}
        </span>
      </div>

      {result.appliedRuleId && RULE_LABELS[result.appliedRuleId] && (
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="text-white/60 flex items-center gap-1.5">
            <Star className="h-3 w-3 text-[#2DA5A0]" strokeWidth={1.5} />
            {RULE_LABELS[result.appliedRuleId]}
          </span>
          <span className="text-[#2DA5A0] font-semibold">
            {result.breakdown.baseDiscount}% off
          </span>
        </div>
      )}

      {result.annualPrepayBonusApplied && (
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="text-white/60">Annual prepay bonus</span>
          <span className="text-[#2DA5A0] font-semibold">+{result.breakdown.annualBonus}%</span>
        </div>
      )}

      <div className="flex items-baseline justify-between gap-3 pt-2 border-t border-white/[0.08]">
        <span className="text-base font-semibold text-white">You pay</span>
        <span className="text-2xl font-bold text-[#2DA5A0]">
          {formatPriceFromCents(result.finalPriceCents)}
        </span>
      </div>

      {hasDiscount && (
        <p className="text-xs text-white/60">
          Savings of {formatPriceFromCents(result.savingsCents)}, {result.appliedDiscountPercent}% off MSRP.
        </p>
      )}
    </div>
  );
}
