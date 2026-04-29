// Prompt #104 Phase 2: Evidence upload + list.
//
// GET  /api/admin/legal/cases/[caseId]/evidence
//   -> list of evidence artifacts for the case
// POST /api/admin/legal/cases/[caseId]/evidence
//   multipart/form-data: file + artifact_type + description?
//   -> uploads to storage, computes SHA-256, inserts evidence row.
//      Path: legal-evidence/{case_id}/{evidence_id}-{filename}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeLegalAudit } from '@/lib/legalAudit/operationsAuditLog';
import { sha256Hex } from '@/lib/legal/evidence/hashing';
import { EVIDENCE_ARTIFACT_TYPES, type EvidenceArtifactType } from '@/lib/legal/types';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

const LEGAL_OPS_ROLES = new Set(['admin', 'compliance_officer', 'legal_ops']);
const ARTIFACT_TYPE_SET = new Set<string>(EVIDENCE_ARTIFACT_TYPES);
const BUCKET = 'legal-evidence';
const MAX_BYTES = 100 * 1024 * 1024;  // matches storage bucket limit

interface ProfileLite { role: string }

async function requireLegalOps(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000, 'api.admin.legal.cases.evidence.auth');
  if (!user) return { ok: false as const, response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: ProfileLite | null }> } } } };
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || !LEGAL_OPS_ROLES.has(profile.role)) {
    return { ok: false as const, response: NextResponse.json({ error: 'Legal-ops access required' }, { status: 403 }) };
  }
  return { ok: true as const, user_id: user.id, role: profile.role };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { caseId: string } },
): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const ctx = await requireLegalOps(supabase);
    if (!ctx.ok) return ctx.response;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { data, error } = await sb
      .from('legal_investigation_evidence')
      .select('evidence_id, artifact_type, storage_path, content_sha256, mime_type, file_size_bytes, captured_at, captured_via, description')
      .eq('case_id', params.caseId)
      .order('captured_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ rows: data ?? [] });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.admin.legal.cases.evidence', 'GET timeout', { error: err });
      return NextResponse.json({ error: 'Request timed out.' }, { status: 503 });
    }
    safeLog.error('api.admin.legal.cases.evidence', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { caseId: string } },
): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const ctx = await requireLegalOps(supabase);
    if (!ctx.ok) return ctx.response;

    const form = await request.formData().catch(() => null);
    if (!form) return NextResponse.json({ error: 'multipart/form-data required' }, { status: 400 });

    const file = form.get('file');
    const artifactType = form.get('artifact_type');
    const description = form.get('description');

    if (!(file instanceof File)) return NextResponse.json({ error: 'file required' }, { status: 400 });
    if (typeof artifactType !== 'string' || !ARTIFACT_TYPE_SET.has(artifactType)) {
      return NextResponse.json({ error: 'artifact_type required (valid enum value)' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: `file exceeds ${MAX_BYTES} bytes` }, { status: 413 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    const { data: caseRow } = await sb
      .from('legal_investigation_cases')
      .select('case_id')
      .eq('case_id', params.caseId)
      .maybeSingle();
    if (!caseRow) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

    const buffer = await file.arrayBuffer();
    const sha = await sha256Hex(buffer);

    // Generate path before insert: legal-evidence/{case_id}/{ts}-{filename}
    const safeName = file.name.replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 80);
    const ts = Date.now();
    const path = `${params.caseId}/${ts}-${safeName}`;

    const { error: upErr } = await sb.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type || 'application/octet-stream', upsert: false });
    if (upErr) return NextResponse.json({ error: `upload failed: ${upErr.message}` }, { status: 500 });

    const { data: inserted, error: insErr } = await sb
      .from('legal_investigation_evidence')
      .insert({
        case_id: params.caseId,
        artifact_type: artifactType as EvidenceArtifactType,
        storage_path: path,
        content_sha256: sha,
        mime_type: file.type || null,
        file_size_bytes: file.size,
        captured_by: ctx.user_id,
        captured_via: 'admin_upload',
        description: typeof description === 'string' ? description : null,
        chain_of_custody_json: [{
          event: 'capture',
          at: new Date().toISOString(),
          actor: ctx.user_id,
          sha256: sha,
          bytes: file.size,
        }],
      })
      .select('evidence_id, content_sha256, storage_path, captured_at')
      .maybeSingle();
    if (insErr || !inserted) {
      // Best-effort cleanup of the uploaded blob if the metadata insert failed.
      await sb.storage.from(BUCKET).remove([path]).catch(() => {});
      return NextResponse.json({ error: insErr?.message ?? 'Insert failed' }, { status: 500 });
    }

    await writeLegalAudit(sb, {
      actor_user_id: ctx.user_id,
      actor_role: ctx.role,
      action_category: 'evidence',
      action_verb: 'captured',
      target_table: 'legal_investigation_evidence',
      target_id: inserted.evidence_id,
      case_id: params.caseId,
      hash_verified: true,
      after_state_json: { storage_path: path, content_sha256: sha, artifact_type: artifactType, file_size: file.size },
    });

    return NextResponse.json({ evidence: inserted }, { status: 201 });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.admin.legal.cases.evidence', 'POST timeout', { error: err });
      return NextResponse.json({ error: 'Request timed out.' }, { status: 503 });
    }
    safeLog.error('api.admin.legal.cases.evidence', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
