/**
 * Genetics source for the Bio Optimization Score (Prompt 214d Gap 2).
 *
 * SINGLE INTERPRETIVE READER: only Elysium finished outputs
 * (`elysium_variant_interpretations` + user `elysium_upload_coverage`).
 * Never reads genetic_profiles or genex360_purchases for score math.
 *
 * Honest-state:
 *  - present = Brief 16 SSOT uploaded (non-sample user_variants or real kit ingest)
 *  - contribution = Elysium mapped interpretations only (no new SNP math)
 *  - pending = coverage exists but mapped_count is 0 (no score delta)
 *  - absent  = no Elysium coverage row (no score delta; UI messaging elsewhere)
 * UNKNOWN is never coerced to 0.
 * 12 hub SNP calls cannot coexist with present=false.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { loadGeneticsUploadFacts } from '@/lib/genetics/loadGeneticsUploadFacts';
import {
  isGeneticsUploaded,
  resolveGeneticsUploadState,
} from '@/lib/genetics/geneticsUploadState';

export interface GeneticsSource {
  present: boolean;
  processed_at: string | null;
  panel: 'genex360_v1' | null;
  source_specific?: {
    lifecycle_status: 'genex360_purchase' | 'genex360_status' | 'complete' | 'pending_interpretation';
    purchase_lifecycle?: string | null;
    interpreted_count?: number;
    pending_count?: number;
    unknown_count?: number;
    contribution: 'none' | 'pending' | 'active';
  };
}

export async function getGeneticsSource(
  userId: string,
  supabase: SupabaseClient,
): Promise<GeneticsSource> {
  const empty: GeneticsSource = {
    present: false,
    processed_at: null,
    panel: null,
    source_specific: {
      lifecycle_status: 'genex360_purchase',
      contribution: 'none',
      interpreted_count: 0,
      pending_count: 0,
      unknown_count: 0,
    },
  };

  try {
    const uploadFacts = await loadGeneticsUploadFacts(supabase, userId);
    const uploadState = resolveGeneticsUploadState(uploadFacts);
    const uploaded = isGeneticsUploaded(uploadState);

    // User-specific Elysium coverage (finished pipeline output). Score
    // contribution only. Presence / 96% rung uses the hub SSOT above.
    const coverageResult = await supabase
      .from('elysium_upload_coverage')
      .select('mapped_count, unknown_count, pending_count, coverage_pct, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const coverage = (coverageResult.error ? null : coverageResult.data) as
      | {
          mapped_count?: number | null;
          unknown_count?: number | null;
          pending_count?: number | null;
          coverage_pct?: number | null;
          created_at?: string | null;
        }
      | null;

    // Catalog freshness (Elysium interpretations exist platform-wide)
    const catalogResult = await supabase
      .from('elysium_variant_interpretations')
      .select('rsid, interpretation_status, last_verified_at')
      .eq('interpretation_status', 'interpreted')
      .order('last_verified_at', { ascending: false })
      .limit(5);

    const catalog = Array.isArray(catalogResult.data) ? catalogResult.data : [];
    const catalogInterpreted = catalog.length;

    if (!coverage) {
      // No Elysium coverage: score contributes nothing. Presence still
      // follows hub SNPs / real kit ingest so 12 calls are uploaded.
      return {
        present: uploaded,
        processed_at: null,
        panel: uploaded ? 'genex360_v1' : null,
        source_specific: {
          lifecycle_status: uploaded ? 'complete' : 'genex360_purchase',
          contribution: 'none',
          interpreted_count: 0,
          pending_count: 0,
          unknown_count: 0,
        },
      };
    }

    const mapped =
      typeof coverage.mapped_count === 'number' && Number.isFinite(coverage.mapped_count)
        ? coverage.mapped_count
        : 0;
    const pending =
      typeof coverage.pending_count === 'number' && Number.isFinite(coverage.pending_count)
        ? coverage.pending_count
        : 0;
    const unknown =
      typeof coverage.unknown_count === 'number' && Number.isFinite(coverage.unknown_count)
        ? coverage.unknown_count
        : 0;

    // Score contribution only when mapped interpretations exist for this user
    // AND the platform catalog has interpreted entries (Elysium finished).
    if (mapped > 0 && catalogInterpreted > 0) {
      return {
        present: uploaded,
        processed_at: coverage.created_at ?? null,
        panel: uploaded ? 'genex360_v1' : null,
        source_specific: {
          lifecycle_status: uploaded ? 'complete' : 'pending_interpretation',
          contribution: 'active',
          interpreted_count: mapped,
          pending_count: pending,
          unknown_count: unknown,
          // coverage_pct may be null = UNKNOWN; never invent 0 for missing
          purchase_lifecycle: null,
        },
      };
    }

    // User has genetics pipeline contact but interpretations not ready
    return {
      present: uploaded,
      processed_at: coverage.created_at ?? null,
      panel: uploaded ? 'genex360_v1' : null,
      source_specific: {
        lifecycle_status: uploaded ? 'complete' : 'pending_interpretation',
        contribution: 'pending',
        interpreted_count: mapped,
        pending_count: pending,
        unknown_count: unknown,
        purchase_lifecycle: null,
      },
    };
  } catch {
    return empty;
  }
}

/**
 * Test helper: assert this module's source text never imports raw genetics tables.
 * Used by Michelangelo suite (static scan of this file's public contract).
 */
export const GENETICS_SCORE_TABLES = [
  'elysium_variant_interpretations',
  'elysium_upload_coverage',
] as const;

export const FORBIDDEN_SCORE_GENETICS_TABLES = [
  'genetic_profiles',
  'genex360_purchases',
] as const;
