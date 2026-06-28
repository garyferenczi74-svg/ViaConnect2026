'use client';

/**
 * src/components/formavision/MilestoneMoment.tsx
 *
 * Prompt 210b P6-T4: MilestoneMoment (consumer-only, celebrate-only).
 *
 * CELEBRATE-ONLY (Gary decision 2026-06-27, binding):
 *   This surface DISPLAYS a celebratory moment for a genuinely-achieved
 *   body-composition milestone, reading EXISTING server-recorded state.
 *   NO creditEarning, NO helix_score_events write, NO helix_increment_balance
 *   from this surface. The avatar is a visualization layer.
 *
 *   CARRY-FORWARD: server-side milestone-crossing -> Helix crediting is NOT
 *   wired here. If not wired elsewhere, that is a separate server task.
 *
 * Data source: body_tracker_milestones (completed_date IS NOT NULL, body-comp
 *   types only). Fail-open read: withTimeout(4s) + try/catch + safeLog.warn.
 *   useHubMetrics reads a count only, not row data; a bespoke read is used.
 *
 * HONESTY CONTRACT:
 *   - Achieved = completed_date set (server-recorded). Never compute client-side.
 *   - None completed -> renders nothing. No empty or fabricated celebration.
 *   - UNKNOWN values never shown as 0. Title is the real server value.
 *
 * Seen-guard: sessionStorage key vc_milestone_moment_seen. One-shot per
 *   milestone per session. Mirrors the useDailyScores.ts cache idiom.
 *
 * Consumer-only: mounted only on the (consumer) composition route.
 *   No practitioner path added here.
 *
 * Reduced-motion: the toast simply appears (no CSS animation) when
 *   reducedMotion=true or the user prefers-reduced-motion. The motion-safe:
 *   transition classes are omitted, preserving static parity.
 *
 * Standing rules: Lucide strokeWidth 1.5, no emojis, no em/en dashes,
 * tokens only (Teal #2DA5A0 / Navy #1E3054), Instrument Sans.
 * Desktop AND mobile responsive. 44px touch target on dismiss.
 *
 * 2026-06-27. No em/en dashes.
 */

import { useEffect, useRef, useState } from 'react';
import { X, Trophy } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import {
  BODY_COMP_MILESTONE_TYPES,
  selectMilestoneForMoment,
  getSeenIds,
  markMilestoneSeen,
} from '@/lib/formavision/milestone/milestoneMoment';
import type { MilestoneForMoment } from '@/lib/formavision/milestone/milestoneMoment';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface MilestoneMomentContentProps {
  /** The milestone to celebrate, null when none qualifies. */
  milestone: MilestoneForMoment | null;
  /**
   * When true, disables CSS animations (prefers-reduced-motion override).
   * The moment simply appears without transition in that case.
   */
  reducedMotion?: boolean;
  /** Called when the user dismisses the moment. */
  onDismiss: () => void;
}

export interface MilestoneMomentProps {
  /** When true, disables CSS animations (prefers-reduced-motion override). */
  reducedMotion?: boolean;
  /**
   * P8-T1b: telemetry seam. Called once when a qualifying milestone is first
   * displayed to the user (formavision.milestone_celebrated). Absent means no
   * telemetry. NO milestone title or health number is passed -- coarse only.
   */
  onShown?: () => void;
}

// ---------------------------------------------------------------------------
// DB row shape (minimal select)
// ---------------------------------------------------------------------------

interface MilestoneReadRow {
  id: string;
  title: string;
  milestone_type: string;
  completed_date: string | null;
}

// ---------------------------------------------------------------------------
// Pure content renderer
//
// Exported so tests can use renderToStaticMarkup without hooks.
// No side effects, no network calls. Returns null when milestone is null
// (honest: no empty celebration, no fabricated data).
// ---------------------------------------------------------------------------

export function MilestoneMomentContent({
  milestone,
  reducedMotion,
  onDismiss,
}: MilestoneMomentContentProps) {
  // No qualifying milestone -> render nothing. HONEST: no empty celebration.
  if (!milestone) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-testid="milestone-moment-toast"
      className={`fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-[#2DA5A0]/35 bg-[#1E3054]/95 p-4 shadow-2xl backdrop-blur-md sm:right-6 sm:w-80 ${
        reducedMotion
          ? ''
          : 'motion-safe:transition-opacity motion-safe:duration-300'
      }`}
    >
      {/* Header row: icon + heading + dismiss */}
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 pt-[14px]">
          <Trophy
            size={16}
            strokeWidth={1.5}
            className="flex-none text-[#2DA5A0]"
            aria-hidden="true"
          />
          <h3
            data-testid="milestone-moment-heading"
            className="text-sm font-semibold text-white"
          >
            Milestone Achieved
          </h3>
        </div>

        {/* Dismiss: 44px touch target */}
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss milestone moment"
          data-testid="milestone-moment-dismiss"
          className="flex h-[44px] w-[44px] flex-none items-center justify-center rounded-xl text-white/50 transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          <X size={16} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>

      {/* Real milestone title: server-recorded, never fabricated */}
      <p
        data-testid="milestone-moment-title"
        className="text-sm font-medium text-white"
      >
        {milestone.title}
      </p>

      {/* Body-positive congratulatory copy */}
      <p
        data-testid="milestone-moment-body"
        className="mt-1 text-xs leading-relaxed text-white/60"
      >
        Real progress, genuinely earned. This one is yours.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Client wrapper (surface mount point)
//
// Reads body_tracker_milestones for completed body-comp milestones.
// Applies the sessionStorage seen-guard.
// Fail-open: any error -> render nothing, never throw.
//
// NOTE: Does NOT write to any Helix economy table. Read-only entirely.
// ---------------------------------------------------------------------------

export function MilestoneMoment({ reducedMotion, onShown }: MilestoneMomentProps) {
  const [milestone, setMilestone] = useState<MilestoneForMoment | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // P8-T1b: fire once when a qualifying milestone is first shown.
  const shownFiredRef = useRef(false);
  useEffect(() => {
    if (milestone !== null && !shownFiredRef.current) {
      shownFiredRef.current = true;
      onShown?.();
    }
  }, [milestone, onShown]);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const supabase = createClient();

        // Resolve authenticated user. No user -> nothing shown (fail-open).
        const authResult = await withTimeout(
          supabase.auth.getUser(),
          4000,
          'MilestoneMoment.auth',
        );
        const userId = authResult.data?.user?.id;
        if (!userId) return;

        // Read completed body-comp milestones. Scoped to completed_date IS NOT
        // NULL and the three body-comp types to minimise row count.
        // Ordered by completed_date desc so the most recent is tried first.
        const types: string[] = [...BODY_COMP_MILESTONE_TYPES];

        const queryPromise = supabase
          .from('body_tracker_milestones')
          .select('id, title, milestone_type, completed_date')
          .eq('user_id', userId)
          .not('completed_date', 'is', null)
          .in('milestone_type', types)
          .order('completed_date', { ascending: false })
          .limit(10);

        const result = await withTimeout(
          queryPromise as unknown as Promise<{
            data: MilestoneReadRow[] | null;
            error: unknown;
          }>,
          4000,
          'MilestoneMoment.milestones',
        );

        if (!active) return;

        const rows: MilestoneReadRow[] = result.data ?? [];

        // Apply the seen-guard and select the first qualifying milestone.
        const seen = getSeenIds();
        const selected = selectMilestoneForMoment(rows, seen);

        setMilestone(selected);
      } catch (err) {
        safeLog.warn('MilestoneMoment', 'milestone read failed, failing open', {
          error: err instanceof Error ? err.message : String(err),
        });
        // Fail-open: render nothing on any error. Never throw.
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const handleDismiss = () => {
    if (milestone) {
      markMilestoneSeen(milestone.id);
    }
    setDismissed(true);
  };

  // Dismissed by user -> unmount. Still loading or no milestone -> null.
  if (dismissed) return null;

  return (
    <MilestoneMomentContent
      milestone={milestone}
      reducedMotion={reducedMotion}
      onDismiss={handleDismiss}
    />
  );
}
