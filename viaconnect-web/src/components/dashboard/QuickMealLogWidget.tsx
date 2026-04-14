'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Apple, Coffee, UtensilsCrossed, Cookie, Check, ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

interface MealSlot {
  id: string;
  label: string;
  icon: React.ReactNode;
  logged: boolean;
}

const QUALITY_OPTIONS = ['Poor', 'OK', 'Good', 'Great'] as const;
const QUALITY_SCORES = [1, 2, 3, 4];

export function QuickMealLogWidget() {
  const [loggedMeals, setLoggedMeals] = useState<Set<string>>(new Set());
  const [activeMeal, setActiveMeal] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const today = new Date().toISOString().split('T')[0];
        const { data } = await (supabase as any)
          .from('meal_logs')
          .select('meal_type')
          .eq('user_id', user.id)
          .eq('meal_date', today);
        if (data) setLoggedMeals(new Set(data.map((r: { meal_type: string }) => r.meal_type)));
      } catch { /* table may not exist yet */ }
    })();
  }, []);

  const handleQuickLog = useCallback(async (mealType: string, qualityIdx: number) => {
    setSaving(true);
    const quality = QUALITY_SCORES[qualityIdx];

    // Update UI + dispatch BEFORE DB write so gauge updates even if
    // the meal_logs table doesn't exist yet or insert fails.
    setLoggedMeals((prev) => new Set(prev).add(mealType));
    setActiveMeal(null);
    try {
      window.dispatchEvent(new CustomEvent('meal-logged', {
        detail: { meal_type: mealType, quality_rating: quality, log_method: 'quick' },
      }));
    } catch {}

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSaving(false); return; }
      await (supabase as any).from('meal_logs').insert({
        user_id: user.id,
        meal_type: mealType,
        log_method: 'quick',
        quality_rating: quality,
        meal_date: new Date().toISOString().split('T')[0],
      });
    } catch { /* table may not exist yet */ }
    finally { setSaving(false); }
  }, []);

  const slots: MealSlot[] = [
    { id: 'breakfast', label: 'Breakfast', icon: <Coffee className="h-4 w-4" strokeWidth={1.5} />, logged: loggedMeals.has('breakfast') },
    { id: 'lunch', label: 'Lunch', icon: <UtensilsCrossed className="h-4 w-4" strokeWidth={1.5} />, logged: loggedMeals.has('lunch') },
    { id: 'dinner', label: 'Dinner', icon: <UtensilsCrossed className="h-4 w-4" strokeWidth={1.5} />, logged: loggedMeals.has('dinner') },
    { id: 'snack', label: 'Snack', icon: <Cookie className="h-4 w-4" strokeWidth={1.5} />, logged: loggedMeals.has('snack') },
  ];

  const loggedCount = slots.filter((s) => s.logged).length;

  return (
    <div className="rounded-xl border border-white/10 bg-[#1E3054]/60 backdrop-blur-md p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Apple className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
          <h3 className="text-sm font-semibold text-white">Quick Meal Log</h3>
          <span className="text-xs text-white/40">{loggedCount}/4</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {slots.map((slot) => {
          const isActive = activeMeal === slot.id;
          return (
            <button
              key={slot.id}
              onClick={() => {
                if (slot.logged) return;
                setActiveMeal(isActive ? null : slot.id);
              }}
              className={`flex flex-col items-center gap-1.5 rounded-lg py-3 transition-all ${
                slot.logged
                  ? 'border border-[#2DA5A0]/30 bg-[#2DA5A0]/20'
                  : isActive
                    ? 'border border-white/20 bg-white/10'
                    : 'border border-transparent bg-white/[0.04] hover:bg-white/[0.08]'
              }`}
            >
              <span className={slot.logged ? 'text-[#2DA5A0]' : 'text-white/50'}>
                {slot.logged ? <Check className="h-4 w-4" strokeWidth={1.5} /> : slot.icon}
              </span>
              <span className={`text-xs ${slot.logged ? 'text-[#2DA5A0]' : 'text-white/50'}`}>
                {slot.label}
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {activeMeal && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="mb-2 mt-3 text-xs text-white/50">How was it?</p>
            <div className="grid grid-cols-4 gap-2">
              {QUALITY_OPTIONS.map((q, i) => (
                <button
                  key={q}
                  onClick={() => handleQuickLog(activeMeal, i)}
                  disabled={saving}
                  className="rounded-lg bg-white/[0.04] py-2 text-xs font-medium text-white/60 transition-all hover:bg-[#2DA5A0]/20 hover:text-[#2DA5A0] disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Logger button */}
      <Link
        href="/nutrition"
        className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/15 px-4 py-2.5 text-sm font-medium text-[#2DA5A0] transition-all hover:border-[#2DA5A0]/50 hover:bg-[#2DA5A0]/25"
      >
        <Apple className="h-4 w-4" strokeWidth={1.5} />
        Full Nutrition Logger
        <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
      </Link>
    </div>
  );
}
