'use client';

import { PricingTierGrid } from '@/components/pricing/PricingTierGrid';

// Standalone /pricing route. Reuses the shared PricingTierGrid (auth +
// Supabase fetch + billing toggle + family configurator) inside its own
// page-level layout. The same PricingTierGrid is used inline by the
// landing PricingSection scroll wrapper, so there's one source of truth
// for tier rendering and only the headers diverge between the two
// presentation contexts.
export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#0B1520] text-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <header className="text-center mb-10 sm:mb-14">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2DA5A0] mb-3">
            ViaConnect&trade; Membership
          </p>
          <h1 className="text-3xl sm:text-5xl font-bold text-white leading-tight">
            Pick the plan that fits your journey
          </h1>
          <p className="mt-4 text-sm sm:text-base text-white/65 max-w-2xl mx-auto leading-relaxed">
            Every tier includes the CAQ assessment and Bio Optimization Score. Upgrade to unlock
            dynamic tracking, GeneX360 integration, and family coordination.
          </p>
        </header>

        <PricingTierGrid />
      </div>
    </main>
  );
}
