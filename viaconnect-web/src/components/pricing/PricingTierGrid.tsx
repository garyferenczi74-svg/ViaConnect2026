'use client';

import { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TierCard } from '@/components/pricing/TierCard';
import { FamilyConfigurator } from '@/components/pricing/FamilyConfigurator';
import { PractitionerToggleButton } from '@/components/landing/scroll-sections/shared/PractitionerToggleButton';
import type { MembershipTier, TierId } from '@/types/pricing';
import { createClient } from '@/lib/supabase/client';
import { trackPractitionerPricingExpanded } from '@/lib/analytics';

// Shared pricing body. Used both by /pricing standalone route and by the
// landing PricingSection scroll wrapper. Owns the billing-cycle toggle, the
// Supabase tier fetch, the current-tier highlight, and the family configurator
// modal. Consumers wrap it in their own layout (full-page <main> for the
// standalone route, SectionAnchor for the landing scroll narrative).
const INCLUDED_FEATURES: Record<TierId, string[]> = {
  free: [
    'CAQ assessment',
    'Basic Bio Optimization Score (72% confidence)',
    'Static protocol recommendation',
    'Shop at MSRP',
    'Research Hub (read only)',
    'Annual CAQ reassessment',
  ],
  gold: [
    'Everything in Free',
    'Unlimited Hannah interactions',
    'Dynamic Bio Optimization Score tracking',
    '40 day automatic reassessment',
    'Lab data integration (86% confidence)',
    'Nutrition logging with AI analysis',
    'Supplement adherence tracking',
    'Wearable integration (1 device)',
    'Helix Rewards earning and redemption',
    'Subscription discount, 10% off MSRP',
    'Priority email support',
  ],
  platinum: [
    'Everything in Gold',
    'GeneX360 genetic data integration',
    '96% confidence recommendations',
    'Genetic variant explorer',
    'Flagship SKU protocol recommendations',
    'Multiple wearable integration',
    'Practitioner integration',
    'Priority Hannah response times',
    'Advanced analytics and predictive modeling',
    'Subscription discount, 15% off MSRP',
    'Helix Rewards Platinum tier (5x multiplier)',
  ],
  platinum_family: [
    'Everything in Platinum for up to 2 adults',
    'Family Wellness Dashboard',
    'Family protocol coordination',
    'Family health history tracking',
    'Quarterly family wellness consultations',
    '25% family GeneX360 discount',
    'Sproutables product integration',
    'Family Helix Rewards pool',
    'Family shared billing',
    'Dedicated family account manager',
  ],
};

interface PricingTierGridProps {
  className?: string;
}

export function PricingTierGrid({ className = '' }: PricingTierGridProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [tiers, setTiers] = useState<MembershipTier[] | null>(null);
  const [currentTier, setCurrentTier] = useState<TierId>('free');
  const [showFamilyConfig, setShowFamilyConfig] = useState(false);
  const [isPractitionerOpen, setIsPractitionerOpen] = useState(false);

  // useId guarantees unique aria-controls/aria-labelledby pairing even when
  // PricingTierGrid renders inside both desktop + mobile scroll trees.
  const toggleId = useId();
  const regionId = `${toggleId}-region`;

  const handlePractitionerToggle = () => {
    const next = !isPractitionerOpen;
    setIsPractitionerOpen(next);
    if (next) {
      trackPractitionerPricingExpanded();
      // Mobile: scroll the expanded region into view so users on small
      // screens see the new content without manual scrolling. Respects
      // prefers-reduced-motion (auto behavior when set).
      requestAnimationFrame(() => {
        const region = document.getElementById(regionId);
        if (region) {
          const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          region.scrollIntoView({
            behavior: prefersReducedMotion ? 'auto' : 'smooth',
            block: 'nearest',
          });
        }
      });
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('membership_tiers')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (mounted) setTiers((data ?? []) as MembershipTier[]);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const tierResult = await fetch('/api/pricing/tier').then((r) => r.json()).catch(() => null);
        if (mounted && tierResult?.tierId) setCurrentTier(tierResult.tierId);
      }
    })();
    return () => { mounted = false; };
  }, []);

  function handleSelect(tierId: TierId) {
    if (tierId === 'platinum_family') {
      setShowFamilyConfig(true);
      return;
    }
    window.location.href = `/checkout?tier=${tierId}&cycle=${billingCycle}`;
  }

  return (
    <div className={className}>
      <div className="text-center mb-10 sm:mb-14">
        <div className="inline-flex rounded-xl border border-white/[0.08] bg-white/[0.03] p-1 text-sm">
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={`px-5 py-2 rounded-lg font-medium min-h-[40px] transition-all ${
              billingCycle === 'monthly'
                ? 'bg-[#2DA5A0]/30 backdrop-blur-xl border border-[#2DA5A0]/40 text-white shadow-[0_0_15px_rgba(45,165,160,0.3)]'
                : 'text-white/65'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('annual')}
            className={`px-5 py-2 rounded-lg font-medium min-h-[40px] transition-all ${
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

      {!tiers ? (
        <div className="flex items-center justify-center py-20 text-white/50">
          <Loader2 className="h-6 w-6 animate-spin" strokeWidth={1.5} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
          {tiers.map((tier) => (
            <TierCard
              key={tier.id}
              tier={tier}
              billingCycle={billingCycle}
              isCurrentTier={tier.id === currentTier}
              isRecommended={tier.id === 'platinum'}
              includedFeatures={INCLUDED_FEATURES[tier.id as TierId] ?? []}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}

      {showFamilyConfig && (
        <section className="mt-12">
          <h2 className="text-xl sm:text-2xl font-semibold text-white text-center mb-6">
            Build your Platinum+ Family plan
          </h2>
          <div className="max-w-3xl mx-auto">
            <FamilyConfigurator billingCycle={billingCycle} />
            <div className="mt-6 text-center">
              <Link
                href={`/checkout?tier=platinum_family&cycle=${billingCycle}`}
                className="inline-flex items-center justify-center rounded-xl bg-[#2DA5A0] text-[#0B1520] px-6 py-3 text-sm font-semibold min-h-[48px] hover:bg-[#2DA5A0]/90"
              >
                Continue to checkout
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Practitioner & Naturopath pricing toggle scaffold (#139e Path C3).
          Toggle UX is live; the practitioner tier cards themselves are held
          pending Hannah validation + Steve Rica clearance on public-surface
          copy and prices. Once cleared, swap the "Coming soon" panel for
          actual TierCard renders against the practitioner_tiers table. */}
      <div className="mt-12 flex justify-center">
        <PractitionerToggleButton
          id={toggleId}
          ariaControls={regionId}
          isOpen={isPractitionerOpen}
          onToggle={handlePractitionerToggle}
        />
      </div>

      <AnimatePresence initial={false}>
        {isPractitionerOpen && (
          <motion.div
            key="practitioner-tier-region"
            id={regionId}
            role="region"
            aria-labelledby={toggleId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
              opacity: { duration: 0.3, ease: 'easeInOut' },
            }}
            className="overflow-hidden"
          >
            <div className="pt-8 max-w-2xl mx-auto">
              <div className="bg-black/30 backdrop-blur-sm border border-[#2DA5A0]/40 rounded-2xl p-8 text-center">
                <p className="text-[#2DA5A0] uppercase tracking-[0.2em] text-xs mb-3 font-medium">
                  Coming Soon
                </p>
                <h3 className="text-white text-2xl font-light mb-3">
                  Practitioner &amp; Naturopath pricing
                </h3>
                <p className="text-white/70 text-sm leading-relaxed">
                  Tier details for practitioners and naturopaths are in final review. Public pricing announcement coming shortly.
                </p>
              </div>
            </div>
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
