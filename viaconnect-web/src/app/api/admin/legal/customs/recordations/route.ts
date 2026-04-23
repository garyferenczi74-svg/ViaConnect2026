// Prompt #114 P2a GET + P2b POST: Customs recordation list + create.
//
// GET  /api/admin/legal/customs/recordations?status=
//   -> rows for the list + dashboard counts, newest first.
// POST /api/admin/legal/customs/recordations
//   { recordation_type, mark_text?, copyright_registration_number?,
//     uspto_registration_number?, uspto_registration_date?,
//     copyright_registration_date?, total_ic_count?, notes? }
//   -> inserts at status='draft', ai_drafted=FALSE. Further edits via PATCH
//      on /recordations/[id].

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeLegalAudit } from '@/lib/legalAudit/operationsAuditLog';
import type { CustomsRecordationType } from '@/lib/customs/types';

export const runtime = 'nodejs';

const LEGAL_OPS_ROLES = new Set(['admin', 'compliance_officer', 'legal_ops']);
const CFO_CEO_ROLES = new Set(['cfo', 'ceo']);

interface ProfileLite {
  role: string;
}

interface RecordationRow {
  recordation_id: string;
  recordation_type: string;
  status: string;
  mark_text: string | null;
  cbp_recordation_number: string | null;
  cbp_expiration_date: string | null;
  cbp_grace_expiration_date: string | null;
  total_ic_count: number | null;
  total_fee_cents: number | null;
  submitted_at: string | null;
  counsel_reviewed_at: string | null;
  ceo_approved_at: string | null;
  created_at: string;
  updated_at: string;
}

async function requireLegalOrExec(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
    };
  }
  const sb = supabase as unknown as {
    from: (t: string) => {
      select: (s: string) => {
        eq: (k: string, v: string) => {
          maybeSingle: () => Promise<{ data: ProfileLite | null }>;
        };
      };
    };
  };
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Legal or executive access required' }, { status: 403 }),
    };
  }
  const isLegalOps = LEGAL_OPS_ROLES.has(profile.role);
  const isExec = CFO_CEO_ROLES.has(profile.role);
  if (!isLegalOps && !isExec) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Legal or executive access required' }, { status: 403 }),
    };
  }
  return { ok: true as const, user_id: user.id, role: profile.role, is_legal_ops: isLegalOps };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = createClient();
  const ctx = await requireLegalOrExec(supabase);
  if (!ctx.ok) return ctx.response;

  const url = new URL(request.url);
  const status = url.searchParams.get('status');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  let q = sb
    .from('customs_recordations')
    .select(`
      recordation_id,
      recordation_type,
      status,
      mark_text,
      cbp_recordation_number,
      cbp_expiration_date,
      cbp_grace_expiration_date,
      total_ic_count,
      total_fee_cents,
      submitted_at,
      counsel_reviewed_at,
      ceo_approved_at,
      created_at,
      updated_at
    `)
    .order('updated_at', { ascending: false })
    .limit(200);

  if (status) {
    q = q.eq('status', status);
  }

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rows: (data ?? []) as RecordationRow[] });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = createClient();
  const ctx = await requireLegalOrExec(supabase);
  if (!ctx.ok) return ctx.response;
  if (!ctx.is_legal_ops) {
    return NextResponse.json({ error: 'Only legal-ops roles can create recordations' }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) ?? {};

  const recordationType = body.recordation_type as CustomsRecordationType | undefined;
  if (recordationType !== 'trademark' && recordationType !== 'copyright') {
    return NextResponse.json(
      { error: 'recordation_type must be "trademark" or "copyright"' },
      { status: 400 },
    );
  }

  const markText: string | null = typeof body.mark_text === 'string' && body.mark_text.trim().length > 0
    ? body.mark_text.trim()
    : null;
  const copyrightReg: string | null =
    typeof body.copyright_registration_number === 'string' && body.copyright_registration_number.trim().length > 0
      ? body.copyright_registration_number.trim()
      : null;

  if (recordationType === 'trademark' && !markText) {
    return NextResponse.json(
      { error: 'mark_text is required for a trademark recordation' },
      { status: 400 },
    );
  }
  if (recordationType === 'copyright' && !copyrightReg) {
    return NextResponse.json(
      { error: 'copyright_registration_number is required for a copyright recordation' },
      { status: 400 },
    );
  }

  const row: Record<string, unknown> = {
    recordation_type: recordationType,
    status: 'draft',
    mark_text: markText,
    copyright_registration_number: copyrightReg,
    uspto_registration_number: typeof body.uspto_registration_number === 'string' ? body.uspto_registration_number : null,
    uspto_registration_date: typeof body.uspto_registration_date === 'string' ? body.uspto_registration_date : null,
    copyright_registration_date: typeof body.copyright_registration_date === 'string' ? body.copyright_registration_date : null,
    total_ic_count: Number.isInteger(body.total_ic_count) && body.total_ic_count > 0 ? body.total_ic_count : null,
    total_fee_cents: Number.isInteger(body.total_fee_cents) && body.total_fee_cents >= 0 ? body.total_fee_cents : null,
    renewal_fee_cents: Number.isInteger(body.renewal_fee_cents) && body.renewal_fee_cents >= 0 ? body.renewal_fee_cents : null,
    notes: typeof body.notes === 'string' ? body.notes : null,
    created_by: ctx.user_id,
    trade_secrets_flag: true,
    // P2 never inserts as AI-drafted. Marshall flows (P5) explicitly set ai_drafted=TRUE.
    ai_drafted: false,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: created, error } = await sb
    .from('customs_recordations')
    .insert(row)
    .select('*')
    .maybeSingle();

  if (error || !created) {
    return NextResponse.json(
      { error: error?.message ?? 'Insert failed' },
      { status: 500 },
    );
  }

  await writeLegalAudit(sb, {
    actor_user_id: ctx.user_id,
    actor_role: ctx.role,
    action_category: 'customs_recordation',
    action_verb: 'opened',
    target_table: 'customs_recordations',
    target_id: created.recordation_id,
    after_state_json: {
      recordation_type: created.recordation_type,
      status: created.status,
      mark_text: created.mark_text,
      copyright_registration_number: created.copyright_registration_number,
    },
    context_json: null,
  });

  return NextResponse.json({ recordation: created }, { status: 201 });
}
