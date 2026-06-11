// Prompt #160 section 3.3: post-analysis review page.
// Server-fetches the pending draft, then hydrates the client review form.

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ReviewForm } from './ReviewForm';
import { BackToNutritionLink } from '@/components/nutrition/hub/BackToNutritionLink';
import type { NutritionAnalysis } from '@/lib/nutrition/schema';

interface ReviewPageProps {
  searchParams: { logId?: string };
}

export default async function ReviewPage({ searchParams }: ReviewPageProps) {
  const { logId } = searchParams;
  if (!logId) redirect('/nutrition/log-meal');

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: row } = await supabase
    .from('nutrition_logs')
    .select('id, status, serving_description, calories, protein_g, carbs_g, total_fat_g, saturated_fat_g, sugar_g, fiber_g, confidence, ai_notes')
    .eq('id', logId)
    .single();

  if (!row || row.status === 'discarded') {
    redirect('/nutrition/log-meal');
  }

  if (row.status === 'confirmed') {
    redirect('/nutrition');
  }

  const initial: NutritionAnalysis = {
    calories: row.calories ?? 0,
    protein_g: Number(row.protein_g ?? 0),
    carbs_g: Number(row.carbs_g ?? 0),
    total_fat_g: Number(row.total_fat_g ?? 0),
    saturated_fat_g: Number(row.saturated_fat_g ?? 0),
    sugar_g: Number(row.sugar_g ?? 0),
    fiber_g: Number(row.fiber_g ?? 0),
    confidence: Number(row.confidence ?? 0),
    ai_notes: row.ai_notes ?? '',
    serving_description: row.serving_description ?? '',
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 md:py-8">
      <BackToNutritionLink />
      <header className="mb-5">
        <h1 className="text-xl font-bold text-white sm:text-2xl">Review your meal</h1>
        <p className="mt-1 text-sm text-white/40">Tap any value to adjust. Save when it looks right.</p>
      </header>
      <ReviewForm logId={row.id} initial={initial} />
    </div>
  );
}
