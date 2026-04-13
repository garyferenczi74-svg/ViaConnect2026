'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Check, Save } from 'lucide-react';
import { PhotoCapture, type PhotoInput } from './PhotoCapture';
import { MealItemEditor } from './MealItemEditor';
import { MealAnalysisCard } from './MealAnalysisCard';
import { FoodInteractionAlert } from './FoodInteractionAlert';
import { MealInsightCard } from './MealInsightCard';
import {
  analyzeMealPhotos,
  recalculateTotals,
  type MealAnalysisResult,
  type IdentifiedItem,
} from '@/lib/nutrition/analyzeMeal';
import { checkFoodInteractions, type FoodInteraction } from '@/lib/nutrition/checkFoodInteractions';

type Step = 'capture' | 'analyzing' | 'results' | 'saved';

interface PhotoMealLogProps {
  mealType?: string;
  supplements?: { name: string }[];
  onSaved?: () => void;
}

export function PhotoMealLog({ mealType = 'lunch', supplements = [], onSaved }: PhotoMealLogProps) {
  const [step, setStep] = useState<Step>('capture');
  const [photos, setPhotos] = useState<PhotoInput[]>([]);
  const [analysis, setAnalysis] = useState<MealAnalysisResult | null>(null);
  const [interactions, setInteractions] = useState<FoodInteraction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);

  const handlePhotosReady = useCallback(async (newPhotos: PhotoInput[]) => {
    setPhotos(newPhotos);
    if (newPhotos.length === 0) return;

    setStep('analyzing');
    setError(null);

    try {
      const result = await analyzeMealPhotos(
        newPhotos.map((p) => ({ base64: p.base64, mediaType: p.mediaType })),
        mealType,
      );
      setAnalysis(result);
      setInteractions(checkFoodInteractions(result.items, supplements));
      setStep('results');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setStep('capture');
    }
  }, [mealType, supplements]);

  const handleItemsChange = useCallback((items: IdentifiedItem[]) => {
    if (!analysis) return;
    const newTotals = recalculateTotals(items);
    setAnalysis({ ...analysis, items, totals: { ...analysis.totals, ...newTotals } });
    setInteractions(checkFoodInteractions(items, supplements));
  }, [analysis, supplements]);

  const handleSave = useCallback(async () => {
    if (!analysis || saving) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // TODO: Remove cast once meal_logs is added to Supabase typegen
      const untypedClient = supabase as unknown as { from(t: string): { insert(r: Record<string, unknown>): Promise<unknown> } };
      await untypedClient.from('meal_logs').insert({
        user_id: user.id,
        meal_type: mealType,
        log_method: 'photo_ai',
        quality_rating: analysis.mealQualityScore >= 75 ? 4 : analysis.mealQualityScore >= 50 ? 3 : analysis.mealQualityScore >= 25 ? 2 : 1,
        description: analysis.items.map((i) => i.name).join(', '),
        ai_analysis: analysis,
        calories: analysis.totals.calories,
        protein_g: analysis.totals.protein,
        carbs_g: analysis.totals.carbs,
        fat_g: analysis.totals.fat,
        meal_date: new Date().toISOString().split('T')[0],
      });

      setStep('saved');
      setShowSavePrompt(true);
      onSaved?.();
    } catch { /* table may not exist yet */ }
    finally { setSaving(false); }
  }, [analysis, mealType, saving, onSaved]);

  const handleSaveToLibrary = useCallback(async () => {
    if (!analysis) return;
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const mealName = `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} — ${new Date().toLocaleDateString('en-US', { weekday: 'short' })}`;

      // TODO: Remove cast once saved_meals is added to Supabase typegen
      const untypedClient = supabase as unknown as { from(t: string): { upsert(r: Record<string, unknown>, opts?: Record<string, unknown>): Promise<unknown> } };
      await untypedClient.from('saved_meals').upsert({
        user_id: user.id,
        name: mealName,
        meal_type: mealType,
        items: analysis.items,
        totals: analysis.totals,
        micronutrients: analysis.micronutrients,
        meal_quality_score: analysis.mealQualityScore,
      }, { onConflict: 'user_id,name' });

      setShowSavePrompt(false);
    } catch { /* table may not exist yet */ }
  }, [analysis, mealType]);

  const reset = () => {
    setStep('capture');
    setPhotos([]);
    setAnalysis(null);
    setInteractions([]);
    setError(null);
    setShowSavePrompt(false);
  };

  if (step === 'capture') {
    return (
      <div className="space-y-3">
        <PhotoCapture onPhotosReady={handlePhotosReady} />
        {error && <p className="text-center text-xs text-red-400">{error}</p>}
      </div>
    );
  }

  if (step === 'analyzing') {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#2DA5A0]" strokeWidth={1.5} />
        <p className="text-sm text-white/60">Analyzing your meal...</p>
        <p className="text-xs text-white/30">Hannah is identifying every food item</p>
      </div>
    );
  }

  if (step === 'saved') {
    return (
      <div className="space-y-3">
        <div className="flex flex-col items-center gap-2 rounded-xl border border-[#22C55E]/20 bg-[#22C55E]/10 py-6">
          <Check className="h-8 w-8 text-[#22C55E]" strokeWidth={1.5} />
          <p className="text-sm font-medium text-[#22C55E]">Meal saved! +10 Helix Points</p>
        </div>

        {showSavePrompt && (
          <div className="flex items-center justify-between rounded-lg bg-white/[0.04] p-3">
            <p className="text-xs text-white/60">Save to My Meals for quick re-logging?</p>
            <div className="flex gap-2">
              <button onClick={() => setShowSavePrompt(false)} className="text-xs text-white/30">Skip</button>
              <button onClick={handleSaveToLibrary} className="flex items-center gap-1 text-xs font-medium text-[#2DA5A0]">
                <Save className="h-3 w-3" strokeWidth={1.5} /> Save
              </button>
            </div>
          </div>
        )}

        <button onClick={reset} className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-sm text-white/60 hover:bg-white/[0.08]">
          Log another meal
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {analysis && (
        <>
          <MealItemEditor items={analysis.items} onChange={handleItemsChange} />
          <MealAnalysisCard analysis={analysis} />
          <FoodInteractionAlert interactions={interactions} />
          <MealInsightCard analysis={analysis} supplementCount={supplements.length} />

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#2DA5A0] text-sm font-medium text-white transition-all hover:bg-[#2DA5A0]/90 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
            ) : (
              <Check className="h-4 w-4" strokeWidth={1.5} />
            )}
            {saving ? 'Saving...' : 'Save Meal'}
          </button>

          <button onClick={reset} className="w-full text-center text-xs text-white/30 hover:text-white/50">
            Start over
          </button>
        </>
      )}
    </div>
  );
}
