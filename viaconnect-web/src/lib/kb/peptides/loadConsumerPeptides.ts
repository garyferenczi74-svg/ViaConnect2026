/**
 * Prompt 225: consumer-tier Collection 14 loader.
 * Relies on RLS: only consumer_safe educational rows with approved gates.
 * Three-layer resilience: try/catch + empty fallback + no fabricated rows.
 */

import { createClient } from '@/lib/supabase/server';
import { safeLog } from '@/lib/utils/safe-log';
import {
  isSafePeptideSlug,
  parseHonestyLayer,
  type ConsumerPeptideMonograph,
  type EducationPeptide,
  type EducationPeptideCategory,
} from './types';

function mapRow(row: Record<string, unknown>): EducationPeptide {
  return {
    slug: String(row.slug ?? ''),
    displayName: String(row.display_name ?? ''),
    canonicalName: String(row.canonical_name ?? ''),
    molecularClass: String(row.molecular_class ?? 'peptide'),
    isPeptide: row.is_peptide !== false,
    category: String(row.category ?? 'Uncategorized'),
    mechanismSummary: String(row.mechanism_summary ?? ''),
    evidenceGrade: String(row.evidence_grade_overall ?? 'E'),
    exclusionTier: (String(row.exclusion_tier ?? 'educational') as EducationPeptide['exclusionTier']),
    misconceptionNotes: String(row.misconception_notes ?? ''),
    wadaStatus: String(row.wada_status ?? 'unknown'),
    humanDataExists: row.human_data_exists === true,
  };
}

function groupByCategory(peptides: EducationPeptide[]): EducationPeptideCategory[] {
  const map = new Map<string, EducationPeptide[]>();
  for (const p of peptides) {
    const key = p.category || 'Uncategorized';
    const list = map.get(key) ?? [];
    list.push(p);
    map.set(key, list);
  }
  return Array.from(map.entries())
    .map(([label, items]) => ({
      id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'uncategorized',
      label,
      peptides: items.sort((a, b) => a.displayName.localeCompare(b.displayName)),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export interface ConsumerPeptideCatalogResult {
  ok: boolean;
  categories: EducationPeptideCategory[];
  total: number;
  marshallPending: boolean;
  error?: string;
}

export async function loadConsumerPeptideCatalog(): Promise<ConsumerPeptideCatalogResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('kb_peptides')
      .select(
        'slug, display_name, canonical_name, molecular_class, is_peptide, category, mechanism_summary, evidence_grade_overall, exclusion_tier, misconception_notes, wada_status, human_data_exists',
      )
      .eq('consumer_safe', true)
      .eq('exclusion_tier', 'educational')
      .order('display_name', { ascending: true })
      .limit(500);

    if (error) {
      safeLog.warn('kb.peptides.consumer', 'query failed', { error: error.message });
      return {
        ok: false,
        categories: [],
        total: 0,
        marshallPending: true,
        error: 'catalog_unavailable',
      };
    }

    const peptides = (Array.isArray(data) ? data : []).map((r) =>
      mapRow(r as Record<string, unknown>),
    );
    return {
      ok: true,
      categories: groupByCategory(peptides),
      total: peptides.length,
      marshallPending: peptides.length === 0,
    };
  } catch (e) {
    safeLog.error('kb.peptides.consumer', 'threw', { error: e });
    return {
      ok: false,
      categories: [],
      total: 0,
      marshallPending: true,
      error: 'catalog_error',
    };
  }
}

const MONOGRAPH_SELECT =
  'slug, display_name, canonical_name, molecular_class, is_peptide, category, mechanism_summary, mechanism_detail, evidence_summary, evidence_grade_overall, exclusion_tier, misconception_notes, wada_status, human_data_exists, honesty_layer, preparation_class, provenance_disclosure, half_life_class';

function mapMonographRow(row: Record<string, unknown>): ConsumerPeptideMonograph {
  return {
    ...mapRow(row),
    mechanismDetail: String(row.mechanism_detail ?? ''),
    evidenceSummary: String(row.evidence_summary ?? ''),
    provenanceDisclosure: String(row.provenance_disclosure ?? ''),
    preparationClass: String(row.preparation_class ?? 'not_applicable'),
    halfLifeClass: String(row.half_life_class ?? 'unknown'),
    honesty: parseHonestyLayer(row.honesty_layer),
  };
}

export async function loadConsumerPeptideBySlug(
  slug: string,
): Promise<ConsumerPeptideMonograph | null> {
  if (!isSafePeptideSlug(slug)) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('kb_peptides')
      .select(MONOGRAPH_SELECT)
      .eq('slug', slug)
      .eq('consumer_safe', true)
      .eq('exclusion_tier', 'educational')
      .maybeSingle();

    if (error) {
      safeLog.warn('kb.peptides.consumer', 'monograph query failed', {
        error: error.message,
      });
      return null;
    }
    if (!data) return null;
    return mapMonographRow(data as Record<string, unknown>);
  } catch (e) {
    safeLog.error('kb.peptides.consumer', 'monograph threw', { error: e });
    return null;
  }
}
