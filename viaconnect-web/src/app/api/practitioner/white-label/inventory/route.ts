// Prompt #96 Phase 6: Practitioner inventory.
//
// GET /api/practitioner/white-label/inventory
// Returns active inventory lots for the calling practitioner with
// summary aggregations (total units, units by storage location, value,
// expiring soon count). Per-lot rows include the resolved label name
// and underlying SKU for cross-reference.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { classifyExpiration } from '@/lib/white-label/expiration-alerts';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const supabase = createClient();

    let user;
    try {
      const authResult = await withTimeout(
        supabase.auth.getUser(),
        5000,
        'api.white-label.inventory.auth',
      );
      user = authResult.data.user;
    } catch (err) {
      if (isTimeoutError(err)) {
        safeLog.error('api.white-label.inventory', 'auth timeout', { requestId, error: err });
        return NextResponse.json({ error: 'Authentication timed out. Please try again.' }, { status: 503 });
      }
      throw err;
    }
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const sb = supabase as any;
    const practitionerRes = await withTimeout(
      (async () => sb.from('practitioners').select('id').eq('user_id', user.id).maybeSingle())(),
      8000,
      'api.white-label.inventory.practitioner-load',
    );
    const practitioner = practitionerRes.data;
    if (!practitioner) return NextResponse.json({ error: 'No practitioner record' }, { status: 404 });

    const lotsRes = await withTimeout(
      (async () => sb
        .from('white_label_inventory_lots')
        .select(`
          id, lot_number, manufactured_date, expiration_date,
          units_produced, units_available, units_sold, units_expired,
          units_returned, units_recalled,
          storage_location, viacura_storage_days, viacura_storage_fee_accrued_cents,
          status, label_design_id, product_catalog_id,
          product_catalog (id, name, sku),
          white_label_label_designs (id, display_product_name, version_number)
        `)
        .eq('practitioner_id', practitioner.id)
        .eq('status', 'active')
        .order('expiration_date', { ascending: true })
        .limit(500))(),
      8000,
      'api.white-label.inventory.lots-load',
    );
    const lots = lotsRes.data;
    const error = lotsRes.error;
    if (error) {
      safeLog.error('api.white-label.inventory', 'lots load failed', { requestId, error });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

  const now = new Date();
  const decorated = (lots ?? []).map((lot: any) => {
    const exp = classifyExpiration({ expiration_date: lot.expiration_date, now });
    return { ...lot, expiration_status: exp.status, days_until_expiration: exp.days_until_expiration };
  });

  const summary = decorated.reduce((acc: any, lot: any) => {
    acc.total_units += lot.units_available;
    acc.total_storage_fee_accrued_cents += lot.viacura_storage_fee_accrued_cents ?? 0;
    if (lot.storage_location === 'viacura_warehouse') acc.units_at_viacura += lot.units_available;
    else acc.units_at_practitioner += lot.units_available;
    if (lot.expiration_status === 'urgent' || lot.expiration_status === 'warning') acc.expiring_soon_lots += 1;
    return acc;
  }, {
    total_units: 0,
    units_at_viacura: 0,
    units_at_practitioner: 0,
    total_storage_fee_accrued_cents: 0,
    expiring_soon_lots: 0,
  });

    return NextResponse.json({ lots: decorated, summary });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.white-label.inventory', 'database timeout', { requestId, error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.white-label.inventory', 'unexpected error', { requestId, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
