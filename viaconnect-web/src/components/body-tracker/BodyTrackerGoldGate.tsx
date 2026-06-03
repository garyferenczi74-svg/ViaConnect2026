'use client';

// BodyTrackerGoldGate  (Prompt #169f section 3 capability matrix)
//
// Gates the Body Tracker consumer surface at Gold (membership_tiers.tier_level
// >= 1). Under the four-tier Via Cura model, Body Tracker (manual entry, manual
// weight log, wearable sync, history and trend charts) is a Gold-and-above
// feature; the Free tier has NO Body Tracker access. Before #169f the Body
// Tracker pages had NO tier gate (open to every tier, including Free); this
// component adds that gate at the layout level so it wraps every Body Tracker
// sub-page in one place.
//
// MECHANISM (reuses the established pattern, no parallel system): the effective
// tier is read from /api/pricing/tier via useEffectiveTier, exactly like the
// FormaVision flow reads /api/body-tracker/entitlement via usePremiumEntitlement.
// The effective-tier route resolves over getEffectiveTierForUser (the same
// memberships + membership_tiers resolver the rest of the pricing system uses),
// so this gate is driven by the canonical tier signal, not a duplicated compute.
// The catalog row body_tracker_access (minimum_tier_level 1, added in migration
// 20260516000180) records the same Gold requirement for the features catalog.
//
// RELATION TO THE FORMAVISION GATE (do NOT regress it): a Gold user PASSES this
// gate and reaches the normal Body Tracker surface, including the Body Scan
// (FormaVision) entry inside RunScanButton, which independently enforces its
// Platinum requirement via usePremiumEntitlement + the body_photo_sessions
// finalize trigger. This Gold gate is strictly ADDITIVE and sits ABOVE that
// Platinum gate; it never weakens or bypasses it.

import Link from 'next/link';
import { Lock, ArrowUpRight } from 'lucide-react';
import { FORMAVISION_BRAND } from '@/lib/body-tracker/brand-config';
import { useEffectiveTier } from '@/hooks/useEffectiveTier';

// Gold is membership_tiers.tier_level 1 (free 0, gold 1, platinum 2,
// platinum_family 3).
const GOLD_TIER_LEVEL = 1;

export function BodyTrackerGoldGate({ children }: { children: React.ReactNode }) {
  const { tierLevel, isLoading } = useEffectiveTier();

  // While the tier resolves, render the surface (the per-page Supabase reads
  // already degrade to empty state, and the only sensitive action, finalizing a
  // Body Scan, is gated server-side at finalize). This avoids a gate flash on a
  // slow tier read for the Gold-and-above majority of authenticated viewers.
  if (isLoading) return <>{children}</>;

  // Gold or above: full Body Tracker surface.
  if (tierLevel >= GOLD_TIER_LEVEL) return <>{children}</>;

  // Free (below Gold): show the upgrade-to-Gold prompt in place of the surface.
  // Minimal, functional copy; the polished tier copy + /membership page are a
  // separate gated task. CTA points at the canonical /pricing upgrade route.
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
    <div
      data-testid="body-tracker-gold-gate"
      className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/80 backdrop-blur p-5 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8803A]/20 flex-none">
          <Lock className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-white">Upgrade to Gold to use {FORMAVISION_BRAND.name}</p>
          <p className="text-sm text-white/70 mt-1 leading-relaxed">
            {FORMAVISION_BRAND.name} is part of Gold membership: manual entry, weight logging, wearable sync, and
            your history and trend charts. Upgrade to Gold to start tracking.
          </p>
        </div>
      </div>

      <Link
        href="/pricing"
        className="mt-5 inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl bg-[#2DA5A0] px-5 py-2.5 text-sm font-semibold text-[#0B1520] hover:bg-[#2DA5A0]/90 min-h-[44px]"
      >
        Upgrade to Gold
        <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} />
      </Link>
    </div>
    </div>
  );
}
