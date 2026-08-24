// Nutrition by Genetics education card detail. Auth-gated like the parent
// page. Reads markdown drafts only. Does not write user_variants or labs.

import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BackToNutritionLink } from '@/components/nutrition/hub/BackToNutritionLink';
import { NutritionGeneticsEducationArticle } from '@/components/nutrition/genetics/NutritionGeneticsEducationArticle';
import {
  isNutritionGeneticsEducationSlug,
  loadNutritionGeneticsEducationCard,
  loadNutritionGeneticsEducationCards,
  NUTRITION_GENETICS_EDUCATION_SLUGS,
} from '@/lib/nutrition/genetics/educationCards';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return NUTRITION_GENETICS_EDUCATION_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata(props: PageProps) {
  const { slug } = await props.params;
  const card = isNutritionGeneticsEducationSlug(slug)
    ? loadNutritionGeneticsEducationCard(slug)
    : null;
  if (!card) {
    return { title: 'Nutrition education | ViaConnect' };
  }
  return {
    title: `${card.title} · Nutrition by Genetics`,
    description: 'Educational theme card. Not a genotype report.',
  };
}

export default async function NutritionGeneticsEducationCardPage(props: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { slug } = await props.params;
  const card = loadNutritionGeneticsEducationCard(slug);
  if (!card) notFound();

  const titleBySlug = Object.fromEntries(
    loadNutritionGeneticsEducationCards().map((item) => [item.slug, item.title]),
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
      <BackToNutritionLink />
      <Link
        href="/nutrition/genetics"
        className="mb-4 inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#1E3054]/35 px-3 py-1.5 text-[12px] font-medium text-white/75 backdrop-blur-sm transition-colors hover:border-white/[0.16] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70"
      >
        <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
        Nutrition by Genetics
      </Link>
      <NutritionGeneticsEducationArticle card={card} titleBySlug={titleBySlug} />
    </div>
  );
}
