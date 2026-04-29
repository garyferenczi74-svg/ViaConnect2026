// Prompt #127 P8: Gate A sign-off.
//
// Records a Gate A sign-off against the polymorphic gate_signoff table.
// One row per framework (DB-enforced via UNIQUE on
// (framework_id, gate_key, subject_type, subject_id)); re-signing upserts
// the same row and records the prior signer in metadata.previous_signers.
//
// Table shape (as applied):
//   id, framework_id, gate_key, subject_type, subject_id,
//   signoff_status, signed_by, signed_at, note, metadata
//
// Mapping for Gate A:
//   gate_key       = 'p127_gate_a'
//   subject_type   = 'framework'
//   subject_id     = framework_id
//   signoff_status = 'signed'
//   note           = attestation_text
//   metadata       = { attestor_role, signed_name, registry_version,
//                      scope_summary, outstanding_flags_critical,
//                      outstanding_flags_warning, previous_signers }
//
// Attestor role derives from framework per FRAMEWORK_TO_ATTESTOR_ROLE:
//   compliance_officer (SOC 2), security_officer (HIPAA), isms_manager (ISO).

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { loadRegistry } from '@/lib/compliance/frameworks/registry';
import type { FrameworkId } from '@/lib/compliance/frameworks/types';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

const GATE_KEY = 'p127_gate_a';
const SIGN_ROLES = new Set(['compliance_officer', 'compliance_admin', 'admin', 'superadmin']);

const FRAMEWORK_TO_ATTESTOR_ROLE: Record<FrameworkId, 'compliance_officer' | 'security_officer' | 'isms_manager'> = {
  soc2: 'compliance_officer',
  hipaa_security: 'security_officer',
  iso_27001_2022: 'isms_manager',
};

interface Body {
  frameworkId?: string;
  signedName?: string;
  scopeSummary?: string;
  attestationText?: string;
  outstandingFlagsCritical?: number;
  outstandingFlagsWarning?: number;
}

export async function POST(req: NextRequest) {
  try {
    const session = createServerClient();
    const { data: { user } } = await withTimeout(session.auth.getUser(), 5000, 'api.compliance.gate-a.auth');
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const { data: profile } = await withTimeout(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async () => (session as any).from('profiles').select('role').eq('id', user.id).maybeSingle())(),
      8000,
      'api.compliance.gate-a.profile',
    );
    const role = (profile as { role?: string } | null)?.role ?? '';
    if (!SIGN_ROLES.has(role)) return NextResponse.json({ error: 'Compliance role required' }, { status: 403 });

  let body: Body;
  try { body = (await req.json()) as Body; }
  catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const frameworkId = (body.frameworkId ?? '').trim();
  const attestorRole = FRAMEWORK_TO_ATTESTOR_ROLE[frameworkId as FrameworkId];
  if (!attestorRole) return NextResponse.json({ error: 'invalid_framework_id' }, { status: 400 });

  const signedName = (body.signedName ?? '').trim();
  const scopeSummary = (body.scopeSummary ?? '').trim();
  const attestationText = (body.attestationText ?? '').trim();
  if (signedName.length < 3) return NextResponse.json({ error: 'signed_name_required', minLength: 3 }, { status: 400 });
  if (scopeSummary.length < 20) return NextResponse.json({ error: 'scope_summary_too_short', minLength: 20 }, { status: 400 });
  if (attestationText.length < 50) return NextResponse.json({ error: 'attestation_text_too_short', minLength: 50 }, { status: 400 });

  const outstandingCritical = typeof body.outstandingFlagsCritical === 'number' && body.outstandingFlagsCritical >= 0
    ? Math.trunc(body.outstandingFlagsCritical) : 0;
  const outstandingWarning = typeof body.outstandingFlagsWarning === 'number' && body.outstandingFlagsWarning >= 0
    ? Math.trunc(body.outstandingFlagsWarning) : 0;

  if (outstandingCritical > 0) {
    return NextResponse.json({
      error: 'critical_flags_block_signoff',
      detail: 'Resolve all critical consistency flags before recording Gate A sign-off.',
      outstandingCritical,
    }, { status: 409 });
  }

  const registry = loadRegistry();
  const frameworkDef = registry.frameworks[frameworkId as FrameworkId];
  if (!frameworkDef) return NextResponse.json({ error: 'unknown_framework' }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = session as any;
  const nowIso = new Date().toISOString();

  // Pull the prior row so we can preserve its signer chain in metadata.
  const { data: priorRow } = await withTimeout(
    (async () => sb
      .from('compliance_gate_a_signoffs')
      .select('id, signed_by, signed_at, metadata')
      .eq('gate_key', GATE_KEY)
      .eq('subject_type', 'framework')
      .eq('subject_id', frameworkId)
      .maybeSingle())(),
    8000,
    'api.compliance.gate-a.priorRow',
  );
  type PriorRow = {
    id: string;
    signed_by: string;
    signed_at: string;
    metadata: Record<string, unknown> | null;
  };
  const prior = priorRow as PriorRow | null;
  const priorMeta = prior?.metadata ?? {};
  const priorSigners = Array.isArray((priorMeta as { previous_signers?: unknown[] }).previous_signers)
    ? ((priorMeta as { previous_signers: unknown[] }).previous_signers)
    : [];
  const previousSigners = prior
    ? [
        ...priorSigners,
        {
          signed_by: prior.signed_by,
          signed_at: prior.signed_at,
          signed_name: (priorMeta as { signed_name?: string }).signed_name ?? null,
          attestor_role: (priorMeta as { attestor_role?: string }).attestor_role ?? null,
          registry_version: (priorMeta as { registry_version?: string }).registry_version ?? null,
        },
      ]
    : priorSigners;

  const metadata = {
    attestor_role: attestorRole,
    signed_name: signedName,
    registry_version: registry.registryVersion,
    scope_summary: scopeSummary,
    outstanding_flags_critical: outstandingCritical,
    outstanding_flags_warning: outstandingWarning,
    previous_signers: previousSigners,
    updated_at: nowIso,
  };

  const { data, error } = await withTimeout(
    (async () => sb
      .from('compliance_gate_a_signoffs')
      .upsert({
        framework_id: frameworkId,
        gate_key: GATE_KEY,
        subject_type: 'framework',
        subject_id: frameworkId,
        signoff_status: 'signed',
        signed_by: user.id,
        signed_at: nowIso,
        note: attestationText,
        metadata,
      }, { onConflict: 'framework_id,gate_key,subject_type,subject_id' })
      .select('id, signed_at')
      .single())(),
    8000,
    'api.compliance.gate-a.upsert',
  );
  if (error) {
    safeLog.error('api.compliance.gate-a', 'upsert failed', { message: error.message });
    return NextResponse.json({ error: 'upsert_failed' }, { status: 500 });
  }
  const row = data as { id: string; signed_at: string };
  return NextResponse.json({
    ok: true,
    id: row.id,
    signedAt: row.signed_at,
    frameworkId,
    attestorRole,
    previousSignersCount: previousSigners.length,
  });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.compliance.gate-a', 'timeout', { error: err });
      return NextResponse.json({ error: 'timeout' }, { status: 503 });
    }
    safeLog.error('api.compliance.gate-a', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'unexpected_error' }, { status: 500 });
  }
}
