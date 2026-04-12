'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Dna, Apple, Pill, Clock, ArrowRight, Loader2 } from 'lucide-react';
import { TierBanner } from '@/components/nutrition/guide/TierBanner';
import { FoodCard } from '@/components/nutrition/guide/FoodCard';
import { AvoidanceCard } from '@/components/nutrition/guide/AvoidanceCard';
import { NutrientTargetBar } from '@/components/nutrition/guide/NutrientTargetBar';
import type { GeneticsNutritionalGuide, SupplementDietSynergy, MealTemplate } from '@/lib/agents/gordan/generateNutritionalGuide';
import { fetchGuide, requestGuideGeneration } from '@/lib/agents/gordan/generateNutritionalGuide';
import { createClient } from '@/lib/supabase/client';

export default function NutritionGuidePage() {
  const [guide, setGuide] = useState<GeneticsNutritionalGuide | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);
        const existing = await fetchGuide(user.id);
        if (existing) setGuide(existing);
      } catch { /* table may not exist yet */ }
      finally { setLoading(false); }
    })();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await requestGuideGeneration(userId!);
      setGuide(result);
    } catch { /* handle error */ }
    finally { setGenerating(false); }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl py-12 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#2DA5A0]" strokeWidth={1.5} />
        <p className="mt-3 text-sm text-white/40">Loading your nutritional guide...</p>
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">Your Genetics Nutritional Guide</h1>
          <p className="mt-1 text-sm text-white/40">Personalized dietary blueprint powered by Gordan</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#1E3054]/60 backdrop-blur-md p-8 text-center">
          <Dna className="mx-auto h-10 w-10 text-[#2DA5A0]/50" strokeWidth={1.5} />
          <h2 className="mt-4 text-lg font-semibold text-white">No Guide Generated Yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/40">
            Gordan will analyze your CAQ responses, lab results, and genetic data to create a personalized nutritional guide tailored to your DNA.
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#2DA5A0] px-6 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#2DA5A0]/90 disabled:opacity-50"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
            ) : (
              <Dna className="h-4 w-4" strokeWidth={1.5} />
            )}
            {generating ? 'Generating...' : 'Generate My Guide'}
          </button>
          <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs text-white/30">
            <Link href="/genetics" className="flex items-center gap-1 text-[#2DA5A0] hover:text-[#2DA5A0]/80">
              Upload genetics for Tier 3
              <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white sm:text-2xl">Your Genetics Nutritional Guide</h1>
        <p className="mt-1 text-sm text-white/40">Personalized dietary blueprint powered by Gordan</p>
      </div>

      <TierBanner
        tier={guide.confidenceTier}
        percent={guide.confidencePercent}
        sources={guide.dataSources}
        generatedAt={guide.generatedAt}
      />

      {/* Diet Type */}
      <section className="rounded-xl border border-white/10 bg-[#1E3054]/60 backdrop-blur-md p-5">
        <div className="mb-1 flex items-center gap-2">
          <Apple className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/50">Your Genetic Diet Type</h2>
        </div>
        <p className="text-lg font-bold text-white">{guide.dietType.name}</p>
        <p className="mt-2 text-sm leading-relaxed text-white/60">{guide.dietType.description}</p>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-white/[0.04] p-3">
            <p className="text-lg font-bold text-[#2DA5A0]">{guide.dietType.macroRatio.protein}%</p>
            <p className="text-[10px] text-white/40">Protein</p>
          </div>
          <div className="rounded-lg bg-white/[0.04] p-3">
            <p className="text-lg font-bold text-[#B75E18]">{guide.dietType.macroRatio.carbs}%</p>
            <p className="text-[10px] text-white/40">Carbs</p>
          </div>
          <div className="rounded-lg bg-white/[0.04] p-3">
            <p className="text-lg font-bold text-[#F59E0B]">{guide.dietType.macroRatio.fat}%</p>
            <p className="text-[10px] text-white/40">Fat</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-white/40">
          Target: {guide.dietType.caloricTarget.base} cal/day ({guide.dietType.caloricTarget.range[0]} to {guide.dietType.caloricTarget.range[1]} range)
        </p>
      </section>

      {/* Priority Foods */}
      {guide.priorityFoods.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/50">Foods to Prioritize</h2>
          <div className="space-y-3">
            {guide.priorityFoods.map((f) => <FoodCard key={f.id} food={f} />)}
          </div>
        </section>
      )}

      {/* Foods to Avoid */}
      {guide.avoidFoods.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/50">Foods to Avoid or Limit</h2>
          <div className="space-y-3">
            {guide.avoidFoods.map((a) => <AvoidanceCard key={a.id} item={a} />)}
          </div>
        </section>
      )}

      {/* Nutrient Targets */}
      {guide.nutrientTargets.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/50">Nutrient Targets</h2>
          <div className="space-y-3">
            {guide.nutrientTargets.map((t) => <NutrientTargetBar key={t.nutrient} target={t} />)}
          </div>
        </section>
      )}

      {/* Meal Framework */}
      {guide.mealFramework?.meals?.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/50">Meal Framework</h2>
          <div className="space-y-3">
            {guide.mealFramework.meals.map((meal) => (
              <MealCard key={meal.mealType} meal={meal} />
            ))}
          </div>
        </section>
      )}

      {/* Supplement Diet Synergy */}
      {guide.synergyMap.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/50">Supplement Diet Synergy</h2>
          <div className="space-y-3">
            {guide.synergyMap.map((s) => (
              <SynergyCard key={s.supplement} synergy={s} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function MealCard({ meal }: { meal: MealTemplate }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#1E3054]/60 backdrop-blur-md p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[#B75E18]" strokeWidth={1.5} />
          <p className="text-sm font-semibold capitalize text-white">{meal.mealType}</p>
        </div>
        <span className="text-xs text-white/40">{meal.timing}</span>
      </div>
      <div className="mt-2 flex gap-3 text-xs text-white/50">
        <span>{meal.macroTarget.protein}g protein</span>
        <span>{meal.macroTarget.carbs}g carbs</span>
        <span>{meal.macroTarget.fat}g fat</span>
      </div>
      {meal.principles.length > 0 && (
        <ul className="mt-3 space-y-1">
          {meal.principles.map((p, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-white/60">
              <Dna className="mt-0.5 h-3 w-3 flex-shrink-0 text-[#2DA5A0]" strokeWidth={1.5} />
              {p}
            </li>
          ))}
        </ul>
      )}
      {meal.exampleMeals.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-[10px] uppercase tracking-wider text-white/30">Example meals</p>
          {meal.exampleMeals.map((e, i) => (
            <p key={i} className="text-xs text-white/50">{e}</p>
          ))}
        </div>
      )}
      {meal.supplementSync.length > 0 && (
        <div className="mt-2">
          {meal.supplementSync.map((s, i) => (
            <p key={i} className="flex items-center gap-1.5 text-xs text-[#2DA5A0]">
              <Pill className="h-3 w-3" strokeWidth={1.5} /> {s}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function SynergyCard({ synergy }: { synergy: SupplementDietSynergy }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#1E3054]/60 backdrop-blur-md p-4">
      <div className="flex items-center gap-2">
        <Pill className="h-4 w-4 text-purple-400" strokeWidth={1.5} />
        <p className="text-sm font-medium text-white">{synergy.supplement}</p>
      </div>
      <p className="mt-1 text-xs text-white/50">{synergy.optimalTiming}</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wider text-[#22C55E]/60">Pair with</p>
          {synergy.bestPairedWith.map((f, i) => (
            <p key={i} className="text-xs text-white/50">{f}</p>
          ))}
        </div>
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wider text-[#EF4444]/60">Avoid with</p>
          {synergy.avoidPairingWith.map((f, i) => (
            <p key={i} className="text-xs text-white/50">{f}</p>
          ))}
        </div>
      </div>
      <p className="mt-2 text-xs text-white/40">{synergy.geneticReason}</p>
    </div>
  );
}
