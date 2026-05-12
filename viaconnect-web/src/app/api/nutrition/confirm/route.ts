// Prompt #160 section 4.3: confirm a pending nutrition log.
// POST body: { logId, edits? }
// Auth: Supabase session required.
// Applies user edits, flips status to confirmed, triggers BOS recompute and
// Helix Rewards award.

import { NextRequest, NextResponse } from 'next/server';
import { safeLog } from '@/lib/utils/safe-log';
import { createClient } from '@/lib/supabase/server';
import { recomputeNutritionDimension } from '@/lib/nutrition/bos-bridge';
import { awardNutritionLogPoints } from '@/lib/nutrition/helix-bridge';

interface MaybeEdits {
  serving_description?: string;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  total_fat_g?: number;
  good_fat_g?: number;
  healthy_fat_g?: number;
  saturated_fat_g?: number;
  sugar_g?: number;
  fiber_g?: number;
}

const NUMERIC_FIELDS = [
  'calories',
  'protein_g',
  'carbs_g',
  'total_fat_g',
  'good_fat_g',
  'healthy_fat_g',
  'saturated_fat_g',
  'sugar_g',
  'fiber_g',
] as const;

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const logId: string | undefined = body?.logId;
    if (!logId || typeof logId !== 'string') {
      return NextResponse.json({ error: 'Invalid logId' }, { status: 400 });
    }

    const edits: MaybeEdits = body?.edits && typeof body.edits === 'object' ? body.edits : {};

    const update: Record<string, unknown> = {
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
    };

    let userEdited = false;
    if (typeof edits.serving_description === 'string' && edits.serving_description.trim().length > 0) {
      update.serving_description = edits.serving_description.trim().slice(0, 2000);
      userEdited = true;
    }
    for (const field of NUMERIC_FIELDS) {
      const v = edits[field];
      if (typeof v === 'number' && Number.isFinite(v) && v >= 0) {
        update[field] = v;
        userEdited = true;
      }
    }
    if (userEdited) {
      update.user_edited = true;
      update.confidence = 1.0;
    }

    const { data: row, error: selErr } = await supabase
      .from('nutrition_logs')
      .select('id, user_id, source, logged_at, status')
      .eq('id', logId)
      .single();

    if (selErr || !row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (row.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (row.status === 'confirmed') {
      return NextResponse.json({ ok: true, alreadyConfirmed: true });
    }
    if (row.status === 'discarded') {
      return NextResponse.json({ error: 'Cannot confirm a discarded draft' }, { status: 409 });
    }

    const { error: updErr } = await supabase
      .from('nutrition_logs')
      .update(update)
      .eq('id', logId)
      .eq('user_id', user.id);

    if (updErr) {
      safeLog.error('api.nutrition.confirm', 'update failed', { error: updErr, userId: user.id, logId });
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    try {
      await awardNutritionLogPoints({
        userId: user.id,
        source: row.source as 'manual_text' | 'photo_ai' | 'barcode' | 'imported',
      });
    } catch (rewardErr) {
      safeLog.warn('api.nutrition.confirm', 'helix award failed', { error: rewardErr, userId: user.id });
    }

    try {
      await recomputeNutritionDimension({ userId: user.id, date: row.logged_at });
    } catch (bosErr) {
      safeLog.warn('api.nutrition.confirm', 'bos recompute failed', { error: bosErr, userId: user.id });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    safeLog.error('api.nutrition.confirm', 'unexpected', { error: err });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
