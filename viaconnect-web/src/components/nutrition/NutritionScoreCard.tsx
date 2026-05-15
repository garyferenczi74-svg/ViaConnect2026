'use client';

// Prompt #168c section 2.7: Nutrition Score card on the Nutrition page top.
// Horizontal progress bar replaced with NutritionScoreCircleGauge. Score now
// computes from the canonical meals table (qualityScore + optional glucose
// response adjustment) instead of the legacy meal_logs table's quality_rating.

import { useEffect, useMemo, useState } from 'react';
import { Apple } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useUserMeals } from '@/hooks/useUserMeals';
import { NutritionScoreCircleGauge } from './NutritionScoreCircleGauge';

interface NutritionScoreCardProps {
  // Optional. If not passed, the component fetches its own user.
  readonly userId?: string | null;
}

function localDateKey(iso: string, timezone: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: timezone,
    }).format(d);
  } catch {
    return '';
  }
}

export function NutritionScoreCard({ userId: propUserId }: NutritionScoreCardProps = {}) {
  const [internalUserId, setInternalUserId] = useState<string | null>(propUserId ?? null);

  useEffect(() => {
    if (propUserId !== undefined) return;
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setInternalUserId(data.user?.id ?? null);
    });
  }, [propUserId]);

  const userId = propUserId ?? internalUserId;
  const { meals } = useUserMeals(userId, { days: 1, includeLegacy: false });

  const tz = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    [],
  );

  const computed = useMemo(() => {
    const todayKey = localDateKey(new Date().toISOString(), tz);
    if (!todayKey) return { score: 0, count: 0 };

    let count = 0;
    let sum = 0;
    for (const m of meals) {
      if (localDateKey(m.loggedAt, tz) !== todayKey) continue;
      count += 1;
      if (m.qualityScore === null || m.qualityScore === undefined) continue;
      // Spec section 2.7: aggregate excludes legacy meals (qualityScore null);
      // glucose_response_adjustment is a 168a addition deferred there.
      const adjusted = Math.max(0, Math.min(100, Number(m.qualityScore)));
      sum += adjusted;
    }

    const scoredCount = meals.filter(
      (m) => localDateKey(m.loggedAt, tz) === todayKey && m.qualityScore !== null,
    ).length;
    const score = scoredCount > 0 ? Math.round(sum / scoredCount) : 0;
    return { score, count };
  }, [meals, tz]);

  return (
    <div className="rounded-xl border border-white/10 bg-[#1E3054]/35 backdrop-blur-md p-5">
      <div className="mb-4 flex items-center gap-2">
        <Apple className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
        <h2 className="text-base font-bold text-white">Nutrition Score</h2>
      </div>
      <NutritionScoreCircleGauge
        score={computed.score}
        mealCount={computed.count}
        emptyStateLabel={`Based on ${computed.count} meals logged today`}
      />
    </div>
  );
}
