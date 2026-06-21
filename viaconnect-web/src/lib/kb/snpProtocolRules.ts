/**
 * src/lib/kb/snpProtocolRules.ts
 *
 * SNP-to-protocol rule seed anchor list + read/match helpers.
 *
 * Prompt 208 Phase 2 Task 7 (2026-06-21).
 *
 * The SEED_RULES array encodes the clinical anchor list: variant + genotype ->
 * recommended action. ALL entries ship as 'draft' or 'in_review' only. The
 * human clinical+compliance gate is the ONLY path to 'published'. No entry in
 * this file reaches users until that gate is passed.
 *
 * Key design decisions:
 *   - genotype_match of '' or '*' is a wildcard that matches any genotype.
 *   - HFE entries carry sensitive: false explicitly (iron contraindication is
 *     a safety interlock, not a consent-gated sensitive topic).
 *   - APOE entries carry sensitive: true (consent-gated, never default surfaced).
 *   - Genotype matching is order-independent via canonicalGenotype from
 *     variantSeverity.ts: 'CT' and 'TC' resolve to the same canonical form.
 *   - seedRulesAsDrafts deduplicates on (rsid, genotype_match, action_type) so
 *     re-running the seed is always idempotent.
 *   - getPublishedRules queries review_status = 'published' ONLY. Gate B.
 *
 * No em/en-dashes. No emojis. No package.json changes. No live DB writes from
 * this file; the seed function must be called explicitly by the controller.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { canonicalGenotype } from '@/lib/genetics/variantSeverity';
import type { EvidenceTier } from './evidenceTier';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SnpProtocolActionType =
  | 'prefer_form'
  | 'avoid_intake'
  | 'dose_context'
  | 'monitor_biomarker'
  | 'contraindicate'
  | 'practitioner_only';

/**
 * Shape of a seed entry. review_status is constrained to draft|in_review;
 * 'published' is excluded at the type level to enforce the human gate.
 */
export interface SnpProtocolRuleSeed {
  rsid: string;
  gene: string;
  /** Exact genotype to match, or '' / '*' for any genotype (wildcard). */
  genotype_match: string;
  effect?: string;
  action_type: SnpProtocolActionType;
  recommended_form?: string;
  flagged_form?: string;
  avoid_list?: string[];
  linked_atom_ids?: string[];
  evidence_tier?: EvidenceTier;
  sensitive?: boolean;
  review_status: 'draft' | 'in_review';
}

/**
 * Full DB row shape (includes server-set columns).
 */
export interface SnpProtocolRule extends SnpProtocolRuleSeed {
  id: string;
  review_status: 'draft' | 'in_review' | 'published' | 'rejected' | 'retired';
  created_at: string;
}

// ---------------------------------------------------------------------------
// Seed anchor list
//
// Each entry maps a variant+genotype to a recommended action. Entries with
// genotype_match '' apply to any genotype observed for that rsid (the action
// is variant-level, not genotype-specific). Where multiple genotypes warrant
// different actions for the same rsid, add a row per genotype.
//
// Clinical rationale is documented in the effect field and in the companion
// knowledge_atoms monographs. This file does NOT fabricate clinical content;
// all entries are derived from the Hannah-authored monographs and the
// validated panel roster (see docs/knowledge-base/204h-panel-roster-reconciliation.md).
// ---------------------------------------------------------------------------
export const SEED_RULES: SnpProtocolRuleSeed[] = [
  // ---------- MTHFR C677T (rs1801133) -- folate pathway ---------
  {
    rsid: 'rs1801133',
    gene: 'MTHFR',
    genotype_match: 'TT',
    effect: 'Homozygous C677T reduces MTHFR enzyme activity ~70%; folic acid cannot be converted efficiently to 5-methylTHF.',
    action_type: 'prefer_form',
    recommended_form: 'L-methylfolate',
    flagged_form: 'folic acid',
    avoid_list: ['folic-acid-fortified grains', 'high-dose folic acid supplements'],
    evidence_tier: 1,
    sensitive: false,
    review_status: 'in_review',
  },
  {
    rsid: 'rs1801133',
    gene: 'MTHFR',
    genotype_match: 'CT',
    effect: 'Heterozygous C677T reduces MTHFR enzyme activity ~35%; prefer active folate form.',
    action_type: 'prefer_form',
    recommended_form: 'L-methylfolate',
    flagged_form: 'folic acid',
    avoid_list: ['folic-acid-fortified grains'],
    evidence_tier: 1,
    sensitive: false,
    review_status: 'in_review',
  },

  // ---------- MTHFR A1298C (rs1801131) -- BH4 recycling ----------
  {
    rsid: 'rs1801131',
    gene: 'MTHFR',
    genotype_match: 'CC',
    effect: 'Homozygous A1298C reduces BH4 recycling and MTHFR activity; compound heterozygous with C677T amplifies impact.',
    action_type: 'prefer_form',
    recommended_form: 'L-methylfolate',
    flagged_form: 'folic acid',
    avoid_list: ['folic-acid-fortified grains'],
    evidence_tier: 1,
    sensitive: false,
    review_status: 'in_review',
  },
  {
    rsid: 'rs1801131',
    gene: 'MTHFR',
    genotype_match: 'AC',
    effect: 'Heterozygous A1298C: moderate impact on BH4 recycling; prefer active folate form.',
    action_type: 'prefer_form',
    recommended_form: 'L-methylfolate',
    flagged_form: 'folic acid',
    avoid_list: ['folic-acid-fortified grains'],
    evidence_tier: 1,
    sensitive: false,
    review_status: 'in_review',
  },

  // ---------- MTR rs1805087 -- methionine synthase / B12 ----------
  {
    rsid: 'rs1805087',
    gene: 'MTR',
    genotype_match: 'GG',
    effect: 'Homozygous MTR A2756G increases methionine synthase activity; higher B12 demand for methyl cycling.',
    action_type: 'dose_context',
    recommended_form: 'methylcobalamin (active B12)',
    evidence_tier: 2,
    sensitive: false,
    review_status: 'draft',
  },
  {
    rsid: 'rs1805087',
    gene: 'MTR',
    genotype_match: 'AG',
    effect: 'Heterozygous MTR A2756G: modest increased B12 cycling demand; methylcobalamin context recommended.',
    action_type: 'dose_context',
    recommended_form: 'methylcobalamin (active B12)',
    evidence_tier: 2,
    sensitive: false,
    review_status: 'draft',
  },

  // ---------- MTRR rs1801394 -- MTR reductase / B12 recycling ----
  {
    rsid: 'rs1801394',
    gene: 'MTRR',
    genotype_match: 'GG',
    effect: 'Homozygous MTRR A66G reduces MTR reactivation, impairing B12-dependent methylation cycling.',
    action_type: 'dose_context',
    recommended_form: 'methylcobalamin with riboflavin cofactor support',
    evidence_tier: 2,
    sensitive: false,
    review_status: 'draft',
  },
  {
    rsid: 'rs1801394',
    gene: 'MTRR',
    genotype_match: 'AG',
    effect: 'Heterozygous MTRR A66G: partial reduction in MTR reactivation; dose context for methylcobalamin support.',
    action_type: 'dose_context',
    recommended_form: 'methylcobalamin with riboflavin cofactor support',
    evidence_tier: 2,
    sensitive: false,
    review_status: 'draft',
  },

  // ---------- COMT rs4680 -- methyl-donor tolerance ---------------
  {
    rsid: 'rs4680',
    gene: 'COMT',
    genotype_match: 'GG',
    effect: 'High-activity COMT (Val/Val): rapid catecholamine breakdown; generally tolerates methyl donors well.',
    action_type: 'dose_context',
    evidence_tier: 2,
    sensitive: false,
    review_status: 'draft',
  },
  {
    rsid: 'rs4680',
    gene: 'COMT',
    genotype_match: 'AA',
    effect: 'Low-activity COMT (Met/Met): slow catecholamine breakdown; high-dose methyl donors may worsen anxiety or overmethylation symptoms.',
    action_type: 'dose_context',
    evidence_tier: 2,
    sensitive: false,
    review_status: 'draft',
  },
  {
    rsid: 'rs4680',
    gene: 'COMT',
    genotype_match: 'AG',
    effect: 'Intermediate COMT activity (Val/Met): balanced methyl-donor tolerance; individual response monitoring suggested.',
    action_type: 'dose_context',
    evidence_tier: 2,
    sensitive: false,
    review_status: 'draft',
  },

  // ---------- VDR BsmI (rs1544410) -- vitamin D receptor ----------
  {
    rsid: 'rs1544410',
    gene: 'VDR',
    genotype_match: 'TT',
    effect: 'VDR BsmI TT genotype associated with reduced receptor efficiency; monitor 25-OH vitamin D levels.',
    action_type: 'monitor_biomarker',
    evidence_tier: 2,
    sensitive: false,
    review_status: 'draft',
  },
  {
    rsid: 'rs1544410',
    gene: 'VDR',
    genotype_match: 'CT',
    effect: 'Heterozygous VDR BsmI: intermediate receptor efficiency; periodic 25-OH vitamin D monitoring recommended.',
    action_type: 'monitor_biomarker',
    evidence_tier: 2,
    sensitive: false,
    review_status: 'draft',
  },

  // ---------- VDR FokI (rs2228570) -- vitamin D receptor ----------
  {
    rsid: 'rs2228570',
    gene: 'VDR',
    genotype_match: 'TT',
    effect: 'VDR FokI TT (ff) genotype: shorter VDR protein, reduced transcriptional efficiency; monitor 25-OH vitamin D.',
    action_type: 'monitor_biomarker',
    evidence_tier: 2,
    sensitive: false,
    review_status: 'draft',
  },
  {
    rsid: 'rs2228570',
    gene: 'VDR',
    genotype_match: 'CT',
    effect: 'Heterozygous VDR FokI: intermediate function; 25-OH vitamin D monitoring recommended.',
    action_type: 'monitor_biomarker',
    evidence_tier: 2,
    sensitive: false,
    review_status: 'draft',
  },

  // ---------- FUT2 rs601338 -- B12 absorption / microbiome --------
  {
    rsid: 'rs601338',
    gene: 'FUT2',
    genotype_match: 'AA',
    effect: 'FUT2 non-secretor (AA): reduced gut B12 absorption and altered microbiome; B12 dose context and gut health support.',
    action_type: 'dose_context',
    recommended_form: 'methylcobalamin or sublingual B12',
    evidence_tier: 2,
    sensitive: false,
    review_status: 'draft',
  },
  {
    rsid: 'rs601338',
    gene: 'FUT2',
    genotype_match: 'AG',
    effect: 'FUT2 heterozygous: partial secretor status; B12 and microbiome context monitoring.',
    action_type: 'dose_context',
    recommended_form: 'methylcobalamin or sublingual B12',
    evidence_tier: 2,
    sensitive: false,
    review_status: 'draft',
  },

  // ---------- BCO1 rs12934922 -- beta-carotene conversion ---------
  {
    rsid: 'rs12934922',
    gene: 'BCO1',
    genotype_match: 'TT',
    effect: 'BCO1 rs12934922 TT: reduced beta-carotene to retinol conversion; preformed vitamin A context.',
    action_type: 'dose_context',
    recommended_form: 'preformed vitamin A (retinol)',
    evidence_tier: 2,
    sensitive: false,
    review_status: 'draft',
  },
  {
    rsid: 'rs12934922',
    gene: 'BCO1',
    genotype_match: 'AT',
    effect: 'Heterozygous BCO1 rs12934922: partial reduction in beta-carotene conversion efficiency.',
    action_type: 'dose_context',
    recommended_form: 'preformed vitamin A (retinol)',
    evidence_tier: 2,
    sensitive: false,
    review_status: 'draft',
  },

  // ---------- BCO1 rs7501331 -- beta-carotene conversion ----------
  {
    rsid: 'rs7501331',
    gene: 'BCO1',
    genotype_match: 'TT',
    effect: 'BCO1 rs7501331 TT: compounding reduced beta-carotene conversion; preformed vitamin A context.',
    action_type: 'dose_context',
    recommended_form: 'preformed vitamin A (retinol)',
    evidence_tier: 2,
    sensitive: false,
    review_status: 'draft',
  },
  {
    rsid: 'rs7501331',
    gene: 'BCO1',
    genotype_match: 'CT',
    effect: 'Heterozygous BCO1 rs7501331: partial impact on beta-carotene conversion.',
    action_type: 'dose_context',
    recommended_form: 'preformed vitamin A (retinol)',
    evidence_tier: 2,
    sensitive: false,
    review_status: 'draft',
  },

  // ---------- HFE C282Y (rs1800562) -- iron overload SAFETY -------
  // sensitive: false -- this is a safety interlock, NOT a consent-gated topic.
  {
    rsid: 'rs1800562',
    gene: 'HFE',
    genotype_match: 'AA',
    effect: 'HFE C282Y homozygous: hereditary hemochromatosis risk; iron supplementation contraindicated without practitioner monitoring.',
    action_type: 'contraindicate',
    flagged_form: 'iron',
    avoid_list: ['iron supplements', 'high-dose iron-fortified foods', 'iron chelation without clinical oversight'],
    evidence_tier: 1,
    sensitive: false,
    review_status: 'in_review',
  },
  {
    rsid: 'rs1800562',
    gene: 'HFE',
    genotype_match: 'AG',
    effect: 'HFE C282Y heterozygous: carrier state; iron supplementation should be discussed with a practitioner before use.',
    action_type: 'contraindicate',
    flagged_form: 'iron',
    avoid_list: ['high-dose iron supplements without monitoring'],
    evidence_tier: 1,
    sensitive: false,
    review_status: 'in_review',
  },

  // ---------- HFE H63D (rs1799945) -- iron overload SAFETY --------
  // sensitive: false -- safety interlock, not consent-gated.
  {
    rsid: 'rs1799945',
    gene: 'HFE',
    genotype_match: 'GG',
    effect: 'HFE H63D homozygous: increased iron absorption risk; iron supplementation contraindicated without monitoring.',
    action_type: 'contraindicate',
    flagged_form: 'iron',
    avoid_list: ['iron supplements without practitioner monitoring'],
    evidence_tier: 1,
    sensitive: false,
    review_status: 'in_review',
  },
  {
    rsid: 'rs1799945',
    gene: 'HFE',
    genotype_match: 'CG',
    effect: 'HFE H63D heterozygous: mild increased iron absorption; iron supplementation context discussion recommended.',
    action_type: 'contraindicate',
    flagged_form: 'iron',
    avoid_list: ['high-dose iron supplements without monitoring'],
    evidence_tier: 1,
    sensitive: false,
    review_status: 'in_review',
  },

  // ---------- APOE rs429358 -- lipid/cognitive risk CONSENT-GATED -
  // sensitive: true -- never default surfaced; consent required.
  {
    rsid: 'rs429358',
    gene: 'APOE',
    genotype_match: 'CC',
    effect: 'APOE rs429358 CC: e4 carrier allele combination; cardiovascular and cognitive risk context -- practitioner-only disclosure.',
    action_type: 'practitioner_only',
    evidence_tier: 1,
    sensitive: true,
    review_status: 'in_review',
  },
  {
    rsid: 'rs429358',
    gene: 'APOE',
    genotype_match: 'CT',
    effect: 'APOE rs429358 CT: heterozygous e4 context; practitioner-mediated disclosure only.',
    action_type: 'practitioner_only',
    evidence_tier: 1,
    sensitive: true,
    review_status: 'in_review',
  },

  // ---------- APOE rs7412 -- lipid/cognitive risk CONSENT-GATED ---
  // sensitive: true -- never default surfaced; consent required.
  {
    rsid: 'rs7412',
    gene: 'APOE',
    genotype_match: 'TT',
    effect: 'APOE rs7412 TT: e2 allele context; cardioprotective in some models; practitioner-only framing required.',
    action_type: 'practitioner_only',
    evidence_tier: 1,
    sensitive: true,
    review_status: 'in_review',
  },
  {
    rsid: 'rs7412',
    gene: 'APOE',
    genotype_match: 'CT',
    effect: 'APOE rs7412 CT: heterozygous; practitioner-mediated disclosure only.',
    action_type: 'practitioner_only',
    evidence_tier: 1,
    sensitive: true,
    review_status: 'in_review',
  },

  // ---------- TCN2 rs1801198 -- B12 transport / monitor ----------
  {
    rsid: 'rs1801198',
    gene: 'TCN2',
    genotype_match: 'GG',
    effect: 'TCN2 rs1801198 GG: reduced transcobalamin II efficiency; serum B12 monitoring recommended.',
    action_type: 'monitor_biomarker',
    evidence_tier: 2,
    sensitive: false,
    review_status: 'draft',
  },
  {
    rsid: 'rs1801198',
    gene: 'TCN2',
    genotype_match: 'CG',
    effect: 'Heterozygous TCN2 rs1801198: partial reduction in B12 transport capacity; B12 monitoring context.',
    action_type: 'monitor_biomarker',
    evidence_tier: 2,
    sensitive: false,
    review_status: 'draft',
  },

  // ---------- LCT rs4988235 (AMY1/LCT) -- lactase persistence -----
  {
    rsid: 'rs4988235',
    gene: 'LCT',
    genotype_match: 'AA',
    effect: 'LCT rs4988235 AA: lactase non-persistence; lactose-containing supplements may cause GI intolerance -- dose context.',
    action_type: 'dose_context',
    flagged_form: 'lactose-containing supplement carriers',
    evidence_tier: 2,
    sensitive: false,
    review_status: 'draft',
  },
  {
    rsid: 'rs4988235',
    gene: 'LCT',
    genotype_match: 'AG',
    effect: 'Heterozygous LCT rs4988235: partial lactase persistence; individual tolerance varies -- dose context monitoring.',
    action_type: 'dose_context',
    evidence_tier: 2,
    sensitive: false,
    review_status: 'draft',
  },

  // ---------- HLA-DQ2/DQ8 -- celiac risk context ------------------
  // Practitioner-only; never diagnostic. Representative tag rsid used.
  // gene is 'HLA-DQ2/DQ8' per brief.
  {
    rsid: 'rs2187668',
    gene: 'HLA-DQ2/DQ8',
    genotype_match: '',
    effect: 'HLA-DQ2/DQ8 haplotype context: elevated celiac disease genetic risk. This is NOT a diagnosis. Practitioner-only disclosure; gluten elimination requires clinical evaluation.',
    action_type: 'practitioner_only',
    evidence_tier: 1,
    sensitive: false,
    review_status: 'in_review',
  },
];

// ---------------------------------------------------------------------------
// getPublishedRules
//
// Gate B: query review_status = 'published' ONLY. Never returns drafts.
// In-memory filter applied as a secondary guard after the DB predicate.
// Fail-open: returns [] on error.
// ---------------------------------------------------------------------------
export async function getPublishedRules(): Promise<SnpProtocolRule[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('snp_protocol_rules')
    .select('*')
    .eq('review_status', 'published');

  if (error || !data) {
    return [];
  }

  // Secondary in-memory guard -- never leak non-published rows.
  return (data as SnpProtocolRule[]).filter((r) => r.review_status === 'published');
}

// ---------------------------------------------------------------------------
// ruleMatchesGenotype
//
// Returns true when canonicalGenotype(genotype) matches canonicalGenotype(
// rule.genotype_match). Empty string or '*' genotype_match is a wildcard that
// matches any genotype (variant-level rules that apply regardless of genotype).
// ---------------------------------------------------------------------------
export function ruleMatchesGenotype(
  rule: { genotype_match: string },
  genotype: string,
): boolean {
  const match = rule.genotype_match.trim();
  // Wildcard: '' or '*' matches everything.
  if (match === '' || match === '*') return true;
  return canonicalGenotype(match) === canonicalGenotype(genotype);
}

// ---------------------------------------------------------------------------
// seedRulesAsDrafts
//
// Idempotent: deduplicates on (rsid, genotype_match, action_type). Checks for
// an existing row before inserting. A failed insert increments `failed`, not
// `inserted`. Do NOT execute this function from tests; always mock the admin
// client and do not call against the live DB.
// ---------------------------------------------------------------------------
export async function seedRulesAsDrafts(): Promise<{
  inserted: number;
  skipped: number;
  failed: number;
}> {
  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  const supabase = createAdminClient();

  for (const rule of SEED_RULES) {
    // Existence check: find any row with matching (rsid, genotype_match, action_type).
    const { data: existing, error: selectError } = await supabase
      .from('snp_protocol_rules')
      .select('id')
      .eq('rsid', rule.rsid)
      .eq('genotype_match', rule.genotype_match)
      .eq('action_type', rule.action_type);

    if (selectError) {
      // Fail-open: count as failed and continue.
      failed++;
      continue;
    }

    if (existing && existing.length > 0) {
      skipped++;
      continue;
    }

    // Build insert row (omit undefined optional fields).
    const row: Record<string, unknown> = {
      rsid: rule.rsid,
      gene: rule.gene,
      genotype_match: rule.genotype_match,
      action_type: rule.action_type,
      review_status: rule.review_status,
      sensitive: rule.sensitive ?? false,
    };

    if (rule.effect !== undefined) row.effect = rule.effect;
    if (rule.recommended_form !== undefined) row.recommended_form = rule.recommended_form;
    if (rule.flagged_form !== undefined) row.flagged_form = rule.flagged_form;
    if (rule.avoid_list !== undefined) row.avoid_list = rule.avoid_list;
    if (rule.linked_atom_ids !== undefined) row.linked_atom_ids = rule.linked_atom_ids;
    if (rule.evidence_tier !== undefined) row.evidence_tier = rule.evidence_tier;

    const { error: insertError } = await supabase.from('snp_protocol_rules').insert([row]);

    if (insertError) {
      failed++;
    } else {
      inserted++;
    }
  }

  return { inserted, skipped, failed };
}
