'use client';

// Prompt #162 section 8.3: composes the full Daily Totals view.
// DateNavigator + (optional MacroIncompleteBanner) + 5 MetricProgressRow
// + (optional EmptyDayCta) + ProtocolTierChip.

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, Wheat, Droplet, Droplets, Cherry } from 'lucide-react';
import { DateNavigator } from './DateNavigator';
import { MetricProgressRow } from './MetricProgressRow';
import { MacroIncompleteBanner } from './MacroIncompleteBanner';
import { ProtocolTierChip } from './ProtocolTierChip';
import { EmptyDayCta } from './EmptyDayCta';

interface DailyTotalsPayload {
  readonly date: string;
  readonly totals: {
    readonly calories: number;
    readonly carbs_g: number;
    readonly bad_fat_g: number;
    readonly good_fat_g: number;
    readonly sugar_g: number;
  };
  readonly targets: {
    readonly calories: number;
    readonly carbs_g: number;
    readonly bad_fat_g: number;
    readonly good_fat_g: number;
    readonly sugar_g: number;
    readonly tier: 0 | 1 | 2 | 3;
    readonly confidence: number;
    readonly source: 'protocol_engine' | 'fallback';
  };
  readonly log_count: number;
  readonly has_quick_only: boolean;
}

interface DailyTotalsTabProps {
  readonly onGoToLog: () => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function DailyTotalsTab({ onGoToLog }: DailyTotalsTabProps) {
  const [date, setDate] = useState<string>(todayIso());
  const [data, setData] = useState<DailyTotalsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal: AbortSignal, isoDate: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/nutrition/daily-totals?date=${encodeURIComponent(isoDate)}`, {
        signal,
        cache: 'no-store',
      });
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({ error: 'Could not load totals' }));
        setError(msg);
        setData(null);
      } else {
        const payload = (await res.json()) as DailyTotalsPayload;
        setData(payload);
      }
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return;
      setError('Network error');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    void load(ctrl.signal, date);
    return () => ctrl.abort();
  }, [date, load]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-4"
    >
      <DateNavigator date={date} onChange={setDate} />

      {error && (
        <div className="rounded-xl border border-[#B75E18]/30 bg-[#B75E18]/10 p-3 text-xs text-white/75">
          {error}
        </div>
      )}

      {data?.has_quick_only && <MacroIncompleteBanner />}

      {loading && !data && (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[120px] animate-pulse rounded-2xl bg-white/[0.04]" />
          ))}
        </div>
      )}

      {data && (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.06 } },
          }}
          className="space-y-3"
        >
          {[
            { label: 'Calories', Icon: Flame,    actual: data.totals.calories,   target: data.targets.calories,   unit: 'kcal', direction: 'reach' as const },
            { label: 'Carbs',    Icon: Wheat,    actual: data.totals.carbs_g,    target: data.targets.carbs_g,    unit: 'g',    direction: 'reach' as const },
            { label: 'Bad Fat',  Icon: Droplet,  actual: data.totals.bad_fat_g,  target: data.targets.bad_fat_g,  unit: 'g',    direction: 'stay-under' as const },
            { label: 'Good Fat', Icon: Droplets, actual: data.totals.good_fat_g, target: data.targets.good_fat_g, unit: 'g',    direction: 'reach' as const },
            { label: 'Sugar',    Icon: Cherry,   actual: data.totals.sugar_g,    target: data.targets.sugar_g,    unit: 'g',    direction: 'stay-under' as const },
          ].map((row) => (
            <motion.div
              key={row.label}
              variants={{
                hidden: { opacity: 0, y: 8 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
              }}
            >
              <MetricProgressRow
                label={row.label}
                Icon={row.Icon}
                actual={row.actual}
                target={row.target}
                unit={row.unit}
                direction={row.direction}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {data && data.log_count === 0 && <EmptyDayCta onGoToLog={onGoToLog} />}

      {data && (
        <div className="flex justify-center pt-2">
          <ProtocolTierChip
            tier={data.targets.tier}
            confidence={data.targets.confidence}
            source={data.targets.source}
          />
        </div>
      )}
    </motion.div>
  );
}
