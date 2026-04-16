'use client';

// useTodaysAdherence — fetches today's protocol_adherence_log rows for the
// current user and exposes a toggle that writes/updates a row optimistically.
// On 100% daily completion, awards bonus Helix points via helix_transactions.

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

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
          await (supabase as any).from('helix_transactions').insert({
            user_id: userId,
            amount: POINTS_PER_CHECK,
            transaction_type: 'earn',
            source: 'protocol_adherence',
            description: `Checked off ${slug}`,
          }).then(() => {}, () => {});
        }

        // Bonus on full-day completion
        const completedNow = Object.entries({ ...entries, [k]: next }).filter(([, v]) => v).length;
        if (next && total > 0 && completedNow === total) {
          await (supabase as any).from('helix_transactions').insert({
            user_id: userId,
            amount: BONUS_FULL_DAY,
            transaction_type: 'earn',
            source: 'protocol_adherence_full_day',
            description: '100% daily protocol adherence bonus',
          }).then(() => {}, () => {});
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
