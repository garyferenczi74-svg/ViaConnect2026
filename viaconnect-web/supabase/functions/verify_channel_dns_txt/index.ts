// Prompt #102 Workstream A — DNS TXT record channel verification.
// Queries DNS via Deno.resolveDns; supports propagation grace up to
// 48h via the attempt row's created_at check.

// deno-lint-ignore-file no-explicit-any
import { getSupabaseClient, jsonResponse } from '../_operations_shared/shared.ts';

function recordName(url: string): string {
  const apex = url.replace(/^https?:\/\//i, '').replace(/\/$/, '').replace(/^www\./i, '');
  return `_viaconnect-verification.${apex}`;
}

Deno.serve(async (req) => {
  const { channelId } = await req.json().catch(() => ({} as Record<string, unknown>));
  if (!channelId) return jsonResponse({ error: 'missing channelId' }, 400);
  const supabase = getSupabaseClient() as any;

  const { data: channel } = await supabase
    .from('practitioner_verified_channels')
    .select('channel_id, practitioner_id, channel_url')
    .eq('channel_id', channelId)
    .maybeSingle();
  if (!channel) return jsonResponse({ error: 'channel_not_found' }, 404);

  const { data: attempt } = await supabase
    .from('channel_verification_attempts')
    .select('attempt_id, attempt_token, expires_at, created_at, attempt_status')
    .eq('channel_id', channelId)
    .eq('method', 'dns_txt_record')
    .eq('attempt_status', 'pending')
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!attempt) return jsonResponse({ error: 'no_pending_attempt' }, 404);

  const name = recordName(channel.channel_url as string);
  let txtRecords: string[] = [];
  try {
    const result = await Deno.resolveDns(name, 'TXT');
    txtRecords = result.flat();
  } catch (err) {
    console.warn('dns resolve error (propagation grace)', err);
  }

  const match = txtRecords.some((r) => {
    const cleaned = r.replace(/^"|"$/g, '').trim();
    return cleaned === attempt.attempt_token;
  });

  if (match) {
    const reVerifyDue = new Date();
    reVerifyDue.setDate(reVerifyDue.getDate() + 90);
    await supabase.from('practitioner_verified_channels').update({
      state: 'verified',
      verification_method: 'dns_txt_record',
      verified_at: new Date().toISOString(),
      re_verify_due_at: reVerifyDue.toISOString(),
    }).eq('channel_id', channelId);
    await supabase.from('channel_verification_attempts').update({
      attempt_status: 'succeeded', resolved_at: new Date().toISOString(),
    }).eq('attempt_id', attempt.attempt_id);
    await supabase.from('practitioner_operations_audit_log').insert({
      action_category: 'channel', action_verb: 'channel.verified',
      target_table: 'practitioner_verified_channels', target_id: channelId,
      practitioner_id: channel.practitioner_id,
      context_json: { method: 'dns_txt_record' },
    });
    return jsonResponse({ verified: true });
  }

  // Within the 48h propagation window, keep the attempt pending so the
  // UI can retry. Only flip to failed after the window expires.
  const attemptAge = Date.now() - new Date(attempt.created_at as string).getTime();
  const withinGrace = attemptAge < 48 * 60 * 60 * 1000;
  if (!withinGrace) {
    await supabase.from('channel_verification_attempts').update({
      attempt_status: 'failed', failure_reason: 'propagation_window_expired',
      resolved_at: new Date().toISOString(),
    }).eq('attempt_id', attempt.attempt_id);
    await supabase.from('practitioner_verified_channels').update({
      state: 'verification_failed',
    }).eq('channel_id', channelId);
  }
  return jsonResponse({ verified: false, retry_ok: withinGrace });
});
