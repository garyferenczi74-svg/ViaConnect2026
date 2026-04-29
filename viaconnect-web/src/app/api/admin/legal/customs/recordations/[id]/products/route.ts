// Prompt #114 P3: Recordation products linkage CRUD.
//
// GET    /api/admin/legal/customs/recordations/[id]/products
//   -> list linked products enriched with master_skus display fields.
// POST   /api/admin/legal/customs/recordations/[id]/products
//   { sku }
//   -> link a SKU.
// DELETE /api/admin/legal/customs/recordations/[id]/products?sku=<sku>
//   -> unlink.
//
// master_skus has no legal-ops RLS policy, so the join uses the service-role
// admin client after authenticating the caller via user-session client
// (pattern mirrors /master-skus picker route).

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeLegalAudit } from '@/lib/legalAudit/operationsAuditLog';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

const LEGAL_OPS_ROLES = new Set(['admin', 'compliance_officer', 'legal_ops']);
const CFO_CEO_ROLES = new Set(['cfo', 'ceo']);

interface ProfileLite {
  role: string;
}

interface LinkedRowEnriched {
  recordation_product_id: string;
  sku: string;
  linked_at: string;
  linked_by: string | null;
  notes: string | null;
  product_name: string | null;
  product_category: string | null;
  product_msrp: number | null;
}

async function requireLegalOrExec(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000, 'api.admin.legal.customs.recordations.products.auth');
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

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const ctx = await requireLegalOrExec(supabase);
    if (!ctx.ok) return ctx.response;

    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = admin as any;

    // Fetch linked rows (admin client can read customs_recordation_products
    // + master_skus without RLS surprises).
    const { data: linked, error: linkedError } = await sb
      .from('customs_recordation_products')
      .select('recordation_product_id, sku, linked_at, linked_by, notes')
      .eq('recordation_id', params.id)
      .order('linked_at', { ascending: false });
    if (linkedError) {
      return NextResponse.json({ error: linkedError.message }, { status: 500 });
    }

    const rows = (linked ?? []) as Array<{
      recordation_product_id: string;
      sku: string;
      linked_at: string;
      linked_by: string | null;
      notes: string | null;
    }>;
    const skus = rows.map((r) => r.sku);

    const skuMap: Record<string, { name: string; category: string; msrp: number }> = {};
    if (skus.length > 0) {
      const { data: masters } = await sb
        .from('master_skus')
        .select('sku, name, category, msrp')
        .in('sku', skus);
      for (const m of (masters ?? []) as Array<{ sku: string; name: string; category: string; msrp: number }>) {
        skuMap[m.sku] = { name: m.name, category: m.category, msrp: m.msrp };
      }
    }

    const enriched: LinkedRowEnriched[] = rows.map((r) => ({
      recordation_product_id: r.recordation_product_id,
      sku: r.sku,
      linked_at: r.linked_at,
      linked_by: r.linked_by,
      notes: r.notes,
      product_name: skuMap[r.sku]?.name ?? null,
      product_category: skuMap[r.sku]?.category ?? null,
      product_msrp: skuMap[r.sku]?.msrp ?? null,
    }));

    return NextResponse.json({ rows: enriched });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.admin.legal.customs.recordations.products', 'GET timeout', { error: err });
      return NextResponse.json({ error: 'Request timed out.' }, { status: 503 });
    }
    safeLog.error('api.admin.legal.customs.recordations.products', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const ctx = await requireLegalOrExec(supabase);
    if (!ctx.ok) return ctx.response;
    if (!ctx.is_legal_ops) {
      return NextResponse.json(
        { error: 'Only legal-ops roles can link products to a recordation' },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => null)) ?? {};
    const sku: string | null = typeof body.sku === 'string' && body.sku.trim().length > 0
      ? body.sku.trim()
      : null;
    if (!sku) {
      return NextResponse.json({ error: 'sku is required' }, { status: 400 });
    }

    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = admin as any;

    // Verify the target recordation exists.
    const { data: parent } = await sb
      .from('customs_recordations')
      .select('recordation_id')
      .eq('recordation_id', params.id)
      .maybeSingle();
    if (!parent) {
      return NextResponse.json({ error: 'Recordation not found' }, { status: 404 });
    }

    // Verify the SKU exists in master_skus.
    const { data: sku_row } = await sb
      .from('master_skus')
      .select('sku')
      .eq('sku', sku)
      .maybeSingle();
    if (!sku_row) {
      return NextResponse.json({ error: `SKU ${sku} not found in master_skus` }, { status: 400 });
    }

    const { data: created, error } = await sb
      .from('customs_recordation_products')
      .insert({
        recordation_id: params.id,
        sku,
        linked_by: ctx.user_id,
      })
      .select('*')
      .maybeSingle();
    if (error || !created) {
      const msg = error?.message ?? 'Insert failed';
      if (msg.includes('duplicate') || msg.includes('unique')) {
        return NextResponse.json(
          { error: 'SKU already linked to this recordation' },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    await writeLegalAudit(sb, {
      actor_user_id: ctx.user_id,
      actor_role: ctx.role,
      action_category: 'customs_recordation',
      action_verb: 'product_linked',
      target_table: 'customs_recordations',
      target_id: params.id,
      after_state_json: { sku },
    });

    return NextResponse.json({ link: created }, { status: 201 });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.admin.legal.customs.recordations.products', 'POST timeout', { error: err });
      return NextResponse.json({ error: 'Request timed out.' }, { status: 503 });
    }
    safeLog.error('api.admin.legal.customs.recordations.products', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const ctx = await requireLegalOrExec(supabase);
    if (!ctx.ok) return ctx.response;
    if (!ctx.is_legal_ops) {
      return NextResponse.json(
        { error: 'Only legal-ops roles can unlink products from a recordation' },
        { status: 403 },
      );
    }

    const url = new URL(request.url);
    const sku = url.searchParams.get('sku');
    if (!sku) {
      return NextResponse.json({ error: 'sku query param required' }, { status: 400 });
    }

    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = admin as any;

    const { data: existing } = await sb
      .from('customs_recordation_products')
      .select('recordation_product_id, sku, recordation_id')
      .eq('recordation_id', params.id)
      .eq('sku', sku)
      .maybeSingle();
    if (!existing) {
      return NextResponse.json({ error: 'SKU link not found' }, { status: 404 });
    }

    const { error } = await sb
      .from('customs_recordation_products')
      .delete()
      .eq('recordation_id', params.id)
      .eq('sku', sku);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await writeLegalAudit(sb, {
      actor_user_id: ctx.user_id,
      actor_role: ctx.role,
      action_category: 'customs_recordation',
      action_verb: 'product_unlinked',
      target_table: 'customs_recordations',
      target_id: params.id,
      before_state_json: { sku },
    });

    return NextResponse.json({ deleted: sku });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.admin.legal.customs.recordations.products', 'DELETE timeout', { error: err });
      return NextResponse.json({ error: 'Request timed out.' }, { status: 503 });
    }
    safeLog.error('api.admin.legal.customs.recordations.products', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
