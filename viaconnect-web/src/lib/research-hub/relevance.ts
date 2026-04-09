// Research Hub — Local relevance scoring engine.
// Pure JavaScript scoring against the user's profile/CAQ/protocols.
// Zero API cost — runs entirely client-side using data we already fetch.

import type { ResearchItem } from './types';

export interface RelevanceContext {
  /** Normalized free-text concerns (CAQ, profile.health_concerns, opportunities). */
  healthConcerns: string[];
  /** Active supplement names (from useUserDashboardData.supplements). */
  supplements: string[];
  /** Active medications (from CAQ phase 6 if available). */
  medications: string[];
  /** Genetic variants the user knows about (e.g. "MTHFR C677T", "COMT V158M"). */
  geneticVariants: string[];
  /** Top wellness category labels (sleep, methylation, gut, etc.). */
  wellnessCategories: string[];
  /** Bio Optimization tier text (used for downstream weighting if needed). */
  bioTier?: string | null;
}

export interface RelevanceResult {
  score: number;          // 0-100
  reasons: string[];      // Human-readable match descriptions
  matchedDomains: string[]; // Tag-style domains: 'genetics', 'supplements', 'protocol', etc.
}

// ─── Domain dictionaries ───────────────────────────────────
// Curated keyword lists used for fuzzy domain matching when the user's
// own data doesn't directly mention a term but the topic still aligns
// with their wellness journey.

const DOMAIN_KEYWORDS: Record<string, string[]> = {
  methylation: ['methylation', 'mthfr', 'methylfolate', 'b12', 'folate', 'homocysteine', 'same'],
  sleep: ['sleep', 'circadian', 'melatonin', 'magnesium glycinate', 'nsdr', 'insomnia'],
  stress: ['stress', 'cortisol', 'hpa', 'ashwagandha', 'rhodiola', 'adaptogen', 'anxiety'],
  gut: ['gut', 'microbiome', 'probiotic', 'digestion', 'leaky', 'sibo', 'ibs'],
  inflammation: ['inflammation', 'curcumin', 'turmeric', 'omega-3', 'nf-kb', 'nrf2'],
  hormonal: ['hormone', 'thyroid', 'estrogen', 'progesterone', 'testosterone', 'cortisol'],
  cognitive: ['cognition', 'brain', 'nootropic', 'focus', 'memory', 'lions mane', 'creatine'],
  longevity: ['longevity', 'aging', 'nad', 'nmn', 'sirtuin', 'telomere', 'senolytic'],
  detox: ['detox', 'glutathione', 'sulforaphane', 'liver', 'phase ii'],
  immune: ['immune', 'zinc', 'vitamin d', 'quercetin', 'elderberry'],
  metabolic: ['metabolic', 'insulin', 'glucose', 'a1c', 'berberine', 'glp', 'metformin'],
  cardiovascular: ['cardio', 'heart', 'blood pressure', 'lipid', 'hdl', 'ldl', 'coq10'],
  peptides: ['peptide', 'bpc-157', 'tb-500', 'cjc-1295', 'ipamorelin', 'ghk'],
  bioavailability: ['bioavailability', 'liposomal', 'micellar', 'absorption'],
};

const DOMAIN_LABELS: Record<string, string> = {
  methylation: 'Methylation',
  sleep: 'Sleep',
  stress: 'Stress',
  gut: 'Gut Health',
  inflammation: 'Inflammation',
  hormonal: 'Hormones',
  cognitive: 'Cognition',
  longevity: 'Longevity',
  detox: 'Detox',
  immune: 'Immune',
  metabolic: 'Metabolic',
  cardiovascular: 'Cardiovascular',
  peptides: 'Peptides',
  bioavailability: 'Bioavailability',
};

// ─── Tokenization helpers ──────────────────────────────────
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'in', 'is',
  'it', 'of', 'on', 'or', 'that', 'the', 'to', 'was', 'with', 'this', 'these',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

function containsAnyTerm(haystack: string, needles: string[]): { hit: boolean; matches: string[] } {
  const matches: string[] = [];
  for (const n of needles) {
    if (!n) continue;
    const term = normalize(n);
    if (term.length < 3) continue;
    if (haystack.includes(term)) matches.push(n);
  }
  return { hit: matches.length > 0, matches };
}

// ─── Scoring ───────────────────────────────────────────────
// Weighted composite per the prompt:
//   Health concerns:        30%
//   Protocol alignment:     25% (active supplement / med terms)
//   Genetic relevance:      20%
//   Wellness category:      15%
//   Bioavailability/topic:  10% (general wellness alignment via DOMAIN_KEYWORDS)

export function scoreRelevance(
  item: ResearchItem,
  context: RelevanceContext,
): RelevanceResult {
  const haystack = [item.title || '', item.summary || '', (item.tags || []).join(' ')]
    .join(' ')
    .toLowerCase();
  const reasons: string[] = [];
  const matchedDomains = new Set<string>();
  let score = 0;

  // ── 1. Health concerns (30%) ───────────────────────────
  const concerns = containsAnyTerm(haystack, context.healthConcerns);
  if (concerns.hit) {
    const weight = Math.min(30, 10 + concerns.matches.length * 8);
    score += weight;
    reasons.push(`Matches your health concern${concerns.matches.length > 1 ? 's' : ''}: ${concerns.matches.slice(0, 2).join(', ')}`);
    matchedDomains.add('concerns');
  }

  // ── 2. Active supplements / protocols (25%) ────────────
  const supps = containsAnyTerm(haystack, context.supplements);
  if (supps.hit) {
    const weight = Math.min(25, 12 + supps.matches.length * 6);
    score += weight;
    reasons.push(`Discusses your protocol: ${supps.matches.slice(0, 2).join(', ')}`);
    matchedDomains.add('protocol');
  }

  const meds = containsAnyTerm(haystack, context.medications);
  if (meds.hit) {
    score += 10;
    reasons.push(`Mentions a medication you take: ${meds.matches[0]}`);
    matchedDomains.add('medications');
  }

  // ── 3. Genetic variants (20%) ─────────────────────────
  const variants = containsAnyTerm(haystack, context.geneticVariants);
  if (variants.hit) {
    const weight = Math.min(20, 12 + variants.matches.length * 5);
    score += weight;
    reasons.push(`Relevant to your genetic variant: ${variants.matches[0]}`);
    matchedDomains.add('genetics');
  }

  // ── 4. Wellness categories (15%) ──────────────────────
  const cats = containsAnyTerm(haystack, context.wellnessCategories);
  if (cats.hit) {
    const weight = Math.min(15, 8 + cats.matches.length * 3);
    score += weight;
    reasons.push(`Aligns with your top wellness focus: ${cats.matches[0]}`);
    matchedDomains.add('wellness_category');
  }

  // ── 5. Domain keyword fuzzy match (10%) ───────────────
  let domainHits = 0;
  for (const [domain, kws] of Object.entries(DOMAIN_KEYWORDS)) {
    if (kws.some((kw) => haystack.includes(kw))) {
      matchedDomains.add(domain);
      domainHits++;
    }
  }
  if (domainHits > 0) {
    score += Math.min(10, domainHits * 3);
    if (reasons.length === 0) {
      const sample = Array.from(matchedDomains)
        .filter((d) => DOMAIN_LABELS[d])
        .slice(0, 2)
        .map((d) => DOMAIN_LABELS[d])
        .join(', ');
      if (sample) reasons.push(`General wellness alignment: ${sample}`);
    }
  }

  // ── Tag-based bonus (small) ───────────────────────────
  const tagText = (item.tags || []).join(' ').toLowerCase();
  if (tagText && (tagText.includes('bioavailability') || tagText.includes('liposomal'))) {
    score += 3;
    matchedDomains.add('bioavailability');
  }

  // Clamp + ensure base score for items in active feeds so users see
  // *something* on day 1 even with empty profile data.
  if (score === 0) {
    score = 35; // baseline "Interesting"
    reasons.push('General wellness research from your feed');
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  return { score, reasons, matchedDomains: Array.from(matchedDomains) };
}

// ─── Context builder (no API calls) ────────────────────────
// Builds a RelevanceContext from data already fetched by useUserDashboardData.

interface RawProfile {
  bio_optimization_strengths?: string[] | null;
  bio_optimization_opportunities?: string[] | null;
  bio_optimization_tier?: string | null;
}

interface RawSupplement {
  product_name?: string | null;
  supplement_name?: string | null;
}

export function buildRelevanceContext(input: {
  profile?: RawProfile | null;
  supplements?: RawSupplement[];
  healthConcerns?: string[];
  geneticVariants?: string[];
  medications?: string[];
  wellnessCategories?: string[];
}): RelevanceContext {
  const concerns = new Set<string>();
  (input.healthConcerns || []).forEach((c) => concerns.add(c));
  (input.profile?.bio_optimization_opportunities || []).forEach((c) => concerns.add(c));
  (input.profile?.bio_optimization_strengths || []).forEach((c) => concerns.add(c));

  const supps = (input.supplements || [])
    .map((s) => s.product_name || s.supplement_name || '')
    .filter(Boolean);

  return {
    healthConcerns: Array.from(concerns),
    supplements: supps,
    medications: input.medications || [],
    geneticVariants: input.geneticVariants || [],
    wellnessCategories: input.wellnessCategories || [],
    bioTier: input.profile?.bio_optimization_tier || null,
  };
}

// ─── Bulk scoring helper ───────────────────────────────────
export function scoreItems(
  items: ResearchItem[],
  context: RelevanceContext,
): Array<{ item: ResearchItem; result: RelevanceResult }> {
  return items.map((item) => ({ item, result: scoreRelevance(item, context) }));
}
