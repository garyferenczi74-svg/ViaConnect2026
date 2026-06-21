/**
 * src/lib/kb/knowledgeAtoms.ts
 *
 * Atom persistence and retrieval for the Prompt 208 knowledge corpus
 * (Phase 2, Task 6, 2026-06-20).
 *
 * Three public functions:
 *   atomFromEntry   -- maps a KnowledgeEntry to a KnowledgeAtomInsert (no DB)
 *   getPublishedAtoms -- reads ONLY published rows (Gate B: never drafts)
 *   upsertAtomDraft   -- idempotent insert of a draft atom (select-then-insert)
 *
 * seedMonographsAsDrafts is the convenience runner that converts all 29
 * methylation monographs and persists them as drafts. It is idempotent and
 * MUST NOT be called against the live DB from tests (tests mock the client).
 *
 * No em/en-dashes. No emojis.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import { embedText } from './embeddings';
import { gradeToTier } from './evidenceTier';
import { METHYLATION_SNP_MONOGRAPHS } from './seeds/methylationSnpMonographs';
import type { KnowledgeEntry } from './knowledgeEntry';

// ---------------------------------------------------------------------------
// Domain type (knowledge_atoms.domain column -- scientific domain, NOT KbDomain)
// ---------------------------------------------------------------------------
export type KnowledgeAtomDomain =
  | 'methylation'
  | 'nutrition'
  | 'hormones'
  | 'epigenetics'
  | 'peptides'
  | 'cannabinoid'
  | 'longevity';

// ---------------------------------------------------------------------------
// Shape types mirroring the knowledge_atoms table columns.
// ---------------------------------------------------------------------------

export interface KnowledgeAtomInsert {
  domain: KnowledgeAtomDomain;
  claim: string;
  mechanism: string | null;
  evidence_tier: 1 | 2 | 3;
  source_type: string;
  source_authority: 'pubmed' | 'consensus' | 'clinicaltrials' | 'internal_study' | 'open_web';
  source_url: string | null;
  citation: string | null;
  snp_refs: string[];
  nutrient_refs: string[];
  supplement_refs: string[];
  contraindications: unknown;
  review_status: 'draft' | 'in_review' | 'published' | 'rejected' | 'retired';
  reviewed_by: string | null;
  confidence: number | null;
  // embedding is intentionally absent here -- the seed step attaches it separately
  last_verified_at: string | null;
}

export interface KnowledgeAtom extends KnowledgeAtomInsert {
  id: string;
  created_at: string;
  embedding: number[] | null;
}

// ---------------------------------------------------------------------------
// Map a KnowledgeEntry to a KnowledgeAtomInsert.
//
// evidence_tier  -- gradeToTier(entry.evidence_grade)
// snp_refs       -- [entry.canonical_keys.rsid] when present, else []
// claim          -- entry.body (the full validated content chunk)
// mechanism      -- null (not separately stored in KnowledgeEntry schema)
// citation       -- first citation source text, or null
// source_url     -- first citation url, or null
// source_type    -- first citation source_type, or 'monograph'
// source_authority -- 'pubmed' when a pubmed url present; else 'internal_study'
// review_status  -- always 'draft' (never published; human gate is the only path to live)
// reviewed_by    -- provenance.reviewed_by (null for all current draft monographs)
// embedding      -- NOT set here; the seed step calls embedText separately
// ---------------------------------------------------------------------------
export function atomFromEntry(
  entry: KnowledgeEntry,
  domain: KnowledgeAtomDomain,
): KnowledgeAtomInsert {
  const firstCitation = entry.citations.length > 0 ? entry.citations[0] : null;

  // Determine source_authority from the first citation url.
  let sourceAuthority: KnowledgeAtomInsert['source_authority'] = 'internal_study';
  if (firstCitation?.url) {
    const url = firstCitation.url.toLowerCase();
    if (url.includes('pubmed') || url.includes('ncbi.nlm.nih.gov')) {
      sourceAuthority = 'pubmed';
    } else if (url.includes('clinicaltrials.gov')) {
      sourceAuthority = 'clinicaltrials';
    } else if (url.includes('cochrane') || url.includes('consensus')) {
      sourceAuthority = 'consensus';
    } else {
      sourceAuthority = 'open_web';
    }
  }

  // Build contraindications from the entry's cautions array.
  const contraindications =
    entry.contraindications_and_cautions.length > 0
      ? entry.contraindications_and_cautions
      : null;

  return {
    domain,
    claim: entry.body,
    mechanism: null,
    evidence_tier: gradeToTier(entry.evidence_grade),
    source_type: firstCitation ? firstCitation.source_type : 'monograph',
    source_authority: sourceAuthority,
    source_url: firstCitation?.url ?? null,
    citation: firstCitation ? firstCitation.source : null,
    snp_refs: entry.canonical_keys.rsid ? [entry.canonical_keys.rsid] : [],
    nutrient_refs: [],
    supplement_refs: [],
    contraindications,
    review_status: 'draft',
    reviewed_by: entry.provenance.reviewed_by ?? null,
    confidence: null,
    last_verified_at: null,
  };
}

// ---------------------------------------------------------------------------
// Read ONLY published atoms. Gate B: never return drafts.
//
// Applies in-memory filtering for domain and snpRef so the DB call is always
// anchored on review_status = 'published'. Fail-open: returns [] on error.
// ---------------------------------------------------------------------------
export async function getPublishedAtoms(filter?: {
  domain?: KnowledgeAtomDomain;
  snpRef?: string;
}): Promise<KnowledgeAtom[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('knowledge_atoms')
    .select('*')
    .eq('review_status', 'published');

  if (error || !data) {
    return [];
  }

  let rows = data as KnowledgeAtom[];

  // In-memory filters (domain, snpRef) applied after the DB call so the
  // review_status gate is always the primary predicate sent to the DB.
  if (filter?.domain) {
    rows = rows.filter((r) => r.domain === filter.domain);
  }
  if (filter?.snpRef) {
    rows = rows.filter(
      (r) => Array.isArray(r.snp_refs) && r.snp_refs.includes(filter.snpRef as string),
    );
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Idempotent draft upsert (select-then-insert).
//
// Checks for an existing row by (claim) before inserting. This avoids
// duplicate rows when the seed is re-run. A future migration may add a
// unique constraint on (domain, claim) to enforce this at the DB level.
// embedding is accepted here to allow the seed step to attach it before saving.
// ---------------------------------------------------------------------------
export async function upsertAtomDraft(
  atom: KnowledgeAtomInsert & { embedding?: number[] | null },
): Promise<void> {
  const supabase = createAdminClient();

  // Existence check: find any row with the same (domain, claim) pair.
  const { data: existing, error: selectError } = await supabase
    .from('knowledge_atoms')
    .select('id')
    .eq('domain', atom.domain)
    .eq('claim', atom.claim);

  if (selectError) {
    // Fail-open: log and skip rather than hard-throw during seeding.
    return;
  }

  if (existing && existing.length > 0) {
    // Row already present -- skip (idempotent).
    return;
  }

  // Build the row to insert, including embedding if provided.
  const row: Record<string, unknown> = {
    domain: atom.domain,
    claim: atom.claim,
    mechanism: atom.mechanism,
    evidence_tier: atom.evidence_tier,
    source_type: atom.source_type,
    source_authority: atom.source_authority,
    source_url: atom.source_url,
    citation: atom.citation,
    snp_refs: atom.snp_refs,
    nutrient_refs: atom.nutrient_refs,
    supplement_refs: atom.supplement_refs,
    contraindications: atom.contraindications,
    review_status: atom.review_status,
    reviewed_by: atom.reviewed_by,
    confidence: atom.confidence,
    embedding: atom.embedding ?? null,
    last_verified_at: atom.last_verified_at,
  };

  await supabase.from('knowledge_atoms').insert([row]);
}

// ---------------------------------------------------------------------------
// Seed all 29 methylation monographs as DRAFT atoms.
//
// For each monograph:
//   1. Convert via atomFromEntry (domain = 'methylation').
//   2. Embed the claim text (null tolerated -- fails open).
//   3. Upsert as draft (idempotent: skip if (domain, claim) already present).
//
// Returns { inserted, skipped, failed } counts. MUST NOT be called against
// the live DB from tests -- always mock createAdminClient and embedText.
// ---------------------------------------------------------------------------
export async function seedMonographsAsDrafts(): Promise<{
  inserted: number;
  skipped: number;
  failed: number;
}> {
  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  const supabase = createAdminClient();

  for (const entry of METHYLATION_SNP_MONOGRAPHS) {
    const atom = atomFromEntry(entry, 'methylation');

    // Attach embedding (null tolerated).
    const embedding = await embedText(atom.claim);

    // Existence check on (domain, claim).
    const { data: existing } = await supabase
      .from('knowledge_atoms')
      .select('id')
      .eq('domain', atom.domain)
      .eq('claim', atom.claim);

    if (existing && existing.length > 0) {
      skipped++;
      continue;
    }

    // Insert.
    const row: Record<string, unknown> = {
      domain: atom.domain,
      claim: atom.claim,
      mechanism: atom.mechanism,
      evidence_tier: atom.evidence_tier,
      source_type: atom.source_type,
      source_authority: atom.source_authority,
      source_url: atom.source_url,
      citation: atom.citation,
      snp_refs: atom.snp_refs,
      nutrient_refs: atom.nutrient_refs,
      supplement_refs: atom.supplement_refs,
      contraindications: atom.contraindications,
      review_status: atom.review_status,
      reviewed_by: atom.reviewed_by,
      confidence: atom.confidence,
      embedding: embedding,
      last_verified_at: atom.last_verified_at,
    };

    const { error: insertError } = await supabase.from('knowledge_atoms').insert([row]);

    if (insertError) {
      safeLog.error('kb.seed', 'Failed to insert knowledge atom draft', {
        claim: atom.claim,
        domain: atom.domain,
        error: insertError,
      });
      failed++;
    } else {
      inserted++;
    }
  }

  return { inserted, skipped, failed };
}
