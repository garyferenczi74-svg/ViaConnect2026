'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Check, ChevronDown, PenLine } from 'lucide-react';

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;

export function ManualMealEntry({ onSaved }: { onSaved?: () => void }) {
  const [mealType, setMealType] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [showMacros, setShowMacros] = useState(false);
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(async () => {
    if (!mealType || saving) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await (supabase as any).from('meal_logs').insert({
        user_id: user.id,
        meal_type: mealType.toLowerCase(),
        log_method: 'manual',
        description: description || null,
        calories: calories ? parseInt(calories) : null,
        protein_g: protein ? parseFloat(protein) : null,
        carbs_g: carbs ? parseFloat(carbs) : null,
        fat_g: fat ? parseFloat(fat) : null,
        meal_date: new Date().toISOString().split('T')[0],
      });

      setSaved(true);
      onSaved?.();
      try {
        window.dispatchEvent(new CustomEvent('meal-logged', {
          detail: {
            meal_type: mealType.toLowerCase(),
            calories: calories ? parseInt(calories) : null,
            protein_grams: protein ? parseFloat(protein) : null,
            carbs_grams: carbs ? parseFloat(carbs) : null,
            fats_grams: fat ? parseFloat(fat) : null,
          },
        }));
      } catch {}
      setTimeout(() => {
        setSaved(false);
        setMealType(null);
        setDescription('');
        setCalories('');
        setProtein('');
        setCarbs('');
        setFat('');
        setShowMacros(false);
      }, 2000);
    } catch { /* table may not exist yet */ }
    finally { setSaving(false); }
  }, [mealType, description, calories, protein, carbs, fat, saving, onSaved]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <PenLine className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />
        <h3 className="text-sm font-semibold text-white">Manual Entry</h3>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {MEAL_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setMealType(t.toLowerCase())}
            className={`rounded-lg py-2 text-xs font-medium transition-all ${
              mealType === t.toLowerCase()
                ? 'border border-[#B75E18]/40 bg-[#B75E18]/20 text-[#B75E18]'
                : 'border border-white/[0.06] bg-white/[0.04] text-white/50 hover:bg-white/[0.08]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {mealType && (
        <>
          <input
            type="text"
            placeholder="What did you eat?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#2DA5A0]/50 focus:outline-none"
          />

          <button
            onClick={() => setShowMacros(!showMacros)}
            className="flex items-center gap-1 text-xs text-[#2DA5A0]"
          >
            <ChevronDown
              className={`h-3 w-3 transition-transform ${showMacros ? 'rotate-180' : ''}`}
              strokeWidth={1.5}
            />
            {showMacros ? 'Hide' : 'Add'} calories & macros (optional)
          </button>

          {showMacros && (
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Cal', value: calories, setter: setCalories },
                { label: 'Protein', value: protein, setter: setProtein },
                { label: 'Carbs', value: carbs, setter: setCarbs },
                { label: 'Fat', value: fat, setter: setFat },
              ].map((f) => (
                <div key={f.label}>
                  <label className="mb-1 block text-[10px] text-white/40">{f.label}</label>
                  <input
                    type="number"
                    value={f.value}
                    onChange={(e) => f.setter(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-xs text-white focus:border-[#2DA5A0]/50 focus:outline-none"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving || saved}
            className="flex w-full min-h-[40px] items-center justify-center gap-2 rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/15 text-sm font-medium text-[#2DA5A0] transition-all hover:bg-[#2DA5A0]/25 disabled:opacity-50"
          >
            {saved ? (
              <>
                <Check className="h-4 w-4" strokeWidth={1.5} />
                Saved!
              </>
            ) : saving ? 'Saving...' : 'Save Meal'}
          </button>
        </>
      )}
    </div>
  );
}
