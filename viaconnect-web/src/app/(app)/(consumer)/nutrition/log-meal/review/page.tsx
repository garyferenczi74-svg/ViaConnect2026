// Prompt #160 section 3.3: post-analysis review page.
// Server-fetches the pending draft, then hydrates the client review form.
// Brief 3: same review for photo, upload, voice/dictation, and text, then
// protocol-match chips and protocol-tied micro rings.

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ReviewForm } from './ReviewForm';
import { BackToNutritionLink } from '@/components/nutrition/hub/BackToNutritionLink';
import type { NutritionAnalysis } from '@/lib/nutrition/schema';
import { getLatestUserProtocolSynthesis } from '@/lib/protocol/readSynthesis';
import { contractFromAnalysis, decodePendingRawInput } from '@/lib/nutrition/meal-card-contract/toContract';
import { matchMealToProtocol } from '@/lib/nutrition/meal-card-contract/protocolMatch';
import type { ProtocolVariantInput } from '@/lib/nutrition/meal-card-contract/types';

interface ReviewPageProps {
  searchParams: Promise<{ logId?: string }>;
}

function variantFromUnknown(raw: unknown): ProtocolVariantInput | null {
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as Record<string, unknown>;
  if (rec.is_sample === true) return null;
  if (typeof rec.rsid !== 'string' || typeof rec.panel_key !== 'string') return null;
  return {
    rsid: rec.rsid,
    gene: typeof rec.gene === 'string' ? rec.gene : null,
    genotype: typeof rec.genotype === 'string' ? rec.genotype : null,
    panelKey: rec.panel_key,
  };
}

export default async function ReviewPage(props: ReviewPageProps) {
  const searchParams = await props.searchParams;
  const { logId } = searchParams;
  if (!logId) redirect('/nutrition/log-meal');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: row } = await supabase
    .from('nutrition_logs')
    .select('id, status, serving_description, calories, protein_g, carbs_g, total_fat_g, saturated_fat_g, sugar_g, fiber_g, confidence, ai_notes, raw_input')
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

  const decoded = decodePendingRawInput(row.raw_input);
  const contract = contractFromAnalysis(initial, decoded.meal_card_source ?? 'text', {
    foodNames: decoded.food_names,
    micronutrients: decoded.micronutrients,
  });

  const [synthesis, variantRes] = await Promise.all([
    getLatestUserProtocolSynthesis(user.id),
    supabase
      .from('user_variants')
      .select('rsid, gene, genotype, panel_key, is_sample')
      .eq('user_id', user.id),
  ]);

  const variants: ProtocolVariantInput[] = [];
  if (Array.isArray(variantRes.data)) {
    for (const raw of variantRes.data) {
      const parsed = variantFromUnknown(raw);
      if (parsed) variants.push(parsed);
    }
  }

  const protocolMatch = matchMealToProtocol(
    contract,
    {
      prefer: synthesis?.nutrition_guidance.prefer ?? [],
      avoid: synthesis?.nutrition_guidance.avoid ?? [],
      recommended: (synthesis?.recommended_vitamins_minerals ?? []).map((item) => ({
        form: item.form,
        rationale: item.rationale,
        ruleRsid: item.ruleRsid,
      })),
    },
    variants,
  );

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 md:py-8">
      <BackToNutritionLink />
      <header className="mb-5">
        <h1 className="text-xl font-bold text-white sm:text-2xl">Review your meal</h1>
        <p className="mt-1 text-sm text-white/40">Tap any value to adjust. Save when it looks right.</p>
      </header>
      <ReviewForm logId={row.id} initial={initial} protocolMatch={protocolMatch} />
    </div>
  );
}
