// src/lib/research/researchPass.ts
//
// Autonomous per-domain research pass for the Prompt 208 knowledge corpus.
// Deterministic (no LLM call). Fail-open (never throws to caller).
// Idempotent (re-running does not duplicate atoms).
// Never writes user_protocol_synthesis.
//
// Prompt 208, Phase 6, Task 17 (2026-06-21).
// No em/en-dashes. No emojis.

import { searchPubMed } from '@/lib/research/sources/pubmed'
import { searchClinicalTrials } from '@/lib/research/sources/clinicalTrials'
import { searchConsensus } from '@/lib/research/sources/consensus'
import { embedText } from '@/lib/kb/embeddings'
import { upsertAtomDraft } from '@/lib/kb/knowledgeAtoms'
import { getPublishedRules } from '@/lib/kb/snpProtocolRules'
import { createAdminClient } from '@/lib/supabase/admin'
import { safeLog } from '@/lib/utils/safe-log'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const RESEARCH_DOMAINS = [
  'methylation',
  'nutrition',
  'hormones',
  'epigenetics',
  'peptides',
  'cannabinoid',
  'longevity',
] as const

export type ResearchDomain = typeof RESEARCH_DOMAINS[number]

export const DOMAIN_QUERIES: Record<ResearchDomain, string> = {
  methylation: 'MTHFR methylation SNP nutrition',
  nutrition: 'nutrigenomics nutrient gene variant',
  hormones: 'hormone SNP genetic variant endocrine',
  epigenetics: 'epigenetics DNA methylation gene expression',
  peptides: 'peptide bioactive supplement clinical trial',
  cannabinoid: 'cannabinoid receptor SNP genetic variant endocannabinoid',
  longevity: 'longevity aging SNP genetic variant healthspan',
}

// ---------------------------------------------------------------------------
// Pure helper: tier for source authority
// ---------------------------------------------------------------------------

export function tierForAuthority(a: string): 1 | 2 | 3 {
  if (a === 'pubmed' || a === 'clinicaltrials' || a === 'consensus') return 2
  return 3
}

// ---------------------------------------------------------------------------
// Pure helper: extract rsIDs from text
// ---------------------------------------------------------------------------

export function extractRsids(text: string): string[] {
  const matches = text.match(/rs\d+/gi)
  if (!matches) return []
  const lower = matches.map((m) => m.toLowerCase())
  return Array.from(new Set(lower))
}

// ---------------------------------------------------------------------------
// Pure helper: cosine similarity
// ---------------------------------------------------------------------------

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0

  let dot = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  if (denom === 0) return 0
  return dot / denom
}

// ---------------------------------------------------------------------------
// RunResult
// ---------------------------------------------------------------------------

export interface RunResult {
  domain: string
  atomsCreated: number
  atomsRejected: number
  sourcesQueried: string[]
  status: 'ok' | 'partial' | 'error'
  durationMs: number
}

// ---------------------------------------------------------------------------
// runResearchPass
//
// Idempotent, fail-open, deterministic. Never throws to caller.
// Never writes user_protocol_synthesis.
// ---------------------------------------------------------------------------

export async function runResearchPass(domain: ResearchDomain): Promise<RunResult> {
  const start = Date.now()
  const sourcesQueried = ['pubmed', 'clinicaltrials', 'consensus']

  let atomsCreated = 0
  let atomsRejected = 0

  try {
    const query = DOMAIN_QUERIES[domain]

    // Step 1: Query all three source clients (each is already fail-open -> [])
    const [pubmedSources, ctSources, consensusSources] = await Promise.all([
      searchPubMed(query).catch(() => []),
      searchClinicalTrials(query).catch(() => []),
      searchConsensus(query).catch(() => []),
    ])

    const allSources = [...pubmedSources, ...ctSources, ...consensusSources]

    // Step 2: Load existing atom embeddings (all statuses) for this domain for dedup.
    let existingEmbeddings: number[][] = []

    try {
      const supabase = createAdminClient()
      const { data, error } = await supabase
        .from('knowledge_atoms')
        .select('claim, embedding')
        .eq('domain', domain)

      if (!error && data) {
        for (const row of data as { claim: string; embedding: string | number[] | null }[]) {
          if (!row.embedding) continue
          try {
            const parsed: number[] =
              typeof row.embedding === 'string' ? JSON.parse(row.embedding) : row.embedding
            if (Array.isArray(parsed) && parsed.length > 0) {
              existingEmbeddings.push(parsed)
            }
          } catch {
            // skip rows whose embedding cannot be parsed
          }
        }
      }
    } catch (err) {
      safeLog.warn('research.pass', 'Failed to load existing embeddings for dedup', {
        domain,
        error: err instanceof Error ? err.message : String(err),
      })
    }

    // Step 3: Load published rules to check for rsid promotion.
    let ruleRsids: Set<string> = new Set()
    try {
      const rules = await getPublishedRules()
      for (const r of rules) {
        if (r.rsid) ruleRsids.add(r.rsid.toLowerCase())
      }
    } catch (err) {
      safeLog.warn('research.pass', 'Failed to load published rules', {
        domain,
        error: err instanceof Error ? err.message : String(err),
      })
    }

    // Step 4: Process each source
    for (const source of allSources) {
      try {
        const snpRefs = extractRsids(source.title)
        const candidate = {
          domain,
          claim: source.title,
          mechanism: null as null,
          evidence_tier: tierForAuthority(source.sourceAuthority) as 1 | 2 | 3,
          source_type: 'literature' as const,
          source_authority: source.sourceAuthority as
            | 'pubmed'
            | 'consensus'
            | 'clinicaltrials'
            | 'internal_study'
            | 'open_web',
          source_url: source.url,
          citation: `${source.title} (${source.identifier})`,
          snp_refs: snpRefs,
          nutrient_refs: [] as string[],
          supplement_refs: [] as string[],
          contraindications: null as null,
          review_status: 'draft' as 'draft' | 'in_review' | 'published' | 'rejected' | 'retired',
          reviewed_by: null as null,
          confidence: null as null,
          last_verified_at: null as null,
        }

        // Embed and dedup
        let emb: number[] | null = null
        try {
          emb = await embedText(candidate.claim)
        } catch {
          emb = null
        }

        if (emb !== null) {
          // Check cosine similarity against existing embeddings
          let maxSim = 0
          for (const existing of existingEmbeddings) {
            const sim = cosineSimilarity(emb, existing)
            if (sim > maxSim) maxSim = sim
          }
          if (maxSim > 0.92) {
            atomsRejected++
            continue
          }
        }

        // Promote: if any rsid in snpRefs matches a published rule
        const hasRuleMatch = snpRefs.some((r) => ruleRsids.has(r.toLowerCase()))
        if (hasRuleMatch) {
          candidate.review_status = 'in_review'
        }

        // Upsert (idempotent on domain+claim)
        await upsertAtomDraft({ ...candidate, embedding: emb })
        atomsCreated++

        // Add new embedding to in-memory list for within-pass dedup
        if (emb !== null) {
          existingEmbeddings = [...existingEmbeddings, emb]
        }
      } catch (err) {
        safeLog.error('research.pass', 'Error processing source', {
          domain,
          title: source.title,
          error: err instanceof Error ? err.message : String(err),
        })
        atomsRejected++
      }
    }

    // Step 5 + 6: Write run log row
    const durationMs = Date.now() - start
    try {
      const supabase = createAdminClient()
      const { error: logError } = await supabase.from('research_run_log').insert([
        {
          domain,
          sources_queried: sourcesQueried,
          atoms_created: atomsCreated,
          atoms_rejected: atomsRejected,
          gaps_recorded: 0,
          duration_ms: durationMs,
          status: 'ok',
        },
      ])
      if (logError) {
        safeLog.error('research.pass', 'Failed to write research_run_log', {
          domain,
          error: logError,
        })
      }
    } catch (err) {
      safeLog.error('research.pass', 'research_run_log insert threw', {
        domain,
        error: err instanceof Error ? err.message : String(err),
      })
    }

    return {
      domain,
      atomsCreated,
      atomsRejected,
      sourcesQueried,
      status: 'ok',
      durationMs,
    }
  } catch (err) {
    // Top-level catch: never throws to caller
    safeLog.error('research.pass', 'Unexpected error in runResearchPass', {
      domain,
      error: err instanceof Error ? err.message : String(err),
    })

    const durationMs = Date.now() - start

    // Write error log row (best-effort)
    try {
      const supabase = createAdminClient()
      await supabase.from('research_run_log').insert([
        {
          domain,
          sources_queried: sourcesQueried,
          atoms_created: atomsCreated,
          atoms_rejected: atomsRejected,
          gaps_recorded: 0,
          duration_ms: durationMs,
          status: 'error',
        },
      ])
    } catch {
      // ignore
    }

    return {
      domain,
      atomsCreated,
      atomsRejected,
      sourcesQueried,
      status: 'error',
      durationMs,
    }
  }
}
