// Prompt 171b Phase 3: user sleep window persistence endpoint.
//
// GET returns the user's current sleep_start + sleep_wake from profiles.
// PUT upserts. When either column is NULL the 171b caffeine-timing-source.ts
// (BOS 10th slice) falls back to the default 23:00-07:00 window. This route
// lets the user specify their actual window so the BOS caffeine impact
// reasoning aligns with their real sleep schedule.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// HH:MM 24-hour format. Postgres TIME accepts wider formats but we constrain
// here to the format the UI emits.
const TIME_RX = /^\d{2}:\d{2}$/;
const TIME_SCHEMA = z.string().regex(TIME_RX, 'expected HH:MM');

const PutSchema = z.object({
  sleep_start: TIME_SCHEMA,
  sleep_wake: TIME_SCHEMA,
});

interface ProfileRow {
  sleep_start?: string | null;
  sleep_wake?: string | null;
}

function normalizeTimeFromPg(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string' || raw.length === 0) return null;
  // Postgres TIME often comes back as HH:MM:SS; trim to HH:MM.
  const m = raw.match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
  if (!m) return null;
  return `${m[1]}:${m[2]}`;
}

export async function GET(): Promise<NextResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('sleep_start, sleep_wake')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    safeLog.warn('api.profile.sleep_window', 'read failed', {
      userId: user.id,
      error: error.message,
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = (data ?? null) as ProfileRow | null;
  const sleepStart = normalizeTimeFromPg(row?.sleep_start ?? null);
  const sleepWake = normalizeTimeFromPg(row?.sleep_wake ?? null);

  return NextResponse.json({
    sleep_start: sleepStart,
    sleep_wake: sleepWake,
    source: sleepStart !== null && sleepWake !== null ? 'user_saved' : 'default',
    default_sleep_start: '23:00',
    default_sleep_wake: '07:00',
  });
}

export async function PUT(request: Request): Promise<NextResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const parsed = PutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid body', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Persist with HH:MM:SS so Postgres TIME parses cleanly. The trailing :00
  // seconds value is canonical for our minute-precision schema.
  const sleepStartSql = `${parsed.data.sleep_start}:00`;
  const sleepWakeSql = `${parsed.data.sleep_wake}:00`;

  const { error } = await supabase
    .from('profiles')
    .update({
      sleep_start: sleepStartSql,
      sleep_wake: sleepWakeSql,
    })
    .eq('id', user.id);

  if (error) {
    safeLog.warn('api.profile.sleep_window', 'write failed', {
      userId: user.id,
      error: error.message,
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  safeLog.info('api.profile.sleep_window', 'sleep window updated', {
    userId: user.id,
    sleep_start: parsed.data.sleep_start,
    sleep_wake: parsed.data.sleep_wake,
  });

  return NextResponse.json({
    ok: true,
    sleep_start: parsed.data.sleep_start,
    sleep_wake: parsed.data.sleep_wake,
    source: 'user_saved',
  });
}
