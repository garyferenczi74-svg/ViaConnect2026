// Prompt #105 Phase 2a §3.7 — CEO issue bright-line.
//
// THIS IS THE ONLY PATH from pending_ceo_approval → issued.
// Every gate below is a hard deny; missing any one means the pack does not
// issue and no distributions are created.
//
// Gates (in order):
//   1. Actor authenticated.
//   2. Actor has CEO role (admin is NOT a substitute here — by design).
//   3. Pack is in state 'pending_ceo_approval'.
//   4. Pack has a recorded cfo_approved_at (not null).
//   5. Typed confirmation exactly equals 'ISSUE PACK' (case-sensitive).
//
// After all gates pass:
//   6. Transition pack pending_ceo_approval → issued.
//   7. Resolve eligible board members (NDA on_file + scope match +
//      not departed + access not revoked).
//   8. For each, generate a unique 22-char URL-safe watermark token and
//      insert board_pack_distributions (trigger re-verifies NDA on INSERT).
//   9. Append audit: one pack.ceo_issued entry + one distribution.granted
//      per successful insert.
//
// Artifact rendering (PDF/XLSX/PPTX) is OUT OF SCOPE for this function —
// it runs server-side via the Next.js /api route that owns pdf-lib,
// exceljs, and pptxgenjs. That route attaches artifacts referencing the
// distribution_id created here.
//
// Contract:
//   POST { packId, typedConfirmation }
//   Response { pack_id, state, distributions: [...], excluded: [...] }

// deno-lint-ignore-file no-explicit-any
import {
  adminClient,
  corsPreflight,
  EXEC_ERRORS,
  isCEO,
  jsonResponse,
  resolveActor,
} from '../_exec_reporting_shared/shared.ts';

const CEO_ISSUE_CONFIRMATION_PHRASE = 'ISSUE PACK';

/**
 * Crypto-strong 22-char URL-safe base64 token (128 bits of entropy).
 * Mirrors generateWatermarkToken in src/lib/executiveReporting/distribution/watermarker.ts.
 */
function generateWatermarkToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let b64 = btoa(String.fromCharCode(...bytes));
  b64 = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return b64.slice(0, 22);
}

interface IssueRequest {
  packId: string;
  typedConfirmation: string;
}

interface BoardMemberRow {
  member_id: string;
  display_name: string;
  role: string;
  nda_status: string;
  departure_date: string | null;
  board_reporting_scope: string[] | null;
  access_revoked_at: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsPreflight();
  if (req.method !== 'POST') return jsonResponse({ error: 'POST required' }, 405);

  const actor = await resolveActor(req);
  if (!actor) return jsonResponse({ error: EXEC_ERRORS.MISSING_JWT }, 401);

  // Gate 2: CEO role required (bright line — admin cannot substitute).
  if (!isCEO(actor.role)) {
    return jsonResponse({
      error: 'MISSING_CEO_ROLE',
      detail: 'CEO role required; admin cannot substitute for the bright-line issue action',
      role: actor.role,
    }, 403);
  }

  let body: IssueRequest;
  try {
    body = (await req.json()) as IssueRequest;
  } catch {
    return jsonResponse({ error: EXEC_ERRORS.BAD_REQUEST, detail: 'invalid JSON' }, 400);
  }
  if (!body.packId) {
    return jsonResponse({ error: EXEC_ERRORS.BAD_REQUEST, detail: 'packId required' }, 400);
  }

  // Gate 5: typed confirmation.
  if (body.typedConfirmation !== CEO_ISSUE_CONFIRMATION_PHRASE) {
    return jsonResponse({
      error: 'CEO_CONFIRMATION_TEXT_MISMATCH',
      detail: `typedConfirmation must exactly equal "${CEO_ISSUE_CONFIRMATION_PHRASE}"`,
    }, 403);
  }

  const admin = adminClient() as any;

  // Gates 3 + 4.
  const { data: pack, error: pErr } = await admin
    .from('board_packs')
    .select('pack_id, state, cfo_approved_at, period_type')
    .eq('pack_id', body.packId)
    .maybeSingle();
  if (pErr) return jsonResponse({ error: EXEC_ERRORS.INTERNAL, detail: pErr.message }, 500);
  if (!pack) return jsonResponse({ error: EXEC_ERRORS.NOT_FOUND }, 404);
  if (pack.state !== 'pending_ceo_approval') {
    return jsonResponse({
      error: 'PACK_NOT_IN_PENDING_CEO_APPROVAL',
      detail: `pack in state ${pack.state}`,
    }, 409);
  }
  if (!pack.cfo_approved_at) {
    return jsonResponse({
      error: 'CFO_APPROVAL_MISSING',
      detail: 'cfo_approved_at is null; cannot issue without CFO approval on file',
    }, 409);
  }

  const nowIso = new Date().toISOString();

  // Gate 6: transition to issued.
  const { error: uErr } = await admin
    .from('board_packs')
    .update({
      state: 'issued',
      ceo_issued_by: actor.userId,
      ceo_issued_at: nowIso,
    })
    .eq('pack_id', body.packId);
  if (uErr) return jsonResponse({ error: EXEC_ERRORS.INTERNAL, detail: uErr.message }, 500);

  // Gate 7: resolve eligible board members.
  const { data: allMembers, error: mErr } = await admin
    .from('board_members')
    .select('member_id, display_name, role, nda_status, departure_date, board_reporting_scope, access_revoked_at');
  if (mErr) return jsonResponse({ error: EXEC_ERRORS.INTERNAL, detail: mErr.message }, 500);

  const eligible: BoardMemberRow[] = [];
  const excluded: Array<{ member_id: string; reason: string }> = [];

  const nowMs = Date.now();
  for (const m of (allMembers ?? []) as BoardMemberRow[]) {
    if (m.access_revoked_at) {
      excluded.push({ member_id: m.member_id, reason: 'access_revoked' });
      continue;
    }
    if (m.departure_date && new Date(m.departure_date).getTime() <= nowMs) {
      excluded.push({ member_id: m.member_id, reason: 'departed' });
      continue;
    }
    if (m.nda_status !== 'on_file') {
      excluded.push({ member_id: m.member_id, reason: 'nda_not_on_file' });
      continue;
    }
    const scope = Array.isArray(m.board_reporting_scope) ? m.board_reporting_scope : [];
    if (!scope.includes(pack.period_type)) {
      excluded.push({ member_id: m.member_id, reason: 'scope_mismatch' });
      continue;
    }
    eligible.push(m);
  }

  // Gate 8: create distribution rows. Insert one at a time so a single
  // NDA-trigger failure doesn't abort the whole batch.
  const distributions: Array<{
    distribution_id: string; member_id: string; watermark_token: string;
  }> = [];
  const distributionErrors: Array<{ member_id: string; error: string }> = [];

  for (const m of eligible) {
    const token = generateWatermarkToken();
    const { data: dist, error: dErr } = await admin
      .from('board_pack_distributions')
      .insert({
        pack_id: body.packId,
        member_id: m.member_id,
        watermark_token: token,
        distributed_at: nowIso,
      })
      .select('distribution_id')
      .single();
    if (dErr || !dist) {
      distributionErrors.push({
        member_id: m.member_id,
        error: dErr?.message ?? 'insert failed',
      });
      continue;
    }
    distributions.push({
      distribution_id: dist.distribution_id,
      member_id: m.member_id,
      watermark_token: token,
    });

    await admin.from('executive_reporting_audit_log').insert({
      action_category: 'distribution',
      action_verb: 'distribution.granted',
      target_table: 'board_pack_distributions',
      target_id: dist.distribution_id,
      pack_id: body.packId,
      member_id: m.member_id,
      actor_user_id: actor.userId,
      actor_role: actor.role,
      context_json: { period_type: pack.period_type },
      ip_address: actor.ipAddress,
      user_agent: actor.userAgent,
    });
  }

  // Final issue-pack audit entry.
  await admin.from('executive_reporting_audit_log').insert({
    action_category: 'pack',
    action_verb: 'pack.ceo_issued',
    target_table: 'board_packs',
    target_id: body.packId,
    pack_id: body.packId,
    actor_user_id: actor.userId,
    actor_role: actor.role,
    before_state_json: { state: 'pending_ceo_approval' },
    after_state_json: { state: 'issued', ceo_issued_at: nowIso },
    context_json: {
      distributions_created: distributions.length,
      excluded_count: excluded.length,
      distribution_errors_count: distributionErrors.length,
    },
    ip_address: actor.ipAddress,
    user_agent: actor.userAgent,
  });

  return jsonResponse({
    pack_id: body.packId,
    state: 'issued',
    ceo_issued_at: nowIso,
    distributions,
    excluded,
    distribution_errors: distributionErrors,
  });
});
