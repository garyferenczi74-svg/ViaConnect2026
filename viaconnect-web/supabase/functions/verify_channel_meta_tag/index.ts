// Prompt #102 Workstream A — domain meta-tag channel verification.
// Fetches the channel URL over HTTP, parses the HTML, and confirms the
// practitioner's verification meta tag is present with the issued token.

// deno-lint-ignore-file no-explicit-any
import { getSupabaseClient, jsonResponse } from '../_operations_shared/shared.ts';
import { withAbortTimeout, isTimeoutError } from '../_shared/with-timeout.ts';
import { safeLog } from '../_shared/safe-log.ts';
import { getCircuitBreaker, isCircuitBreakerError } from '../_shared/circuit-breaker.ts';

const channelHttpBreaker = getCircuitBreaker('channel-http-fetch');

function extractMetaTagToken(html: string): string | null {
  const patterns = [
    /<meta\s+name=["']viaconnect-channel-verification["']\s+content=["']([^"']+)["']/i,
    /<meta\s+content=["']([^"']+)["']\s+name=["']viaconnect-channel-verification["']/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m && m[1]) return m[1];
  }
  return null;
}

Deno.serve(async (req) => {
  const { channelId } = await req.json().catch(() => ({} as Record<string, unknown>));
  if (!channelId) return jsonResponse({ error: 'missing channelId' }, 400);
  const supabase = getSupabaseClient() as any;

  const { data: channel } = await supabase
    .from('practitioner_verified_channels')
    .select('channel_id, practitioner_id, channel_url, state')
    .eq('channel_id', channelId)
    .maybeSingle();
  if (!channel) return jsonResponse({ error: 'channel_not_found' }, 404);

  const { data: attempt } = await supabase
    .from('channel_verification_attempts')
    .select('attempt_id, attempt_token, expires_at, attempt_status')
    .eq('channel_id', channelId)
    .eq('method', 'domain_meta_tag')
    .eq('attempt_status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!attempt) return jsonResponse({ error: 'no_pending_attempt' }, 404);
  if (new Date(attempt.expires_at as string) < new Date()) {
    await supabase.from('channel_verification_attempts')
      .update({ attempt_status: 'expired', resolved_at: new Date().toISOString() })
      .eq('attempt_id', attempt.attempt_id);
    return jsonResponse({ verified: false, reason: 'token_expired' });
  }

  try {
    const resp = await channelHttpBreaker.execute(() =>
      withAbortTimeout(
        (signal) => fetch(channel.channel_url, { headers: { Accept: 'text/html' }, signal }),
        10000,
        'verify-channel-meta-tag.fetch',
      )
    );
    if (!resp.ok) {
      await supabase.from('channel_verification_attempts')
        .update({ attempt_status: 'failed', failure_reason: `http_${resp.status}`, resolved_at: new Date().toISOString() })
        .eq('attempt_id', attempt.attempt_id);
      return jsonResponse({ verified: false, reason: 'fetch_failed', status: resp.status });
    }
    const html = await resp.text();
    const found = extractMetaTagToken(html);

    if (found && found === attempt.attempt_token) {
      const reVerifyDue = new Date();
      reVerifyDue.setDate(reVerifyDue.getDate() + 90);
      await supabase.from('practitioner_verified_channels').update({
        state: 'verified',
        verification_method: 'domain_meta_tag',
        verified_at: new Date().toISOString(),
        re_verify_due_at: reVerifyDue.toISOString(),
      }).eq('channel_id', channelId);
      await supabase.from('channel_verification_attempts').update({
        attempt_status: 'succeeded',
        resolved_at: new Date().toISOString(),
      }).eq('attempt_id', attempt.attempt_id);
      await supabase.from('practitioner_operations_audit_log').insert({
        action_category: 'channel', action_verb: 'channel.verified',
        target_table: 'practitioner_verified_channels', target_id: channelId,
        practitioner_id: channel.practitioner_id,
        context_json: { method: 'domain_meta_tag' },
      });
      return jsonResponse({ verified: true });
    }

    await supabase.from('channel_verification_attempts').update({
      attempt_status: 'failed',
      failure_reason: found ? 'token_mismatch' : 'tag_not_found',
      resolved_at: new Date().toISOString(),
    }).eq('attempt_id', attempt.attempt_id);
    await supabase.from('practitioner_verified_channels').update({
      state: 'verification_failed',
    }).eq('channel_id', channelId);
    return jsonResponse({ verified: false, reason: found ? 'token_mismatch' : 'tag_not_found' });
  } catch (err) {
    if (isCircuitBreakerError(err)) safeLog.warn('verify-channel-meta-tag', 'circuit open', { errorName: (err as Error)?.name ?? 'unknown' });
    else if (isTimeoutError(err)) safeLog.warn('verify-channel-meta-tag', 'fetch timeout', { errorName: (err as Error)?.name ?? 'unknown' });
    else safeLog.error('verify-channel-meta-tag', 'fetch error', { errorName: (err as Error)?.name ?? 'unknown' });
    return jsonResponse({ verified: false, reason: 'network_error' });
  }
});
