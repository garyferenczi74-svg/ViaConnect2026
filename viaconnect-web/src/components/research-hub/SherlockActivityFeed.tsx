'use client';

// SherlockActivityFeed — compact "Sherlock found N insights today" card.
// Shows daily totals (items / highly relevant / trends / alerts) plus a
// manual refresh button. Designed to slot into the Research Hub header
// area without restructuring the existing layout.

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Search, Sparkles, TrendingUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getDailySummary, triggerSherlockRun } from '@/lib/agents/sherlock/service';
import type { SherlockDailySummary } from '@/lib/agents/sherlock/types';

// Small count-up animation for the headline number
function useCountUp(target: number, duration = 800): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

export function SherlockActivityFeed() {
  const [summary, setSummary] = useState<SherlockDailySummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const s = await getDailySummary(user?.id ?? null);
      setSummary(s);
    } catch (e) {
      console.warn('[sherlock] summary load failed', e);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  const animatedTotal = useCountUp(summary?.items_discovered ?? 0);

  const handleRefresh = async () => {
    setRefreshing(true);
    setToast(null);
    const result = await triggerSherlockRun();
    setToast(result.message);
    await load();
    setRefreshing(false);
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-gradient-to-r from-[#1E3054] to-[#1A2744] p-3.5 sm:p-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Sherlock identity */}
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-[#2DA5A0]/30 bg-gradient-to-br from-[#1A2744] to-[#2DA5A0]">
          <Search className="h-[18px] w-[18px] text-white" strokeWidth={1.5} />
        </div>

        {/* Headline */}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#2DA5A0]">
            Sherlock · Research Agent
          </p>
          <p className="mt-0.5 text-sm font-bold text-white">
            <motion.span
              key={animatedTotal}
              initial={{ opacity: 0, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
            >
              found {animatedTotal}
            </motion.span>{' '}
            new insight{animatedTotal === 1 ? '' : 's'} today
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-white/45">
            {summary && summary.highly_relevant > 0 && (
              <span className="flex items-center gap-1">
                <Sparkles className="h-2.5 w-2.5 text-[#22C55E]" strokeWidth={2} />
                {summary.highly_relevant} highly relevant
              </span>
            )}
            {summary && summary.trends_detected > 0 && (
              <span className="flex items-center gap-1">
                <TrendingUp className="h-2.5 w-2.5 text-[#FBBF24]" strokeWidth={2} />
                {summary.trends_detected} trending topics
              </span>
            )}
            {summary && summary.alerts_generated > 0 && (
              <span>· {summary.alerts_generated} alert{summary.alerts_generated === 1 ? '' : 's'}</span>
            )}
          </div>
        </div>

        {/* Refresh */}
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex h-9 items-center gap-1.5 rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 px-3 text-[11px] font-medium text-[#2DA5A0] transition-all hover:border-[#2DA5A0]/50 hover:bg-[#2DA5A0]/20 disabled:opacity-60"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
            strokeWidth={1.5}
          />
          {refreshing ? 'Running…' : 'Refresh'}
        </button>
      </div>

      {toast && (
        <p className="mt-2 text-[10px] text-white/55">{toast}</p>
      )}
    </section>
  );
}
