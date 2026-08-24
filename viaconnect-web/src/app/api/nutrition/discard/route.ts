// Prompt 228 D2: hard-delete a pending nutrition log and its storage photo.
// POST body: { logId }
// Auth: Supabase session required.
// Success only after DB delete confirms a row removed. Storage best-effort
// but attempted before returning ok when photo_url is present.

import { NextRequest, NextResponse } from 'next/server';
import { safeLog } from '@/lib/utils/safe-log';
import { createClient } from '@/lib/supabase/server';
import { tryCreateAdminClient } from '@/lib/supabase/admin-optional';
import {
  NUTRITION_PHOTO_BUCKET,
  ownedNutritionPhotoPath,
  storagePathFromPhotoUrl,
} from '@/lib/nutrition/nutritionPhotoPath';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const logId: string | undefined = body?.logId;
    if (!logId || typeof logId !== 'string') {
      return NextResponse.json({ error: 'Invalid logId' }, { status: 400 });
    }

    // Load row first so we can delete storage and confirm ownership.
    const { data: existing, error: loadErr } = await supabase
      .from('nutrition_logs')
      .select('id, user_id, photo_url, status')
      .eq('id', logId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (loadErr) {
      safeLog.error('api.nutrition.discard', 'load failed', {
        error: loadErr.message,
        userId: user.id,
        logId,
      });
      return NextResponse.json({ error: 'Could not load record' }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const photoUrl =
      typeof existing.photo_url === 'string' ? existing.photo_url : null;
    const resolvedPath = photoUrl ? storagePathFromPhotoUrl(photoUrl) : null;
    const storagePath = ownedNutritionPhotoPath(user.id, resolvedPath);
    if (resolvedPath && !storagePath) {
      safeLog.warn('api.nutrition.discard', 'photo_url rejected: not owner prefix', {
        userId: user.id,
        logId,
      });
    }

    // Brief 3: pending analyze-text dual-writes meals. Delete those first so
    // Discard cannot leave a visible meal on Today's Meals.
    const { error: mealsDelErr } = await supabase
      .from('meals')
      .delete()
      .eq('legacy_nutrition_log_id', logId)
      .eq('user_id', user.id);
    if (mealsDelErr) {
      safeLog.error('api.nutrition.discard', 'linked meals delete failed', {
        error: mealsDelErr.message,
        userId: user.id,
        logId,
      });
      return NextResponse.json(
        { error: 'Could not discard. Your meal is still here.' },
        { status: 500 },
      );
    }

    // Hard delete the row. .select() confirms a row was removed.
    const { data: deletedRows, error: delErr } = await supabase
      .from('nutrition_logs')
      .delete()
      .eq('id', logId)
      .eq('user_id', user.id)
      .select('id');

    if (delErr) {
      safeLog.error('api.nutrition.discard', 'delete failed', {
        error: delErr.message,
        userId: user.id,
        logId,
      });
      return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }
    if (!Array.isArray(deletedRows) || deletedRows.length === 0) {
      return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }

    let storageDeleted = false;
    let storageError: string | null = null;
    if (storagePath) {
      const admin = tryCreateAdminClient();
      const storageClient = admin ?? supabase;
      const { error: rmErr } = await storageClient.storage
        .from(NUTRITION_PHOTO_BUCKET)
        .remove([storagePath]);
      if (rmErr) {
        storageError = rmErr.message;
        safeLog.warn('api.nutrition.discard', 'storage remove failed', {
          userId: user.id,
          logId,
          storagePath,
          error: rmErr.message,
        });
      } else {
        storageDeleted = true;
      }
    }

    return NextResponse.json({
      ok: true,
      deleted: true,
      storageDeleted: storagePath ? storageDeleted : null,
      storageError,
    });
  } catch (err) {
    safeLog.error('api.nutrition.discard', 'unexpected', { error: err });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
