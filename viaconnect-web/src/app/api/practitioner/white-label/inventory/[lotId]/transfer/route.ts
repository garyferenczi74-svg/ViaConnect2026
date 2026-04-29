// Prompt #96 Phase 6: Inventory transfer request.
//
// POST /api/practitioner/white-label/inventory/[lotId]/transfer
//   body: { to: 'viacura_warehouse' | 'practitioner_facility' }
//
// Phase 6 records the request immediately (flips storage_location and
// resets viacura_storage_days when moving FROM the warehouse). The
// physical fulfillment is an ops task; an admin tool to acknowledge
// will follow in Phase 7.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { STORAGE_LOCATIONS } from '@/lib/white-label/schema-types';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

const schema = z.object({
  to: z.enum(STORAGE_LOCATIONS),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { lotId: string } },
): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const supabase = createClient();

    let user;
    try {
      const authResult = await withTimeout(
        supabase.auth.getUser(),
        5000,
        'api.white-label.inventory.transfer.auth',
      );
      user = authResult.data.user;
    } catch (err) {
      if (isTimeoutError(err)) {
        safeLog.error('api.white-label.inventory.transfer', 'auth timeout', { requestId, error: err });
        return NextResponse.json({ error: 'Authentication timed out. Please try again.' }, { status: 503 });
      }
      throw err;
    }
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const sb = supabase as any;
    const practitionerRes = await withTimeout(
      (async () => sb.from('practitioners').select('id').eq('user_id', user.id).maybeSingle())(),
      8000,
      'api.white-label.inventory.transfer.practitioner-load',
    );
    const practitioner = practitionerRes.data;
    if (!practitioner) return NextResponse.json({ error: 'No practitioner record' }, { status: 404 });

    const json = await request.json().catch(() => null);
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.issues }, { status: 400 });
    }

    const lotRes = await withTimeout(
      (async () => sb
        .from('white_label_inventory_lots')
        .select('id, practitioner_id, storage_location, status')
        .eq('id', params.lotId)
        .maybeSingle())(),
      8000,
      'api.white-label.inventory.transfer.lot-load',
    );
    const lot = lotRes.data;
    if (!lot) return NextResponse.json({ error: 'Lot not found' }, { status: 404 });
    if (lot.practitioner_id !== practitioner.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (lot.status !== 'active') {
      return NextResponse.json({ error: `Cannot transfer a ${lot.status} lot` }, { status: 400 });
    }
    if (lot.storage_location === parsed.data.to) {
      return NextResponse.json({ error: 'Lot is already at the requested location' }, { status: 400 });
    }

    const update: Record<string, unknown> = {
      storage_location: parsed.data.to,
      updated_at: new Date().toISOString(),
    };
    // Moving away from ViaCura stops further accrual but preserves the
    // already-billed amount. Reset only the day counter.
    if (lot.storage_location === 'viacura_warehouse' && parsed.data.to === 'practitioner_facility') {
      update.viacura_storage_days = 0;
    }

    await withTimeout(
      (async () => sb
        .from('white_label_inventory_lots')
        .update(update)
        .eq('id', params.lotId))(),
      8000,
      'api.white-label.inventory.transfer.update',
    );

    return NextResponse.json({ ok: true, storage_location: parsed.data.to });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.white-label.inventory.transfer', 'database timeout', { requestId, error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.white-label.inventory.transfer', 'unexpected error', { requestId, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
