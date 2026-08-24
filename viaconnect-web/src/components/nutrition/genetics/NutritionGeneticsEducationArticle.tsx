// Full education card view. Structured fields plus safe markdown body.
// Never treats listed SNPs as the signed-in member's genotypes.

import Link from 'next/link';
import { EducationalCardMarkdown } from '@/components/content/EducationalCardMarkdown';
import type { NutritionGeneticsEducationCard } from '@/lib/nutrition/genetics/educationCards';

export interface NutritionGeneticsEducationArticleProps {
  readonly card: NutritionGeneticsEducationCard;
  readonly titleBySlug?: Readonly<Record<string, string>>;
}

function cautionLabel(level: string): string {
  if (level === 'high') return 'High caution education';
  if (level === 'medium') return 'Medium caution education';
  return 'Education';
}

export function NutritionGeneticsEducationArticle({
  card,
  titleBySlug = {},
}: NutritionGeneticsEducationArticleProps) {
  return (
    <article
      data-testid={`nutrition-genetics-education-article-${card.slug}`}
      className="space-y-5 rounded-2xl border border-white/[0.08] bg-[#1E3054] p-4 sm:p-6"
    >
      <header className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="text-[22px] font-semibold leading-tight text-white md:text-[26px]">
            {card.title}
          </h1>
          <span className="inline-flex shrink-0 self-start rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/55">
            {cautionLabel(card.medicalCautionLevel)}
          </span>
        </div>
        {card.subtitle ? (
          <p className="text-[14px] leading-relaxed text-white/80">{card.subtitle}</p>
        ) : null}
        <p className="rounded-xl border border-[#2DA5A0]/25 bg-[#2DA5A0]/10 px-3 py-2 text-[12px] leading-relaxed text-white/75">
          Education only. This card explains a Nutrition by Genetics theme. It is not
          your genotype report and it does not attach alleles to your profile. Meal
          amounts stay on the meal plan.
        </p>
      </header>

      {card.narrativeBody ? (
        <EducationalCardMarkdown markdown={card.narrativeBody} />
      ) : (
        <p className="text-[13px] leading-relaxed text-white/[0.72]">{card.leadText}</p>
      )}

      {card.confirmedRsIds.length > 0 ? (
        <section aria-labelledby="confirmed-research-snps-heading" className="space-y-2">
          <h2
            id="confirmed-research-snps-heading"
            className="text-[15px] font-semibold text-white"
          >
            Confirmed research SNPs on this card
          </h2>
          <p className="text-[12px] leading-relaxed text-white/55">
            Extract list only. These IDs are discussed in the education card. They are
            not your results and they are not written to your profile.
          </p>
          <ul className="flex flex-wrap gap-2">
            {card.confirmedRsIds.map((rsid) => (
              <li
                key={rsid}
                className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-white/70"
              >
                {rsid}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {card.keyTakeaways.length > 0 ? (
        <section aria-labelledby="education-takeaways-heading" className="space-y-2">
          <h2
            id="education-takeaways-heading"
            className="text-[15px] font-semibold text-white"
          >
            Key takeaways
          </h2>
          <ul className="list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-white/[0.72] md:text-[14px]">
            {card.keyTakeaways.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {card.whatToDoNext.length > 0 ? (
        <section aria-labelledby="education-next-heading" className="space-y-2">
          <h2 id="education-next-heading" className="text-[15px] font-semibold text-white">
            What to do next
          </h2>
          <ul className="list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-white/[0.72] md:text-[14px]">
            {card.whatToDoNext.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {card.relatedSlugs.length > 0 ? (
        <section aria-labelledby="education-related-heading" className="space-y-2">
          <h2
            id="education-related-heading"
            className="text-[15px] font-semibold text-white"
          >
            Related education
          </h2>
          <ul className="flex flex-col gap-2">
            {card.relatedSlugs.map((slug) => (
              <li key={slug}>
                <Link
                  href={`/nutrition/genetics/education/${slug}`}
                  className="inline-flex min-h-[44px] items-center text-[13px] font-medium text-[#2DA5A0] hover:underline"
                >
                  {titleBySlug[slug] ?? slug}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {card.citations.length > 0 ? (
        <section aria-labelledby="education-sources-heading" className="space-y-2">
          <h2
            id="education-sources-heading"
            className="text-[15px] font-semibold text-white"
          >
            Sources
          </h2>
          <ul className="list-disc space-y-1.5 pl-5 text-[12px] leading-relaxed text-white/55">
            {card.citations.map((citation) => (
              <li key={citation.text}>{citation.text}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {card.fdaDisclaimer ? (
        <footer className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-[11px] leading-relaxed text-white/50">
          {card.fdaDisclaimer}
        </footer>
      ) : null}
    </article>
  );
}

export default NutritionGeneticsEducationArticle;
