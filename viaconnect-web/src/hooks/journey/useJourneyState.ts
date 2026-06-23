'use client';

/**
 * src/hooks/journey/useJourneyState.ts
 *
 * Client hook that feeds the tested deriveJourneyState brain (Prompt 208c,
 * Phase 1, Task P1-T3) with best-effort, individually fail-open signals.
 *
 * Contract:
 *   - Every signal read is independent and fail-open. On ANY error the signal
 *     takes its conservative default (false / 0 / [] / null), so the derived
 *     phase degrades to the honest 'Baseline' state.
 *   - The hook NEVER throws. deriveJourneyState is pure and never throws either.
 *   - Several signals are legitimately defaulted today (documented below); the
 *     hook only feeds the brain, it does not own the phase logic.
 *
 * NOTE: retestCadence.getDueRetests is server-only (it imports the service-role
 * admin client). We DO NOT import it here. Instead we read retest_schedule
 * directly with the RLS-scoped browser client (owner-scoped SELECT policy).
 *
 * No em/en-dashes. No emojis. No new dependencies. No package.json changes.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  deriveJourneyState,
  type JourneySignals,
  type JourneyState,
} from '@/lib/journey/deriveJourneyState';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface JourneyMomentum {
  /** Consecutive check-in days back from today; null when unknown. */
  currentStreak: number | null;
  /** Whole days until the next scheduled re-test; null when unknown. */
  daysToNextMilestone: number | null;
}

export interface UseJourneyStateResult {
  state: JourneyState;
  momentum: JourneyMomentum;
  loading: boolean;
}

// ---------------------------------------------------------------------------
// Conservative defaults
//
// These resolve deriveJourneyState to 'Baseline' with honest copy when every
// signal is unknown, which is exactly the fail-open behaviour we want before
// (or instead of) any successful read.
// ---------------------------------------------------------------------------

const DEFAULT_SIGNALS: JourneySignals = {
  caqComplete: false,
  hasProtocol: false,
  recentTrackingDays: 0,
  retestDue: false,
  adjustPending: false,
  retestsCompleted: 0,
  goals: [],
};

const DEFAULT_MOMENTUM: JourneyMomentum = {
  currentStreak: null,
  daysToNextMilestone: null,
};

// ---------------------------------------------------------------------------
// Small helpers (pure, fail-open)
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;

/** A UTC YYYY-MM-DD day key for an arbitrary timestamp. */
function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Consecutive-day streak counted back from today over a set of YYYY-MM-DD keys.
 * Returns 0 when the set is empty. Pure; never throws.
 */
function consecutiveStreak(dayKeys: Set<string>): number {
  if (dayKeys.size === 0) return 0;
  let streak = 0;
  const cursor = new Date();
  for (let i = 0; i < 365; i++) {
    if (dayKeys.has(dayKey(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Wraps a best-effort async read so a rejection or throw resolves to the
 * supplied fallback instead of propagating. Keeps every signal independent.
 */
async function failOpen<T>(read: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await read();
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// useJourneyState
// ---------------------------------------------------------------------------

/**
 * Best-effort client hook feeding deriveJourneyState.
 *
 * Wired today:   caqComplete, hasProtocol, recentTrackingDays, retestDue,
 *                retestsCompleted, momentum.currentStreak,
 *                momentum.daysToNextMilestone.
 * Defaulted:     adjustPending (no reliable client signal yet -> false),
 *                goals (no clean client source yet -> []).
 *
 * @param userId The authenticated user id, or null before auth resolves.
 */
export function useJourneyState(userId: string | null): UseJourneyStateResult {
  const [signals, setSignals] = useState<JourneySignals>(DEFAULT_SIGNALS);
  const [momentum, setMomentum] = useState<JourneyMomentum>(DEFAULT_MOMENTUM);
  const [loading, setLoading] = useState<boolean>(false);

  // Guards a late resolution from writing state after a userId change/unmount.
  const requestRef = useRef(0);

  useEffect(() => {
    if (!userId) {
      // No user yet: stay at the conservative Baseline defaults, not loading.
      setSignals(DEFAULT_SIGNALS);
      setMomentum(DEFAULT_MOMENTUM);
      setLoading(false);
      return;
    }

    const requestId = ++requestRef.current;
    let active = true;
    setLoading(true);

    // The whole load is wrapped so it can never throw out of the effect.
    (async () => {
      const supabase = createClient();
      // Cast: several of these tables are not in the regenerated typegen
      // (mirrors how analytics/page.tsx already handles them).
      const sb = supabase as unknown as {
        from: (t: string) => any;
      };

      const nowMs = Date.now();
      const since7 = new Date(nowMs - 7 * DAY_MS).toISOString();
      const nowIso = new Date(nowMs).toISOString();

      // ---- caqComplete: profiles.assessment_completed (default false) ----
      const caqComplete = await failOpen(async () => {
        const { data } = await sb
          .from('profiles')
          .select('assessment_completed')
          .eq('id', userId)
          .single();
        return data?.assessment_completed === true;
      }, false);

      // ---- hasProtocol: any current supplement (default false) ----
      const hasProtocol = await failOpen(async () => {
        const { data } = await sb
          .from('user_current_supplements')
          .select('id')
          .eq('user_id', userId)
          .eq('is_current', true)
          .limit(1);
        return Array.isArray(data) && data.length > 0;
      }, false);

      // ---- recentTrackingDays: distinct logging days in the last 7 (default 0) ----
      const recentTrackingDays = await failOpen(async () => {
        const dayKeys = new Set<string>();

        // Daily check-ins (the canonical engagement signal on this page).
        const checkins = await failOpen(async () => {
          const { data } = await sb
            .from('daily_checkins')
            .select('check_in_date')
            .eq('user_id', userId)
            .gte('check_in_date', since7.slice(0, 10));
          return (data ?? []) as { check_in_date: string | null }[];
        }, [] as { check_in_date: string | null }[]);
        for (const row of checkins) {
          if (row.check_in_date) dayKeys.add(row.check_in_date.slice(0, 10));
        }

        // Supplement check-offs as a second best-effort tracking source.
        const adherence = await failOpen(async () => {
          const { data } = await sb
            .from('protocol_adherence_log')
            .select('scheduled_date')
            .eq('user_id', userId)
            .eq('completed', true)
            .gte('scheduled_date', since7.slice(0, 10));
          return (data ?? []) as { scheduled_date: string | null }[];
        }, [] as { scheduled_date: string | null }[]);
        for (const row of adherence) {
          if (row.scheduled_date) dayKeys.add(row.scheduled_date.slice(0, 10));
        }

        return dayKeys.size;
      }, 0);

      // ---- streak: consecutive check-in days back from today (null when unknown) ----
      const currentStreak = await failOpen(async () => {
        const { data } = await sb
          .from('daily_checkins')
          .select('check_in_date')
          .eq('user_id', userId)
          .order('check_in_date', { ascending: false })
          .limit(365);
        const keys = new Set<string>(
          ((data ?? []) as { check_in_date: string | null }[])
            .map((r) => r.check_in_date)
            .filter((v): v is string => typeof v === 'string')
            .map((v) => v.slice(0, 10)),
        );
        return consecutiveStreak(keys);
      }, null as number | null);

      // ---- retest_schedule reads (owner-scoped RLS, browser client) ----
      // retestDue: any scheduled/due row whose window has elapsed (default false).
      const retestDue = await failOpen(async () => {
        const { data } = await sb
          .from('retest_schedule')
          .select('id')
          .eq('user_id', userId)
          .in('status', ['scheduled', 'due'])
          .lte('recommended_retest_at', nowIso)
          .limit(1);
        return Array.isArray(data) && data.length > 0;
      }, false);

      // retestsCompleted: count of completed cycles (default 0).
      const retestsCompleted = await failOpen(async () => {
        const { count } = await sb
          .from('retest_schedule')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'completed');
        return typeof count === 'number' && isFinite(count) ? count : 0;
      }, 0);

      // daysToNextMilestone: whole days until the soonest future re-test (null when none).
      const daysToNextMilestone = await failOpen(async () => {
        const { data } = await sb
          .from('retest_schedule')
          .select('recommended_retest_at')
          .eq('user_id', userId)
          .in('status', ['scheduled', 'due'])
          .gt('recommended_retest_at', nowIso)
          .order('recommended_retest_at', { ascending: true })
          .limit(1);
        const rows = (data ?? []) as { recommended_retest_at: string | null }[];
        const next = rows[0]?.recommended_retest_at;
        if (!next) return null;
        const ms = new Date(next).getTime() - nowMs;
        if (!isFinite(ms)) return null;
        return Math.max(0, Math.ceil(ms / DAY_MS));
      }, null as number | null);

      // ---- Defaulted signals (documented in the report) ----
      // adjustPending: no reliable client signal yet -> conservative false.
      // goals: no clean client source yet -> [].
      const nextSignals: JourneySignals = {
        caqComplete,
        hasProtocol,
        recentTrackingDays,
        retestDue,
        adjustPending: false,
        retestsCompleted,
        goals: [],
      };

      const nextMomentum: JourneyMomentum = {
        currentStreak,
        daysToNextMilestone,
      };

      // Ignore stale resolutions (userId changed or unmounted mid-flight).
      if (!active || requestRef.current !== requestId) return;
      setSignals(nextSignals);
      setMomentum(nextMomentum);
      setLoading(false);
    })().catch(() => {
      // Defensive: the body already swallows per-signal errors, but honour the
      // never-throws contract at the effect boundary too.
      if (!active || requestRef.current !== requestId) return;
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [userId]);

  const state = useMemo(() => deriveJourneyState(signals), [signals]);

  return { state, momentum, loading };
}
