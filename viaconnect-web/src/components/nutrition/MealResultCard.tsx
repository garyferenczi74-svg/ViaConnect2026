'use client';

// Prompt #160 section 3.3: meal result card.
// Prompt 184b: a single Fat field plus a fat-source dropdown replace the old
// Good Fat / Healthy Fat tiles. Prominent: Calories, Protein, Fat, Sugar.
// Carbs, Saturated Fat, Fiber in the Full breakdown expandable.

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Info, ChevronDown, ChevronUp, CheckCircle2, AlertCircle } from 'lucide-react';
import { MetricTile } from './MetricTile';
import { FatSourceDropdown } from '@/components/meals/FatSourceDropdown';
import { useFatSources } from '@/hooks/useFatSources';
import { computeMealKcal } from '@/lib/nutrition/compute-meal-kcal';
import { resolveMealConfidenceTone, type MealConfidenceTone } from './mealConfidence';
import type { NutritionAnalysis } from '@/lib/nutrition/schema';

interface MealResultCardProps {
  readonly analysis: NutritionAnalysis;
  readonly onChange: (next: NutritionAnalysis) => void;
  // Prompt 184b: the chosen fat source. Optional so non-review usages can omit
  // it; the review surface threads it to the confirm save.
  readonly fatSourceId?: string | null;
  readonly onFatSourceChange?: (id: string | null) => void;
}

function dataSourceAttribution(ds: NonNullable<NutritionAnalysis['data_source']>): string {
  if (ds === 'usda') return 'Nutrition data from USDA FoodData Central.';
  if (ds === 'mixed') return 'Nutrition data from USDA FoodData Central and AI estimates.';
  if (ds === 'gemini_fallback') return 'Nutrition values estimated. We could not confirm a USDA match for these foods.';
  return 'Nutrition values entered manually.';
}

function ConfidenceChip({ tone }: { tone: MealConfidenceTone }) {
  // Prompt 203: the chip reflects the meal's framing, not the USDA match rate.
  // A genuine quality downgrade reads "review", a USDA miss reads "Estimated",
  // and only a clean full match reads "High". See mealConfidence.ts.
  if (tone === 'low') {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/15 px-2.5 py-1 text-[11px] font-medium text-red-300"
        title="Some values looked unusual and were re-estimated. Review each before saving."
      >
        <AlertCircle className="h-3 w-3" strokeWidth={1.5} />
        Review recommended
      </span>
    );
  }
  if (tone === 'estimated') {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-[11px] font-medium text-amber-300"
        title="Some foods were estimated because we could not confirm a USDA match. Adjust any value as needed."
      >
        <Info className="h-3 w-3" strokeWidth={1.5} />
        Estimated
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-300"
      title="Matched to USDA FoodData Central. Tap any metric to adjust manually."
    >
      <CheckCircle2 className="h-3 w-3" strokeWidth={1.5} />
      High confidence
    </span>
  );
}

export function MealResultCard({ analysis, onChange, fatSourceId, onFatSourceChange }: MealResultCardProps) {
  const { fatSources } = useFatSources();
  const [showFull, setShowFull] = useState(false);
  const [servingDraft, setServingDraft] = useState(analysis.serving_description);
  const [editingServing, setEditingServing] = useState(false);
  // Prompt 203: tone keys off the genuine quality signal (downgrade) and USDA
  // match, NOT the match-rate percentage that used to fire a false "Low".
  const tone = resolveMealConfidenceTone(analysis);
  // Prompt 186: partial nutrients carry the est. marker on their tile; partial
  // or unknown nutrients surface the Estimated notice below the chip.
  const partialSet = new Set(analysis.nutrient_flags?.partial ?? []);
  const hasUnknowns = (analysis.nutrient_flags?.unknown ?? []).length > 0 || partialSet.size > 0;
  // Prompt 194a: calories are a pure function of the macros, so the Calories
  // tile DISPLAYS the macro-derived value and is read-only. The user changes
  // calories by editing Protein / Carbs / Fat; this re-derives every render
  // because it is computed from `analysis`, never stored as an editable field.
  const derivedCalories = computeMealKcal({
    proteinG: analysis.protein_g,
    carbsG: analysis.carbs_g,
    fatG: analysis.total_fat_g,
    fiberG: analysis.fiber_g,
  });

  function patch<K extends keyof NutritionAnalysis>(key: K, value: NutritionAnalysis[K]) {
    onChange({ ...analysis, [key]: value });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/60 p-4 backdrop-blur-md sm:p-5"
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wider text-white/40">Analyzed serving</p>
          {editingServing ? (
            <textarea
              autoFocus
              value={servingDraft}
              onChange={(e) => setServingDraft(e.target.value)}
              onBlur={() => {
                const trimmed = servingDraft.trim();
                if (trimmed.length > 0) patch('serving_description', trimmed.slice(0, 2000));
                setEditingServing(false);
              }}
              className="mt-1 w-full rounded-lg border border-white/[0.08] bg-white/5 p-2 text-sm text-white focus:border-[#2DA5A0] focus:outline-none"
              rows={2}
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingServing(true)}
              className="mt-1 text-left text-sm text-white"
            >
              {analysis.serving_description}
            </button>
          )}
        </div>
        <ConfidenceChip tone={tone} />
      </div>

      {tone === 'low' && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-none" strokeWidth={1.5} />
          <span>Some values looked unusual and were re-estimated. Please review each value before saving.</span>
        </div>
      )}

      {tone !== 'low' && hasUnknowns && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-none" strokeWidth={1.5} />
          <span>
            Estimated: some nutrients could not be fully determined. Values marked est. are
            partial; Unknown means no reliable data. Tap any value to adjust.
          </span>
        </div>
      )}

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.05 } },
        }}
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 8 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
          }}
        >
          {/* Prompt 194a: read-only Calories tile. Mirrors the prominent
              MetricTile visual but is static (no Pencil, no editor) because
              calories are derived from the macros, not directly editable. */}
          <div className="relative rounded-xl border border-white/[0.08] bg-white/5 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Calories</p>
            <div className="mt-1 flex w-full items-baseline gap-1">
              <span className="text-3xl font-semibold tabular-nums text-white">{derivedCalories.toFixed(0)}</span>
              <span className="text-xs text-white/40">kcal</span>
            </div>
          </div>
        </motion.div>
        {[
          { label: 'Protein', value: analysis.protein_g, unit: 'g', step: 0.1, key: 'protein_g' as const },
          { label: 'Fat', value: analysis.total_fat_g, unit: 'g', step: 0.1, key: 'total_fat_g' as const },
          { label: 'Sugar', value: analysis.sugar_g, unit: 'g', step: 0.1, key: 'sugar_g' as const },
        ].map((t) => (
          <motion.div
            key={t.key}
            variants={{
              hidden: { opacity: 0, y: 8 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
            }}
          >
            <MetricTile
              label={t.label}
              value={t.value}
              unit={t.unit}
              variant="prominent"
              step={t.step}
              estimated={partialSet.has(t.key)}
              onChange={(v) => patch(t.key, v as never)}
            />
          </motion.div>
        ))}
      </motion.div>

      <div className="mt-3">
        <FatSourceDropdown
          value={fatSourceId ?? null}
          onChange={(id) => onFatSourceChange?.(id)}
          fatSources={fatSources}
        />
      </div>

      <button
        type="button"
        onClick={() => setShowFull((s) => !s)}
        className="mt-3 inline-flex items-center gap-1 text-xs text-white/55 hover:text-white"
      >
        {showFull ? <ChevronUp className="h-3 w-3" strokeWidth={1.5} /> : <ChevronDown className="h-3 w-3" strokeWidth={1.5} />}
        {showFull ? 'Hide full breakdown' : 'Show full breakdown'}
      </button>

      {showFull && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"
        >
          <MetricTile label="Carbs" value={analysis.carbs_g} unit="g" variant="secondary" estimated={partialSet.has('carbs_g')} onChange={(v) => patch('carbs_g', v)} />
          <MetricTile label="Saturated Fat" value={analysis.saturated_fat_g} unit="g" variant="secondary" estimated={partialSet.has('saturated_fat_g')} onChange={(v) => patch('saturated_fat_g', v)} />
          <MetricTile label="Fiber" value={analysis.fiber_g} unit="g" variant="secondary" estimated={partialSet.has('fiber_g')} onChange={(v) => patch('fiber_g', v)} />
        </motion.div>
      )}

      {analysis.ai_notes && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] p-3 text-xs text-white/55">
          <Info className="mt-0.5 h-3.5 w-3.5 flex-none text-[#2DA5A0]" strokeWidth={1.5} />
          <span>{analysis.ai_notes}</span>
        </div>
      )}

      {analysis.data_source && (
        <p className="mt-2 text-[11px] text-white/40">
          {dataSourceAttribution(analysis.data_source)}
        </p>
      )}
    </motion.div>
  );
}
