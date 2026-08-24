'use client';

import { useEffect, useState } from 'react';
import { Minus, Plus, Users, Baby, Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { formatPriceFromCents } from '@/lib/pricing/format';
import type { FamilyPricingBreakdown } from '@/types/pricing';

interface FamilyConfiguratorProps {
  billingCycle: 'monthly' | 'annual';
  onPricingChange?: (breakdown: FamilyPricingBreakdown) => void;
  additionalAdultPriceCents?: number | null;
  additionalChildrenChunkPriceCents?: number | null;
  childrenChunkSize?: number | null;
  maxAdultsAllowed?: number;
  baseAdultsIncluded?: number;
  baseChildrenIncluded?: number;
  familyDisplayName?: string;
}

function adultHint(maxAdults: number, additionalAdultPriceCents: number | null): string {
  const bounds = `Minimum 1, maximum ${maxAdults}.`;
  if (additionalAdultPriceCents === null) {
    return `${bounds} Additional adult pricing comes from the live family plan.`;
  }
  return `${bounds} Each additional adult adds ${formatPriceFromCents(additionalAdultPriceCents)} per month.`;
}

function childrenHint(
  baseChildrenIncluded: number,
  childrenChunkSize: number | null,
  additionalChildrenChunkPriceCents: number | null,
): string {
  const included = `${baseChildrenIncluded} included.`;
  if (additionalChildrenChunkPriceCents === null) {
    return `${included} Additional children pricing comes from the live family plan.`;
  }
  const chunk =
    childrenChunkSize !== null ? ` group of ${childrenChunkSize}` : '';
  return `${included} Each additional${chunk} children adds ${formatPriceFromCents(additionalChildrenChunkPriceCents)} per month.`;
}

export function FamilyConfigurator({
  billingCycle,
  onPricingChange,
  additionalAdultPriceCents = null,
  additionalChildrenChunkPriceCents = null,
  childrenChunkSize = null,
  maxAdultsAllowed = 4,
  baseAdultsIncluded = 2,
  baseChildrenIncluded = 2,
  familyDisplayName = 'Family',
}: FamilyConfiguratorProps) {
  const [adults, setAdults] = useState(baseAdultsIncluded);
  const [children, setChildren] = useState(baseChildrenIncluded);
  const [breakdown, setBreakdown] = useState<FamilyPricingBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetch(`/api/pricing/family?adults=${adults}&children=${children}&cycle=${billingCycle}`, {
      signal: controller.signal,
    })
      .then(async (r) => {
        const body: unknown = await r.json().catch(() => null);
        if (!r.ok) {
          const message =
            body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
              ? body.error
              : 'Failed to load pricing';
          throw new Error(message);
        }
        return body as FamilyPricingBreakdown;
      })
      .then((data) => {
        setBreakdown(data);
        onPricingChange?.(data);
      })
      .catch((e: unknown) => {
        if (e instanceof Error && e.name !== 'AbortError') setError(e.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [adults, children, billingCycle, onPricingChange]);

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/75 backdrop-blur-md p-6 sm:p-8 space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
        <h3 className="text-lg font-semibold text-white">Configure your family</h3>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <Counter
          label="Adults (18+)"
          hint={adultHint(maxAdultsAllowed, additionalAdultPriceCents)}
          value={adults}
          min={1}
          max={maxAdultsAllowed}
          onChange={setAdults}
          icon={Users}
        />
        <Counter
          label="Children (0 to 17)"
          hint={childrenHint(baseChildrenIncluded, childrenChunkSize, additionalChildrenChunkPriceCents)}
          value={children}
          min={0}
          max={10}
          onChange={setChildren}
          icon={Baby}
        />
      </div>

      <div className="pt-6 border-t border-white/[0.08] space-y-2">
        {loading && !breakdown ? (
          <div className="flex items-center justify-center py-4 text-white/50">
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
          </div>
        ) : error ? (
          <p className="text-sm text-[#FCA5A5]">{error}</p>
        ) : breakdown ? (
          <>
            <Row label={`Base ${familyDisplayName}`} value={formatPriceFromCents(breakdown.basePriceCents)} />
            {breakdown.additionalAdultCount > 0 && (
              <Row
                label={`${breakdown.additionalAdultCount} additional adult${breakdown.additionalAdultCount > 1 ? 's' : ''}`}
                value={`+${formatPriceFromCents(breakdown.additionalAdultCostCents)}`}
              />
            )}
            {breakdown.additionalChildrenChunks > 0 && (
              <Row
                label={`${breakdown.additionalChildrenChunks} child chunk${breakdown.additionalChildrenChunks > 1 ? 's' : ''} (1 or 2 children each)`}
                value={`+${formatPriceFromCents(breakdown.additionalChildrenCostCents)}`}
              />
            )}
            <div className="flex items-baseline justify-between pt-3 mt-2 border-t border-white/[0.08]">
              <span className="text-base font-semibold text-white">
                Total ({billingCycle === 'monthly' ? 'per month' : 'per year'})
              </span>
              <span className="text-2xl font-bold text-[#2DA5A0]">
                {formatPriceFromCents(
                  billingCycle === 'monthly' ? breakdown.totalMonthlyCents : breakdown.totalAnnualCents,
                )}
              </span>
            </div>
            {billingCycle === 'annual' && breakdown.annualSavingsCents > 0 && (
              <p className="text-xs text-[#2DA5A0]">
                You save {formatPriceFromCents(breakdown.annualSavingsCents)} vs paying monthly.
              </p>
            )}
          </>
        ) : null}
      </div>
    </section>
  );
}

function Counter({
  label,
  hint,
  value,
  min,
  max,
  onChange,
  icon: Icon,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  icon: LucideIcon;
}) {
  return (
    <div>
      <label className="mb-3 flex items-center gap-1.5 text-sm font-medium text-white/85">
        <Icon className="h-4 w-4 text-white/60" strokeWidth={1.5} />
        {label}
      </label>
      <div className="inline-flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-white/70 hover:bg-white/[0.08] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Minus className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <span className="text-2xl font-semibold text-white w-10 text-center tabular-nums">{value}</span>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-white/70 hover:bg-white/[0.08] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>
      <p className="mt-2 text-xs text-white/50 leading-snug">{hint}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-white/65">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  );
}
