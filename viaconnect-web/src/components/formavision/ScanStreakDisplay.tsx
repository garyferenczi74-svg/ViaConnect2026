'use client';

/**
 * src/components/formavision/ScanStreakDisplay.tsx
 *
 * Prompt 211a Workstream 4 (Part 2): the CONSUMER-ONLY scan streak display.
 *
 * CONSUMER-ONLY, END TO END (Helix invisibility, Section 5 gate):
 *   This surface is mounted ONLY on the (consumer) composition route, NEVER a
 *   practitioner route. The structural test (invariants.test.ts 4.6) asserts no
 *   practitioner route imports this component. The streak read is own-row: it
 *   filters scan_streak by the authenticated user id, and scan_streak carries
 *   own-row RLS (migration 20260710120000), matching the 210e invariant 4.3
 *   posture. Streak CREDIT is never written here: this surface is READ ONLY.
 *   Any credit stays in the server award lane (baseline Item 5).
 *
 * Data source: public.scan_streak (current_streak, longest_streak). Fail-open
 *   read: withTimeout(4s) + try/catch + safeLog.warn. A zero / absent streak or
 *   any error renders nothing (honest: no fabricated "0 day streak").
 *
 * Formatting: formatStreakDisplay (pure, tested). Milestones are tasteful and
 *   never inflated.
 *
 * Telemetry: fires formavision.streak_length once when a real streak is shown
 *   (coarse: the integer length + the milestone tier, PII-clean).
 *
 * Standing rules: Lucide strokeWidth 1.5, no emojis, no em/en dashes, tokens
 *   only (Teal #2DA5A0 / Navy #1E3054), Instrument Sans. Desktop AND mobile
 *   responsive, w-full on mobile, 44px min touch target on the interactive dot.
 */

import { useEffect, useRef, useState } from 'react';
import { Flame } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { formatStreakDisplay, type StreakDisplay } from '@/lib/formavision/cadence/streakDisplay';
import { emitCadenceEvent } from '@/lib/formavision/cadence/cadenceTelemetry';
import { readOwnScanStreak } from '@/lib/formavision/cadence/cadenceDb';

// ---------------------------------------------------------------------------
// Pure content renderer (exported for renderToStaticMarkup tests, no hooks).
// Renders nothing when display is null (honest: no empty / fabricated streak).
// ---------------------------------------------------------------------------

export interface ScanStreakDisplayContentProps {
  display: StreakDisplay | null;
}

export function ScanStreakDisplayContent({ display }: ScanStreakDisplayContentProps) {
  if (!display) return null;

  return (
    <div
      data-testid="scan-streak-display"
      className="flex w-full items-center gap-3 rounded-2xl border border-[#2DA5A0]/25 bg-[#1E3054]/40 p-4 backdrop-blur-md sm:p-5"
    >
      <div
        aria-hidden="true"
        className="flex h-11 w-11 min-h-[44px] min-w-[44px] flex-none items-center justify-center rounded-xl bg-[#2DA5A0]/15"
      >
        <Flame size={20} strokeWidth={1.5} className="text-[#2DA5A0]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span data-testid="scan-streak-label" className="text-base font-semibold text-white">
            {display.label}
          </span>
          {display.milestoneLabel && (
            <span
              data-testid="scan-streak-milestone"
              className="rounded-full border border-[#2DA5A0]/40 bg-[#2DA5A0]/10 px-2 py-0.5 text-[11px] font-medium text-[#2DA5A0]"
            >
              {display.milestoneLabel}
            </span>
          )}
        </div>
        <p data-testid="scan-streak-caption" className="mt-0.5 text-xs leading-relaxed text-white/60">
          {display.caption}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Client wrapper (surface mount point). Reads scan_streak own-row, fail-open.
// NO write of any kind to scan_streak or any economy table (read-only).
// ---------------------------------------------------------------------------

export function ScanStreakDisplay() {
  const [display, setDisplay] = useState<StreakDisplay | null>(null);
  const shownFiredRef = useRef(false);
  const userIdRef = useRef<string | null>(null);

  // Fire streak_length telemetry once when a real streak first appears.
  useEffect(() => {
    if (display !== null && !shownFiredRef.current) {
      shownFiredRef.current = true;
      void emitCadenceEvent(userIdRef.current, 'formavision.streak_length', {
        streakLength: parseStreakLength(display.label),
        milestone: display.milestone ?? 'none',
      });
    }
  }, [display]);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const supabase = createClient();

        const authResult = await withTimeout(
          supabase.auth.getUser(),
          4000,
          'ScanStreakDisplay.auth',
        );
        const userId = authResult.data?.user?.id;
        if (!userId) return;
        userIdRef.current = userId;

        // Own-row read: scan_streak filtered by the authenticated user id.
        // scan_streak carries own-row RLS, so this can only ever see own data.
        // readOwnScanStreak is the thin typed accessor (the table is not yet in
        // the generated Database type; the migration is built, not applied).
        const result = await withTimeout(
          readOwnScanStreak(supabase, userId),
          4000,
          'ScanStreakDisplay.read',
        );

        if (!active) return;

        const row = result.data;
        if (!row) return; // no streak row yet -> render nothing

        setDisplay(formatStreakDisplay(row.current_streak, row.longest_streak));
      } catch (err) {
        safeLog.warn('ScanStreakDisplay', 'streak read failed, failing open', {
          error: err instanceof Error ? err.message : String(err),
        });
        // Fail-open: render nothing on any error. Never throw.
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return <ScanStreakDisplayContent display={display} />;
}

/** Extracts the integer length from a label like "5 scan streak" or "1 scan". */
function parseStreakLength(label: string): number {
  const match = /^(\d+)/.exec(label);
  return match ? Number(match[1]) : 0;
}
