'use client';

import { useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Smartphone, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { APP_REGISTRY } from '@/lib/integrations/appRegistry';

interface Connection {
  id: string;
  source_id: string;
  source_name: string;
  last_sync_at: string | null;
}

interface SyncedMeal {
  id: string;
  meal_type: string | null;
  quality_rating: number | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  logged_at: string | null;
}

const NUTRITION_APP_IDS = APP_REGISTRY.filter((a) => a.category === 'nutrition').map((a) => a.id);

export function ConnectedAppMealDropdown() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [meals, setMeals] = useState<Record<string, SyncedMeal[]>>({});
  const [loadingApp, setLoadingApp] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await (supabase as any)
          .from('data_source_connections')
          .select('id, source_id, source_name, last_sync_at')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .in('source_id', NUTRITION_APP_IDS);

        if (data) setConnections(data);
      } catch { /* table may not exist */ }
    })();
  }, []);

  const loadMeals = useCallback(async (sourceId: string) => {
    if (meals[sourceId]) return;
    setLoadingApp(sourceId);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const today = new Date().toISOString().split('T')[0];

      const { data } = await (supabase as any)
        .from('meal_logs')
        .select('id, meal_type, quality_rating, calories, protein_g, carbs_g, fat_g, logged_at')
        .eq('user_id', user.id)
        .eq('source_app', sourceId)
        .eq('meal_date', today)
        .order('logged_at', { ascending: true });

      setMeals((prev) => ({ ...prev, [sourceId]: data ?? [] }));
    } catch {
      setMeals((prev) => ({ ...prev, [sourceId]: [] }));
    } finally {
      setLoadingApp(null);
    }
  }, [meals]);

  const handleToggle = useCallback((sourceId: string) => {
    const next = expanded === sourceId ? null : sourceId;
    setExpanded(next);
    if (next) loadMeals(next);
  }, [expanded, loadMeals]);

  if (connections.length === 0) {
    return (
      <Link
        href="/plugins/apps"
        className="group relative flex w-full items-center gap-2 overflow-hidden rounded-lg border border-[#B75E18]/30 bg-[#B75E18]/10 px-3 py-2 text-xs font-medium text-[#B75E18] transition-all hover:bg-[#B75E18]/20"
      >
        <Smartphone className="h-3.5 w-3.5" strokeWidth={1.5} />
        Connect a nutrition app
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {connections.map((conn) => {
        const isOpen = expanded === conn.source_id;
        const appMeals = meals[conn.source_id] ?? [];
        const loading = loadingApp === conn.source_id;
        return (
          <div key={conn.id} className="overflow-hidden rounded-lg border border-[#2DA5A0]/30 bg-[#2DA5A0]/[0.08]">
            <button
              onClick={() => handleToggle(conn.source_id)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-[#2DA5A0]/[0.14]"
            >
              <Smartphone className="h-3.5 w-3.5 text-[#2DA5A0]" strokeWidth={1.5} />
              <span className="flex-1 text-xs font-medium text-[#2DA5A0]">{conn.source_name}</span>
              <span className="text-[10px] uppercase tracking-wider text-[#2DA5A0]/60">Connected</span>
              <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="h-3.5 w-3.5 text-[#2DA5A0]" strokeWidth={1.5} />
              </motion.div>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                  className="overflow-hidden border-t border-[#2DA5A0]/20"
                >
                  <div className="p-3 text-xs">
                    {loading ? (
                      <div className="flex items-center gap-2 text-white/50">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                        Loading today&apos;s sync…
                      </div>
                    ) : appMeals.length === 0 ? (
                      <p className="text-white/40">No meals synced from {conn.source_name} today.</p>
                    ) : (
                      <ul className="flex flex-col gap-1.5">
                        {appMeals.map((m) => (
                          <li
                            key={m.id}
                            className="flex items-center justify-between rounded-md bg-white/[0.04] px-2.5 py-1.5"
                          >
                            <span className="capitalize text-white/80">{m.meal_type ?? 'Meal'}</span>
                            <span className="text-white/50">
                              {m.calories != null ? `${Math.round(m.calories)} kcal` : ''}
                              {m.protein_g != null ? ` · P ${Math.round(m.protein_g)}g` : ''}
                              {m.carbs_g != null ? ` · C ${Math.round(m.carbs_g)}g` : ''}
                              {m.fat_g != null ? ` · F ${Math.round(m.fat_g)}g` : ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {conn.last_sync_at && (
                      <p className="mt-2 text-[10px] text-white/30">
                        Last sync: {new Date(conn.last_sync_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
