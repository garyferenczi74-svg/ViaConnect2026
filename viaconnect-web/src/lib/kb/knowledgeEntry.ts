// Prompt 204d (2026-06-19): the validated RAG knowledge-base entry schema. This
// is Phase 0, "fix the entry schema", the contract between the clinical/content
// effort (204d) and the ingestion/retrieval pipeline (204e). It defines STRUCTURE
// only and contains NO clinical content: validated content is drafted, cited,
// clinically reviewed, and compliance reviewed by the human-gated workflow, never
// fabricated here.
//
// HARD RULE carried into 204e: only an entry that is BOTH compliance_status
// 'approved' AND retrievable true may ever be returned to the recommendation
// layer. Drafts and pending entries are excluded from retrieval by construction.

export type KbDomain =
  | 'biomarker_monograph' // grounds lab status + decipherment (204c), keyed by biomarker_key
  | 'snp_monograph' // grounds variant interpretation (204b), keyed by rsid or gene
  | 'genotype_biomarker_linkage' // grounds genotype-adjusted ranges (204c), rsid + biomarker_key
  | 'product_knowledge' // grounds supplement recommendations, keyed by sku
  | 'protocol_recommendation' // grounds recommendation logic, keyed by rule_id
  | 'approved_claim' // compliance language, keyed by claim_id
  | 'lifestyle_education'; // general decipherment, keyed by topic

// A through D are acceptable, strongest first. Marketing copy, unsourced
// assertion, and anecdote are NOT a grade: they are excluded from the corpus and
// have no representation in this type by construction.
export type EvidenceGrade = 'A' | 'B' | 'C' | 'D';

export type ComplianceStatus = 'pending' | 'approved' | 'rejected';

export type CitationSourceType =
  | 'systematic_review' // grade A
  | 'meta_analysis' // grade A
  | 'rct' // grade A
  | 'cohort' // grade B
  | 'observational' // grade B
  | 'mechanistic' // grade C, contextual only
  | 'small_study' // grade C, contextual only
  | 'expert_consensus' // grade D, only where higher evidence is absent
  | 'monograph' // grade D
  | 'product_spec' // product attributes only, never clinical effect
  | 'coa'; // product attributes only, never clinical effect

export interface KbCanonicalKeys {
  biomarker_key?: string;
  rsid?: string;
  gene?: string;
  sku?: string;
  claim_id?: string;
  rule_id?: string;
  topic?: string;
}

export interface KbCitation {
  /** The specific claim in `body` that this source supports. */
  claim: string;
  /** Human-readable citation / reference text. */
  source: string;
  source_type: CitationSourceType;
  grade: EvidenceGrade;
  /** Resolvable link where one exists; verified in the citation-verification step. */
  url?: string;
  /**
   * True when the drafting agent could not confirm the exact citation metadata
   * (the claim is sound but the source details need checking). The mandatory
   * citation-verification step MUST resolve this to false before the entry can be
   * approved. Absent or false means the draft believes the citation is real, but
   * verification is still required for every citation regardless.
   */
  unverified?: boolean;
}

export interface KbProvenance {
  drafted_by: string;
  /** The qualified clinician who passed the clinical-review gate. Null until reviewed. */
  reviewed_by: string | null;
  /** The approver (Gary holds approval authority). Null until approved. */
  approved_by: string | null;
}

export interface KbReview {
  last_reviewed: string | null; // ISO date
  next_review_due: string | null; // ISO date
  version: number;
}

export interface KnowledgeEntry {
  id: string;
  domain: KbDomain;
  title: string;
  canonical_keys: KbCanonicalKeys;
  /** Validated content, chunked to a retrieval-appropriate size. */
  body: string;
  evidence_grade: EvidenceGrade;
  /** Every claim in `body` carries a citation; no exceptions. */
  citations: KbCitation[];
  compliance_status: ComplianceStatus;
  /** The exact DSHEA-compliant phrasing permitted for this entry. */
  approved_claims: string[];
  contraindications_and_cautions: string[];
  /** 'none', or the rsIDs/genes that modify this entry. */
  genotype_dependence: 'none' | string[];
  provenance: KbProvenance;
  review: KbReview;
  /** True only once the entry has completed the full validation pipeline. */
  retrievable: boolean;
}

/**
 * The single gate 204e retrieval MUST apply: only approved AND retrievable
 * entries may reach the recommendation layer. Drafts/pending never leak.
 */
export function isRetrievable(entry: KnowledgeEntry): boolean {
  return entry.compliance_status === 'approved' && entry.retrievable === true;
}

/**
 * The structural preconditions for an entry to be eligible to be marked
 * retrievable. This is NOT a substitute for the human clinical-review gate; it
 * is the machine-checkable floor (citations present and graded, clinician and
 * approver recorded, version stamped). An entry can only be flipped retrievable
 * after a clinician has signed off (provenance.reviewed_by) and compliance has
 * approved it.
 */
export function meetsRetrievabilityPreconditions(entry: KnowledgeEntry): boolean {
  return (
    entry.compliance_status === 'approved' &&
    entry.citations.length > 0 &&
    entry.citations.every((c) => c.source.trim().length > 0) &&
    entry.provenance.reviewed_by !== null &&
    entry.provenance.approved_by !== null &&
    entry.review.version >= 1
  );
}
