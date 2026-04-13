'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Check } from 'lucide-react';

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;
const QUALITY = ['Poor', 'OK', 'Good', 'Great'] as const;
const QUALITY_SCORES = [1, 2, 3, 4];

export function QuickMealLog() {
  const [mealType, setMealType] = useState<string | null>(null);
  const [quality, setQuality] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = useCallback(async () => {
    if (!mealType || quality === null || loading) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await (supabase as any).from('meal_logs').insert({
        user_id: user.id,
        meal_type: mealType.toLowerCase(),
        log_method: 'quick',
        quality_rating: quality,
        meal_date: new Date().toISOString().split('T')[0],
      });

      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setMealType(null);
        setQuality(null);
      }, 2000);
    } catch { /* table may not exist yet */ }
    finally { setLoading(false); }
  }, [mealType, quality, loading]);

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs text-white/50">What meal?</p>
        <div className="flex flex-wrap gap-1.5">
          {MEAL_TYPES.map((m) => (
            <button
              key={m}
              onClick={() => setMealType(m)}
              className={`min-h-[32px] rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all ${
                mealType === m
                  ? 'border border-[#B75E18]/40 bg-[#B75E18]/20 text-[#B75E18]'
                  : 'border border-white/[0.06] bg-white/[0.04] text-white/50 hover:bg-white/[0.08]'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {mealType && (
        <div>
          <p className="mb-2 text-xs text-white/50">How was it?</p>
          <div className="flex flex-wrap gap-1.5">
            {QUALITY.map((q, i) => (
              <button
                key={q}
                onClick={() => setQuality(QUALITY_SCORES[i])}
                className={`min-h-[32px] rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all ${
                  quality === QUALITY_SCORES[i]
                    ? 'border border-[#2DA5A0]/40 bg-[#2DA5A0]/20 text-[#2DA5A0]'
                    : 'border border-white/[0.06] bg-white/[0.04] text-white/50 hover:bg-white/[0.08]'
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {mealType && quality !== null && (
        <button
          onClick={handleSave}
          disabled={loading || saved}
          className="flex w-full min-h-[40px] items-center justify-center gap-2 rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/15 text-sm font-medium text-[#2DA5A0] transition-all hover:bg-[#2DA5A0]/25 disabled:opacity-50"
        >
          {saved ? (
            <>
              <Check className="h-4 w-4" strokeWidth={1.5} />
              Logged!
            </>
          ) : loading ? 'Saving...' : 'Log Meal'}
        </button>
      )}
    </div>
  );
}
