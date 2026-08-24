// Nutrition by Genetics education cards (170r).
// Read-only import of markdown drafts. Education only. Never attaches
// alleles, never writes user_variants, never invents header-gap SNPs.

import {
  loadEducationalCards,
  resolveEducationalCardsRoot,
} from '@/lib/content/authoring-pipeline/card-reader';
import type { CitationRef, ParsedCard } from '@/lib/content/authoring-pipeline/types';

// INDEX.md order. Do not alphabetize; product order is the theme map first.
export const NUTRITION_GENETICS_EDUCATION_SLUGS = [
  'nutrition-genetics-result-scores',
  'nutrition-genetics-hunger-fullness',
  'nutrition-genetics-protein',
  'nutrition-genetics-fats',
  'nutrition-genetics-saturated-fat',
  'nutrition-genetics-omega',
  'nutrition-genetics-carbohydrates',
  'nutrition-genetics-food-sensitivities',
  'nutrition-genetics-insulin-resistance',
  'nutrition-genetics-plant-cholesterol',
  'nutrition-genetics-additional',
] as const;

export type NutritionGeneticsEducationSlug =
  (typeof NUTRITION_GENETICS_EDUCATION_SLUGS)[number];

const SLUG_SET = new Set<string>(NUTRITION_GENETICS_EDUCATION_SLUGS);

const STRUCTURED_HEADINGS = new Set([
  'key takeaways',
  'what to do next',
  'related content',
  'sources',
  'fda disclaimer',
]);

const CONFIRMED_LINE = /^\s*Confirmed variants\b/i;
const RS_ID = /\brs\d+\b/gi;

export interface NutritionGeneticsEducationCard {
  readonly slug: string;
  readonly title: string;
  readonly subtitle: string | null;
  readonly leadText: string;
  readonly narrativeBody: string;
  readonly keyTakeaways: readonly string[];
  readonly whatToDoNext: readonly string[];
  readonly relatedSlugs: readonly string[];
  readonly citations: readonly CitationRef[];
  readonly medicalCautionLevel: string;
  readonly confirmedRsIds: readonly string[];
  readonly estimatedReadingTimeMinutes: number;
  readonly fdaDisclaimer: string | null;
}

export function isNutritionGeneticsEducationSlug(
  slug: string,
): slug is NutritionGeneticsEducationSlug {
  return SLUG_SET.has(slug);
}

// Extract-only. Reads rs IDs from "Confirmed variants" lines. Does not
// scrape the rest of the card (negated IDs such as FADS1 rs174537 stay out).
export function extractConfirmedRsIds(body: string): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const line of body.split(/\r?\n/)) {
    if (!CONFIRMED_LINE.test(line)) continue;
    const matches = line.match(RS_ID) ?? [];
    for (const raw of matches) {
      const id = raw.toLowerCase();
      if (seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

export function stripStructuredSections(body: string): string {
  const lines = body.split(/\r?\n/);
  const out: string[] = [];
  let skip = false;
  for (const line of lines) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      skip = STRUCTURED_HEADINGS.has(heading[1].trim().toLowerCase());
      if (skip) continue;
    }
    if (!skip) out.push(line);
  }
  return out.join('\n').replace(/^\s*#\s+.+\n+/, '').trim();
}

export function extractFdaDisclaimer(body: string): string | null {
  const lines = body.split(/\r?\n/);
  const captured: string[] = [];
  let capturing = false;
  for (const line of lines) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      if (capturing) break;
      capturing = heading[1].trim().toLowerCase() === 'fda disclaimer';
      continue;
    }
    if (capturing) captured.push(line);
  }
  const text = captured.join(' ').replace(/\s+/g, ' ').trim();
  return text.length > 0 ? text : null;
}

export function toEducationCardView(card: ParsedCard): NutritionGeneticsEducationCard {
  return {
    slug: card.frontmatter.slug,
    title: card.title,
    subtitle: card.subtitle,
    leadText: card.leadText,
    narrativeBody: stripStructuredSections(card.body),
    keyTakeaways: card.keyTakeaways,
    whatToDoNext: card.whatToDoNext,
    relatedSlugs: card.relatedSlugs.filter((related) => SLUG_SET.has(related)),
    citations: card.citations,
    medicalCautionLevel: card.frontmatter.medical_caution_level,
    confirmedRsIds: extractConfirmedRsIds(card.body),
    estimatedReadingTimeMinutes: card.estimatedReadingTimeMinutes,
    fdaDisclaimer: extractFdaDisclaimer(card.body),
  };
}

export function loadNutritionGeneticsEducationCards(
  cwd: string = process.cwd(),
): NutritionGeneticsEducationCard[] {
  const root = resolveEducationalCardsRoot(cwd);
  const loaded = loadEducationalCards(root);
  const bySlug = new Map<string, ParsedCard>();
  for (const card of loaded) {
    if (card.frontmatter.primary_category !== 'genetic_education') continue;
    if (!SLUG_SET.has(card.frontmatter.slug)) continue;
    bySlug.set(card.frontmatter.slug, card);
  }

  const ordered: NutritionGeneticsEducationCard[] = [];
  for (const slug of NUTRITION_GENETICS_EDUCATION_SLUGS) {
    const card = bySlug.get(slug);
    if (!card) continue;
    ordered.push(toEducationCardView(card));
  }
  return ordered;
}

export function loadNutritionGeneticsEducationCard(
  slug: string,
  cwd: string = process.cwd(),
): NutritionGeneticsEducationCard | null {
  if (!isNutritionGeneticsEducationSlug(slug)) return null;
  return (
    loadNutritionGeneticsEducationCards(cwd).find((card) => card.slug === slug) ??
    null
  );
}
