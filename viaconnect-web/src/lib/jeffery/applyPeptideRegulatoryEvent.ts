/**
 * Prompt 225 G7: Jeffery apply wrapper for staged peptide regulatory events.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';

export interface ApplyRegulatoryEventResult {
  ok: boolean;
  eventId?: string;
  appliedAt?: string | null;
  error?: string;
}

export async function applyPeptideRegulatoryEvent(opts: {
  eventId: string;
  reviewerMode?: 'programmatic' | 'ai_assisted' | 'gary_escalation';
  rationale?: string;
}): Promise<ApplyRegulatoryEventResult> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc('apply_kb_peptide_regulatory_event', {
      p_event_id: opts.eventId,
      p_reviewer_mode: opts.reviewerMode ?? 'gary_escalation',
      p_rationale:
        opts.rationale ??
        'Gary continue authorized Jeffery apply of staged peptide regulatory event.',
    });

    if (error) {
      safeLog.warn('jeffery.applyPeptideRegulatoryEvent', 'rpc failed', {
        error: error.message,
      });
      return { ok: false, error: error.message };
    }

    const row = (Array.isArray(data) ? data[0] : data) as
      | { id?: string; applied_at?: string | null }
      | null;

    return {
      ok: true,
      eventId: row?.id ? String(row.id) : opts.eventId,
      appliedAt: row?.applied_at ?? null,
    };
  } catch (e) {
    safeLog.error('jeffery.applyPeptideRegulatoryEvent', 'threw', { error: e });
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
