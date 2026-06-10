// Prompt 185a slice 3b (2026-06-09): ensure + read the Hannah-assigned daily
// supplement schedule for the current user.
//
// GET ensures every active supplement has a slot (Hannah assigns where none is
// user-set, honoring the precedence guard) and returns the full schedule.
// ?recompute=1 forces a recompute of hannah slots (used after a CAQ change);
// user-set slots are never touched. Resilience: fails open to an empty schedule
// so the surface never hard-errors. No emojis. No em or en dashes.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeLog } from '@/lib/utils/safe-log';
import { ensureScheduleForUser, getScheduleView, moveSlot, reorderSlots, toggleIntake } from '@/lib/caq/supplements/timing/assignTiming';

type Bucket = 'morning' | 'afternoon' | 'evening';
const BUCKETS: ReadonlyArray<Bucket> = ['morning', 'afternoon', 'evening'];

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const force = req.nextUrl.searchParams.get('recompute') === '1';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    // On a forced recompute, re-evaluate hannah slots first; getScheduleView
    // then ensures + enriches and returns the grouped buckets the UI renders.
    if (force) await ensureScheduleForUser(sb, user.id, { force: true });
    const view = await getScheduleView(sb, user.id);
    return NextResponse.json({ view });
  } catch (err) {
    safeLog.error('api.supplements.schedule', 'handler threw; returning empty schedule', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ view: { morning: [], afternoon: [], evening: [] } });
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const action = typeof body?.action === 'string' ? body.action : 'move';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    if (action === 'reorder') {
      const ids = Array.isArray(body?.orderedSlotIds)
        ? (body.orderedSlotIds as unknown[]).filter((x): x is string => typeof x === 'string')
        : [];
      if (ids.length === 0) {
        return NextResponse.json({ ok: false, error: 'No slot ids' }, { status: 400 });
      }
      const res = await reorderSlots(sb, user.id, ids);
      return NextResponse.json({ ok: res.ok, error: res.error }, { status: res.ok ? 200 : 500 });
    }

    const slotId = typeof body?.slotId === 'string' ? body.slotId : '';
    const timeOfDay = typeof body?.timeOfDay === 'string' ? (body.timeOfDay as Bucket) : ('' as Bucket);
    if (!slotId || !BUCKETS.includes(timeOfDay)) {
      return NextResponse.json({ ok: false, error: 'Invalid slot or bucket' }, { status: 400 });
    }
    const res = await moveSlot(sb, user.id, slotId, timeOfDay);
    return NextResponse.json({ ok: res.ok, error: res.error }, { status: res.ok ? 200 : 500 });
  } catch (err) {
    safeLog.error('api.supplements.schedule', 'PATCH threw', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const userSupplementId = typeof body?.userSupplementId === 'string' ? body.userSupplementId : '';
    const timeOfDay = typeof body?.timeOfDay === 'string' ? (body.timeOfDay as Bucket) : ('' as Bucket);
    const taken = body?.taken === true;
    if (!userSupplementId || !BUCKETS.includes(timeOfDay)) {
      return NextResponse.json({ ok: false, error: 'Invalid supplement or bucket' }, { status: 400 });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await toggleIntake(supabase as any, user.id, userSupplementId, timeOfDay, taken);
    return NextResponse.json({ ok: res.ok, error: res.error }, { status: res.ok ? 200 : 500 });
  } catch (err) {
    safeLog.error('api.supplements.schedule', 'POST threw', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
