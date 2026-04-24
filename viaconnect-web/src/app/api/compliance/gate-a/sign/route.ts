// Prompt #127 P8: Gate A sign-off.
//
// Records a single framework + role sign-off for the #127 multi-framework
// compliance initiative. Callers identify their own role for the
// framework (compliance_officer for SOC 2, security_officer for HIPAA,
// isms_manager for ISO 27001). One active row per (framework, role); a
// new sign-off supersedes prior ones by flipping them to revoked, then
// inserting the new row as active.

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { loadRegistry } from '@/lib/compliance/frameworks/registry';
import type { FrameworkId } from '@/lib/compliance/frameworks/types';

export const runtime = 'nodejs';

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
  const session = createServerClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  const { data: profile } = await session.from('profiles').select('role').eq('id', user.id).maybeSingle();
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

  // Supersede any active prior sign-off for this (framework, role) pair.
  const { error: revokeErr } = await sb
    .from('compliance_gate_a_signoffs')
    .update({
      revoked: true,
      revoked_at: new Date().toISOString(),
      revoked_by: user.id,
      revocation_reason: 'Superseded by new sign-off.',
    })
    .eq('framework_id', frameworkId)
    .eq('attestor_role', attestorRole)
    .eq('revoked', false);
  if (revokeErr) {
    // eslint-disable-next-line no-console
    console.error('[gate-a sign] supersede failed', { message: revokeErr.message });
    return NextResponse.json({ error: 'supersede_failed' }, { status: 500 });
  }

  const { data, error } = await sb
    .from('compliance_gate_a_signoffs')
    .insert({
      framework_id: frameworkId,
      attestor_role: attestorRole,
      signed_by: user.id,
      signed_name: signedName,
      registry_version: registry.registryVersion,
      scope_summary: scopeSummary,
      outstanding_flags_critical: outstandingCritical,
      outstanding_flags_warning: outstandingWarning,
      attestation_text: attestationText,
    })
    .select('id, signed_at')
    .single();
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[gate-a sign] insert failed', { message: error.message });
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }
  const row = data as { id: string; signed_at: string };
  return NextResponse.json({ ok: true, id: row.id, signedAt: row.signed_at, frameworkId, attestorRole });
}
