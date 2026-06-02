'use client';

// BodyScanPremiumPaywall.tsx  (Prompt #169a, realigned to the #169f TIER MODEL)
//
// Platinum upgrade card for the body-scan flow. Under #169f, Body Scan is
// Platinum-and-above only and the free teaser is RETIRED, so this card is the
// upgrade prompt shown to a non-entitled consumer (dashboard / pre-capture guard
// points) and, with `showLockedEvidence`, on the results surface (the Compare +
// Insights tabs are rendered visibly locked as the evidence of what upgrading
// unlocks).
//
// Styling reuses the established paywall pattern (UpgradePromptCard /
// UpgradePromptModal): dark card, orange icon chip, single teal primary CTA.
// The CTA points at the canonical /pricing upgrade route used across the app
// (see src/lib/flags/upgrade-prompt-copy.ts). NO price is rendered here;
// pricing is owned by Gary and surfaced on /pricing.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Lock, ScanLine, GitCompareArrows, Sparkles, Layers, Loader2 } from 'lucide-react';
import { getDisplayName } from '@/lib/getDisplayName';
import { FORMAVISION_BRAND } from '@/lib/body-tracker/brand-config';
import { trackPremiumPaywallShown, trackPremiumUpgradeClicked } from '@/lib/body-tracker/scan-analytics';
import { useTrialState } from '@/hooks/body-tracker/useTrialState';
import { useClaimPlatinumTrial } from '@/hooks/body-tracker/useClaimPlatinumTrial';

interface BodyScanPremiumPaywallProps {
  // When true, also render the locked Compare + Insights tab evidence beneath
  // the feature list (results guard point, spec section 3.1.c).
  showLockedEvidence?: boolean;
  // Optional override for the upgrade route; defaults to the canonical /pricing.
  upgradeHref?: string;
  className?: string;
}

// Spec section 3.2 included-features list. Unlimited FormaVision scanning is the
// headline entitlement. Copy uses commas/colons only (no dashes per standing rules).
const INCLUDED_FEATURES: Array<{ icon: typeof ScanLine; label: string }> = [
  { icon: ScanLine,         label: `Unlimited ${FORMAVISION_BRAND.name} analysis, scan as often as you progress` },
  { icon: GitCompareArrows, label: 'Compare every scan to your baseline and track change over time' },
  { icon: Sparkles,         label: `Personalized protocol insights from ${getDisplayName('arnold')}` },
  { icon: Layers,           label: 'Full segmental composition, asymmetry, and measurement detail' },
];

// Locked-tab evidence shown on the results surface. Copy is verbatim from the
// spec so the value of upgrading is concrete.
const LOCKED_TABS: Array<{ icon: typeof GitCompareArrows; title: string; blurb: string }> = [
  {
    icon: GitCompareArrows,
    title: 'Compare',
    blurb: 'Compare your next scan to this baseline to see exactly what is changing.',
  },
  {
    icon: Sparkles,
    title: 'Insights',
    blurb: `Get ${getDisplayName('arnold')}'s personalized protocol recommendations based on your composition.`,
  },
];

export function BodyScanPremiumPaywall({
  showLockedEvidence = false,
  upgradeHref = '/pricing',
  className = '',
}: BodyScanPremiumPaywallProps) {
  // Distinguish where the paywall surfaced: the results surface (locked-tab
  // evidence) vs the dashboard / pre-capture entry. Metadata only.
  const triggerPoint = showLockedEvidence ? 'results_locked_tabs' : 'scan_entry';

  // Secondary CTA (Prompt #169f Option C): the one-time self-initiated Platinum
  // trial. The CTA is shown ONLY when the read-only signal says the user is
  // eligible (active Gold, no prior self-trial, no active trial); it is hidden
  // otherwise (spec 11.2 / 12.2 "Hidden if user has already used their trial").
  // The claim function remains the authority; on success we refresh so the
  // entitlement re-resolves the user to trial-Platinum. The primary "Upgrade
  // membership" path above stays intact.
  const { eligibleForSelfTrial, isLoading: trialLoading, refresh: refreshTrial } = useTrialState();
  const { claim, isClaiming } = useClaimPlatinumTrial();
  const [claimError, setClaimError] = useState<string | null>(null);

  const onStartSelfTrial = async () => {
    setClaimError(null);
    const result = await claim();
    if (result.ok) {
      // Re-read so the surface (and the entitlement resolver) reflect the new
      // active trial without a hard reload.
      await refreshTrial();
      return;
    }
    // Surface the function's returned reason verbatim.
    setClaimError(result.error ?? 'Could not start the Platinum trial.');
  };

  // Analytics (§14): the body-scan paywall was shown. Under the #169f tier model
  // there is no free teaser; this card is the Platinum upgrade prompt shown to a
  // non-entitled consumer, so has_used_teaser is false.
  useEffect(() => {
    trackPremiumPaywallShown({ trigger_point: triggerPoint, has_used_teaser: false });
  }, [triggerPoint]);

  return (
    <div
      data-testid="body-scan-premium-paywall"
      className={`rounded-2xl border border-white/[0.08] bg-[#1A2744]/80 backdrop-blur p-5 sm:p-6 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8803A]/20 flex-none">
          <Lock className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-white">Upgrade to start scanning</p>
          <p className="text-sm text-white/70 mt-1 leading-relaxed">
            {FORMAVISION_BRAND.name} requires a Platinum membership. Upgrade for unlimited scans plus
            the full composition, comparison, and insight tools.
          </p>
        </div>
      </div>

      {/* Included features */}
      <ul className="mt-5 space-y-2.5">
        {INCLUDED_FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <li key={feature.label} className="flex items-start gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#2DA5A0]/15 flex-none mt-0.5">
                <Icon className="h-3.5 w-3.5 text-[#2DA5A0]" strokeWidth={1.5} />
              </span>
              <span className="text-sm text-white/80 leading-relaxed">{feature.label}</span>
            </li>
          );
        })}
      </ul>

      {/* Locked-tab evidence (results guard point) */}
      {showLockedEvidence && (
        <div className="mt-5 space-y-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
            Unlocks with Premium
          </p>
          {LOCKED_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <div
                key={tab.title}
                data-testid={`locked-tab-${tab.title.toLowerCase()}`}
                className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] flex-none">
                  <Icon className="h-4 w-4 text-white/40" strokeWidth={1.5} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-white/85">{tab.title}</span>
                    <Lock className="h-3 w-3 text-white/40" strokeWidth={1.5} />
                  </div>
                  <p className="text-xs text-white/55 mt-0.5 leading-relaxed">{tab.blurb}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Primary CTA -> canonical upgrade route */}
      <Link
        href={upgradeHref}
        onClick={() => trackPremiumUpgradeClicked({ trigger_point: triggerPoint })}
        className="mt-5 inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl bg-[#2DA5A0] px-5 py-2.5 text-sm font-semibold text-[#0B1520] hover:bg-[#2DA5A0]/90 min-h-[44px]"
      >
        Upgrade membership
        <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} />
      </Link>

      {/* Secondary CTA: one-time self-initiated Platinum trial (Prompt #169f
          Option C). Rendered ONLY when eligible (active Gold, no prior self-trial,
          no active trial); hidden in every other state. Minimal functional label;
          the marketing copy pass (169f 9.5 / 12.2) is gated separately. */}
      {!trialLoading && eligibleForSelfTrial && (
        <div className="mt-3">
          <button
            type="button"
            data-testid="body-scan-self-trial-cta"
            onClick={onStartSelfTrial}
            disabled={isClaiming}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl border border-[#2DA5A0]/40 bg-transparent px-5 py-2.5 text-sm font-semibold text-[#2DA5A0] hover:bg-[#2DA5A0]/10 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isClaiming && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />}
            Start 7 day Platinum trial
          </button>
          {claimError && (
            <p className="mt-2 text-xs text-[#FCA5A5]" role="alert">
              {claimError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
