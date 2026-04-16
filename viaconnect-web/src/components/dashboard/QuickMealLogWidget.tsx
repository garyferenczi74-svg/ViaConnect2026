'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Apple, Coffee, UtensilsCrossed, Cookie, Check, ChevronRight, ChevronDown,
  Beef, Wheat, Droplets, Candy, Loader2, Ban, Leaf, Plus, Minus, GlassWater,
} from 'lucide-react';
import Link from 'next/link';
import { CheckInSlider } from './CheckInSlider';
import { computeMealScore, mealScoreLabel, mealScoreColor } from '@/lib/scoring/mealQualityScore';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks';
type MacroField = 'protein' | 'carbs' | 'fat' | 'healthyFat' | 'sugar';

interface MacroValues { protein: number; carbs: number; fat: number; healthyFat: number; sugar: number; }

const DEFAULT_MACROS: MacroValues = { protein: 5, carbs: 5, fat: 5, healthyFat: 5, sugar: 3 };

const MEAL_TABS: { id: MealType; label: string; icon: React.ReactNode }[] = [
  { id: 'breakfast', label: 'Breakfast', icon: <Coffee className="h-4 w-4" strokeWidth={1.5} /> },
  { id: 'lunch', label: 'Lunch', icon: <UtensilsCrossed className="h-4 w-4" strokeWidth={1.5} /> },
  { id: 'dinner', label: 'Dinner', icon: <UtensilsCrossed className="h-4 w-4" strokeWidth={1.5} /> },
  { id: 'snacks', label: 'Snacks', icon: <Cookie className="h-4 w-4" strokeWidth={1.5} /> },
];

interface QuickMealLogWidgetProps {
  hideHeader?: boolean;
  onSaved?: () => void;
}

export function QuickMealLogWidget({ hideHeader = false, onSaved }: QuickMealLogWidgetProps = {}) {
  const [activeTab, setActiveTab] = useState<MealType | null>(null);
  const [macros, setMacros] = useState<Record<MealType, MacroValues>>({
    breakfast: { ...DEFAULT_MACROS },
    lunch: { ...DEFAULT_MACROS },
    dinner: { ...DEFAULT_MACROS },
    snacks: { ...DEFAULT_MACROS },
  });
  const [expandedMacro, setExpandedMacro] = useState<MacroField | null>(null);
  const [savedMeals, setSavedMeals] = useState<Set<MealType>>(new Set());
  const [skippedMeals, setSkippedMeals] = useState<Set<MealType>>(new Set());
  const [saving, setSaving] = useState(false);
  const [waterGlasses, setWaterGlasses] = useState(0);
  const [waterSaved, setWaterSaved] = useState(false);
  const [waterSaving, setWaterSaving] = useState(false);

  const loadFromDb = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const today = new Date().toISOString().split('T')[0];

      // Prompt #84: Read meal state from meal_logs (independent data stream).
      // Fallback to daily_checkins for backward compat with pre-#84 data.
      const [mealsRes, checkinRes] = await Promise.all([
        (supabase as any)
          .from('meal_logs')
          .select('*')
          .eq('user_id', user.id)
          .eq('meal_date', today)
          .in('meal_type', ['breakfast', 'lunch', 'dinner', 'snack']),
        (supabase as any)
          .from('daily_checkins')
          .select('breakfast_protein, breakfast_carbs, breakfast_fat, breakfast_healthy_fat, breakfast_sugar, breakfast_score, breakfast_skipped, lunch_protein, lunch_carbs, lunch_fat, lunch_healthy_fat, lunch_sugar, lunch_score, lunch_skipped, dinner_protein, dinner_carbs, dinner_fat, dinner_healthy_fat, dinner_sugar, dinner_score, dinner_skipped, snacks_protein, snacks_carbs, snacks_fat, snacks_healthy_fat, snacks_sugar, snacks_score, snacks_skipped, hydration_glasses')
          .eq('user_id', user.id)
          .eq('check_in_date', today)
          .maybeSingle(),
      ]);

      const saved = new Set<MealType>();
      const skipped = new Set<MealType>();
      const newMacros = { ...macros };

      // Primary source: meal_logs (new path)
      const meals = mealsRes.data ?? [];
      for (const m of meals) {
        const tab: MealType = m.meal_type === 'snack' ? 'snacks' : m.meal_type;
        saved.add(tab);
        if (m.macro_sliders) {
          const sl = typeof m.macro_sliders === 'string' ? JSON.parse(m.macro_sliders) : m.macro_sliders;
          newMacros[tab] = {
            protein: sl.protein ?? 5,
            carbs: sl.carbs ?? 5,
            fat: sl.fat ?? 5,
            healthyFat: sl.healthyFat ?? 5,
            sugar: sl.sugar ?? 3,
          };
        }
      }

      // Fallback: daily_checkins (pre-#84 data that hasn't been re-saved yet)
      const data = checkinRes.data;
      if (data) {
        const fallbackTabs: MealType[] = ['breakfast', 'lunch', 'dinner', 'snacks'];
        for (const tab of fallbackTabs) {
          // Only use daily_checkins if meal_logs didn't have this meal
          if (!saved.has(tab) && data[`${tab}_score`] != null) {
            saved.add(tab);
            newMacros[tab] = {
              protein: data[`${tab}_protein`] ?? 5,
              carbs: data[`${tab}_carbs`] ?? 5,
              fat: data[`${tab}_fat`] ?? 5,
              healthyFat: data[`${tab}_healthy_fat`] ?? 5,
              sugar: data[`${tab}_sugar`] ?? 3,
            };
          }
          if (data[`${tab}_skipped`]) skipped.add(tab);
        }

        if (data.hydration_glasses != null) {
          setWaterGlasses(data.hydration_glasses);
          setWaterSaved(true);
        }
      }

      setMacros(newMacros);
      setSavedMeals(saved);
      setSkippedMeals(skipped);
    } catch { /* tables may not have columns yet */ }
  }, []);

  // Initial load + cross-instance sync: any meal-logged event from the
  // dashboard or the nutrition page reloads this widget's state so both
  // surfaces always reflect the same saved meals.
  useEffect(() => { loadFromDb(); }, [loadFromDb]);
  useEffect(() => {
    const onMeal = () => loadFromDb();
    window.addEventListener('meal-logged', onMeal);
    return () => window.removeEventListener('meal-logged', onMeal);
  }, [loadFromDb]);

  // Reset expanded accordion when tab changes
  useEffect(() => { setExpandedMacro(null); }, [activeTab]);

  const setMacroValue = useCallback((meal: MealType, field: MacroField, value: number) => {
    setMacros((prev) => ({ ...prev, [meal]: { ...prev[meal], [field]: value } }));
  }, []);

  const current = activeTab ? macros[activeTab] : null;
  const qualityScore = current
    ? computeMealScore(current.protein, current.carbs, current.fat, current.sugar, current.healthyFat)
    : 0;

  const handleSave = useCallback(async () => {
    if (saving || !activeTab) return;
    setSaving(true);
    const meal = activeTab;
    const m = macros[meal];
    const score = computeMealScore(m.protein, m.carbs, m.fat, m.sugar, m.healthyFat);
    const qualityRating = score >= 75 ? 4 : score >= 50 ? 3 : score >= 25 ? 2 : 1;
    const mealType = meal === 'snacks' ? 'snack' : meal;

    // Dispatch first so gauge updates even if DB fails
    try {
      window.dispatchEvent(new CustomEvent('meal-logged', {
        detail: { meal_type: mealType, quality_rating: qualityRating, meal_score: score, log_method: 'quick' },
      }));
    } catch {}
    setSavedMeals((prev) => new Set(prev).add(meal));
    setSkippedMeals((prev) => {
      if (!prev.has(meal)) return prev;
      const next = new Set(prev);
      next.delete(meal);
      return next;
    });

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSaving(false); return; }
      const today = new Date().toISOString().split('T')[0];

      // Prompt #84: Write meal data ONLY to meal_logs (never daily_checkins).
      // meal_logs and daily_checkins are independent data streams — a partial
      // upsert to daily_checkins would null out check-in columns (sleep, etc.).
      await (supabase as any).from('meal_logs').upsert({
        user_id: user.id,
        meal_type: mealType,
        log_method: 'quick',
        quality_rating: qualityRating,
        meal_score: score,
        macro_sliders: { protein: m.protein, carbs: m.carbs, fat: m.fat, healthyFat: m.healthyFat, sugar: m.sugar },
        meal_date: today,
      }, { onConflict: 'user_id,meal_type,meal_date' });

      // Fire-and-forget: update ONLY the nutrition gauge in daily_scores.
      // Check-in gauges (sleep, exercise, stress, etc.) are untouched.
      void import('@/app/actions/dailyScores')
        .then(({ recalculateNutritionOnly }) => recalculateNutritionOnly(user.id, today))
        .catch((err) => console.error('[QuickMealLogWidget] nutrition recalc failed', err));
    } catch { /* tables may not have new columns yet */ }
    finally {
      setSaving(false);
      setActiveTab(null);
      setExpandedMacro(null);
      onSaved?.();
    }
  }, [activeTab, macros, saving, onSaved]);

  const handleSkip = useCallback(async () => {
    if (saving || !activeTab) return;
    setSaving(true);
    const meal = activeTab;
    const mealType = meal === 'snacks' ? 'snack' : meal;

    setSkippedMeals((prev) => new Set(prev).add(meal));
    setSavedMeals((prev) => {
      if (!prev.has(meal)) return prev;
      const next = new Set(prev);
      next.delete(meal);
      return next;
    });
    try {
      window.dispatchEvent(new CustomEvent('meal-logged', {
        detail: { meal_type: mealType, skipped: true, log_method: 'quick' },
      }));
    } catch {}

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSaving(false); return; }
      const today = new Date().toISOString().split('T')[0];

      // Prompt #84: Only touch meal_logs — never write to daily_checkins from
      // the meal widget. Remove the meal entry so nutrition gauge drops it.
      await (supabase as any)
        .from('meal_logs')
        .delete()
        .eq('user_id', user.id)
        .eq('meal_date', today)
        .eq('meal_type', mealType);

      // Fire-and-forget: recalculate nutrition without this meal
      void import('@/app/actions/dailyScores')
        .then(({ recalculateNutritionOnly }) => recalculateNutritionOnly(user.id, today))
        .catch((err) => console.error('[QuickMealLogWidget:skip] nutrition recalc failed', err));
    } catch { /* table may not exist yet */ }
    finally {
      setSaving(false);
      setActiveTab(null);
      setExpandedMacro(null);
      onSaved?.();
    }
  }, [activeTab, saving, onSaved]);

  const handleWaterSave = useCallback(async (glasses: number) => {
    if (waterSaving) return;
    setWaterSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setWaterSaving(false); return; }
      const today = new Date().toISOString().split('T')[0];

      // Prompt #84: Hydration is a daily_checkins field. Use fetch-merge-upsert
      // so that a partial payload does not null out check-in columns.
      const { data: existing } = await (supabase as any)
        .from('daily_checkins')
        .select('*')
        .eq('user_id', user.id)
        .eq('check_in_date', today)
        .maybeSingle();

      await (supabase as any).from('daily_checkins').upsert({
        ...(existing ?? {}),
        user_id: user.id,
        check_in_date: today,
        hydration_glasses: glasses,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,check_in_date' });

      setWaterSaved(true);
    } catch { /* column may not exist yet */ }
    finally { setWaterSaving(false); }
  }, [waterSaving]);

  const adjustWater = useCallback((delta: number) => {
    setWaterGlasses((prev) => {
      const next = Math.max(0, Math.min(20, prev + delta));
      void handleWaterSave(next);
      return next;
    });
  }, [handleWaterSave]);

  const loggedCount = savedMeals.size + skippedMeals.size;

  return (
    <div className={hideHeader ? '' : 'rounded-xl border border-white/10 bg-[#1E3054]/60 backdrop-blur-md p-4'}>
      {!hideHeader && (
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Apple className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
            <h3 className="text-sm font-semibold text-white">Meal Log</h3>
            <span className="text-xs text-white/40">{loggedCount}/4</span>
          </div>
          <Link
            href="/nutrition"
            className="group relative flex flex-shrink-0 items-center gap-1.5 overflow-hidden rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white transition-all hover:shadow-[0_0_16px_rgba(45,165,160,0.35)] active:scale-[0.97]"
            style={{ background: 'linear-gradient(135deg, #2DA5A0 0%, #1E3054 100%)' }}
          >
            <span className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <span className="relative">Full Nutritional Logger</span>
            <ChevronRight className="relative h-3 w-3" strokeWidth={2} />
          </Link>
        </div>
      )}

      {/* Meal type tabs (unchanged layout pattern) */}
      <div className="grid grid-cols-4 gap-2">
        {MEAL_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const isSaved = savedMeals.has(tab.id);
          const isSkipped = skippedMeals.has(tab.id);
          const iconColor = isActive
            ? 'text-[#2DA5A0]'
            : isSaved
              ? 'text-[#22C55E]'
              : isSkipped
                ? 'text-white/40'
                : 'text-white/50';
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(isActive ? null : tab.id)}
              className={`flex flex-col items-center gap-1.5 rounded-lg py-3 transition-all ${
                isActive
                  ? 'border border-[#2DA5A0]/40 bg-[#2DA5A0]/15'
                  : isSaved
                    ? 'border border-[#22C55E]/30 bg-[#22C55E]/10'
                    : isSkipped
                      ? 'border border-white/10 bg-white/[0.03]'
                      : 'border border-transparent bg-white/[0.04] hover:bg-white/[0.08]'
              }`}
            >
              <span className={iconColor}>
                {!isActive && isSaved ? (
                  <Check className="h-4 w-4" strokeWidth={1.5} />
                ) : !isActive && isSkipped ? (
                  <Ban className="h-4 w-4" strokeWidth={1.5} />
                ) : (
                  tab.icon
                )}
              </span>
              <span className={`text-xs ${iconColor} ${isActive || isSaved ? 'font-medium' : ''}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Water intake tracker */}
      <div className="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: 'rgba(45,165,160,0.15)' }}>
            <GlassWater className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-xs font-medium text-white">Water</p>
            <p className="text-[10px] text-white/40">{waterGlasses} of 8 glasses</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Visual pip bar */}
          <div className="hidden sm:flex items-center gap-0.5">
            {Array.from({ length: 8 }, (_, i) => (
              <div
                key={i}
                className="h-4 w-1.5 rounded-full transition-colors"
                style={{
                  backgroundColor: i < waterGlasses ? '#2DA5A0' : 'rgba(255,255,255,0.06)',
                  boxShadow: i < waterGlasses ? '0 0 6px rgba(45,165,160,0.4)' : 'none',
                }}
              />
            ))}
          </div>

          <button
            onClick={() => adjustWater(-1)}
            disabled={waterGlasses <= 0 || waterSaving}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/60 transition-colors hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Minus className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>

          <span className="w-6 text-center text-sm font-bold tabular-nums text-[#2DA5A0]">{waterGlasses}</span>

          <button
            onClick={() => adjustWater(1)}
            disabled={waterGlasses >= 20 || waterSaving}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2DA5A0]/30 bg-[#2DA5A0]/15 text-[#2DA5A0] transition-colors hover:bg-[#2DA5A0]/25 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>

          {waterSaved && !waterSaving && (
            <Check className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />
          )}
        </div>
      </div>

      {/* Active tab content: meal quality score + macro accordions + save */}
      <AnimatePresence initial={false}>
        {activeTab && current && (() => {
          const meal: MealType = activeTab;
          return (
          <motion.div
            key={`panel-${meal}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
      <div className="mt-4">
        {/* Meal Quality Score */}
        <div className="mb-3 flex items-center justify-between px-1">
          <span className="text-[10px] uppercase tracking-wider text-white/50">Meal Quality</span>
          <motion.span
            key={`${meal}-${qualityScore}`}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="text-sm font-bold"
            style={{ color: mealScoreColor(qualityScore) }}
          >
            {qualityScore} — {mealScoreLabel(qualityScore)}
          </motion.span>
        </div>

        {/* Macro accordion rows */}
        <div className="flex flex-col gap-1">
          <MacroAccordionRow
            id="protein" label="Protein"
            icon={<Beef className="h-4 w-4" strokeWidth={1.5} />}
            value={current.protein}
            onChange={(v) => setMacroValue(meal,'protein', v)}
            accentColor="#2DA5A0"
            isExpanded={expandedMacro === 'protein'}
            onToggle={() => setExpandedMacro((p) => (p === 'protein' ? null : 'protein'))}
          />
          <MacroAccordionRow
            id="carbs" label="Carbs"
            icon={<Wheat className="h-4 w-4" strokeWidth={1.5} />}
            value={current.carbs}
            onChange={(v) => setMacroValue(meal,'carbs', v)}
            accentColor="#B75E18"
            isExpanded={expandedMacro === 'carbs'}
            onToggle={() => setExpandedMacro((p) => (p === 'carbs' ? null : 'carbs'))}
          />
          <MacroAccordionRow
            id="fat" label="Fat"
            icon={<Droplets className="h-4 w-4" strokeWidth={1.5} />}
            value={current.fat}
            onChange={(v) => setMacroValue(meal,'fat', v)}
            accentColor="#6366F1"
            isExpanded={expandedMacro === 'fat'}
            onToggle={() => setExpandedMacro((p) => (p === 'fat' ? null : 'fat'))}
          />
          <MacroAccordionRow
            id="healthyFat" label="Healthy Fat"
            icon={<Leaf className="h-4 w-4" strokeWidth={1.5} />}
            value={current.healthyFat}
            onChange={(v) => setMacroValue(meal,'healthyFat', v)}
            accentColor="#22C55E"
            isExpanded={expandedMacro === 'healthyFat'}
            onToggle={() => setExpandedMacro((p) => (p === 'healthyFat' ? null : 'healthyFat'))}
          />
          <MacroAccordionRow
            id="sugar" label="Sugar"
            icon={<Candy className="h-4 w-4" strokeWidth={1.5} />}
            value={current.sugar}
            onChange={(v) => setMacroValue(meal,'sugar', v)}
            accentColor="#EF4444"
            isExpanded={expandedMacro === 'sugar'}
            onToggle={() => setExpandedMacro((p) => (p === 'sugar' ? null : 'sugar'))}
          />
        </div>

        {/* Skip button — marks the meal as skipped for today so it does
            not count against the nutrition score. */}
        <button
          onClick={handleSkip}
          disabled={saving}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/60 transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {skippedMeals.has(meal) ? (
            <Ban className="h-4 w-4" strokeWidth={1.5} />
          ) : null}
          {skippedMeals.has(meal) ? `Skipped ${MEAL_TABS.find((t) => t.id === meal)?.label}` : `No ${MEAL_TABS.find((t) => t.id === meal)?.label}`}
        </button>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/15 px-4 py-2 text-sm font-medium text-[#2DA5A0] transition-colors hover:bg-[#2DA5A0]/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
          ) : savedMeals.has(meal) ? (
            <Check className="h-4 w-4" strokeWidth={1.5} />
          ) : null}
          {saving ? 'Saving...' : savedMeals.has(meal) ? `Update ${MEAL_TABS.find((t) => t.id === meal)?.label}` : `Save ${MEAL_TABS.find((t) => t.id === meal)?.label}`}
        </button>
      </div>
          </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}

interface MacroAccordionRowProps {
  id: MacroField;
  label: string;
  icon: React.ReactNode;
  value: number;
  onChange: (v: number) => void;
  accentColor: string;
  isExpanded: boolean;
  onToggle: () => void;
}

function MacroAccordionRow({ id, label, icon, value, onChange, accentColor, isExpanded, onToggle }: MacroAccordionRowProps) {
  const pips = Array.from({ length: 10 }, (_, i) => i + 1);
  return (
    <div className="overflow-hidden rounded-xl">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-150 hover:bg-white/[0.04]"
      >
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${accentColor}20` }}
        >
          <span style={{ color: accentColor }}>{icon}</span>
        </div>
        <span className="flex-1 text-left text-sm text-white/70">{label}</span>
        <div className="flex shrink-0 items-center gap-0.5">
          {pips.map((pip) => (
            <div
              key={pip}
              className="h-3 w-1.5 rounded-sm transition-all duration-200"
              style={{ backgroundColor: pip <= value ? accentColor : 'rgba(255,255,255,0.10)' }}
            />
          ))}
        </div>
        <span
          className="min-w-[1.5rem] shrink-0 text-right text-sm font-semibold tabular-nums"
          style={{ color: accentColor }}
        >
          {value}
        </span>
        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }} className="shrink-0">
          <ChevronDown className="h-4 w-4 text-white/30" strokeWidth={1.5} />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key={`${id}-panel`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1">
              <CheckInSlider
                id={`meal-${id}`}
                title=""
                min={1}
                max={10}
                step={1}
                value={value}
                onChange={onChange}
                formatLabel={(v) => `${v} / 10`}
                leftLabel="Very Low"
                rightLabel="Very High"
                accentColor={accentColor}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
