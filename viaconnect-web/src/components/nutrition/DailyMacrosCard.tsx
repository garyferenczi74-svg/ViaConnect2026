'use client';

// Gary 2026-06-03: Daily Macros lifted out of DailyTotalsTab so it can mount
// directly under NutritionScoreCard at the top of the Nutrition page. Today's
// Meals stays in DailyTotalsTab at its prior location further down the page.
//
// Owns its own auth + meal + target fetches so the page can mount it without
// threading props. useUserMeals + useNutritionTargets are subscribe-style
// hooks; running them in two places on the same page is safe (both pick up
// the same realtime channel) and the duplicate GET is negligible.

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useUserMeals } from '@/hooks/useUserMeals';
import { useNutritionTargets } from '@/hooks/useNutritionTargets';
import { generateTargets } from '@/lib/gordon/generateTargets';
import { DailyMacroRings } from './DailyMacroRings';

export function DailyMacrosCard() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  // Prompt 175 audit (2026-06-05): includeLegacy was true but DailyMacroRings
  // filters qualityScore === null anyway (173b legacy exclusion). Drop the
  // extra fetch fan-out by passing false; net behavior is identical and
  // matches NutritionScoreCard.
  const { meals, loading } = useUserMeals(userId, { days: 7, includeLegacy: false });
  const { targets: prompt168Targets } = useNutritionTargets(userId);

  // USDA fallback when no nutrition_targets row exists yet (pre-CAQ); the
  // rings require a target to render percentages.
  const effectiveTargets = useMemo(() => (
    prompt168Targets
    ?? generateTargets({ caqSnapshot: null, bodySnapshot: null, bioOptDay: null, mealPatternHistory: null })
  ), [prompt168Targets]);

  if (loading && meals.length === 0) {
    return <div className="h-[140px] animate-pulse rounded-2xl bg-white/[0.04]" />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <DailyMacroRings meals={meals} targets={effectiveTargets} />
    </motion.div>
  );
}

export default DailyMacrosCard;
