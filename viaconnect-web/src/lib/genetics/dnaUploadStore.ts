// Prompt 204b (2026-06-17): server-side persistence for the DNA analysis engine.
// Creates the dna_uploads provenance row, runs the deterministic engine, and
// upserts user_variants on (user_id, rsid) so a re-upload updates in place.
//
// Resilience: fail-open with structured logging. A persistence failure never
// blocks the existing genetic_profiles write or the user's upload result; the
// engine output is best-effort additional data.
//
// The dna_uploads and user_variants tables are brand new and not yet in the
// generated typegen, so the writes cast the client to any, matching the existing
// genetics route pattern (genetic_variants is cast the same way).

import { safeLog } from '@/lib/utils/safe-log';
import { analyzeVariants, type ParsedSnpRow } from './dnaAnalysisEngine';
import type { PanelKey } from './panelLabels';

export interface DnaUploadProvenance {
  provider: string;
  isFarmceutica: boolean;
  brandedProductCode: string | null;
  sourceFilename: string | null;
}

export interface DnaPersistResult {
  uploadId: string | null;
  variantCount: number;
  panelCounts: Partial<Record<PanelKey, number>>;
}

const EMPTY: DnaPersistResult = { uploadId: null, variantCount: 0, panelCounts: {} };

export async function persistDnaAnalysis(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  rows: ParsedSnpRow[],
  provenance: DnaUploadProvenance,
): Promise<DnaPersistResult> {
  try {
    const variants = analyzeVariants(rows);

    // Provenance row first so variants can reference its id.
    const { data: upload, error: uploadErr } = await supabase
      .from('dna_uploads')
      .insert({
        user_id: userId,
        provider: provenance.provider,
        is_farmceutica: provenance.isFarmceutica,
        branded_product_code: provenance.brandedProductCode,
        source_filename: provenance.sourceFilename,
        status: 'completed',
      })
      .select('id')
      .single();

    if (uploadErr || !upload) {
      safeLog.warn('genetics.persist', 'dna_uploads insert failed (continuing)', {
        user_id: userId,
        error: uploadErr?.message ?? 'no row',
      });
      return { ...EMPTY, variantCount: variants.length };
    }

    const uploadId = upload.id as string;

    if (variants.length > 0) {
      const rowsToWrite = variants.map((v) => ({
        user_id: userId,
        upload_id: uploadId,
        panel_key: v.panel_key,
        rsid: v.rsid,
        gene: v.gene,
        chromosome: v.chromosome,
        position: v.position,
        genotype: v.genotype,
        allele1: v.allele1,
        allele2: v.allele2,
        status: v.status,
        clinical_significance: v.clinical_significance,
      }));

      const { error: variantErr } = await supabase
        .from('user_variants')
        .upsert(rowsToWrite, { onConflict: 'user_id,rsid' });

      if (variantErr) {
        safeLog.warn('genetics.persist', 'user_variants upsert failed (continuing)', {
          user_id: userId,
          upload_id: uploadId,
          error: variantErr.message,
        });
      }
    }

    const panelCounts: Partial<Record<PanelKey, number>> = {};
    for (const v of variants) {
      panelCounts[v.panel_key] = (panelCounts[v.panel_key] ?? 0) + 1;
    }

    return { uploadId, variantCount: variants.length, panelCounts };
  } catch (err) {
    safeLog.error('genetics.persist', 'persistDnaAnalysis threw (fail-open)', {
      user_id: userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return EMPTY;
  }
}
