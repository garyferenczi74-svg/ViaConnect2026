/**
 * Prompt 170o Phase 1 Phase C: Hydration Detail view per Hannah §4.
 *
 * Gary 2026-06-03: page body lifted into HydrationFullSection so the same
 * section mounts inline in the Dashboard Quick Log accordion + the
 * Nutrition Log Today's Meals accordion. This page now wraps that section
 * with the route chrome (back link + heading) only.
 */

'use client';

import Link from 'next/link';
import { ArrowLeft, Droplet } from 'lucide-react';
import { HydrationFullSection } from '@/components/hydration/HydrationFullSection';

export default function HydrationDetailPage(): JSX.Element {
  return (
    <div className="min-h-screen w-full bg-[#1A2744] text-white">
      <div className="mx-auto max-w-3xl px-4 py-6 md:py-8">
        <header className="mb-6 flex items-center gap-3">
          <Link
            href="/dashboard"
            aria-label="Back to dashboard"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/5 text-white/80 transition-colors hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          </Link>
          <div className="flex items-center gap-2">
            <Droplet className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
            <h1 className="text-xl font-bold text-white sm:text-2xl">Hydration</h1>
          </div>
        </header>

        <HydrationFullSection logSurface="hydration_detail_view" />
      </div>
    </div>
  );
}
