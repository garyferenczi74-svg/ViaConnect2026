// Prompt #96 Phase 6: Admin inventory aggregator.
//
// GET /api/admin/white-label/inventory
// Returns the cross-practitioner roll-up plus the most-urgent expiring
// lot list. Admin-only.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { classifyExpiration } from '@/lib/white-label/expiration-alerts';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000, 'api.white-label.inventory.auth');
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const sb = supabase as any;
    const profileRes = await withTimeout(
      (async () => sb.from('profiles').select('role').eq('id', user.id).maybeSingle())(),
      5000,
      'api.white-label.inventory.load-profile',
    );
    const profile = profileRes.data as { role?: string } | null;
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const lotsRes = await withTimeout(
      (async () => sb
        .from('white_label_inventory_lots')
        .select(`
          id, lot_number, expiration_date,
          units_available, units_sold, units_recalled,
          storage_location, viacura_storage_days, viacura_storage_fee_accrued_cents,
          practitioner_id,
          product_catalog (name, sku),
          practitioners (display_name, practice_name)
        `)
        .eq('status', 'active')
        .order('expiration_date', { ascending: true })
        .limit(1000))(),
      15000,
      'api.white-label.inventory.list-lots',
    );
    const lots = lotsRes.data;

    const now = new Date();
    const summary = {
      total_active_lots: 0,
      total_units: 0,
      units_at_viacura: 0,
      units_at_practitioner: 0,
      total_storage_fees_accrued_cents: 0,
      expiring_within_30: 0,
      expiring_within_90: 0,
      practitioner_count: 0,
    };
    const byPractitioner = new Set<string>();

    for (const lot of (lots ?? []) as any[]) {
      summary.total_active_lots += 1;
      summary.total_units += lot.units_available;
      summary.total_storage_fees_accrued_cents += lot.viacura_storage_fee_accrued_cents ?? 0;
      if (lot.storage_location === 'viacura_warehouse') summary.units_at_viacura += lot.units_available;
      else summary.units_at_practitioner += lot.units_available;
      const cls = classifyExpiration({ expiration_date: lot.expiration_date, now });
      if (cls.status === 'urgent' || cls.status === 'expired') summary.expiring_within_30 += 1;
      if (cls.status === 'warning' || cls.status === 'urgent' || cls.status === 'expired') summary.expiring_within_90 += 1;
      byPractitioner.add(lot.practitioner_id);
    }
    summary.practitioner_count = byPractitioner.size;

    const expiring = (lots ?? [])
      .map((lot: any) => ({
        ...lot,
        expiration_class: classifyExpiration({ expiration_date: lot.expiration_date, now }),
      }))
      .filter((lot: any) => ['warning', 'urgent', 'expired'].includes(lot.expiration_class.status))
      .slice(0, 50);

    return NextResponse.json({ summary, expiring });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.white-label.inventory', 'database timeout', { error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.white-label.inventory', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
