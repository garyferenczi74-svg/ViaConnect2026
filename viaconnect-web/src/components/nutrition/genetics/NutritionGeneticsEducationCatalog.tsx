// Nutrition by Genetics education catalog. Lists the 11 theme cards from
// markdown. Education only: no alleles, no user_variants writes, no meal calc.

import Link from 'next/link';
import { BookOpen, ChevronRight } from 'lucide-react';
import type { NutritionGeneticsEducationCard } from '@/lib/nutrition/genetics/educationCards';

export interface NutritionGeneticsEducationCatalogProps {
  readonly cards: readonly NutritionGeneticsEducationCard[];
}

function cautionLabel(level: string): string {
  if (level === 'high') return 'High caution education';
  if (level === 'medium') return 'Medium caution education';
  return 'Education';
}

export function NutritionGeneticsEducationCatalog({
  cards,
}: NutritionGeneticsEducationCatalogProps) {
  return (
    <section
      aria-labelledby="nutrition-genetics-education-heading"
      data-testid="nutrition-genetics-education-catalog"
      className="space-y-4"
    >
      <header className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[rgba(45,165,160,0.30)] bg-gradient-to-br from-[#1A2744] to-[#2DA5A0]">
          <BookOpen className="h-[18px] w-[18px] text-white" strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <h2
            id="nutrition-genetics-education-heading"
            className="text-[16px] font-semibold text-white md:text-lg"
          >
            Theme education
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-white/[0.62] md:text-[14px]">
            Research themes only. These cards are not your genotypes and they do not
            attach alleles to your profile. Meal amounts stay on the meal plan.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.slug}
            href={`/nutrition/genetics/education/${card.slug}`}
            data-testid={`nutrition-genetics-education-card-${card.slug}`}
            aria-label={`Open education card: ${card.title}`}
            className="flex min-h-[44px] flex-col rounded-2xl border border-white/[0.08] bg-[#1E3054] p-4 transition-colors hover:border-[#2DA5A0]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744]"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="min-w-0 text-[14px] font-semibold leading-snug text-white">
                {card.title}
              </h3>
              <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/55">
                {cautionLabel(card.medicalCautionLevel)}
              </span>
            </div>
            <p className="mt-2 line-clamp-3 text-[12px] leading-relaxed text-white/[0.62]">
              {card.leadText}
            </p>
            {card.confirmedRsIds.length > 0 ? (
              <p className="mt-3 text-[11px] text-white/45">
                Confirmed research SNPs on this card: {card.confirmedRsIds.length}.
                Not your results.
              </p>
            ) : (
              <p className="mt-3 text-[11px] text-white/45">
                Theme map. No rs IDs on this card.
              </p>
            )}
            <span className="mt-3 inline-flex min-h-[44px] items-center gap-1 text-[12px] font-medium text-[#2DA5A0]">
              Open card
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default NutritionGeneticsEducationCatalog;
