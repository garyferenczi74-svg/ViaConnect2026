// Prompt #122 P6: Manual-evidence list + upload.
//
// GET  → list rows, newest first, with freshness classifier applied.
// POST → multipart form-data upload (bytes + metadata).
// Compliance role required on both paths.

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  uploadManualEvidence,
  ManualEvidenceUploadError,
} from '@/lib/soc2/manualEvidence/upload';
import { classifyMany } from '@/lib/soc2/manualEvidence/freshness';
import type { ManualEvidenceRow } from '@/lib/soc2/manualEvidence/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

const COMPLIANCE_ROLES = new Set(['compliance_officer', 'compliance_admin', 'admin', 'superadmin']);

async function requireCompliance(): Promise<
  { ok: true; userId: string } | { ok: false; response: NextResponse }
> {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  const role = (profile as { role?: string } | null)?.role ?? '';
  if (!COMPLIANCE_ROLES.has(role)) {
    return { ok: false, response: NextResponse.json({ error: 'Compliance role required' }, { status: 403 }) };
  }
  return { ok: true, userId: user.id };
}

export async function GET(_req: NextRequest) {
  const auth = await requireCompliance();
  if (!auth.ok) return auth.response;

  const supabase = createServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data, error } = await sb
    .from('soc2_manual_evidence')
    .select('id, title, storage_key, sha256, size_bytes, content_type, controls, valid_from, valid_until, source_description, uploaded_by, uploaded_at, signoff_by, signoff_at, superseded_by, archived, archived_at')
    .order('uploaded_at', { ascending: false })
    .limit(500);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type DbRow = {
    id: string; title: string; storage_key: string; sha256: string; size_bytes: number;
    content_type: string; controls: string[]; valid_from: string | null; valid_until: string | null;
    source_description: string; uploaded_by: string; uploaded_at: string;
    signoff_by: string | null; signoff_at: string | null; superseded_by: string | null;
    archived: boolean; archived_at: string | null;
  };

  const rows: ManualEvidenceRow[] = ((data ?? []) as DbRow[]).map((r) => ({
    id: r.id,
    title: r.title,
    storageKey: r.storage_key,
    sha256: r.sha256,
    sizeBytes: r.size_bytes,
    contentType: r.content_type,
    controls: r.controls ?? [],
    validFrom: r.valid_from,
    validUntil: r.valid_until,
    sourceDescription: r.source_description,
    uploadedBy: r.uploaded_by,
    uploadedAt: r.uploaded_at,
    signoffBy: r.signoff_by,
    signoffAt: r.signoff_at,
    supersededBy: r.superseded_by,
    archived: r.archived,
    archivedAt: r.archived_at,
  }));

  const classified = classifyMany(rows);
  return NextResponse.json({ ok: true, rows: classified });
}

export async function POST(req: NextRequest) {
  const auth = await requireCompliance();
  if (!auth.ok) return auth.response;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'invalid_form' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: 'file_required' }, { status: 400 });
  }
  const title = String(form.get('title') ?? '').trim();
  const sourceDescription = String(form.get('sourceDescription') ?? '').trim();
  const controlsRaw = String(form.get('controls') ?? '').trim();
  const validFrom = nullableString(form.get('validFrom'));
  const validUntil = nullableString(form.get('validUntil'));
  const filenameHint = (file as File).name || 'evidence';

  const controls = controlsRaw
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);

  const ab = await file.arrayBuffer();

  try {
    const result = await uploadManualEvidence({
      supabase: createAdminClient(),
      uploadedBy: auth.userId,
      evidence: {
        title,
        controls,
        validFrom: validFrom ?? undefined,
        validUntil: validUntil ?? undefined,
        sourceDescription,
        bytes: new Uint8Array(ab),
        contentType: file.type || 'application/octet-stream',
        filenameHint,
      },
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof ManualEvidenceUploadError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: 400 });
    }
    // eslint-disable-next-line no-console
    console.error('[soc2 manual-evidence] upload failed', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

function nullableString(v: FormDataEntryValue | null): string | null {
  if (v === null) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}
