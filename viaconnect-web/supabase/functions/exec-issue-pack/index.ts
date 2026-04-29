// Prompt #105 Phase 2b.1 §3.7 — CEO issue bright-line (thin RPC wrapper).
//
// All fiduciary logic now lives in public.exec_issue_pack() — one atomic
// SQL transaction that enforces:
//   1. Actor has CEO role (resolved from profiles.role — not trusted from caller).
//   2. Typed confirmation exactly equals 'ISSUE PACK'.
//   3. Pack in state 'pending_ceo_approval' (FOR UPDATE row lock serializes
//      concurrent issue attempts).
//   4. CFO approval on file.
//   5. Pack transition + per-member distributions + audit log all land in
//      the same transaction; any failure rolls the whole issue back.
//
// This edge function's only responsibilities:
//   - Authenticate caller.
//   - Forward IP + user-agent + caller identity to the RPC.
//   - Translate P0001 error codes into HTTP responses with stable shapes
//     the UI can match.
//
// Contract:
//   POST { packId, typedConfirmation }
//   Response { pack_id, state, distributions: [...], excluded: [...] }

// deno-lint-ignore-file no-explicit-any
import { isTimeoutError } from '../_shared/with-timeout.ts';
import { safeLog } from '../_shared/safe-log.ts';
import {
  adminClient,
  corsPreflight,
  EXEC_ERRORS,
  jsonResponse,
  resolveActor,
} from '../_exec_reporting_shared/shared.ts';

interface IssueRequest {
  packId: string;
  typedConfirmation: string;
}

// Map RPC P0001 messages to HTTP status codes + stable API error codes.
function mapRpcError(message: string): { status: number; error: string } {
  const head = message.split(/\s+/, 1)[0] ?? '';
  const bare = message.trim();
  const known = new Set([
    'MISSING_CEO_ROLE',
    'CEO_CONFIRMATION_TEXT_MISMATCH',
    'PACK_NOT_FOUND',
    'PACK_NOT_IN_PENDING_CEO_APPROVAL',
    'CFO_APPROVAL_MISSING',
  ]);
  for (const code of known) {
    if (bare.startsWith(code) || head === code) {
      if (code === 'PACK_NOT_FOUND') return { status: 404, error: code };
      if (code === 'MISSING_CEO_ROLE') return { status: 403, error: code };
      if (code === 'CEO_CONFIRMATION_TEXT_MISMATCH') return { status: 403, error: code };
      if (code === 'PACK_NOT_IN_PENDING_CEO_APPROVAL') return { status: 409, error: code };
      if (code === 'CFO_APPROVAL_MISSING') return { status: 409, error: code };
    }
  }
  return { status: 500, error: EXEC_ERRORS.INTERNAL };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsPreflight();
  if (req.method !== 'POST') return jsonResponse({ error: 'POST required' }, 405);

  const actor = await resolveActor(req);
  if (!actor) return jsonResponse({ error: EXEC_ERRORS.MISSING_JWT }, 401);

  let body: IssueRequest;
  try {
    body = (await req.json()) as IssueRequest;
  } catch {
    return jsonResponse({ error: EXEC_ERRORS.BAD_REQUEST, detail: 'invalid JSON' }, 400);
  }
  if (!body.packId) {
    return jsonResponse({ error: EXEC_ERRORS.BAD_REQUEST, detail: 'packId required' }, 400);
  }
  if (typeof body.typedConfirmation !== 'string') {
    return jsonResponse({ error: EXEC_ERRORS.BAD_REQUEST, detail: 'typedConfirmation required' }, 400);
  }

  const admin = adminClient() as any;
  const { data, error } = await admin.rpc('exec_issue_pack', {
    p_pack_id: body.packId,
    p_ceo_user_id: actor.userId,
    p_typed_confirmation: body.typedConfirmation,
    p_ip_address: actor.ipAddress,
    p_user_agent: actor.userAgent,
  });

  if (error) {
    const mapped = mapRpcError(error.message ?? '');
    return jsonResponse({
      error: mapped.error,
      detail: error.message,
    }, mapped.status);
  }

  return jsonResponse(data as Record<string, unknown>);
});
