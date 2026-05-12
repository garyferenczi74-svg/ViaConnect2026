'use client';

// Prompt #161: Quick Calories card form. Numeric calorie input + meal type
// pills + optional one-line note. Skips Claude analysis: writes directly to
// nutrition_logs with source='quick_calories', status='confirmed', macros
// null (unknown, not zero).

import { useMemo, useState } from 'react';
import { Flame, Sunrise, Sun, Moon, Apple } from 'lucide-react';
import { InlineEntryPanel } from '..';
import type { MealType } from '@/lib/nutrition/schema';

interface CaloriesQuickFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

const MEAL_OPTIONS: Array<{ value: MealType; label: string; Icon: typeof Sunrise }> = [
  { value: 'breakfast', label: 'Breakfast', Icon: Sunrise },
  { value: 'lunch',     label: 'Lunch',     Icon: Sun },
  { value: 'dinner',    label: 'Dinner',    Icon: Moon },
  { value: 'snack',     label: 'Snack',     Icon: Apple },
];

function defaultMealForHour(hour: number): MealType {
  if (hour >= 4 && hour < 10) return 'breakfast';
  if (hour >= 10 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 22) return 'dinner';
  return 'snack';
}

export function CaloriesQuickForm({ open, onOpenChange, onSaved }: CaloriesQuickFormProps) {
  const initialMeal = useMemo<MealType>(() => defaultMealForHour(new Date().getHours()), []);
  const [calories, setCalories] = useState<string>('');
  const [mealType, setMealType] = useState<MealType>(initialMeal);
  const [note, setNote] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numeric = Number.parseInt(calories, 10);
  const isValid = Number.isFinite(numeric) && numeric >= 1 && numeric <= 9999;

  function reset() {
    setCalories('');
    setMealType(defaultMealForHour(new Date().getHours()));
    setNote('');
    setError(null);
  }

  async function handleSave() {
    if (!isValid || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/nutrition/quick-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calories: numeric,
          mealType,
          note: note.trim() ? note.trim().slice(0, 80) : undefined,
          loggedAt: new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({ error: 'Save failed' }));
        setError(msg);
        setSaving(false);
        return;
      }
      reset();
      onOpenChange(false);
      onSaved?.();
    } catch {
      setError('Network error. Try again.');
      setSaving(false);
    }
  }

  function handleCaloriesChange(raw: string) {
    const stripped = raw.replace(/[^0-9]/g, '');
    if (stripped === '') {
      setCalories('');
      return;
    }
    const n = Math.min(9999, Math.max(0, Number.parseInt(stripped, 10)));
    setCalories(String(n));
  }

  return (
    <InlineEntryPanel
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
      title="Quick log calories"
      description="Fast number-only entry, no analysis"
    >
      <div className="space-y-5">
        <div>
          <label htmlFor="quick-calories-input" className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-white/45">
            Calories
          </label>
          <div className="flex items-center gap-3 rounded-xl border border-[#B75E18]/30 bg-[#B75E18]/5 px-4 py-3">
            <Flame className="h-5 w-5 flex-none text-[#B75E18]" strokeWidth={1.5} />
            <input
              id="quick-calories-input"
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              min={1}
              max={9999}
              autoFocus
              value={calories}
              onChange={(e) => handleCaloriesChange(e.target.value)}
              placeholder="0"
              className="w-full bg-transparent text-3xl font-semibold tabular-nums text-white placeholder:text-white/20 focus:outline-none"
            />
            <span className="text-xs text-white/40">kcal</span>
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/45">Meal type</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Meal type">
            {MEAL_OPTIONS.map(({ value, label, Icon }) => {
              const isActive = value === mealType;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => setMealType(value)}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all min-h-[44px] ${
                    isActive
                      ? 'border-[#2DA5A0]/60 bg-[#2DA5A0]/15 text-[#2DA5A0]'
                      : 'border-white/[0.08] bg-white/5 text-white/55 hover:bg-white/10'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="quick-calories-note" className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-white/45">
            Note (optional)
          </label>
          <input
            id="quick-calories-note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={80}
            placeholder="Optional note (e.g. coffee with cream)"
            className="w-full rounded-xl border border-white/[0.08] bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-[#2DA5A0] focus:outline-none"
          />
        </div>

        {error && <p className="text-xs text-[#FCA5A5]">{error}</p>}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="text-xs font-medium text-white/55 transition-colors hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isValid || saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#B75E18] px-6 py-3 text-sm font-semibold text-white transition-all min-h-[48px] hover:bg-[#B75E18]/90 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto w-full"
          >
            {saving ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>
    </InlineEntryPanel>
  );
}
