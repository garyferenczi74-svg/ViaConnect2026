'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Calendar } from 'lucide-react';

interface DayEntry {
  date: string;
  label: string;
  meals: Set<string>;
}

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];
const DOT_COLORS: Record<string, string> = {
  breakfast: '#FFB347',
  lunch: '#2DA5A0',
  dinner: '#B75E18',
  snack: '#7C6FE0',
};

export function MealHistory() {
  const [days, setDays] = useState<DayEntry[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        const from = sevenDaysAgo.toISOString().split('T')[0];

        const { data } = await (supabase as any)
          .from('meal_logs')
          .select('meal_type, meal_date')
          .eq('user_id', user.id)
          .gte('meal_date', from)
          .order('meal_date', { ascending: true });

        const byDate: Record<string, Set<string>> = {};
        (data ?? []).forEach((r: any) => {
          if (!byDate[r.meal_date]) byDate[r.meal_date] = new Set();
          byDate[r.meal_date].add(r.meal_type);
        });

        const entries: DayEntry[] = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          const iso = d.toISOString().split('T')[0];
          entries.push({
            date: iso,
            label: d.toLocaleDateString('en-US', { weekday: 'short' }),
            meals: byDate[iso] ?? new Set(),
          });
        }
        setDays(entries);
      } catch { /* table may not exist yet */ }
    })();
  }, []);

  if (days.length === 0) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-[#1E3054]/60 backdrop-blur-md p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <Calendar className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">
          7-Day Meal History
        </h3>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => (
          <div key={day.date} className="flex flex-col items-center gap-1.5">
            <span className="text-[10px] text-white/40">{day.label}</span>
            <div className="flex gap-0.5">
              {MEAL_TYPES.map((mt) => (
                <div
                  key={mt}
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: day.meals.has(mt) ? DOT_COLORS[mt] : 'rgba(255,255,255,0.08)',
                  }}
                />
              ))}
            </div>
            <span className="text-[9px] text-white/30">{day.meals.size}/4</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-3">
        {MEAL_TYPES.map((mt) => (
          <span key={mt} className="flex items-center gap-1 text-[10px] text-white/30">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: DOT_COLORS[mt] }} />
            {mt.charAt(0).toUpperCase() + mt.slice(1)}
          </span>
        ))}
      </div>
    </div>
  );
}
