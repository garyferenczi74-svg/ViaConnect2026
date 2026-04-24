// Prompt #125 P2: Practitioner override signer.
//
// Preconditions (all must hold):
//   - practitionerId matches the scan's practitioner (RLS enforces too).
//   - findingIds is non-empty and covers every finding raised on the scan.
//   - justification is 50-2000 characters.
//   - ip_address + user_agent supplied (captured on the API route).
//
// Consequences (§8.5):
//   - scheduler_overrides row written with full evidence.
//   - No clearance receipt issued; the scan decision is flipped to
//     override_accepted on scheduler_scans.
//   - If the same practitioner has 4+ overrides on the same rule id in
//     30 days, pattern_flag_triggered = true and a pattern event is
//     emitted for #123 (P2 emits the event; the #123 detector consumes).

import type { SupabaseClient } from '@supabase/supabase-js';
import { schedulerLogger } from './logging';

export interface OverrideSignInput {
  supabase: SupabaseClient;
  scanId: string;
  practitionerId: string;
  findingIds: string[];
  justification: string;
  ipAddress: string | null;
  userAgent: string | null;
}

export type OverrideOutcome =
  | { outcome: 'rejected'; error: string }
  | { outcome: 'signed'; overrideId: string; patternFlagTriggered: boolean };

const MIN_JUSTIFICATION = 50;
const MAX_JUSTIFICATION = 2000;
const PATTERN_WINDOW_DAYS = 30;
const PATTERN_THRESHOLD = 4;

export async function signOverride(input: OverrideSignInput): Promise<OverrideOutcome> {
  const justification = input.justification.trim();
  if (justification.length < MIN_JUSTIFICATION) {
    return { outcome: 'rejected', error: `justification_too_short:min=${MIN_JUSTIFICATION}` };
  }
  if (justification.length > MAX_JUSTIFICATION) {
    return { outcome: 'rejected', error: `justification_too_long:max=${MAX_JUSTIFICATION}` };
  }
  if (!Array.isArray(input.findingIds) || input.findingIds.length === 0) {
    return { outcome: 'rejected', error: 'finding_ids_required' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = input.supabase as any;

  const patternFlagTriggered = await detectOverridePattern(sb, input.practitionerId, input.findingIds);

  const { data, error } = await sb
    .from('scheduler_overrides')
    .insert({
      scan_id: input.scanId,
      practitioner_id: input.practitionerId,
      finding_ids: input.findingIds,
      justification,
      ip_address: input.ipAddress,
      user_agent: input.userAgent,
      pattern_flag_triggered: patternFlagTriggered,
    })
    .select('id')
    .single();
  if (error) {
    schedulerLogger.error('[override] insert failed', { scanId: input.scanId, code: error.code });
    return { outcome: 'rejected', error: `insert_failed:${error.code ?? 'unknown'}` };
  }

  // Flip the scan decision to override_accepted so the timeline is auditable.
  await sb
    .from('scheduler_scans')
    .update({ decision: 'override_accepted' })
    .eq('id', input.scanId);

  return { outcome: 'signed', overrideId: (data as { id: string }).id, patternFlagTriggered };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function detectOverridePattern(sb: any, practitionerId: string, findingIds: string[]): Promise<boolean> {
  const windowStart = new Date(Date.now() - PATTERN_WINDOW_DAYS * 86_400_000).toISOString();
  const { data } = await sb
    .from('scheduler_overrides')
    .select('finding_ids')
    .eq('practitioner_id', practitionerId)
    .gte('signed_at', windowStart);
  const rows = (data as Array<{ finding_ids: string[] }> | null) ?? [];
  const countByRule = new Map<string, number>();
  for (const r of rows) {
    for (const id of r.finding_ids ?? []) {
      countByRule.set(id, (countByRule.get(id) ?? 0) + 1);
    }
  }
  // Account for the override we're about to insert.
  for (const id of findingIds) {
    if ((countByRule.get(id) ?? 0) + 1 >= PATTERN_THRESHOLD) return true;
  }
  return false;
}
