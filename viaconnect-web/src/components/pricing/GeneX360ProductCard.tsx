'use client';

import { Dna, Gift, CheckCircle2, Sparkles } from 'lucide-react';
import type { GeneX360Product, MembershipTier } from '@/types/pricing';
import { formatPriceFromCents } from '@/lib/pricing/format';
import { cn } from '@/lib/utils';

interface GeneX360ProductCardProps {
  product: GeneX360Product;
  giftedTier?: MembershipTier | null;
  familyDiscountActive?: boolean;
  onSelect?: (productId: string) => void;
  className?: string;
}

const PANEL_DISPLAY_NAMES: Record<string, string> = {
  genex_m: 'Methylation (GeneX-M)',
  nutrigen_dx: 'Nutrigenomics (NutragenHQ)',
  hormone_iq: 'Hormonal (HormoneIQ)',
  epigen_hq: 'Epigenetics (EpiGenDX)',
  peptide_iq: 'Peptide response (PeptidesIQ)',
  cannabis_iq: 'Cannabinoid response (CannabisIQ)',
};

export function GeneX360ProductCard({
  product,
  giftedTier,
  familyDiscountActive,
  onSelect,
  className,
}: GeneX360ProductCardProps) {
  const effectivePriceCents = familyDiscountActive
    ? product.price_cents - Math.round(product.price_cents * (product.family_member_discount_percent / 100))
    : product.price_cents;

  return (
    <div
      className={cn(
        'relative rounded-2xl border border-white/[0.08] bg-[#1E3054]/75 backdrop-blur-md p-6 sm:p-7 flex flex-col',
        product.unlocks_full_precision && 'border-[#E8803A]/40 ring-2 ring-[#E8803A]/15',
        className,
      )}
    >
      {product.unlocks_full_precision && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-[#E8803A] text-[#0B1520] px-3 py-1 text-[11px] font-semibold">
          <Sparkles className="h-3 w-3" strokeWidth={1.5} />
          Unlocks 20% full precision
        </span>
      )}

      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2DA5A0]/20">
          <Dna className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/55">
          {product.panel_count} panel{product.panel_count > 1 ? 's' : ''}
        </p>
      </div>

      <h3 className="text-xl sm:text-2xl font-semibold text-white">{product.display_name}</h3>
      {product.description && (
        <p className="mt-2 text-sm text-white/65 leading-relaxed min-h-[5rem]">{product.description}</p>
      )}

      <div className="mt-5">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-white">{formatPriceFromCents(effectivePriceCents)}</span>
          {familyDiscountActive && (
            <span className="text-sm text-white/50 line-through">
              {formatPriceFromCents(product.price_cents)}
            </span>
          )}
        </div>
        {familyDiscountActive && (
          <p className="mt-1 text-xs text-[#2DA5A0]">
            {product.family_member_discount_percent}% family member discount applied
          </p>
        )}
      </div>

      {giftedTier && product.gifted_months > 0 && (
        <div className="mt-5 rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 p-3.5 flex items-start gap-2.5">
          <Gift className="h-4 w-4 text-[#2DA5A0] mt-0.5 flex-none" strokeWidth={1.5} />
          <div>
            <p className="text-xs font-semibold text-[#2DA5A0]">
              Includes {product.gifted_months} months of {giftedTier.display_name}
            </p>
            <p className="mt-0.5 text-[11px] text-white/60 leading-snug">
              Gift membership activates when your test results are delivered; value of approximately {' '}
              {formatPriceFromCents(giftedTier.monthly_price_cents * product.gifted_months)}.
            </p>
          </div>
        </div>
      )}

      <div className="mt-5 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Panels included</p>
        {product.panels_included.map((panel) => (
          <div key={panel} className="flex items-start gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#2DA5A0] mt-0.5 flex-none" strokeWidth={1.5} />
            <span className="text-sm text-white/75 leading-snug">
              {PANEL_DISPLAY_NAMES[panel] ?? panel}
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onSelect?.(product.id)}
        className={cn(
          'mt-7 w-full rounded-xl px-4 py-2.5 text-sm font-semibold min-h-[44px] transition-all',
          product.unlocks_full_precision
            ? 'bg-[#E8803A] text-[#0B1520] hover:bg-[#E8803A]/90'
            : 'bg-[#2DA5A0] text-[#0B1520] hover:bg-[#2DA5A0]/90',
        )}
      >
        Choose {product.display_name}
      </button>
    </div>
  );
}
