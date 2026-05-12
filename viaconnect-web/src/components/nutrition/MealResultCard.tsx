'use client';

// Prompt #160 section 3.3: meal result card.
// Gary's five (Calories, Protein, Good Fat, Healthy Fat, Sugar) prominent.
// Carbs, Total Fat, Saturated Fat, Fiber in the Full breakdown expandable.

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Info, ChevronDown, ChevronUp, CheckCircle2, AlertCircle } from 'lucide-react';
import { MetricTile } from './MetricTile';
import type { NutritionAnalysis } from '@/lib/nutrition/schema';

interface MealResultCardProps {
  readonly analysis: NutritionAnalysis;
  readonly onChange: (next: NutritionAnalysis) => void;
}

function ConfidenceChip({ confidence }: { confidence: number }) {
  let color = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40';
  let label = 'High';
  if (confidence < 0.5) {
    color = 'bg-red-500/15 text-red-300 border-red-500/40';
    label = 'Low';
  } else if (confidence < 0.8) {
    color = 'bg-amber-500/15 text-amber-300 border-amber-500/40';
    label = 'Medium';
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${color}`}
      title="AI confidence in this estimate. Tap any metric to adjust manually."
    >
      <CheckCircle2 className="h-3 w-3" strokeWidth={1.5} />
      {label} confidence: {(confidence * 100).toFixed(0)}%
    </span>
  );
}

export function MealResultCard({ analysis, onChange }: MealResultCardProps) {
  const [showFull, setShowFull] = useState(false);
  const [servingDraft, setServingDraft] = useState(analysis.serving_description);
  const [editingServing, setEditingServing] = useState(false);
  const lowConfidence = analysis.confidence < 0.3;

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
        <ConfidenceChip confidence={analysis.confidence} />
      </div>

      {lowConfidence && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-none" strokeWidth={1.5} />
          <span>Low confidence estimate. Please review each value before saving.</span>
        </div>
      )}

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.05 } },
        }}
        className="grid grid-cols-2 gap-2 sm:grid-cols-5"
      >
        {[
          { label: 'Calories', value: analysis.calories, unit: 'kcal', step: 1, key: 'calories' as const },
          { label: 'Protein', value: analysis.protein_g, unit: 'g', step: 0.1, key: 'protein_g' as const },
          { label: 'Good Fat', value: analysis.good_fat_g, unit: 'g', step: 0.1, key: 'good_fat_g' as const },
          { label: 'Healthy Fat', value: analysis.healthy_fat_g, unit: 'g', step: 0.1, key: 'healthy_fat_g' as const },
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
              onChange={(v) => patch(t.key, v as never)}
            />
          </motion.div>
        ))}
      </motion.div>

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
          <MetricTile label="Carbs" value={analysis.carbs_g} unit="g" variant="secondary" onChange={(v) => patch('carbs_g', v)} />
          <MetricTile label="Total Fat" value={analysis.total_fat_g} unit="g" variant="secondary" onChange={(v) => patch('total_fat_g', v)} />
          <MetricTile label="Saturated Fat" value={analysis.saturated_fat_g} unit="g" variant="secondary" onChange={(v) => patch('saturated_fat_g', v)} />
          <MetricTile label="Fiber" value={analysis.fiber_g} unit="g" variant="secondary" onChange={(v) => patch('fiber_g', v)} />
        </motion.div>
      )}

      {analysis.ai_notes && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] p-3 text-xs text-white/55">
          <Info className="mt-0.5 h-3.5 w-3.5 flex-none text-[#2DA5A0]" strokeWidth={1.5} />
          <span>{analysis.ai_notes}</span>
        </div>
      )}
    </motion.div>
  );
}
