'use client';

import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { TierCard } from '@/components/pricing/TierCard';
import { FamilyConfigurator } from '@/components/pricing/FamilyConfigurator';
import { PractitionerToggleButton } from '@/components/landing/scroll-sections/shared/PractitionerToggleButton';
import type { PricingPlanCardModel, PricingCatalogLoadState } from '@/lib/pricing/catalog';
import { buildPricingPlanCards } from '@/lib/pricing/catalog';

export interface PricingCatalogBodyProps {
  loadState: PricingCatalogLoadState;
  billingCycle: 'monthly' | 'annual';
  onBillingCycleChange: (cycle: 'monthly' | 'annual') => void;
  currentTierId: string | null;
  onSelectPlan: (plan: PricingPlanCardModel) => void;
  onRetry: () => void;
  showFamilyConfig: boolean;
  familyPlan: PricingPlanCardModel | null;
  practitionerToggleId: string;
  practitionerRegionId: string;
  isPractitionerOpen: boolean;
  onPractitionerToggle: () => void;
}

export function PricingCatalogBody({
  loadState,
  billingCycle,
  onBillingCycleChange,
  currentTierId,
  onSelectPlan,
  onRetry,
  showFamilyConfig,
  familyPlan,
  practitionerToggleId,
  practitionerRegionId,
  isPractitionerOpen,
  onPractitionerToggle,
}: PricingCatalogBodyProps) {
  const plans = loadState.status === 'ready' ? buildPricingPlanCards(loadState.catalog) : [];

  return (
    <div>
      <div className="text-center mb-10 sm:mb-14">
        <div
          className="inline-flex rounded-xl border border-white/[0.08] bg-white/[0.03] p-1 text-sm"
          role="group"
          aria-label="Billing cycle"
        >
          <button
            type="button"
            onClick={() => onBillingCycleChange('monthly')}
            className={`px-5 py-2 rounded-lg font-medium min-h-[44px] transition-all ${
              billingCycle === 'monthly'
                ? 'bg-[#2DA5A0]/30 backdrop-blur-xl border border-[#2DA5A0]/40 text-white shadow-[0_0_15px_rgba(45,165,160,0.3)]'
                : 'text-white/65'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => onBillingCycleChange('annual')}
            className={`px-5 py-2 rounded-lg font-medium min-h-[44px] transition-all ${
              billingCycle === 'annual'
                ? 'bg-[#2DA5A0]/30 backdrop-blur-xl border border-[#2DA5A0]/40 text-white shadow-[0_0_15px_rgba(45,165,160,0.3)]'
                : 'text-white/65'
            }`}
          >
            Annual
            <span className="ml-2 text-[10px] rounded-full bg-[#E8803A]/20 text-[#E8803A] px-1.5 py-0.5">
              Save more
            </span>
          </button>
        </div>
      </div>

      <CatalogStatus
        loadState={loadState}
        plans={plans}
        billingCycle={billingCycle}
        currentTierId={currentTierId}
        onSelectPlan={onSelectPlan}
        onRetry={onRetry}
      />

      {showFamilyConfig && familyPlan && (
        <section className="mt-12">
          <h2 className="text-xl sm:text-2xl font-semibold text-white text-center mb-6">
            Build your {familyPlan.displayName} plan
          </h2>
          <div className="max-w-3xl mx-auto">
            <FamilyConfigurator
              billingCycle={billingCycle}
              additionalAdultPriceCents={familyPlan.familyAddOn?.additionalAdultPriceCents ?? null}
              additionalChildrenChunkPriceCents={
                familyPlan.familyAddOn?.additionalChildrenChunkPriceCents ?? null
              }
              childrenChunkSize={familyPlan.familyAddOn?.childrenChunkSize ?? null}
              maxAdultsAllowed={familyPlan.familyAddOn?.maxAdultsAllowed}
              baseAdultsIncluded={familyPlan.familyAddOn?.baseAdultsIncluded}
              baseChildrenIncluded={familyPlan.familyAddOn?.baseChildrenIncluded}
              familyDisplayName={familyPlan.displayName}
            />
            <div className="mt-6 text-center">
              <Link
                href={`/checkout?tier=${encodeURIComponent(familyPlan.id)}&cycle=${billingCycle}`}
                className="inline-flex items-center justify-center rounded-xl bg-[#2DA5A0] text-[#0B1520] px-6 py-3 text-sm font-semibold min-h-[48px] hover:bg-[#2DA5A0]/90"
              >
                Continue to checkout
              </Link>
            </div>
          </div>
        </section>
      )}

      <div className="mt-12 flex justify-center">
        <PractitionerToggleButton
          id={practitionerToggleId}
          ariaControls={practitionerRegionId}
          isOpen={isPractitionerOpen}
          onToggle={onPractitionerToggle}
        />
      </div>

      <AnimatePresence initial={false}>
        {isPractitionerOpen && (
          <motion.div
            key="practitioner-tier-region"
            id={practitionerRegionId}
            role="region"
            aria-labelledby={practitionerToggleId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
              opacity: { duration: 0.3, ease: 'easeInOut' },
            }}
            className="overflow-hidden"
          >
            <PractitionerComingSoonPanel />
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mt-8 text-center text-[11px] text-white/50 leading-relaxed max-w-2xl mx-auto">
        Supplement recommendations are informational only and do not replace medical advice. Speak
        with a qualified healthcare provider before starting new supplements.
      </p>
    </div>
  );
}

function CatalogStatus({
  loadState,
  plans,
  billingCycle,
  currentTierId,
  onSelectPlan,
  onRetry,
}: {
  loadState: PricingCatalogLoadState;
  plans: PricingPlanCardModel[];
  billingCycle: 'monthly' | 'annual';
  currentTierId: string | null;
  onSelectPlan: (plan: PricingPlanCardModel) => void;
  onRetry: () => void;
}) {
  if (loadState.status === 'loading') {
    return (
      <div
        data-testid="pricing-catalog-loading"
        className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/75 backdrop-blur-md px-6 py-16 text-center"
        aria-busy="true"
        aria-live="polite"
      >
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#2DA5A0]" strokeWidth={1.5} />
        <p className="mt-4 text-sm text-white/70">Loading live membership plans</p>
        <p className="mt-2 text-xs text-white/50">Prices come from the live catalog. This wait is time limited.</p>
      </div>
    );
  }

  if (loadState.status === 'error') {
    return (
      <div
        data-testid="pricing-catalog-error"
        className="rounded-2xl border border-[#B75E18]/40 bg-[#1E3054]/75 backdrop-blur-md px-6 py-12 text-center"
        role="alert"
      >
        <AlertCircle className="mx-auto h-8 w-8 text-[#B75E18]" strokeWidth={1.5} />
        <h2 className="mt-4 text-lg font-semibold text-white">Live membership prices unavailable</h2>
        <p className="mt-2 text-sm text-white/70 max-w-md mx-auto">{loadState.message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 inline-flex items-center justify-center gap-2 min-h-[44px] rounded-xl bg-[#2DA5A0] px-5 py-2.5 text-sm font-semibold text-[#0B1520] hover:bg-[#2DA5A0]/90"
        >
          <RefreshCw className="h-4 w-4" strokeWidth={1.5} />
          Try again
        </button>
      </div>
    );
  }

  if (loadState.status === 'empty' || plans.length === 0) {
    return (
      <div
        data-testid="pricing-catalog-empty"
        className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/75 backdrop-blur-md px-6 py-12 text-center"
      >
        <h2 className="text-lg font-semibold text-white">No membership plans to show</h2>
        <p className="mt-2 text-sm text-white/70 max-w-md mx-auto">
          The live catalog did not return any active membership tiers. Please try again in a moment.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 inline-flex items-center justify-center gap-2 min-h-[44px] rounded-xl border border-white/[0.12] bg-white/[0.06] px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/[0.12]"
        >
          <RefreshCw className="h-4 w-4" strokeWidth={1.5} />
          Refresh catalog
        </button>
      </div>
    );
  }

  return (
    <div
      data-testid="pricing-catalog-plans"
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6"
    >
      {plans.map((plan) => (
        <TierCard
          key={plan.id}
          plan={plan}
          billingCycle={billingCycle}
          isCurrentTier={plan.id === currentTierId}
          onSelect={onSelectPlan}
        />
      ))}
    </div>
  );
}

export function PractitionerComingSoonPanel() {
  return (
    <div className="pt-8 max-w-2xl mx-auto" data-testid="practitioner-coming-soon">
      <div className="bg-black/30 backdrop-blur-sm border border-[#2DA5A0]/40 rounded-2xl p-8 text-center">
        <p className="text-[#2DA5A0] uppercase tracking-[0.2em] text-xs mb-3 font-medium">
          Coming Soon
        </p>
        <h3 className="text-white text-2xl font-light mb-3">
          Practitioner and Naturopath pricing
        </h3>
        <p className="text-white/70 text-sm leading-relaxed">
          Practitioner plans are in final review. Join the waitlist and we will notify you when
          public pricing opens.
        </p>
        <Link
          href="/practitioners"
          className="mt-6 inline-flex items-center justify-center min-h-[44px] rounded-xl bg-[#2DA5A0] px-6 py-2.5 text-sm font-semibold text-[#0B1520] hover:bg-[#2DA5A0]/90"
        >
          Join the waitlist
        </Link>
      </div>
    </div>
  );
}
