/**
 * Prompt 225 / G7: Thanos regulatory event staging.
 * Detected changes are appended to kb_peptide_regulatory_events and must pass
 * Jeffery review before live peptide regulatory fields may change.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';

export interface RegulatoryEventInput {
  peptideSlug: string;
  jurisdiction: string;
  previousStatus: string | null;
  newStatus: string;
  effectiveDate?: string | null;
  sourceCitationId?: string | null;
  detectedBy?: string;
}

export interface RegulatoryEventResult {
  ok: boolean;
  eventId?: string;
  error?: string;
}

/**
 * Stage a regulatory change. Does NOT mutate kb_peptides.regulatory_status.
 * applied_at stays null until Jeffery review applies it.
 */
export async function stagePeptideRegulatoryEvent(
  input: RegulatoryEventInput,
): Promise<RegulatoryEventResult> {
  try {
    const admin = createAdminClient();
    const { data: peptide, error: pErr } = await admin
      .from('kb_peptides')
      .select('id')
      .eq('slug', input.peptideSlug)
      .maybeSingle();

    if (pErr || !peptide?.id) {
      return { ok: false, error: pErr?.message ?? 'peptide_not_found' };
    }

    const { data, error } = await admin
      .from('kb_peptide_regulatory_events')
      .insert({
        peptide_id: peptide.id,
        jurisdiction: input.jurisdiction,
        previous_status: input.previousStatus,
        new_status: input.newStatus,
        effective_date: input.effectiveDate ?? null,
        source_citation_id: input.sourceCitationId ?? null,
        detected_by: input.detectedBy ?? 'thanos',
        jeffery_review_id: null,
        applied_at: null,
      })
      .select('id')
      .maybeSingle();

    if (error) {
      safeLog.warn('thanos.regulatoryEvents', 'insert failed', { error: error.message });
      return { ok: false, error: error.message };
    }

    return { ok: true, eventId: data?.id ? String(data.id) : undefined };
  } catch (e) {
    safeLog.error('thanos.regulatoryEvents', 'threw', { error: e });
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
