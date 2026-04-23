'use client';

import { Brain, Sparkles } from 'lucide-react';

interface NutritionInsightsProps {
  mealsLoggedToday: number;
  score: number;
}

export function NutritionInsights({ mealsLoggedToday, score }: NutritionInsightsProps) {
  const insight = generateInsight(mealsLoggedToday, score);

  return (
    <div className="rounded-xl border border-white/10 bg-[#1E3054]/35 backdrop-blur-md p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <Brain className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
        <h3 className="text-sm font-semibold text-white">Nutrition Insights</h3>
        <span className="ml-auto text-[10px] uppercase tracking-wider text-white/30">
          Powered by Hannah
        </span>
      </div>
      <p className="text-sm leading-relaxed text-white/70">{insight.message}</p>
      {insight.suggestions.map((s, i) => (
        <div key={i} className="mt-2 flex items-start gap-2">
          <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#B75E18]" strokeWidth={1.5} />
          <p className="text-xs text-white/60">{s}</p>
        </div>
      ))}
    </div>
  );
}

function generateInsight(meals: number, score: number) {
  if (meals === 0) {
    return {
      message: "No meals logged today yet. Logging meals helps Hannah understand your nutritional patterns and refine your supplement protocol.",
      suggestions: [
        "Try a quick log — just tap the meal type and rate its quality. Takes 5 seconds.",
        "Your supplement stack is optimized for your genetics, but dietary data makes it even more precise.",
      ],
    };
  }
  if (meals < 3) {
    return {
      message: `You've logged ${meals} meal${meals > 1 ? 's' : ''} today. Logging 3+ meals gives Hannah a complete picture of your daily nutrition.`,
      suggestions: [
        "Consistent logging unlocks weekly trend analysis and personalized meal suggestions.",
        score < 50
          ? "Consider adding more protein-rich foods — your CAQ profile suggests room for improvement."
          : "Your nutrition score is looking solid. Keep logging to maintain your streak.",
      ],
    };
  }
  return {
    message: `Great consistency — ${meals} meals logged today with a nutrition score of ${score}/100. Hannah can now track your weekly patterns.`,
    suggestions: [
      score >= 75
        ? "Strong nutritional balance today. Your supplement stack and diet are working well together."
        : "Try adding more leafy greens or lean protein to push your score above 75.",
      "Log meals for 7 consecutive days to unlock your weekly nutrition trend report (+50 Helix pts).",
    ],
  };
}
