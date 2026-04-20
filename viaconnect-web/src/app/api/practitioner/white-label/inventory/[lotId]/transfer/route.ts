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

export const runtime = 'nodejs';

const schema = z.object({
  to: z.enum(STORAGE_LOCATIONS),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { lotId: string } },
): Promise<NextResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const sb = supabase as any;
  const { data: practitioner } = await sb
    .from('practitioners').select('id').eq('user_id', user.id).maybeSingle();
  if (!practitioner) return NextResponse.json({ error: 'No practitioner record' }, { status: 404 });

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.issues }, { status: 400 });
  }

  const { data: lot } = await sb
    .from('white_label_inventory_lots')
    .select('id, practitioner_id, storage_location, status')
    .eq('id', params.lotId)
    .maybeSingle();
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

  await sb
    .from('white_label_inventory_lots')
    .update(update)
    .eq('id', params.lotId);

  return NextResponse.json({ ok: true, storage_location: parsed.data.to });
}
