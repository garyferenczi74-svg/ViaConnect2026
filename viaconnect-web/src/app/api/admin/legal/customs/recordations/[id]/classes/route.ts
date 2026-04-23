// Prompt #114 P2b: IC class sub-CRUD.
//
// POST   /api/admin/legal/customs/recordations/[id]/classes
//   { international_class, class_description, fee_cents?, renewal_fee_cents?,
//     authorized_manufacturers?, countries_of_manufacture? }
//   -> inserts one IC class row. Trademark recordations only.
// DELETE /api/admin/legal/customs/recordations/[id]/classes?classRowId=<uuid>
//   -> removes an IC class by row id.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeLegalAudit } from '@/lib/legalAudit/operationsAuditLog';
import {
  CBP_RATE_PER_IC_CENTS_INITIAL,
  CBP_RATE_PER_IC_CENTS_RENEWAL,
  MIN_INTERNATIONAL_CLASS,
  MAX_INTERNATIONAL_CLASS,
} from '@/lib/customs/cbpFeeCalculator';

export const runtime = 'nodejs';

const LEGAL_OPS_ROLES = new Set(['admin', 'compliance_officer', 'legal_ops']);

interface ProfileLite {
  role: string;
}

async function requireLegalOps(supabase: ReturnType<typeof createClient>) {
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
  if (!profile || !LEGAL_OPS_ROLES.has(profile.role)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Legal-ops access required' }, { status: 403 }),
    };
  }
  return { ok: true as const, user_id: user.id, role: profile.role };
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const supabase = createClient();
  const ctx = await requireLegalOps(supabase);
  if (!ctx.ok) return ctx.response;

  const body = (await request.json().catch(() => null)) ?? {};

  const ic = body.international_class;
  if (!Number.isInteger(ic) || ic < MIN_INTERNATIONAL_CLASS || ic > MAX_INTERNATIONAL_CLASS) {
    return NextResponse.json(
      {
        error: `international_class must be an integer between ${MIN_INTERNATIONAL_CLASS} and ${MAX_INTERNATIONAL_CLASS}`,
      },
      { status: 400 },
    );
  }

  const description = typeof body.class_description === 'string' ? body.class_description.trim() : '';
  if (description.length < 3) {
    return NextResponse.json(
      { error: 'class_description must be at least 3 characters' },
      { status: 400 },
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: parent, error: parentError } = await sb
    .from('customs_recordations')
    .select('recordation_id, recordation_type, status')
    .eq('recordation_id', params.id)
    .maybeSingle();
  if (parentError || !parent) {
    return NextResponse.json({ error: 'Recordation not found' }, { status: 404 });
  }
  if (parent.recordation_type !== 'trademark') {
    return NextResponse.json(
      { error: 'IC classes can only be added to trademark recordations' },
      { status: 400 },
    );
  }

  const insertRow = {
    recordation_id: params.id,
    international_class: ic,
    class_description: description,
    fee_cents: Number.isInteger(body.fee_cents) && body.fee_cents >= 0
      ? body.fee_cents
      : CBP_RATE_PER_IC_CENTS_INITIAL,
    renewal_fee_cents: Number.isInteger(body.renewal_fee_cents) && body.renewal_fee_cents >= 0
      ? body.renewal_fee_cents
      : CBP_RATE_PER_IC_CENTS_RENEWAL,
    authorized_manufacturers: Array.isArray(body.authorized_manufacturers)
      ? body.authorized_manufacturers.filter((s: unknown) => typeof s === 'string')
      : [],
    countries_of_manufacture: Array.isArray(body.countries_of_manufacture)
      ? body.countries_of_manufacture.filter((s: unknown) => typeof s === 'string')
      : [],
  };

  const { data: created, error } = await sb
    .from('customs_recordation_classes')
    .insert(insertRow)
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
    action_verb: 'ic_class_added',
    target_table: 'customs_recordation_classes',
    target_id: created.class_row_id,
    after_state_json: {
      recordation_id: created.recordation_id,
      international_class: created.international_class,
      fee_cents: created.fee_cents,
    },
  });

  return NextResponse.json({ class: created }, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const supabase = createClient();
  const ctx = await requireLegalOps(supabase);
  if (!ctx.ok) return ctx.response;

  const url = new URL(request.url);
  const classRowId = url.searchParams.get('classRowId');
  if (!classRowId) {
    return NextResponse.json(
      { error: 'classRowId query param required' },
      { status: 400 },
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: existing } = await sb
    .from('customs_recordation_classes')
    .select('*')
    .eq('class_row_id', classRowId)
    .eq('recordation_id', params.id)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json({ error: 'IC class row not found' }, { status: 404 });
  }

  const { error } = await sb
    .from('customs_recordation_classes')
    .delete()
    .eq('class_row_id', classRowId)
    .eq('recordation_id', params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await writeLegalAudit(sb, {
    actor_user_id: ctx.user_id,
    actor_role: ctx.role,
    action_category: 'customs_recordation',
    action_verb: 'ic_class_removed',
    target_table: 'customs_recordation_classes',
    target_id: classRowId,
    before_state_json: {
      recordation_id: existing.recordation_id,
      international_class: existing.international_class,
      class_description: existing.class_description,
    },
  });

  return NextResponse.json({ deleted: classRowId });
}
