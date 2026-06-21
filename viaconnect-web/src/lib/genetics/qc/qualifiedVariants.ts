/**
 * src/lib/genetics/qc/qualifiedVariants.ts
 *
 * QC-gated variant reader. Returns the user's real variants (excluding SAMPLE rows)
 * after filtering out any whose latest variant_calls row has orientation_resolved===false
 * OR is_no_call===true. Variants with no QC row (legacy pre-QC uploads) are INCLUDED
 * (backward compatible). Fail-open: if the variant_calls read errors, returns the base
 * variants unfiltered so a transient DB error cannot brick synthesis.
 *
 * Prompt 208a Task A3 (2026-06-21).
 * No em/en-dashes. No emojis.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QualifiedVariantRow {
  rsid: string;
  gene: string | null;
  genotype: string | null;
  panel_key: string;
  status: string | null;
}

interface VariantCallRow {
  rsid: string;
  orientation_resolved: boolean;
  is_no_call: boolean;
  created_at: string;
}

// ---------------------------------------------------------------------------
// getQualifiedUserVariants
// ---------------------------------------------------------------------------

/**
 * Returns the user's qualified (QC-passed) variant rows.
 *
 * Algorithm:
 * 1. Read user_variants for userId (same select + neq is_sample=true as synthesis).
 *    On error: return [] (synthesis already tolerates empty variants).
 * 2. Read variant_calls for userId (rsid, orientation_resolved, is_no_call, created_at).
 *    On error: fail-open, return base variants unfiltered.
 * 3. Build rsid -> latest call map (latest = max created_at).
 * 4. Exclude variants where latest call has orientation_resolved===false OR is_no_call===true.
 *    Variants with no call row (legacy) are INCLUDED.
 */
export async function getQualifiedUserVariants(userId: string): Promise<QualifiedVariantRow[]> {
  const supabase = createAdminClient();

  // -------------------------------------------------------------------------
  // Step 1: Read user_variants (same query shape as synthesis.ts)
  // -------------------------------------------------------------------------
  let baseVariants: QualifiedVariantRow[] = [];
  try {
    const { data, error } = await supabase
      .from('user_variants')
      .select('rsid, gene, genotype, panel_key, status')
      .eq('user_id', userId)
      // Preserve the is_sample exclusion: SAMPLE rows must never drive a real protocol.
      // neq-true keeps legacy null rows (real uploads without the flag).
      .neq('is_sample', true);

    if (error) {
      safeLog.warn('qualifiedVariants', 'user_variants read failed; returning empty', {
        userId,
        error,
      });
      return [];
    }

    baseVariants = (data ?? []) as QualifiedVariantRow[];
  } catch (err) {
    safeLog.error('qualifiedVariants', 'user_variants query threw; returning empty', {
      userId,
      err,
    });
    return [];
  }

  if (baseVariants.length === 0) {
    return [];
  }

  // -------------------------------------------------------------------------
  // Step 2: Read variant_calls (QC is best-effort; fail-open on error)
  // -------------------------------------------------------------------------
  let callRows: VariantCallRow[] = [];
  let qcReadFailed = false;
  try {
    const { data: callData, error: callError } = await supabase
      .from('variant_calls')
      .select('rsid, orientation_resolved, is_no_call, created_at')
      .eq('user_id', userId);

    if (callError) {
      safeLog.warn('qualifiedVariants', 'variant_calls read failed; returning base variants unfiltered (fail-open)', {
        userId,
        error: callError,
      });
      qcReadFailed = true;
    } else {
      callRows = (callData ?? []) as VariantCallRow[];
    }
  } catch (err) {
    safeLog.error('qualifiedVariants', 'variant_calls query threw; returning base variants unfiltered (fail-open)', {
      userId,
      err,
    });
    qcReadFailed = true;
  }

  // Fail-open: QC read error must not block synthesis
  if (qcReadFailed) {
    return baseVariants;
  }

  // -------------------------------------------------------------------------
  // Step 3: Build rsid -> latest call map
  // -------------------------------------------------------------------------
  const latestCallByRsid = new Map<string, VariantCallRow>();
  for (const row of callRows) {
    const existing = latestCallByRsid.get(row.rsid);
    if (!existing || row.created_at > existing.created_at) {
      latestCallByRsid.set(row.rsid, row);
    }
  }

  // -------------------------------------------------------------------------
  // Step 4: Filter variants
  // -------------------------------------------------------------------------
  return baseVariants.filter((variant) => {
    const latestCall = latestCallByRsid.get(variant.rsid);

    // No QC row (legacy pre-QC upload) -> INCLUDE (backward compatible)
    if (!latestCall) return true;

    // Exclude if orientation unresolved OR is a no-call
    if (latestCall.orientation_resolved === false) return false;
    if (latestCall.is_no_call === true) return false;

    return true;
  });
}
