// Prompt #127 P4: HIPAA Risk Analysis upload + insert.
// 45 CFR 164.308(a)(1)(ii)(A), Required, annual.

import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomUUID } from 'node:crypto';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';
export const maxDuration = 60;

const HIPAA_ADMIN_ROLES = new Set(['compliance_officer', 'compliance_admin', 'admin', 'superadmin']);
const BUCKET = 'hipaa-evidence';

export async function POST(req: NextRequest) {
  try {
    const session = createServerClient();
    const { data: { user } } = await withTimeout(session.auth.getUser(), 5000, 'api.hipaa.risk-analysis.auth');
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const { data: profile } = await withTimeout(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async () => (session as any).from('profiles').select('role').eq('id', user.id).maybeSingle())(),
      8000,
      'api.hipaa.risk-analysis.profile',
    );
    const role = (profile as { role?: string } | null)?.role ?? '';
    if (!HIPAA_ADMIN_ROLES.has(role)) return NextResponse.json({ error: 'HIPAA admin role required' }, { status: 403 });

  let form: FormData;
  try { form = await req.formData(); }
  catch { return NextResponse.json({ error: 'invalid_form' }, { status: 400 }); }

  const file = form.get('file');
  if (!(file instanceof Blob) || file.size === 0) return NextResponse.json({ error: 'file_required' }, { status: 400 });
  const version = Number.parseInt(String(form.get('version') ?? ''), 10);
  if (!Number.isFinite(version) || version <= 0) return NextResponse.json({ error: 'version_required' }, { status: 400 });
  const validFrom = String(form.get('validFrom') ?? '').trim();
  const validUntil = String(form.get('validUntil') ?? '').trim() || null;
  const scopeSummary = String(form.get('scopeSummary') ?? '').trim();
  const methodologySummary = String(form.get('methodologySummary') ?? '').trim();
  if (!validFrom || !scopeSummary || !methodologySummary) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const sha256 = createHash('sha256').update(Buffer.from(bytes)).digest('hex');
  const storageKey = `risk-analysis/v${version}-${randomUUID().slice(0, 8)}.pdf`;

  const admin = createAdminClient();
  const { error: uploadErr } = await admin.storage.from(BUCKET).upload(storageKey, bytes, {
    contentType: (file as File).type || 'application/pdf',
    cacheControl: 'private, max-age=31536000, immutable',
    upsert: false,
  });
  if (uploadErr && !uploadErr.message?.toLowerCase().includes('already exists')) {
    return NextResponse.json({ error: 'storage_upload_failed' }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = admin as any;
  const { data, error } = await withTimeout(
    (async () => sb
      .from('hipaa_risk_analyses')
      .insert({
        version,
        storage_key: storageKey,
        sha256,
        valid_from: validFrom,
        valid_until: validUntil,
        scope_summary: scopeSummary,
        methodology_summary: methodologySummary,
        uploaded_by: user.id,
      })
      .select('id')
      .single())(),
    8000,
    'api.hipaa.risk-analysis.insert',
  );
  if (error) {
    safeLog.error('api.hipaa.risk-analysis', 'insert failed', { message: error.message });
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: (data as { id: string }).id, storageKey });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.hipaa.risk-analysis', 'timeout', { error: err });
      return NextResponse.json({ error: 'timeout' }, { status: 503 });
    }
    safeLog.error('api.hipaa.risk-analysis', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'unexpected_error' }, { status: 500 });
  }
}
