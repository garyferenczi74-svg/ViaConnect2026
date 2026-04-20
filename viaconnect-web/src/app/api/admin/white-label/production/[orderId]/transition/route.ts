// Prompt #96 Phase 5: Admin advances a production order through milestones.
//
// POST /api/admin/white-label/production/[orderId]/transition
//   body: { to: <ProductionStatus>, lot_updates?: [...], tracking?: {...} }
//
// Validates the requested transition against the state machine,
// optionally writes per-line lot/QC updates, and stamps the matching
// timestamp column on the order.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isValidTransition } from '@/lib/white-label/production-state-machine';
import { PRODUCTION_ORDER_STATUSES } from '@/lib/white-label/schema-types';

export const runtime = 'nodejs';

const schema = z.object({
  to: z.enum(PRODUCTION_ORDER_STATUSES),
  lot_updates: z.array(z.object({
    item_id: z.string().uuid(),
    lot_number: z.string().min(1).max(50),
    expiration_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    qc_passed: z.boolean(),
    qc_notes: z.string().max(500).optional(),
  })).optional(),
  tracking: z.object({
    carrier: z.string().min(1).max(50),
    tracking_number: z.string().min(1).max(100),
  }).optional(),
});

const TIMESTAMP_FIELD: Partial<Record<string, string>> = {
  labels_approved_pending_deposit: 'labels_approved_at',
  in_production: 'production_started_at',
  quality_control: 'quality_control_completed_at',
  shipped: 'shipped_at',
  delivered: 'delivered_at',
};

export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } },
): Promise<NextResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const sb = supabase as any;
  const { data: profile } = await sb
    .from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.issues }, { status: 400 });
  }

  const { data: order } = await sb
    .from('white_label_production_orders')
    .select('id, status')
    .eq('id', params.orderId)
    .maybeSingle();
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  if (!isValidTransition(order.status, parsed.data.to)) {
    return NextResponse.json({
      error: `Invalid transition: ${order.status} -> ${parsed.data.to}`,
    }, { status: 400 });
  }

  const now = new Date().toISOString();
  const tsField = TIMESTAMP_FIELD[parsed.data.to];
  const update: Record<string, unknown> = { status: parsed.data.to, updated_at: now };
  if (tsField) update[tsField] = now;
  if (parsed.data.tracking) {
    update.carrier = parsed.data.tracking.carrier;
    update.tracking_number = parsed.data.tracking.tracking_number;
  }

  await sb
    .from('white_label_production_orders')
    .update(update)
    .eq('id', params.orderId);

  // Lot/QC updates per line.
  if (parsed.data.lot_updates) {
    for (const u of parsed.data.lot_updates) {
      await sb
        .from('white_label_production_order_items')
        .update({
          lot_number: u.lot_number,
          expiration_date: u.expiration_date,
          qc_passed: u.qc_passed,
          qc_notes: u.qc_notes ?? null,
          updated_at: now,
        })
        .eq('id', u.item_id)
        .eq('production_order_id', params.orderId);
    }
  }

  return NextResponse.json({ ok: true, new_status: parsed.data.to });
}
