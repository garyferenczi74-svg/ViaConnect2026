'use client';

// Prompt 183 Task 3 (2026-06-10): My Nutrition Connect strip.
//
// Models the My Biology ConnectionsStrip. Links to the existing
// Connect Your App destination at /plugins/apps. The strip presents a
// small static set of representative nutrition sources as pills with a
// dim dot. This is presentational only: every source ships as
// connected = false and nothing is read from Supabase. A real status
// hook can land later.
//
// Mobile (under 560px): pills wrap, the affordance sits on its own row.
// Desktop: everything sits to the right.

import Link from 'next/link';
import { ArrowRight, Plug } from 'lucide-react';
import {
  CONSUMER_CARD_SUBHEAD,
  CONSUMER_CARD_TITLE,
} from '@/lib/ui/consumerChrome';
import '@/components/body-tracker/hub/hub-card-frame.css';

const ACCENT_HEX = '#2DA5A0';

const HREF = '/plugins/apps';
const TITLE = 'Connect your app';
const DESCRIPTION =
  'Sync the nutrition apps and wearables that feed every surface above.';

interface NutritionSource {
  id: string;
  label: string;
  // Always false in this task; status wiring lands in a later release.
  connected: boolean;
}

const SOURCES: NutritionSource[] = [
  { id: 'apple-health', label: 'Apple Health', connected: false },
  { id: 'myfitnesspal', label: 'MyFitnessPal', connected: false },
  { id: 'cronometer', label: 'Cronometer', connected: false },
];

export function NutritionConnectStrip() {
  return (
    <Link
      href={HREF}
      aria-label={`${TITLE}: ${DESCRIPTION}`}
      className="hub-card-frame group relative flex min-h-[88px] flex-col gap-3 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-4 backdrop-blur-md transition-all duration-200 ease-out hover:border-white/[0.16] hover:shadow-lg hover:shadow-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] md:min-h-[96px] md:flex-row md:items-center md:gap-4 md:p-5"
      data-nutrition-hub-connect
    >
      <div className="flex items-center gap-3 md:gap-4">
        <span
          className="inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] backdrop-blur-sm md:h-14 md:w-14"
          aria-hidden="true"
        >
          <Plug className="h-5 w-5" strokeWidth={1.5} style={{ color: ACCENT_HEX }} />
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className={CONSUMER_CARD_TITLE}>
            {TITLE}
          </h2>
          <p className={CONSUMER_CARD_SUBHEAD}>
            {DESCRIPTION}
          </p>
        </div>
      </div>

      {/* Source pills + go affordance. Mobile: pills wrap, affordance sits
          on its own row. Desktop: everything sits to the right. */}
      <div className="flex flex-wrap items-center gap-2 md:ml-auto md:flex-nowrap md:gap-3">
        <ul className="flex flex-wrap items-center gap-1.5">
          {SOURCES.map((source) => (
            <li key={source.id}>
              <span className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-sm text-white/85 backdrop-blur-sm">
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 rounded-full ${
                    source.connected ? 'bg-[#2DA5A0]' : 'bg-white/25'
                  }`}
                />
                {source.label}
                <span className="sr-only">
                  {source.connected ? 'connected' : 'not connected'}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <span className="ml-auto inline-flex items-center gap-1 text-[12px] font-medium text-white/70 transition-colors group-hover:text-white md:ml-2">
          <span>Manage</span>
          <ArrowRight
            className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
            strokeWidth={1.5}
          />
        </span>
      </div>
    </Link>
  );
}

export default NutritionConnectStrip;
