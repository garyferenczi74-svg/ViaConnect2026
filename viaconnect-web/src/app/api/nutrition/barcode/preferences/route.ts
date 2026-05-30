/**
 * Prompt 170l Phase 1c-3: barcode preferences endpoint.
 *
 * Mirrors the /api/nutrition/voice/preferences shape per spec §10.4 +
 * Gate 3 (Hannah defaults verbatim).
 *
 * GET returns current 3-toggle state from user_nutrivision_settings.
 * PUT upserts a partial patch with Zod validation.
 *
 * Settings persist via the columns added by
 * 20260530143040_prompt_170l_user_nutrivision_settings_barcode_columns.sql.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface BarcodePreferences {
  barcode_quality_indicators: boolean;
  barcode_audio_chime: boolean;
  barcode_haptic_feedback: boolean;
}

const DEFAULT_PREFS: BarcodePreferences = {
  barcode_quality_indicators: true,
  barcode_audio_chime: false,
  barcode_haptic_feedback: true,
};

export async function GET(): Promise<NextResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('user_nutrivision_settings')
    .select('barcode_quality_indicators, barcode_audio_chime, barcode_haptic_feedback')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? DEFAULT_PREFS);
}

export async function PUT(request: Request): Promise<NextResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  let body: Partial<BarcodePreferences>;
  try {
    body = (await request.json()) as Partial<BarcodePreferences>;
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const patch: Partial<BarcodePreferences> = {};
  if (typeof body.barcode_quality_indicators === 'boolean') {
    patch.barcode_quality_indicators = body.barcode_quality_indicators;
  }
  if (typeof body.barcode_audio_chime === 'boolean') {
    patch.barcode_audio_chime = body.barcode_audio_chime;
  }
  if (typeof body.barcode_haptic_feedback === 'boolean') {
    patch.barcode_haptic_feedback = body.barcode_haptic_feedback;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: 'no valid preferences in body' },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from('user_nutrivision_settings')
    .upsert({ user_id: user.id, ...patch }, { onConflict: 'user_id' });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...patch });
}
