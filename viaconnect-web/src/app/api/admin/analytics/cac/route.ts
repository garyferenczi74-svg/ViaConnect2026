// Prompt #94 Phase 2.4: Admin CAC API route.
//
// GET /api/admin/analytics/cac
//   ?month=YYYY-MM-01            (required, normalized to first of month)
//   &segment_type=overall|channel (default overall)
//   &channel=<acquisition_channel> (required when segment_type=channel)
//   &mode=same_month|trailing_3_month (default same_month)
//
// Admin-only. Wraps buildBlendedCAC + buildChannelCAC.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  buildBlendedCAC,
  buildChannelCAC,
  type CACMode,
} from '@/lib/analytics/cac-engine';
import { ACQUISITION_CHANNELS } from '@/lib/analytics/acquisition-attribution';

export const runtime = 'nodejs';

const querySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'month must be YYYY-MM-DD'),
  segment_type: z.enum(['overall', 'channel']).default('overall'),
  channel: z.string().optional(),
  mode: z.enum(['same_month', 'trailing_3_month']).default('same_month'),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Admin-only at the route layer; RLS would also block but a friendly 403
  // beats a silent empty payload.
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const url = new URL(request.url);
  const rawQuery = {
    month: url.searchParams.get('month') ?? '',
    segment_type: url.searchParams.get('segment_type') ?? 'overall',
    channel: url.searchParams.get('channel') ?? undefined,
    mode: url.searchParams.get('mode') ?? 'same_month',
  };
  const parsed = querySchema.safeParse(rawQuery);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query', details: parsed.error.issues },
      { status: 400 },
    );
  }

  // Normalize the month to the first day in case caller passed mid-month.
  const month = `${parsed.data.month.slice(0, 7)}-01`;
  const mode = parsed.data.mode as CACMode;

  if (parsed.data.segment_type === 'channel') {
    if (!parsed.data.channel) {
      return NextResponse.json(
        { error: 'channel is required when segment_type=channel' },
        { status: 400 },
      );
    }
    if (!ACQUISITION_CHANNELS.includes(parsed.data.channel as any)) {
      return NextResponse.json(
        { error: `Unknown channel: ${parsed.data.channel}` },
        { status: 400 },
      );
    }
    const result = await buildChannelCAC(month, parsed.data.channel, mode, { supabase });
    return NextResponse.json(result);
  }

  const result = await buildBlendedCAC(month, mode, { supabase });
  return NextResponse.json(result);
}
