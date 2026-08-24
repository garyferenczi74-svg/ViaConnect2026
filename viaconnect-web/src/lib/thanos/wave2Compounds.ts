/**
 * Prompt 225a Wave 2: chunked educational peptides beyond Wave 1 flagships.
 * Gary 2026-08-22: ingest eligibility no longer requires consumer_safe
 * (education first; Marshall gates consumer visibility separately).
 */

import { createAdminClient } from '@/lib/supabase/admin';
import {
  WAVE1_COMPOUNDS,
  type Wave1Compound,
  type Wave1TermSource,
} from '@/lib/thanos/wave1Compounds';

export const WAVE1_SLUG_SET = new Set(WAVE1_COMPOUNDS.map((c) => c.slug));

export interface Wave2BatchOptions {
  /** Skip this many non-Wave1 educational peptides (ordered by slug). */
  offset?: number;
  /** Max compounds in this chunk (default 10, max 25). */
  limit?: number;
}

function termFromName(name: string, source: Wave1TermSource): Wave1Compound['terms'][number] | null {
  const term = name.trim();
  if (term.length < 3) return null;
  return { term, termSource: source };
}

/**
 * Resolve next Wave 2 chunk from live kb_peptides.
 * Uses display_name / canonical_name / slug as query terms (no invented synonyms).
 */
export async function loadWave2Compounds(
  opts?: Wave2BatchOptions,
): Promise<{
  compounds: Wave1Compound[];
  offset: number;
  limit: number;
  totalEligible: number;
  nextOffset: number | null;
}> {
  const offset = Math.max(0, opts?.offset ?? 0);
  const limit = Math.min(25, Math.max(1, opts?.limit ?? 10));
  const admin = createAdminClient();

  const { data, error, count } = await admin
    .from('kb_peptides')
    .select('slug, display_name, canonical_name, exclusion_tier', { count: 'exact' })
    .eq('exclusion_tier', 'educational')
    .order('slug', { ascending: true });

  if (error) {
    throw new Error(`wave2_load_failed:${error.message}`.slice(0, 160));
  }

  const eligible = (data ?? []).filter((r) => r.slug && !WAVE1_SLUG_SET.has(String(r.slug)));
  const totalEligible = count != null
    ? Math.max(0, (count as number) - WAVE1_SLUG_SET.size)
    : eligible.length;

  const slice = eligible.slice(offset, offset + limit);
  const compounds: Wave1Compound[] = slice.map((r) => {
    const slug = String(r.slug);
    const display = String(r.display_name ?? r.canonical_name ?? slug);
    const terms: Wave1Compound['terms'] = [];
    const canonical = termFromName(String(r.canonical_name ?? display), 'canonical');
    const displayTerm = termFromName(display, 'community_name');
    const slugTerm = termFromName(slug.replace(/^edu-/, '').replace(/-/g, ' '), 'canonical');
    if (canonical) terms.push(canonical);
    if (displayTerm && displayTerm.term.toLowerCase() !== canonical?.term.toLowerCase()) {
      terms.push(displayTerm);
    }
    if (
      slugTerm &&
      !terms.some((t) => t.term.toLowerCase() === slugTerm.term.toLowerCase())
    ) {
      terms.push(slugTerm);
    }
    if (terms.length === 0) {
      terms.push({ term: display || slug, termSource: 'canonical' });
    }
    return { slug, display, terms };
  });

  const nextOffset =
    offset + compounds.length < eligible.length ? offset + compounds.length : null;

  return {
    compounds,
    offset,
    limit,
    totalEligible: eligible.length || totalEligible,
    nextOffset,
  };
}
