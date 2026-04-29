// Prompt #97 Phase 5.1: Level 4 production quote endpoint.
// POST /api/practitioner/custom-formulations/orders/quote
// Body: { items: [{ custom_formulation_id, quantity }], timeline: 'standard'|'expedited' }
// Reads level_4_parameters, loads per-formulation COGS estimates, applies
// the pure pricing calculator. Returns the quote (no order created).

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requirePractitioner } from '@/lib/custom-formulations/admin-guard';
import {
  DEFAULT_LEVEL_4_PARAMETERS,
  calculateLevel4Quote,
  type Level4Parameters,
} from '@/lib/custom-formulations/pricing-calculator';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const auth = await requirePractitioner();
    if (auth.kind === 'error') return auth.response;

    const body = (await request.json().catch(() => null)) as
      | {
          items?: Array<{ custom_formulation_id: string; quantity: number }>;
          timeline?: 'standard' | 'expedited';
        }
      | null;

    if (!body?.items || body.items.length === 0) {
      return NextResponse.json({ error: 'items array required' }, { status: 400 });
    }
    const timeline = body.timeline ?? 'standard';
    if (!['standard', 'expedited'].includes(timeline)) {
      return NextResponse.json({ error: 'timeline must be standard or expedited' }, { status: 400 });
    }

    const supabase = createClient();

    const formulationIds = body.items.map((i) => i.custom_formulation_id);
    const formulationsRes = await withTimeout(
      (async () => supabase
        .from('custom_formulations')
        .select('id, practitioner_id, status, estimated_cogs_per_unit_cents, internal_name')
        .in('id', formulationIds))(),
      8000,
      'api.practitioner.custom-formulations.quote.formulations-load',
    );
    const formulations = formulationsRes.data;
  const formulationRows = (formulations ?? []) as Array<{
    id: string;
    practitioner_id: string;
    status: string;
    estimated_cogs_per_unit_cents: number | null;
    internal_name: string;
  }>;

  const formulationMap = new Map(formulationRows.map((f) => [f.id, f]));
  for (const item of body.items) {
    const f = formulationMap.get(item.custom_formulation_id);
    if (!f) {
      return NextResponse.json(
        { error: `Formulation ${item.custom_formulation_id} not found` },
        { status: 404 },
      );
    }
    if (f.practitioner_id !== auth.practitionerId) {
      return NextResponse.json(
        { error: 'Forbidden: formulation belongs to another practitioner' },
        { status: 403 },
      );
    }
    if (f.status !== 'approved_production_ready') {
      return NextResponse.json(
        {
          error: `Formulation ${f.internal_name} (${f.status}) is not production-ready`,
        },
        { status: 409 },
      );
    }
  }

  // level_4_parameters was applied AFTER the last types.ts regen; cast the
  // client to avoid the generated Database union overflow until next regen.
  const dynamic = supabase as unknown as {
    from(table: string): {
      select(cols: string): {
        eq(col: string, val: string): {
          maybeSingle(): Promise<{ data: Record<string, unknown> | null }>;
        };
      };
    };
  };
    const paramRes = await withTimeout(
      (async () => dynamic
        .from('level_4_parameters')
        .select('*')
        .eq('id', 'default')
        .maybeSingle())(),
      8000,
      'api.practitioner.custom-formulations.quote.params-load',
    );
    const paramRow = paramRes.data;
    const raw = paramRow;
  const parameters: Level4Parameters = raw
    ? {
        developmentFeeCents: Number(raw.development_fee_cents ?? DEFAULT_LEVEL_4_PARAMETERS.developmentFeeCents),
        medicalReviewFeeCents: Number(raw.medical_review_fee_cents ?? DEFAULT_LEVEL_4_PARAMETERS.medicalReviewFeeCents),
        moqPerFormulation: Number(raw.moq_per_formulation ?? DEFAULT_LEVEL_4_PARAMETERS.moqPerFormulation),
        minimumOrderValueCents: Number(raw.minimum_order_value_cents ?? DEFAULT_LEVEL_4_PARAMETERS.minimumOrderValueCents),
        manufacturingOverheadPercent: Number(raw.manufacturing_overhead_percent ?? DEFAULT_LEVEL_4_PARAMETERS.manufacturingOverheadPercent),
        qaQcPercent: Number(raw.qa_qc_percent ?? DEFAULT_LEVEL_4_PARAMETERS.qaQcPercent),
        packagingLaborPercent: Number(raw.packaging_labor_percent ?? DEFAULT_LEVEL_4_PARAMETERS.packagingLaborPercent),
        markupPercent: Number(raw.markup_percent ?? DEFAULT_LEVEL_4_PARAMETERS.markupPercent),
        expeditedSurchargePercent: Number(raw.expedited_surcharge_percent ?? DEFAULT_LEVEL_4_PARAMETERS.expeditedSurchargePercent),
      }
    : DEFAULT_LEVEL_4_PARAMETERS;

  // For each item, look up whether this is the first production order for
  // that formulation. Simple check: has any development fee refund row
  // already recorded `applied_to_first_production_order`?
    const feeRes = await withTimeout(
      (async () => supabase
        .from('custom_formulation_development_fees')
        .select('custom_formulation_id, refund_reason')
        .in('custom_formulation_id', formulationIds))(),
      8000,
      'api.practitioner.custom-formulations.quote.fees-load',
    );
    const feeRows = feeRes.data;
  const firstOrderMap = new Map<string, boolean>();
  for (const id of formulationIds) {
    const fees = (feeRows ?? []).filter(
      (r: { custom_formulation_id: string; refund_reason: string | null }) =>
        r.custom_formulation_id === id,
    );
    const alreadyCredited = fees.some(
      (r: { refund_reason: string | null }) =>
        r.refund_reason === 'applied_to_first_production_order',
    );
    firstOrderMap.set(id, !alreadyCredited);
  }

  const quote = calculateLevel4Quote({
    items: body.items.map((item) => ({
      customFormulationId: item.custom_formulation_id,
      quantity: item.quantity,
      unitCogsCents: formulationMap.get(item.custom_formulation_id)?.estimated_cogs_per_unit_cents ?? 0,
      firstProductionOrder: firstOrderMap.get(item.custom_formulation_id) ?? true,
    })),
    timeline,
    parameters,
  });

    return NextResponse.json(quote);
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.practitioner.custom-formulations.quote', 'database timeout', { requestId, error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.practitioner.custom-formulations.quote', 'unexpected error', { requestId, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
