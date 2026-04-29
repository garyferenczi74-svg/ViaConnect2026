// Prompt #104 Phase 2: Counterparty registry list + create.
//
// GET /api/admin/legal/counterparties?disputed_only=true&q=acme
//   -> registry rows with case-count + last activity
// POST /api/admin/legal/counterparties
//   { display_label, counterparty_type, primary_jurisdiction?,
//     verified_business_reg_id?, verified_domain?, marketplace_handles?,
//     notes? }
//   -> creates a counterparty record. AI-only inference is rejected
//      via identityScoring; here we accept whatever the human admin
//      enters and the score is recomputed.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeLegalAudit } from '@/lib/legalAudit/operationsAuditLog';
import { scoreCounterpartyIdentity } from '@/lib/legal/counterparties/identityScoring';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

const LEGAL_OPS_ROLES = new Set(['admin', 'compliance_officer', 'legal_ops']);

interface ProfileLite { role: string }

async function requireLegalOps(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000, 'api.admin.legal.counterparties.auth');
  if (!user) return { ok: false as const, response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: ProfileLite | null }> } } } };
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || !LEGAL_OPS_ROLES.has(profile.role)) {
    return { ok: false as const, response: NextResponse.json({ error: 'Legal-ops access required' }, { status: 403 }) };
  }
  return { ok: true as const, user_id: user.id, role: profile.role };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const ctx = await requireLegalOps(supabase);
    if (!ctx.ok) return ctx.response;

    const url = new URL(request.url);
    const disputedOnly = url.searchParams.get('disputed_only') === 'true';
    const search = url.searchParams.get('q');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    let q = sb
      .from('legal_counterparties')
      .select('counterparty_id, display_label, counterparty_type, primary_jurisdiction, verified_business_reg_id, verified_domain, identity_confidence, disputed_identity, total_cases_count, total_settlement_cents, first_seen_at, last_activity_at')
      .order('last_activity_at', { ascending: false })
      .limit(200);
    if (disputedOnly) q = q.eq('disputed_identity', true);
    if (search && search.length > 0) {
      q = q.ilike('display_label', `%${search}%`);
    }

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ rows: data ?? [] });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.admin.legal.counterparties', 'GET timeout', { error: err });
      return NextResponse.json({ error: 'Request timed out.' }, { status: 503 });
    }
    safeLog.error('api.admin.legal.counterparties', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

interface MarketplaceHandle {
  platform: string;
  handle: string;
  admin_confirmed: boolean;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const ctx = await requireLegalOps(supabase);
    if (!ctx.ok) return ctx.response;

    const body = (await request.json().catch(() => null)) ?? {};
    if (typeof body.display_label !== 'string' || body.display_label.trim().length < 2) {
      return NextResponse.json({ error: 'display_label required (>= 2 chars)' }, { status: 400 });
    }
    const counterpartyType: string = typeof body.counterparty_type === 'string' ? body.counterparty_type : 'unknown';
    const verifiedBusinessRegId: string | null = typeof body.verified_business_reg_id === 'string' && body.verified_business_reg_id.length > 0 ? body.verified_business_reg_id : null;
    const verifiedDomain: string | null = typeof body.verified_domain === 'string' && body.verified_domain.length > 0 ? body.verified_domain : null;
    const marketplaceHandles: MarketplaceHandle[] = Array.isArray(body.marketplace_handles) ? body.marketplace_handles : [];

    // Compute identity confidence the same way the dedup engine will,
    // so admin sees the score that downstream merge logic will weigh.
    const score = scoreCounterpartyIdentity({
      verified_business_reg_id: verifiedBusinessRegId,
      verified_domain: verifiedDomain,
      marketplace_handles_admin_confirmed: marketplaceHandles,
      payment_identity_present: false,
      self_identified_only: !verifiedBusinessRegId && !verifiedDomain && marketplaceHandles.length === 0,
      ai_inferred_identifier_only: false,
    });

    if (score.ai_only_blocked) {
      return NextResponse.json({
        error: 'AI-inferred identifier alone cannot create a counterparty. Add at least one human-verified identifier.',
      }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { data: created, error } = await sb
      .from('legal_counterparties')
      .insert({
        display_label: body.display_label.trim(),
        counterparty_type: counterpartyType,
        primary_jurisdiction: typeof body.primary_jurisdiction === 'string' ? body.primary_jurisdiction : null,
        jurisdictions: Array.isArray(body.jurisdictions) ? body.jurisdictions : [],
        verified_business_reg_id: verifiedBusinessRegId,
        verified_domain: verifiedDomain,
        marketplace_handles: marketplaceHandles,
        identity_confidence: score.confidence,
        notes: typeof body.notes === 'string' ? body.notes : null,
      })
      .select('counterparty_id, display_label, identity_confidence')
      .maybeSingle();
    if (error || !created) return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 });

    await writeLegalAudit(sb, {
      actor_user_id: ctx.user_id,
      actor_role: ctx.role,
      action_category: 'counterparty',
      action_verb: 'created',
      target_table: 'legal_counterparties',
      target_id: created.counterparty_id,
      after_state_json: { display_label: created.display_label, identity_confidence: created.identity_confidence },
    });

    return NextResponse.json({ counterparty: created }, { status: 201 });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.admin.legal.counterparties', 'POST timeout', { error: err });
      return NextResponse.json({ error: 'Request timed out.' }, { status: 503 });
    }
    safeLog.error('api.admin.legal.counterparties', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
