'use client';

// Prompt #168c section 2.6: Daily Totals tab inside the Nutrition section.
//
// Gary 2026-06-03: DailyMacroRings lifted into the new DailyMacrosCard
// mounted directly under NutritionScoreCard at the top of the Nutrition
// page. This wrapper now renders Today's Meals only (which includes the
// Hydration accordion as the 5th section).
//
// Supersedes the prior #162 MetricProgressRow implementation per #168c spec.
// onGoToLog prop preserved for the empty state CTA so the existing tab strip
// caller does not need to change its prop signature.

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useUserMeals } from '@/hooks/useUserMeals';
import { TodaysMealsSummary } from './TodaysMealsSummary';

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

  if (loading && meals.length === 0) {
    return <div className="h-[140px] animate-pulse rounded-2xl bg-white/[0.04]" />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <TodaysMealsSummary meals={meals} />
    </motion.div>
  );
}

export default DailyTotalsTab;
