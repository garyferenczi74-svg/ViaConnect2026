'use client';

import { Brain, Sparkles } from 'lucide-react';
import type { MealAnalysisResult } from '@/lib/nutrition/analyzeMeal';

interface MealInsightCardProps {
  analysis: MealAnalysisResult;
  supplementCount: number;
}

export function MealInsightCard({ analysis, supplementCount }: MealInsightCardProps) {
  const insight = generateMealInsight(analysis, supplementCount);

  return (
    <div className="rounded-xl border border-white/10 bg-[#1E3054]/35 backdrop-blur-md p-4">
      <div className="mb-3 flex items-center gap-2">
        <Brain className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />
        <span className="text-xs font-semibold text-white">Hannah's Take</span>
      </div>
      <p className="text-sm leading-relaxed text-white/70">{insight.summary}</p>
      {insight.suggestions.map((s, i) => (
        <div key={i} className="mt-2 flex items-start gap-2">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#B75E18]" strokeWidth={1.5} />
          <p className="text-xs text-white/60">{s}</p>
        </div>
      ))}
    </div>
  );
}

function generateMealInsight(analysis: MealAnalysisResult, supplementCount: number) {
  const { totals, mealQualityScore, portionAssessment } = analysis;
  const suggestions: string[] = [];

  const proteinOk = totals.protein >= 20;
  const fiberOk = totals.fiber >= 5;

  let summary: string;
  if (mealQualityScore >= 75) {
    summary = `Solid meal — ${totals.protein}g protein, well-balanced macros.`;
  } else if (mealQualityScore >= 50) {
    summary = `Decent meal. A few tweaks could push your nutrition score higher.`;
  } else {
    summary = `This meal is light on nutrients. Consider adding more whole foods.`;
  }

  if (!proteinOk) suggestions.push('Aim for 20g+ protein per meal to support muscle and recovery.');
  if (!fiberOk) suggestions.push('Add a serving of vegetables or legumes for fiber.');
  if (portionAssessment === 'very_large') suggestions.push('Portion is generous — consider splitting if you feel overfull.');
  if (supplementCount > 0) suggestions.push('Take your supplements within 30 minutes of this meal for best absorption.');
  if (suggestions.length === 0) suggestions.push('Keep it up — your nutrition is tracking well today.');

  return { summary, suggestions };
}
