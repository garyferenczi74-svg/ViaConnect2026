// src/lib/research/gapScheduler.ts
//
// Gap-driven domain scheduler for the Prompt 208 research pass.
// Queries knowledge_queries for gap rows and orders research domains
// by gap count (descending), so domains with more unanswered user
// questions are researched first.
//
// Fail-open: on DB error, returns RESEARCH_DOMAINS in natural order.
//
// Prompt 208, Phase 6, Task 17 (2026-06-21).
// No em/en-dashes. No emojis.

import { createAdminClient } from '@/lib/supabase/admin'
import { safeLog } from '@/lib/utils/safe-log'
import { RESEARCH_DOMAINS } from './researchPass'
import type { ResearchDomain } from './researchPass'

// ---------------------------------------------------------------------------
// Mapping from conversational domain -> research domain.
//
// knowledge_queries.domain uses 6 conversational domains:
//   genomics, nutraceuticals, biohacking, athletics, weightloss, longevity
//
// research domains are the 7 in RESEARCH_DOMAINS.
// ---------------------------------------------------------------------------

const CONVERSATIONAL_TO_RESEARCH: Record<string, ResearchDomain> = {
  genomics: 'methylation',
  nutraceuticals: 'nutrition',
  biohacking: 'epigenetics',
  athletics: 'hormones',
  weightloss: 'nutrition',
  longevity: 'longevity',
}

// ---------------------------------------------------------------------------
// nextDomains
//
// Returns all 7 RESEARCH_DOMAINS ordered by gap count DESC.
// Domains with no gaps are appended in their natural RESEARCH_DOMAINS order.
// Fail-open: on error, returns RESEARCH_DOMAINS in natural order.
// ---------------------------------------------------------------------------

export async function nextDomains(): Promise<ResearchDomain[]> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('knowledge_queries')
      .select('domain')
      .eq('coverage', 'gap')

    if (error || !data) {
      safeLog.warn('research.gapScheduler', 'Failed to query knowledge_queries gaps', {
        error,
      })
      return [...RESEARCH_DOMAINS]
    }

    // Count gaps per research domain
    const gapCounts: Map<ResearchDomain, number> = new Map()
    for (const domain of RESEARCH_DOMAINS) {
      gapCounts.set(domain, 0)
    }

    for (const row of data as { domain: string }[]) {
      const researchDomain = CONVERSATIONAL_TO_RESEARCH[row.domain]
      if (researchDomain) {
        const prev = gapCounts.get(researchDomain) ?? 0
        gapCounts.set(researchDomain, prev + 1)
      }
    }

    // Sort: domains with gaps first (by count DESC), then no-gap domains in natural order
    const withGaps = RESEARCH_DOMAINS.filter((d) => (gapCounts.get(d) ?? 0) > 0).sort(
      (a, b) => (gapCounts.get(b) ?? 0) - (gapCounts.get(a) ?? 0),
    )

    const withoutGaps = RESEARCH_DOMAINS.filter((d) => (gapCounts.get(d) ?? 0) === 0)

    return [...withGaps, ...withoutGaps]
  } catch (err) {
    safeLog.error('research.gapScheduler', 'Unexpected error in nextDomains', {
      error: err instanceof Error ? err.message : String(err),
    })
    return [...RESEARCH_DOMAINS]
  }
}
