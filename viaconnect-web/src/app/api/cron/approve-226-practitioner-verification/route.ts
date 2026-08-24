/**
 * Prompt 226: admin/cron approve pending Module B license verification.
 * Body: { requestId: string }  Bearer CRON_SECRET or use as ops tool.
 */
import { isCronAuthorized } from '@/lib/jeffery/ops/cronAuth';
import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
  if (!isCronAuthorized(request.headers.get('authorization'))) {
    return new Response('Unauthorized', { status: 401 });
  }

  let body: { requestId?: string; reject?: boolean; note?: string };
  try {
    body = (await request.json()) as {
      requestId?: string;
      reject?: boolean;
      note?: string;
    };
  } catch {
    return Response.json({ ok: false, error: 'invalid_json' }, { status: 200 });
  }

  const requestId = body.requestId?.trim();
  if (!requestId) {
    return Response.json({ ok: false, error: 'requestId_required' }, { status: 200 });
  }

  const admin = createAdminClient();
  const { data: reqRow, error } = await admin
    .from('practitioner_license_verification_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle();

  if (error || !reqRow) {
    return Response.json({ ok: false, error: 'request_not_found' }, { status: 200 });
  }
  if (reqRow.status !== 'pending') {
    return Response.json({
      ok: false,
      error: 'not_pending',
      status: reqRow.status,
    });
  }

  const reject = body.reject === true;
  const now = new Date().toISOString();

  if (reject) {
    await admin
      .from('practitioner_license_verification_requests')
      .update({
        status: 'rejected',
        admin_note: String(body.note ?? '').slice(0, 500),
        reviewed_at: now,
        updated_at: now,
      })
      .eq('id', requestId);
    return Response.json({ ok: true, status: 'rejected' });
  }

  const { error: updReq } = await admin
    .from('practitioner_license_verification_requests')
    .update({
      status: 'approved',
      admin_note: String(body.note ?? 'approved').slice(0, 500),
      reviewed_at: now,
      updated_at: now,
    })
    .eq('id', requestId);

  if (updReq) {
    return Response.json({ ok: false, error: updReq.message }, { status: 200 });
  }

  const { error: updPrac } = await admin
    .from('practitioners')
    .update({
      license_verified: true,
      license_verified_at: now,
      license_jurisdiction: reqRow.jurisdiction,
      license_issuing_body: reqRow.issuing_body,
      license_number: reqRow.license_number,
      updated_at: now,
    })
    .eq('id', reqRow.practitioner_id);

  if (updPrac) {
    safeLog.error('cron.approve-226-verification', 'practitioner update failed', {
      error: updPrac,
    });
    return Response.json({ ok: false, error: updPrac.message }, { status: 200 });
  }

  return Response.json({
    ok: true,
    status: 'approved',
    practitionerId: reqRow.practitioner_id,
    jurisdiction: reqRow.jurisdiction,
  });
}

export async function GET(request: Request): Promise<Response> {
  if (!isCronAuthorized(request.headers.get('authorization'))) {
    return new Response('Unauthorized', { status: 401 });
  }
  const admin = createAdminClient();
  const { data } = await admin
    .from('practitioner_license_verification_requests')
    .select(
      'id, practitioner_id, jurisdiction, issuing_body, license_number, status, created_at, display_name_snapshot',
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(50);
  return Response.json({ ok: true, pending: data ?? [] });
}
