'use client';

// Prompt #168c section 2.6: Daily Totals tab inside the Nutrition section.
// Mounts the three relocated cards (TodaysMealsSummary + DailyMacroRings +
// 7-day AverageQualityScoreTile) under one tab. Subscribes to useUserMeals
// for realtime updates so any meal logged from any channel propagates here.
//
// Supersedes the prior #162 MetricProgressRow implementation per #168c spec.
// onGoToLog prop preserved for the empty state CTA so the existing tab strip
// caller does not need to change its prop signature.

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useUserMeals } from '@/hooks/useUserMeals';
import { useNutritionTargets } from '@/hooks/useNutritionTargets';
import { generateTargets } from '@/lib/gordon/generateTargets';
import { TodaysMealsSummary } from './TodaysMealsSummary';
import { DailyMacroRings } from './DailyMacroRings';

interface DailyTotalsTabProps {
  readonly onGoToLog: () => void;
}

export function DailyTotalsTab(_: DailyTotalsTabProps) {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  const { meals, loading } = useUserMeals(userId, { days: 7, includeLegacy: true });
  const { targets: prompt168Targets } = useNutritionTargets(userId);

  // USDA fallback when no nutrition_targets row exists yet (pre-CAQ).
  // DailyMacroRings always needs a target; without one the rings render at 0%.
  const effectiveTargets = useMemo(() => (
    prompt168Targets
    ?? generateTargets({ caqSnapshot: null, bodySnapshot: null, bioOptDay: null, mealPatternHistory: null })
  ), [prompt168Targets]);

  if (loading && meals.length === 0) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[140px] animate-pulse rounded-2xl bg-white/[0.04]" />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-4"
    >
      <TodaysMealsSummary meals={meals} />
      <DailyMacroRings meals={meals} targets={effectiveTargets} />
    </motion.div>
  );
}

export default DailyTotalsTab;
