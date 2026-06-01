'use client';

// DashboardTierCards  (Prompt #169f section 11.2: tier-branched dashboard cards)
//
// Branches the consumer dashboard by EFFECTIVE TIER and renders the right entry
// cards for each tier. Reuses the existing dashboard card component
// (DashboardLinkCard) and, for the Platinum upsell on a Gold account, the
// existing BodyScanPremiumPaywall, so no new card styling is introduced.
//
//   Free            -> upgrade cards (Gold explains Body Tracker; Platinum
//                      explains FormaVision). Neither feature is accessible.
//   Gold            -> the Body Tracker card (active) PLUS the FormaVision card
//                      shown with its existing Platinum paywall (BodyScanPremiumPaywall).
//   Platinum        -> FormaVision active (and Body Tracker active).
//   Platinum+ Family-> everything Platinum sees PLUS a family management entry.
//
// TIER SIGNAL: read from /api/pricing/tier via useEffectiveTier (the canonical
// effective-tier resolver). This drives CARD VISIBILITY only. The FormaVision
// ACCESS decision is NOT made here: it stays with the body_photo_sessions
// finalize entitlement (migration 20260516000150) and usePremiumEntitlement, and
// the BodyScanPremiumPaywall on the Gold branch is the SAME upsell component the
// authoritative gate uses, so the two cannot diverge. Copy is minimal and
// functional; the polished tier copy + /membership page are a separate gated task.

import { Activity, ScanLine, UsersRound } from 'lucide-react';
import { DashboardLinkCard } from '@/components/dashboard/DashboardLinkCard';
import { BodyScanPremiumPaywall } from '@/components/body-tracker/scanning/BodyScanPremiumPaywall';
import { useEffectiveTier } from '@/hooks/useEffectiveTier';

// membership_tiers.tier_level: free 0, gold 1, platinum 2, platinum_family 3.
const GOLD_LEVEL = 1;
const PLATINUM_LEVEL = 2;
const FAMILY_LEVEL = 3;

// Brand accent colors already in use across the dashboard cards.
const TEAL = '#2DA5A0';
const ORANGE = '#B75E18';

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wider text-white/50">{children}</h2>
  );
}

export function DashboardTierCards() {
  const { tierLevel, isLoading } = useEffectiveTier();

  // Do not flash any tier branch before the tier resolves.
  if (isLoading) return null;

  // ---- Free: upgrade cards for Gold and Platinum -----------------------------
  if (tierLevel < GOLD_LEVEL) {
    return (
      <section data-testid="dashboard-tier-cards" data-tier="free" className="space-y-3">
        <SectionHeading>Unlock more with membership</SectionHeading>
        <div className="grid gap-3 md:grid-cols-2">
          <DashboardLinkCard
            eyebrow="Gold"
            eyebrowIcon={Activity}
            title="Body Tracker"
            description="Upgrade to Gold for Body Tracker: manual entry, weight logging, wearable sync, and your history and trend charts."
            icon={Activity}
            accent={ORANGE}
            href="/pricing"
            cta="Upgrade to Gold"
          />
          <DashboardLinkCard
            eyebrow="Platinum"
            eyebrowIcon={ScanLine}
            title="FormaVision Body Scan"
            description="Upgrade to Platinum for FormaVision: full body scan composition, comparison over time, and asymmetry analysis."
            icon={ScanLine}
            accent={TEAL}
            href="/pricing"
            cta="Upgrade to Platinum"
          />
        </div>
      </section>
    );
  }

  // ---- Gold: Body Tracker active + FormaVision behind the Platinum paywall ----
  if (tierLevel < PLATINUM_LEVEL) {
    return (
      <section data-testid="dashboard-tier-cards" data-tier="gold" className="space-y-3">
        <SectionHeading>Your tracking</SectionHeading>
        <DashboardLinkCard
          eyebrow="Gold"
          eyebrowIcon={Activity}
          title="Body Tracker"
          description="Log weight and measurements, sync your wearable, and follow your history and trend charts."
          icon={Activity}
          accent={ORANGE}
          href="/body-tracker"
          cta="Open Body Tracker"
        />
        {/* FormaVision card: reuse the authoritative Platinum upsell component so
            the Gold-to-Platinum prompt cannot diverge from the real gate. */}
        <BodyScanPremiumPaywall />
      </section>
    );
  }

  // ---- Platinum and Platinum+ Family: FormaVision + Body Tracker active -------
  return (
    <section
      data-testid="dashboard-tier-cards"
      data-tier={tierLevel >= FAMILY_LEVEL ? 'platinum_family' : 'platinum'}
      className="space-y-3"
    >
      <SectionHeading>Your tracking</SectionHeading>
      <div className="grid gap-3 md:grid-cols-2">
        <DashboardLinkCard
          eyebrow="Platinum"
          eyebrowIcon={ScanLine}
          title="FormaVision Body Scan"
          description="Run a body scan, compare it to your baseline, and review your full composition and asymmetry detail."
          icon={ScanLine}
          accent={TEAL}
          href="/body-tracker/photos"
          cta="Open FormaVision"
        />
        <DashboardLinkCard
          eyebrow="Gold"
          eyebrowIcon={Activity}
          title="Body Tracker"
          description="Log weight and measurements, sync your wearable, and follow your history and trend charts."
          icon={Activity}
          accent={ORANGE}
          href="/body-tracker"
          cta="Open Body Tracker"
        />
      </div>
      {/* Platinum+ Family only: a family management entry point. Points at the
          canonical family surface (/pricing?focus=family), the same route the
          flag upgrade copy uses for the family reason; the dedicated family
          management page is a separate gated task. */}
      {tierLevel >= FAMILY_LEVEL && (
        <DashboardLinkCard
          eyebrow="Platinum+ Family"
          eyebrowIcon={UsersRound}
          title="Family Management"
          description="Manage your family members, included seats, and your family wellness plan."
          icon={UsersRound}
          accent={TEAL}
          href="/pricing?focus=family"
          cta="Manage Family"
        />
      )}
    </section>
  );
}
