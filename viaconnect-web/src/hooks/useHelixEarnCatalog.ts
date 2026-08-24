'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { reportSupabaseError } from '@/lib/utils/schema-drift';
import {
  mapActivityRows,
  mapEarningEvents,
  type HelixActivityView,
  type HelixEarningEventView,
} from '@/lib/helix/consumer-honesty';

export interface HelixEarnCatalog {
  loading: boolean;
  events: HelixEarningEventView[];
  activity: HelixActivityView[];
}

const EMPTY: HelixEarnCatalog = {
  loading: true,
  events: [],
  activity: [],
};

export function useHelixEarnCatalog(): HelixEarnCatalog {
  const [state, setState] = useState<HelixEarnCatalog>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const eventsRes = await supabase
          .from('helix_earning_event_types')
          .select('id, display_name, description, base_points, category, is_active')
          .eq('is_active', true)
          .order('base_points', { ascending: true });

        if (eventsRes.error) {
          reportSupabaseError('helix.earnCatalog.events', eventsRes.error, {
            table: 'helix_earning_event_types',
          });
        }

        let activity = mapActivityRows([]);
        if (user) {
          const activityRes = await supabase
            .from('helix_transactions')
            .select('id, description, amount, created_at, type')
            .eq('user_id', user.id)
            .eq('type', 'earn')
            .order('created_at', { ascending: false })
            .limit(8);
          if (activityRes.error) {
            reportSupabaseError('helix.earnCatalog.activity', activityRes.error, {
              table: 'helix_transactions',
            });
          } else {
            activity = mapActivityRows(activityRes.data);
          }
        }

        if (cancelled) return;
        setState({
          loading: false,
          events: mapEarningEvents(eventsRes.error ? [] : eventsRes.data),
          activity,
        });
      } catch {
        if (!cancelled) {
          setState({ ...EMPTY, loading: false });
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
