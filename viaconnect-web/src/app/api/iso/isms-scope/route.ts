// Prompt #127 P6: ISO 27001 ISMS scope document upload route. Clause 4.3.
//
// Multipart form: PDF + scope_description + included_boundaries JSON +
// exclusions JSON + effective_from + optional effective_until. Server
// auto-bumps version, writes PDF into iso-evidence/scope/vN-<uuid>.pdf,
// computes sha256 for integrity.

import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomUUID } from 'node:crypto';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const ISO_ADMIN_ROLES = new Set(['compliance_officer', 'compliance_admin', 'admin', 'superadmin']);
const MAX_BYTES = 100 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const session = createServerClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  const { data: profile } = await session.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const role = (profile as { role?: string } | null)?.role ?? '';
  if (!ISO_ADMIN_ROLES.has(role)) return NextResponse.json({ error: 'ISO admin role required' }, { status: 403 });

  let fd: FormData;
  try { fd = await req.formData(); }
  catch { return NextResponse.json({ error: 'invalid_form_data' }, { status: 400 }); }

  const file = fd.get('file');
  const scopeDescription = String(fd.get('scopeDescription') ?? '').trim();
  const effectiveFrom = String(fd.get('effectiveFrom') ?? '').trim();
  const effectiveUntil = String(fd.get('effectiveUntil') ?? '').trim();
  const includedBoundariesRaw = String(fd.get('includedBoundaries') ?? '[]');
  const exclusionsRaw = String(fd.get('exclusions') ?? '[]');

  if (!(file instanceof File)) return NextResponse.json({ error: 'file_required' }, { status: 400 });
  if (file.size === 0) return NextResponse.json({ error: 'file_empty' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'file_too_large', maxBytes: MAX_BYTES }, { status: 400 });
  if (scopeDescription.length < 50) return NextResponse.json({ error: 'scope_description_too_short', minLength: 50 }, { status: 400 });
  if (!effectiveFrom) return NextResponse.json({ error: 'effective_from_required' }, { status: 400 });

  let includedBoundaries: unknown[];
  let exclusions: unknown[];
  try {
    includedBoundaries = JSON.parse(includedBoundariesRaw);
    if (!Array.isArray(includedBoundaries)) throw new Error('not_array');
  } catch {
    return NextResponse.json({ error: 'included_boundaries_not_array' }, { status: 400 });
  }
  try {
    exclusions = JSON.parse(exclusionsRaw);
    if (!Array.isArray(exclusions)) throw new Error('not_array');
  } catch {
    return NextResponse.json({ error: 'exclusions_not_array' }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const sha256 = createHash('sha256').update(buf).digest('hex');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = session as any;
  const { data: priorRow } = await sb
    .from('iso_isms_scope_documents')
    .select('version')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  const priorVersion = (priorRow as { version?: number } | null)?.version ?? 0;
  const nextVersion = priorVersion + 1;

  const storageKey = `scope/v${nextVersion}-${randomUUID().slice(0, 8)}.pdf`;
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sbAdmin = admin as any;
  const { error: uploadErr } = await sbAdmin.storage
    .from('iso-evidence')
    .upload(storageKey, buf, { contentType: file.type || 'application/pdf', upsert: false });
  if (uploadErr) {
    // eslint-disable-next-line no-console
    console.error('[iso isms-scope] upload failed', { message: uploadErr.message });
    return NextResponse.json({ error: 'upload_failed' }, { status: 500 });
  }

  const { data, error } = await sb
    .from('iso_isms_scope_documents')
    .insert({
      version: nextVersion,
      scope_description: scopeDescription,
      included_boundaries: includedBoundaries,
      exclusions,
      effective_from: effectiveFrom,
      effective_until: effectiveUntil || null,
      storage_key: storageKey,
      recorded_by: user.id,
    })
    .select('id, version')
    .single();
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[iso isms-scope] insert failed', { message: error.message });
    return NextResponse.json({ error: 'insert_failed', sha256 }, { status: 500 });
  }
  const row = data as { id: string; version: number };
  return NextResponse.json({ ok: true, id: row.id, version: row.version, storageKey, sha256 });
}
