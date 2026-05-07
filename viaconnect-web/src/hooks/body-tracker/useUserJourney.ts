'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export type JourneyType = 'weight_loss' | 'muscle_building';

export interface JourneyStartingSnapshot {
  weight_lbs?: number;
  body_fat_pct?: number;
  muscle_mass_lbs?: number;
  waist_in?: number;
  measured_at?: string;
}

export interface UserJourneyState {
  activeJourney: JourneyType | null;
  startedAt: string | null;
  startingSnapshot: JourneyStartingSnapshot;
  loading: boolean;
  error: string | null;
}

export interface UseUserJourneyResult extends UserJourneyState {
  setJourney: (journey: JourneyType, snapshot?: JourneyStartingSnapshot) => Promise<void>;
  refresh: () => void;
}

interface UserStateRow {
  active_journey: JourneyType | null;
  journey_started_at: string | null;
  journey_starting_snapshot: JourneyStartingSnapshot | null;
}

export function useUserJourney(userId: string | null): UseUserJourneyResult {
  const [state, setState] = useState<UserJourneyState>({
    activeJourney: null,
    startedAt: null,
    startingSnapshot: {},
    loading: true,
    error: null,
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!userId) {
      setState({ activeJourney: null, startedAt: null, startingSnapshot: {}, loading: false, error: null });
      return;
    }

    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));

    (async () => {
      try {
        const supabase = createClient();
        const { data, error: dbErr } = await (supabase as unknown as {
          from: (t: string) => {
            select: (cols: string) => {
              eq: (col: string, val: string) => {
                maybeSingle: () => Promise<{ data: UserStateRow | null; error: { message: string } | null }>;
              };
            };
          };
        })
          .from('body_tracker_user_state')
          .select('active_journey, journey_started_at, journey_starting_snapshot')
          .eq('user_id', userId)
          .maybeSingle();

        if (cancelled) return;
        if (dbErr) throw new Error(dbErr.message);

        setState({
          activeJourney: data?.active_journey ?? null,
          startedAt: data?.journey_started_at ?? null,
          startingSnapshot: data?.journey_starting_snapshot ?? {},
          loading: false,
          error: null,
        });
      } catch (e) {
        if (cancelled) return;
        setState({
          activeJourney: null,
          startedAt: null,
          startingSnapshot: {},
          loading: false,
          error: e instanceof Error ? e.message : 'Failed to load journey state',
        });
      }
    })();

    return () => { cancelled = true; };
  }, [userId, tick]);

  const setJourney = async (journey: JourneyType, snapshot?: JourneyStartingSnapshot) => {
    if (!userId) return;
    const supabase = createClient();
    const startedAt = new Date().toISOString();
    const finalSnapshot = snapshot ?? {};

    interface DbErr { message: string }
    interface InsertBuilder {
      select: (cols: string) => {
        single: () => Promise<{ data: { id: string } | null; error: DbErr | null }>;
      };
      then: <TResult1>(
        onfulfilled: (value: { error: DbErr | null }) => TResult1,
      ) => Promise<TResult1>;
    }
    type Loose = {
      from: (t: string) => {
        upsert: (p: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
        update: (p: Record<string, unknown>) => {
          eq: (c: string, v: string) => {
            eq: (c: string, v: boolean) => Promise<{ error: { message: string } | null }>;
          };
        };
        insert: (p: Record<string, unknown>) => InsertBuilder;
      };
    };
    const sb = supabase as unknown as Loose;

    const stateRes = await sb.from('body_tracker_user_state').upsert({
      user_id: userId,
      active_journey: journey,
      journey_started_at: startedAt,
      journey_starting_snapshot: finalSnapshot,
      updated_at: startedAt,
    });
    if (stateRes.error) {
      // user_state is the source of truth for active journey; bubble this up
      throw new Error(stateRes.error.message);
    }

    // End any prior active journey
    const hadPriorActive = state.activeJourney !== null && state.activeJourney !== undefined;
    const endRes = await sb.from('body_tracker_journeys')
      .update({ is_active: false, ended_at: startedAt })
      .eq('user_id', userId)
      .eq('is_active', true);
    if (endRes.error) {
      console.warn('[useUserJourney] failed to end prior journey:', endRes.error.message);
    }

    // Insert the new journey row and capture its id for the event log
    const newJourneyResult = await sb.from('body_tracker_journeys').insert({
      user_id: userId,
      journey_type: journey,
      started_at: startedAt,
      starting_snapshot: finalSnapshot,
      is_active: true,
    }).select('id').single();
    if (newJourneyResult.error) {
      throw new Error(newJourneyResult.error.message);
    }
    const newJourneyId = newJourneyResult.data?.id ?? null;

    // Record a Key Moments event so the JourneyTimeline picks it up.
    // Server-side trigger does NOT cover this case (journey_started/switched
    // requires the prior-active context that lives on the client), so this
    // client insert is the source of truth for journey events. Event failures
    // are non-fatal: the journey itself is already persisted.
    const journeyLabel = journey === 'weight_loss' ? 'Weight Loss' : 'Muscle Building';
    const eventRes = await sb.from('body_tracker_journey_events').insert({
      user_id: userId,
      journey_id: newJourneyId,
      event_type: hadPriorActive ? 'journey_switched' : 'journey_started',
      title: hadPriorActive
        ? `Switched to ${journeyLabel} journey`
        : `Started ${journeyLabel} journey`,
      occurred_at: startedAt,
      metadata: { journey_type: journey },
    });
    if (eventRes.error) {
      // Per Phase H Jeffery advisory: surface audit-log failures so a missing
      // Key Moment becomes observable instead of silently dropping
      console.warn('[useUserJourney] failed to record journey event:', eventRes.error.message);
    }

    setTick((t) => t + 1);
  };

  const refresh = () => setTick((t) => t + 1);

  return { ...state, setJourney, refresh };
}
