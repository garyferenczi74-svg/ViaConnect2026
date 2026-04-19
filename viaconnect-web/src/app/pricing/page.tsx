'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { TierCard } from '@/components/pricing/TierCard';
import { FamilyConfigurator } from '@/components/pricing/FamilyConfigurator';
import type { MembershipTier, TierId } from '@/types/pricing';
import { createClient } from '@/lib/supabase/client';

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

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [tiers, setTiers] = useState<MembershipTier[] | null>(null);
  const [currentTier, setCurrentTier] = useState<TierId>('free');
  const [showFamilyConfig, setShowFamilyConfig] = useState(false);

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
    <main className="min-h-screen bg-[#0B1520] text-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <header className="text-center mb-10 sm:mb-14">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2DA5A0] mb-3">
            ViaConnect membership
          </p>
          <h1 className="text-3xl sm:text-5xl font-bold text-white leading-tight">
            Pick the plan that fits your journey
          </h1>
          <p className="mt-4 text-sm sm:text-base text-white/65 max-w-2xl mx-auto leading-relaxed">
            Every tier includes the CAQ assessment and Bio Optimization Score. Upgrade to unlock
            dynamic tracking, GeneX360 integration, and family coordination.
          </p>

          <div className="mt-8 inline-flex rounded-xl border border-white/[0.08] bg-white/[0.03] p-1 text-sm">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`px-5 py-2 rounded-lg font-medium min-h-[40px] transition-colors ${
                billingCycle === 'monthly' ? 'bg-[#2DA5A0] text-[#0B1520]' : 'text-white/65'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('annual')}
              className={`px-5 py-2 rounded-lg font-medium min-h-[40px] transition-colors ${
                billingCycle === 'annual' ? 'bg-[#2DA5A0] text-[#0B1520]' : 'text-white/65'
              }`}
            >
              Annual
              <span className="ml-2 text-[10px] rounded-full bg-[#E8803A]/20 text-[#E8803A] px-1.5 py-0.5">
                Save more
              </span>
            </button>
          </div>
        </header>

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

        <footer className="mt-16 text-center text-[11px] text-white/50 leading-relaxed max-w-2xl mx-auto">
          <p>
            Supplement recommendations are informational only and do not replace medical advice. Speak
            with a qualified healthcare provider before starting new supplements.
          </p>
        </footer>
      </div>
    </main>
  );
}
