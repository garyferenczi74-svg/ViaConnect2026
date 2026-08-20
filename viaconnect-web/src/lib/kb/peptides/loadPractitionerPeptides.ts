/**
 * Prompt 225: practitioner-tier Collection 14 loader (service role).
 * Returns educational + restricted monographs. Excluded adverse refs are
 * returned as decline metadata only (no full body). No dose fields selected.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import type { EducationPeptide } from './types';

export interface PractitionerPeptideEntry extends EducationPeptide {
  mechanismDetail: string;
  evidenceSummary: string;
  sourcingRiskNotes: string;
  exclusionReason: string | null;
  marshallStatus: string;
  lexStatus: string;
  isExcludedDecline: boolean;
  viaCuraAdjacency: Record<string, unknown> | null;
}

function mapRow(row: Record<string, unknown>): PractitionerPeptideEntry {
  const tier = String(row.exclusion_tier ?? 'educational');
  const isExcluded = tier === 'excluded_adverse_reference';
  return {
    slug: String(row.slug ?? ''),
    displayName: String(row.display_name ?? ''),
    canonicalName: String(row.canonical_name ?? ''),
    molecularClass: String(row.molecular_class ?? 'peptide'),
    isPeptide: row.is_peptide !== false,
    category: String(row.category ?? 'Uncategorized'),
    mechanismSummary: isExcluded
      ? 'Excluded adverse reference. See exclusion reason.'
      : String(row.mechanism_summary ?? ''),
    mechanismDetail: isExcluded ? '' : String(row.mechanism_detail ?? ''),
    evidenceSummary: isExcluded ? '' : String(row.evidence_summary ?? ''),
    evidenceGrade: String(row.evidence_grade_overall ?? 'E'),
    exclusionTier: tier as EducationPeptide['exclusionTier'],
    misconceptionNotes: String(row.misconception_notes ?? ''),
    sourcingRiskNotes: isExcluded ? '' : String(row.sourcing_risk_notes ?? ''),
    exclusionReason: row.exclusion_reason ? String(row.exclusion_reason) : null,
    wadaStatus: String(row.wada_status ?? 'unknown'),
    humanDataExists: row.human_data_exists === true,
    marshallStatus: String(row.marshall_status ?? 'pending'),
    lexStatus: String(row.lex_status ?? 'not_required'),
    isExcludedDecline: isExcluded,
    viaCuraAdjacency:
      row.via_cura_adjacency && typeof row.via_cura_adjacency === 'object'
        ? (row.via_cura_adjacency as Record<string, unknown>)
        : null,
  };
}

export async function loadPractitionerPeptideCatalog(limit = 200): Promise<{
  ok: boolean;
  entries: PractitionerPeptideEntry[];
  error?: string;
}> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('kb_peptides')
      .select(
        'slug, display_name, canonical_name, molecular_class, is_peptide, category, mechanism_summary, mechanism_detail, evidence_summary, evidence_grade_overall, exclusion_tier, exclusion_reason, misconception_notes, sourcing_risk_notes, wada_status, human_data_exists, marshall_status, lex_status, via_cura_adjacency',
      )
      .order('display_name', { ascending: true })
      .limit(limit);

    if (error) {
      safeLog.warn('kb.peptides.practitioner', 'query failed', { error: error.message });
      return { ok: false, entries: [], error: error.message };
    }

    return {
      ok: true,
      entries: (Array.isArray(data) ? data : []).map((r) =>
        mapRow(r as Record<string, unknown>),
      ),
    };
  } catch (e) {
    safeLog.error('kb.peptides.practitioner', 'threw', { error: e });
    return {
      ok: false,
      entries: [],
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
