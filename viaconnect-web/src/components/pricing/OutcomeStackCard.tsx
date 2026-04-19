'use client';

import { Package, Tag } from 'lucide-react';
import type { OutcomeStack } from '@/types/pricing';
import { formatPriceFromCents, formatDiscountPercent } from '@/lib/pricing/format';
import { cn } from '@/lib/utils';

export interface OutcomeStackCardComponent {
  sku: string;
  name: string;
  isPrimary: boolean;
}

interface OutcomeStackCardProps {
  stack: OutcomeStack;
  components: OutcomeStackCardComponent[];
  individualTotalCents: number;
  bundlePriceCents: number;
  onSelect?: (stackId: string) => void;
  className?: string;
}

export function OutcomeStackCard({
  stack,
  components,
  individualTotalCents,
  bundlePriceCents,
  onSelect,
  className,
}: OutcomeStackCardProps) {
  const savings = individualTotalCents - bundlePriceCents;
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/[0.08] bg-[#1E3054]/75 backdrop-blur-md p-5 sm:p-6 flex flex-col',
        className,
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7C3AED]/20">
          <Package className="h-4 w-4 text-[#7C3AED]" strokeWidth={1.5} />
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#E8803A]/15 border border-[#E8803A]/30 px-2 py-0.5 text-[10px] font-semibold text-[#E8803A]">
          <Tag className="h-2.5 w-2.5" strokeWidth={1.5} />
          {formatDiscountPercent(stack.bundle_discount_percent)}
        </span>
      </div>

      <h3 className="text-lg sm:text-xl font-semibold text-white">{stack.display_name}</h3>
      <p className="mt-2 text-sm text-white/65 leading-relaxed min-h-[4.5rem]">{stack.description}</p>

      <ul className="mt-4 space-y-1.5">
        {components.map((c) => (
          <li key={c.sku} className="flex items-center gap-2 text-sm text-white/75">
            <span
              className={cn(
                'inline-flex h-1.5 w-1.5 rounded-full',
                c.isPrimary ? 'bg-[#E8803A]' : 'bg-white/30',
              )}
            />
            <span className={c.isPrimary ? 'font-medium text-white' : undefined}>{c.name}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-white">{formatPriceFromCents(bundlePriceCents)}</span>
        {savings > 0 && (
          <span className="text-sm text-white/50 line-through">{formatPriceFromCents(individualTotalCents)}</span>
        )}
      </div>
      {savings > 0 && (
        <p className="mt-1 text-xs text-[#2DA5A0]">
          You save {formatPriceFromCents(savings)} versus buying individually.
        </p>
      )}

      <button
        type="button"
        onClick={() => onSelect?.(stack.id)}
        className="mt-5 w-full rounded-xl bg-[#2DA5A0] text-[#0B1520] px-4 py-2.5 text-sm font-semibold min-h-[44px] hover:bg-[#2DA5A0]/90 transition-all"
      >
        Add stack to cart
      </button>
    </div>
  );
}
