'use client';

// useTodaysAdherence - fetches today's protocol_adherence_log rows for the
// current user and exposes a toggle that writes/updates a row optimistically.
// On 100% daily completion, awards bonus Helix points via helix_transactions.

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { reportSupabaseError } from '@/lib/utils/schema-drift';

type SupabaseAny = ReturnType<typeof createClient>;

export interface AdherenceEntry {
  product_slug: string;
  time_of_day: string;
  completed: boolean;
}

interface UseTodaysAdherenceResult {
  loading: boolean;
  entries: Record<string, boolean>; // key: `${slug}:${timeOfDay}`
  toggle: (slug: string, timeOfDay: string, totalItems: number) => Promise<void>;
  completedCount: number;
  setTotalItems: (n: number) => void;
}

const today = () => new Date().toISOString().slice(0, 10);
const key = (slug: string, t: string) => `${slug}:${t}`;

const POINTS_PER_CHECK = 5;
const BONUS_FULL_DAY = 15;

// Prompt 210d P0-5: helix award insert payload, extracted into a pure builder
// so the live-shape test (src/lib/gamification/__tests__/live-shape.test.ts)
// can assert the keys match the live helix_transactions columns. The live
// column is `type` (CHECK admits 'earn'); the pre-210d key `transaction_type`
// does not exist live, so every award insert was silently rejected.
export interface HelixAwardPayload {
  user_id: string;
  amount: number;
  type: 'earn';
  source: string;
  description: string;
}

export function buildHelixAwardPayload(input: {
  userId: string;
  amount: number;
  source: string;
  description: string;
}): HelixAwardPayload {
  return {
    user_id: input.userId,
    amount: input.amount,
    type: 'earn',
    source: input.source,
    description: input.description,
  };
}

// Prompt 210d P0-5: award writes are best effort. Route failures through the
// P0-1 classifier so schema drift becomes a reason-tagged safeLog.error, but
// contain the deliberate strict-mode rethrow here: a failed award must never
// reach the outer catch and roll back the already-saved adherence upsert.
// This preserves the pre-210d control flow exactly (award failures were
// swallowed by .then(() => {}, () => {})); the drift log is emitted before
// the rethrow, so visibility is kept in every environment.
function reportHelixAwardError(error: unknown): void {
  try {
    reportSupabaseError('helix.award', error, { table: 'helix_transactions' });
  } catch {
    // Strict-mode rethrow stops here; the award stays non-blocking.
  }
}

const ADHERENCE_CHANNEL = 'adherence-sync';
const ADHERENCE_EVENT = 'adherence-changed';

export function useTodaysAdherence(): UseTodaysAdherenceResult {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<Record<string, boolean>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);

  // Fetch today's adherence from Supabase
  const fetchEntries = useCallback(async () => {
    const supabase: SupabaseAny = createClient();
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data, error } = await (supabase as any)
        .from('protocol_adherence_log')
        .select('product_slug, time_of_day, completed')
        .eq('user_id', user.id)
        .eq('scheduled_date', today());

      if (!error && Array.isArray(data)) {
        const map: Record<string, boolean> = {};
        data.forEach((row: AdherenceEntry) => {
          map[key(row.product_slug, row.time_of_day)] = row.completed;
        });
        setEntries(map);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  // Sync across tabs (BroadcastChannel) + same-tab instances (custom event)
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try { bc = new BroadcastChannel(ADHERENCE_CHANNEL); } catch {}

    const applySync = (updated: Record<string, boolean>) => setEntries(updated);

    const onBroadcast = (e: MessageEvent) => { if (e.data?.entries) applySync(e.data.entries); };
    const onCustom = (e: Event) => { const d = (e as CustomEvent).detail; if (d?.entries) applySync(d.entries); };
    const onVisible = () => { if (document.visibilityState === 'visible') fetchEntries(); };

    bc?.addEventListener('message', onBroadcast);
    window.addEventListener(ADHERENCE_EVENT, onCustom);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      bc?.removeEventListener('message', onBroadcast);
      bc?.close();
      window.removeEventListener(ADHERENCE_EVENT, onCustom);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [fetchEntries]);

  const toggle = useCallback(
    async (slug: string, timeOfDay: string, total: number) => {
      if (!userId) return;
      const k = key(slug, timeOfDay);
      const next = !entries[k];

      // Optimistic update + broadcast to other instances
      const updated = { ...entries, [k]: next };
      setEntries(updated);
      try { new BroadcastChannel(ADHERENCE_CHANNEL).postMessage({ entries: updated }); } catch {}
      window.dispatchEvent(new CustomEvent(ADHERENCE_EVENT, { detail: { entries: updated } }));

      const supabase: SupabaseAny = createClient();

      try {
        await (supabase as any)
          .from('protocol_adherence_log')
          .upsert(
            {
              user_id: userId,
              product_slug: slug,
              scheduled_date: today(),
              time_of_day: timeOfDay,
              completed: next,
              completed_at: next ? new Date().toISOString() : null,
              points_awarded: next ? POINTS_PER_CHECK : 0,
            },
            { onConflict: 'user_id,product_slug,scheduled_date,time_of_day' },
          );

        // Award per-check Helix points (best effort)
        if (next) {
          await (supabase as any).from('helix_transactions').insert(
            buildHelixAwardPayload({
              userId,
              amount: POINTS_PER_CHECK,
              source: 'protocol_adherence',
              description: `Checked off ${slug}`,
            }),
          ).then(
            (result: { error: unknown } | null) => {
              if (result?.error) reportHelixAwardError(result.error);
            },
            (error: unknown) => reportHelixAwardError(error),
          );
        }

        // Bonus on full-day completion
        const completedNow = Object.entries({ ...entries, [k]: next }).filter(([, v]) => v).length;
        if (next && total > 0 && completedNow === total) {
          await (supabase as any).from('helix_transactions').insert(
            buildHelixAwardPayload({
              userId,
              amount: BONUS_FULL_DAY,
              source: 'protocol_adherence_full_day',
              description: '100% daily protocol adherence bonus',
            }),
          ).then(
            (result: { error: unknown } | null) => {
              if (result?.error) reportHelixAwardError(result.error);
            },
            (error: unknown) => reportHelixAwardError(error),
          );
        }
      } catch (e) {
        // Roll back optimistic update on hard failure
        setEntries((prev) => ({ ...prev, [k]: !next }));
      }
    },
    [userId, entries],
  );

  const completedCount = Object.values(entries).filter(Boolean).length;

  return { loading, entries, toggle, completedCount, setTotalItems };
}
