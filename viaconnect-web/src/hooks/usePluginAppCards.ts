/**
 * Prompt 218: client hook for plugin app cards (shared connectionState join).
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  loadPluginAppCards,
  type PluginAppCardModel,
} from '@/lib/integrations/connectionState';
import { safeLog } from '@/lib/utils/safe-log';

export function usePluginAppCards() {
  const [cards, setCards] = useState<PluginAppCardModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [stateOk, setStateOk] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const supabase = createClient();
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id ?? null;
        if (!active) return;
        setUserId(uid);
        const result = await loadPluginAppCards(supabase, uid);
        if (!active) return;
        setCards(result.cards);
        setStateOk(result.stateOk);
      } catch (error) {
        safeLog.warn('usePluginAppCards', 'load failed open', { error });
        if (!active) return;
        setStateOk(false);
        setCards([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [tick]);

  return { cards, loading, stateOk, userId, refresh };
}
