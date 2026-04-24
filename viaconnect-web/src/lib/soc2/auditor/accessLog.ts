// Prompt #122 P8: Auditor access logger.
//
// Every auditor action lands in soc2_auditor_access_log. The table is
// append-only via the P1 trigger (UPDATE/DELETE raise). This helper wraps
// the INSERT with the correct schema + optional pseudonym-resolve fields.
// IP + user-agent are best-effort — auditor portal routes pass them in
// from NextRequest headers.

import type { SupabaseClient } from '@supabase/supabase-js';

export type AuditorAccessAction =
  | 'packet_view'
  | 'file_view'
  | 'file_download'
  | 'packet_download'
  | 'pseudonym_resolve_request'
  | 'pseudonym_resolve_granted'
  | 'pseudonym_resolve_denied';

export interface LogAuditorAccessInput {
  supabase: SupabaseClient;
  grantId: string;
  packetId?: string | null;
  action: AuditorAccessAction;
  targetPath?: string | null;
  resolvedPseudonym?: string | null;
  justification?: string | null;
  approverSteve?: string | null;
  approverThomas?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Append-only insert into soc2_auditor_access_log. Non-throwing by design:
 * a logging failure should NEVER break the auditor's read path. On insert
 * failure we emit a structured console.error so SecOps can page.
 *
 * Also increments soc2_auditor_grants.access_count in the same call so
 * compliance readers see how often a given grant has been touched.
 */
export async function logAuditorAccess(input: LogAuditorAccessInput): Promise<void> {
  const { supabase } = input;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { error: logErr } = await sb.from('soc2_auditor_access_log').insert({
    grant_id: input.grantId,
    packet_id: input.packetId ?? null,
    action: input.action,
    target_path: input.targetPath ?? null,
    resolved_pseudonym: input.resolvedPseudonym ?? null,
    justification: input.justification ?? null,
    approver_steve: input.approverSteve ?? null,
    approver_thomas: input.approverThomas ?? null,
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
  });
  if (logErr) {
    // eslint-disable-next-line no-console
    console.error('[soc2 auditor access log] insert failed', {
      grantId: input.grantId,
      action: input.action,
      message: logErr.message,
    });
  }

  // Best-effort tick of access_count. Use an atomic RPC-equivalent: fetch +
  // increment. Race conditions here are tolerable — the value is used for
  // awareness, not for authorization.
  try {
    const { data: row } = await sb
      .from('soc2_auditor_grants')
      .select('access_count')
      .eq('id', input.grantId)
      .maybeSingle();
    const current = (row as { access_count: number } | null)?.access_count ?? 0;
    await sb
      .from('soc2_auditor_grants')
      .update({ access_count: current + 1 })
      .eq('id', input.grantId);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[soc2 auditor access log] access_count bump failed', err);
  }
}

/** Extract client IP + user-agent from a Next.js request for logAuditorAccess. */
export function extractRequestMetadata(req: Request): { ipAddress: string | null; userAgent: string | null } {
  const fwd = req.headers.get('x-forwarded-for');
  const ipAddress = fwd ? fwd.split(',')[0].trim() : (req.headers.get('x-real-ip') ?? null);
  const userAgent = req.headers.get('user-agent') ?? null;
  return { ipAddress, userAgent };
}
