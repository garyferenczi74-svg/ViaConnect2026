/**
 * Voice preferences endpoint per Prompt 170j §10.4.
 *
 * GET returns the user's current voice settings (defaults when missing).
 * PUT upserts a partial patch.
 *
 * Settings persist on user_nutrivision_settings via the columns added by
 * 20260530120400_prompt_170j_voice_settings_columns.sql.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface VoicePreferences {
  voice_editing_enabled: boolean;
  voice_quick_apply_mode: boolean;
  voice_feedback_chimes: boolean;
  voice_push_to_talk_default: boolean;
}

const DEFAULT_PREFS: VoicePreferences = {
  voice_editing_enabled: true,
  voice_quick_apply_mode: false,
  voice_feedback_chimes: false,
  voice_push_to_talk_default: false,
};

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('user_nutrivision_settings')
    .select(
      'voice_editing_enabled, voice_quick_apply_mode, voice_feedback_chimes, voice_push_to_talk_default'
    )
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? DEFAULT_PREFS);
}

export async function PUT(request: Request): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  let body: Partial<VoicePreferences>;
  try {
    body = (await request.json()) as Partial<VoicePreferences>;
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const patch: Partial<VoicePreferences> = {};
  if (typeof body.voice_editing_enabled === 'boolean') {
    patch.voice_editing_enabled = body.voice_editing_enabled;
  }
  if (typeof body.voice_quick_apply_mode === 'boolean') {
    patch.voice_quick_apply_mode = body.voice_quick_apply_mode;
  }
  if (typeof body.voice_feedback_chimes === 'boolean') {
    patch.voice_feedback_chimes = body.voice_feedback_chimes;
  }
  if (typeof body.voice_push_to_talk_default === 'boolean') {
    patch.voice_push_to_talk_default = body.voice_push_to_talk_default;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: 'no valid preferences in body' },
      { status: 400 }
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
