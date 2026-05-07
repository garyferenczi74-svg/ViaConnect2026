'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export type JourneyEventType =
  | 'journey_started'
  | 'journey_switched'
  | 'milestone_completed'
  | 'wearable_connected'
  | 'genex360_connected'
  | 'caq_completed'
  | 'supplement_added'
  | 'arnold_adjustment'
  | 'goal_reached';

export interface JourneyEvent {
  id: string;
  eventType: JourneyEventType;
  title: string;
  detail: string | null;
  occurredAt: string;
}

export interface UseUserJourneyEventsResult {
  events: JourneyEvent[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

interface EventRow {
  id: string;
  event_type: string;
  title: string;
  detail: string | null;
  occurred_at: string;
}

const ALLOWED: JourneyEventType[] = [
  'journey_started',
  'journey_switched',
  'milestone_completed',
  'wearable_connected',
  'genex360_connected',
  'caq_completed',
  'supplement_added',
  'arnold_adjustment',
  'goal_reached',
];

export function useUserJourneyEvents(
  userId: string | null,
  limit = 8,
): UseUserJourneyEventsResult {
  const [events, setEvents] = useState<JourneyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!userId) {
      setEvents([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const supabase = createClient();
        type Loose = {
          from: (t: string) => {
            select: (cols: string) => {
              eq: (col: string, val: string) => {
                order: (col: string, opts: { ascending: boolean }) => {
                  limit: (n: number) => Promise<{ data: EventRow[] | null; error: { message: string } | null }>;
                };
              };
            };
          };
        };
        const sb = supabase as unknown as Loose;
        const { data, error: dbErr } = await sb.from('body_tracker_journey_events')
          .select('id, event_type, title, detail, occurred_at')
          .eq('user_id', userId)
          .order('occurred_at', { ascending: false })
          .limit(limit);

        if (cancelled) return;
        if (dbErr) throw new Error(dbErr.message);

        const rows = (data ?? []).map((r) => ({
          id: r.id,
          eventType: (ALLOWED.includes(r.event_type as JourneyEventType)
            ? r.event_type
            : 'arnold_adjustment') as JourneyEventType,
          title: r.title,
          detail: r.detail,
          occurredAt: r.occurred_at,
        }));
        setEvents(rows);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setEvents([]);
        setError(e instanceof Error ? e.message : 'Failed to load journey events');
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [userId, limit, tick]);

  return { events, loading, error, refresh: () => setTick((t) => t + 1) };
}
