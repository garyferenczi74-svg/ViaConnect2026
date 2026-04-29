// Prompt #103 Phase 5: Practitioner category opt-ins API.
//
//   GET  -> list of current opt-ins for the signed-in practitioner
//   PUT  -> reconcile desired opt-in set against current state
//           (insert new rows, mark removed rows opted_out_at=NOW())

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

async function getPractitionerId(supabase: ReturnType<typeof createClient>): Promise<{ ok: true; practitioner_id: string; user_id: string } | { ok: false; response: NextResponse }> {
  const authResult = await withTimeout(
    supabase.auth.getUser(),
    5000,
    'api.practitioner.category-opt-ins.auth',
  );
  const user = authResult.data.user;
  if (!user) return { ok: false, response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };

  const sb = supabase as any;
  const practitionerRes = await withTimeout(
    (async () => sb.from('practitioners').select('id').eq('user_id', user.id).maybeSingle())(),
    8000,
    'api.practitioner.category-opt-ins.practitioner-load',
  );
  const practitioner = practitionerRes.data;
  if (!practitioner) return { ok: false, response: NextResponse.json({ error: 'No practitioner record' }, { status: 404 }) };
  return { ok: true, practitioner_id: practitioner.id, user_id: user.id };
}

function handleOuterError(err: unknown, requestId: string): NextResponse {
  if (isTimeoutError(err)) {
    safeLog.error('api.practitioner.category-opt-ins', 'database timeout', { requestId, error: err });
    return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
  }
  safeLog.error('api.practitioner.category-opt-ins', 'unexpected error', { requestId, error: err });
  return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const supabase = createClient();
    const ctx = await getPractitionerId(supabase);
    if (!ctx.ok) return ctx.response;

    const sb = supabase as any;
    const res = await withTimeout(
      (async () => sb
        .from('practitioner_category_opt_ins')
        .select('opt_in_id, product_category_id, opted_in_at, acknowledged_rules, acknowledged_at, opted_out_at, product_categories ( category_slug, display_name )')
        .eq('practitioner_id', ctx.practitioner_id)
        .is('opted_out_at', null)
        .order('opted_in_at'))(),
      8000,
      'api.practitioner.category-opt-ins.list',
    );
    const data = res.data;

  interface OptInRowShape {
    opt_in_id: string;
    product_category_id: string;
    opted_in_at: string;
    acknowledged_rules: boolean;
    acknowledged_at: string | null;
    opted_out_at: string | null;
    product_categories: { category_slug: string; display_name: string } | null;
  }
    return NextResponse.json({
      practitioner_id: ctx.practitioner_id,
      opt_ins: ((data ?? []) as OptInRowShape[]).map((r) => ({
        opt_in_id: r.opt_in_id,
        product_category_id: r.product_category_id,
        category_slug: r.product_categories?.category_slug ?? null,
        display_name: r.product_categories?.display_name ?? null,
        opted_in_at: r.opted_in_at,
        acknowledged_rules: r.acknowledged_rules,
        acknowledged_at: r.acknowledged_at,
      })),
    });
  } catch (err) {
    return handleOuterError(err, requestId);
  }
}

interface DesiredOptIn {
  product_category_id: string;
  acknowledged_rules?: boolean;
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const supabase = createClient();
    const ctx = await getPractitionerId(supabase);
    if (!ctx.ok) return ctx.response;

    const body = (await request.json().catch(() => null)) ?? {};
    const desired = Array.isArray(body.opt_ins) ? (body.opt_ins as DesiredOptIn[]) : [];

    const sb = supabase as any;
    const nowIso = new Date().toISOString();

    const currentRes = await withTimeout(
      (async () => sb
        .from('practitioner_category_opt_ins')
        .select('opt_in_id, product_category_id, acknowledged_rules')
        .eq('practitioner_id', ctx.practitioner_id)
        .is('opted_out_at', null))(),
      8000,
      'api.practitioner.category-opt-ins.put-current-load',
    );
    const current = currentRes.data;

    const currentMap = new Map(
      ((current ?? []) as Array<{ opt_in_id: string; product_category_id: string; acknowledged_rules: boolean }>)
        .map((r) => [r.product_category_id, r]),
    );
    const desiredIds = new Set(desired.map((d) => d.product_category_id));

    // Inserts + ack updates
    for (const d of desired) {
      const existing = currentMap.get(d.product_category_id);
      if (!existing) {
        await withTimeout(
          (async () => sb.from('practitioner_category_opt_ins').insert({
            practitioner_id: ctx.practitioner_id,
            product_category_id: d.product_category_id,
            opted_in_at: nowIso,
            acknowledged_rules: d.acknowledged_rules ?? false,
            acknowledged_at: d.acknowledged_rules ? nowIso : null,
          }))(),
          8000,
          'api.practitioner.category-opt-ins.put-insert',
        );
      } else if (d.acknowledged_rules && !existing.acknowledged_rules) {
        await withTimeout(
          (async () => sb.from('practitioner_category_opt_ins')
            .update({ acknowledged_rules: true, acknowledged_at: nowIso, updated_at: nowIso })
            .eq('opt_in_id', existing.opt_in_id))(),
          8000,
          'api.practitioner.category-opt-ins.put-ack-update',
        );
      }
    }

    // Opt-outs: current rows missing from the desired set get marked out.
    for (const existing of currentMap.values()) {
      if (!desiredIds.has(existing.product_category_id)) {
        await withTimeout(
          (async () => sb.from('practitioner_category_opt_ins')
            .update({ opted_out_at: nowIso, updated_at: nowIso })
            .eq('opt_in_id', existing.opt_in_id))(),
          8000,
          'api.practitioner.category-opt-ins.put-opt-out',
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleOuterError(err, requestId);
  }
}
