'use client';

// useResourceCardTrigger  gathers the signals the support resource card needs
// (Prompt #169b, Task 16, spec section 3.2.5) and returns them as the pure
// ResourceCardTriggerInput plus the user's resource-card persistence default.
//
// Reads (owner-scoped, browser client):
//   * profiles: biological_sex, date_of_birth, body_scan_de_response,
//     body_scan_resource_card_persistence (the seeded default).
//   * body_scan_composition joined via body_photo_sessions for this user's last
//     scans -> recent body-fat % series (oldest-first) for the rapid-loss
//     condition + the latest value for the clinical-threshold condition.
//   * recent scan attempts in the slow-down window -> the scan-frequency
//     condition (reuses the same 7-day attempt count BodyScanSlowDownBanner uses).
//
// The DECISION is the pure decideResourceCard; this hook is only the I/O that
// feeds it. Fail-safe: any read error yields an empty trigger (card hidden).

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { computeAgeYears, SLOW_DOWN_WINDOW_DAYS } from '@/lib/body-tracker/age-frequency-gate';
import {
  isDisorderedEatingResponse,
  type ResourceCardTriggerInput,
  type ResourceCardPersistence,
  type BiologicalSexForThreshold,
} from '@/lib/body-tracker/disordered-eating-safeguard';

export interface UseResourceCardTriggerResult {
  trigger: ResourceCardTriggerInput;
  persistence: ResourceCardPersistence;
  isLoading: boolean;
}

const EMPTY_TRIGGER: ResourceCardTriggerInput = {};

export function useResourceCardTrigger(userId: string | null): UseResourceCardTriggerResult {
  const [trigger, setTrigger] = useState<ResourceCardTriggerInput>(EMPTY_TRIGGER);
  const [persistence, setPersistence] = useState<ResourceCardPersistence>('none');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!userId) { setIsLoading(false); return; }
    (async () => {
      try {
        const supabase = createClient();

        // 1. Profile: sex, dob, DE response, resource-card persistence default.
        const { data: profile } = await (supabase as unknown as {
          from: (t: string) => {
            select: (c: string) => {
              eq: (col: string, val: string) => {
                maybeSingle: () => Promise<{ data: {
                  biological_sex?: string | null;
                  date_of_birth?: string | null;
                  body_scan_de_response?: string | null;
                  body_scan_resource_card_persistence?: string | null;
                } | null }>;
              };
            };
          };
        })
          .from('profiles')
          .select('biological_sex, date_of_birth, body_scan_de_response, body_scan_resource_card_persistence')
          .eq('id', userId)
          .maybeSingle();

        const sexRaw = profile?.biological_sex;
        const sex: BiologicalSexForThreshold | null =
          sexRaw === 'male' || sexRaw === 'female' ? sexRaw : null;
        const ageYears = computeAgeYears(profile?.date_of_birth ?? null);
        const deResponse = isDisorderedEatingResponse(profile?.body_scan_de_response)
          ? profile?.body_scan_de_response
          : null;
        const persist = profile?.body_scan_resource_card_persistence;
        const resolvedPersistence: ResourceCardPersistence =
          persist === 'persistent' || persist === 'dismissible' || persist === 'none'
            ? persist
            : 'none';

        // 2. Recent body-fat % series (oldest-first) from body_scan_composition,
        //    joined through this user's sessions. We read the user's recent
        //    sessions, then the composition rows for them, ordered by date.
        const { data: sessions } = await (supabase as unknown as {
          from: (t: string) => {
            select: (c: string) => {
              eq: (col: string, val: string) => {
                order: (col: string, opts: { ascending: boolean }) => {
                  limit: (n: number) => Promise<{ data: Array<{ id: string; session_date: string | null }> | null }>;
                };
              };
            };
          };
        })
          .from('body_photo_sessions')
          .select('id, session_date')
          .eq('user_id', userId)
          .order('session_date', { ascending: true })
          .limit(10);

        const sessionIds = (sessions ?? []).map((s) => s.id);
        let recentBodyFat: Array<number | null> = [];
        let latestBodyFat: number | null = null;
        if (sessionIds.length > 0) {
          const { data: comps } = await (supabase as unknown as {
            from: (t: string) => {
              select: (c: string) => {
                in: (col: string, vals: string[]) => Promise<{ data: Array<{ session_id: string; body_fat_pct: number | null }> | null }>;
              };
            };
          })
            .from('body_scan_composition')
            .select('session_id, body_fat_pct')
            .in('session_id', sessionIds);

          // Order composition rows by their session's date (oldest-first).
          // Nulls are kept in place: the pure rapid-loss logic ignores them but
          // the array stays aligned to the oldest-first session order.
          const byId = new Map((comps ?? []).map((c) => [c.session_id, c.body_fat_pct]));
          recentBodyFat = sessionIds.map((id) => byId.get(id) ?? null);
          const withValues = recentBodyFat.filter((v): v is number => typeof v === 'number');
          latestBodyFat = withValues.length > 0 ? withValues[withValues.length - 1] : null;
        }

        // 3. Scan-frequency attempts in the slow-down window (7 days).
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - SLOW_DOWN_WINDOW_DAYS);
        const cutoffIso = cutoff.toISOString().slice(0, 10);
        const { data: attemptRows } = await (supabase as unknown as {
          from: (t: string) => {
            select: (c: string) => {
              eq: (col: string, val: string) => {
                gte: (col: string, val: string) => Promise<{ data: Array<{ session_date: string | null }> | null }>;
              };
            };
          };
        })
          .from('body_photo_sessions')
          .select('session_date')
          .eq('user_id', userId)
          .gte('session_date', cutoffIso);
        const attemptsInWindow = (attemptRows ?? []).length;

        if (cancelled) return;
        setPersistence(resolvedPersistence);
        setTrigger({
          recentBodyFatPctOldestFirst: recentBodyFat,
          scanFrequencyAttemptsInWindow: attemptsInWindow,
          latestBodyFatPct: latestBodyFat,
          sex,
          ageYears,
          disorderedEatingResponse: deResponse,
        });
      } catch {
        if (!cancelled) { setTrigger(EMPTY_TRIGGER); setPersistence('none'); }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  return { trigger, persistence, isLoading };
}
