// Prompt #105 Phase 2a §5.2 — record a board-pack download event.
//
// Called when an eligible board member downloads a distributed artifact.
// Verifies the watermark token against the stored value (constant-time
// equality). Writes a download event (watermark_validated TRUE or FALSE)
// PLUS an audit log entry. Both logs are append-only.
//
// This endpoint does NOT serve the file — file serving happens via a
// separate authenticated storage-signed-URL flow. This endpoint only
// records the ACT of downloading so the forensic trail is complete.
//
// Contract:
//   POST { distributionId, presentedToken, artifactFormat, byteSizeServed?, downloadDurationMs? }
//   Response { event_id, validated, distribution_id }

// deno-lint-ignore-file no-explicit-any
import {
  adminClient,
  corsPreflight,
  EXEC_ERRORS,
  jsonResponse,
  resolveActor,
} from '../_exec_reporting_shared/shared.ts';

/**
 * Constant-time string equality.
 * SOURCE OF TRUTH: src/lib/executiveReporting/distribution/watermarker.ts
 * (tokensMatch). Keep in sync.
 */
function tokensMatch(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

interface DownloadRequest {
  distributionId: string;
  presentedToken: string;
  artifactFormat: 'pdf' | 'xlsx' | 'pptx';
  byteSizeServed?: number;
  downloadDurationMs?: number;
  acknowledgmentTyped?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsPreflight();
  if (req.method !== 'POST') return jsonResponse({ error: 'POST required' }, 405);

  // Any authenticated user may RECORD their own download attempt; the
  // watermark token itself is the capability. We still record actor_user_id
  // so we can cross-reference against the distribution's member_id.
  const actor = await resolveActor(req);
  if (!actor) return jsonResponse({ error: EXEC_ERRORS.MISSING_JWT }, 401);

  let body: DownloadRequest;
  try {
    body = (await req.json()) as DownloadRequest;
  } catch {
    return jsonResponse({ error: EXEC_ERRORS.BAD_REQUEST, detail: 'invalid JSON' }, 400);
  }
  if (!body.distributionId || !body.presentedToken || !body.artifactFormat) {
    return jsonResponse({
      error: EXEC_ERRORS.BAD_REQUEST,
      detail: 'distributionId, presentedToken, artifactFormat required',
    }, 400);
  }
  if (!['pdf', 'xlsx', 'pptx'].includes(body.artifactFormat)) {
    return jsonResponse({
      error: EXEC_ERRORS.BAD_REQUEST,
      detail: 'artifactFormat must be pdf|xlsx|pptx',
    }, 400);
  }

  const admin = adminClient() as any;

  const { data: dist, error: dErr } = await admin
    .from('board_pack_distributions')
    .select(`
      distribution_id,
      pack_id,
      member_id,
      watermark_token,
      access_revoked_at,
      board_members!inner(auth_user_id)
    `)
    .eq('distribution_id', body.distributionId)
    .maybeSingle();
  if (dErr) return jsonResponse({ error: EXEC_ERRORS.INTERNAL, detail: dErr.message }, 500);
  if (!dist) return jsonResponse({ error: EXEC_ERRORS.NOT_FOUND }, 404);

  // Cross-reference identity: the authenticated actor must match the
  // board_member that received this distribution. Presenting the correct
  // watermark token from the wrong auth session is a tampering signal,
  // not a valid download. Record it; never treat it as validated.
  const memberAuthId = (dist as any).board_members?.auth_user_id as string | null;
  const identityMatch = memberAuthId !== null && memberAuthId === actor.userId;

  const tokenMatch = tokensMatch(dist.watermark_token, body.presentedToken);
  const accessActive = !dist.access_revoked_at;
  const validated = identityMatch && tokenMatch && accessActive;

  const { data: event, error: eErr } = await admin
    .from('board_pack_download_events')
    .insert({
      distribution_id: body.distributionId,
      artifact_format: body.artifactFormat,
      downloaded_at: new Date().toISOString(),
      ip_address: actor.ipAddress,
      user_agent: actor.userAgent,
      watermark_token_presented: body.presentedToken,
      watermark_validated: validated,
      byte_size_served: body.byteSizeServed ?? null,
      download_duration_ms: body.downloadDurationMs ?? null,
      acknowledgment_typed: body.acknowledgmentTyped ?? false,
    })
    .select('event_id')
    .single();
  if (eErr || !event) {
    return jsonResponse({ error: EXEC_ERRORS.INTERNAL, detail: eErr?.message ?? 'insert failed' }, 500);
  }

  await admin.from('executive_reporting_audit_log').insert({
    action_category: 'download',
    action_verb: validated ? 'download.watermark_validated' : 'download.watermark_failed',
    target_table: 'board_pack_download_events',
    target_id: event.event_id,
    pack_id: dist.pack_id,
    member_id: dist.member_id,
    actor_user_id: actor.userId,
    actor_role: actor.role,
    context_json: {
      artifact_format: body.artifactFormat,
      validated,
      identity_match: identityMatch,
      token_match: tokenMatch,
      access_revoked: !!dist.access_revoked_at,
    },
    ip_address: actor.ipAddress,
    user_agent: actor.userAgent,
  });

  return jsonResponse({
    event_id: event.event_id,
    distribution_id: body.distributionId,
    validated,
  });
});
