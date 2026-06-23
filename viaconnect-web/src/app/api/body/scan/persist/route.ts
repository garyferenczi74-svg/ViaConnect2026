// Prompt 209 (2026-06-22): Canonical scan persistence route.
// POST { scanId } -> reads the photo scan audit row, derives composition, writes
// body_tracker_entries + body_tracker_segmental_fat (idempotent by scan_id).
// Fail-open: any thrown error returns { ok:false, reason } - never 500-crashes.
// Auth is fail-closed: missing or timed-out session returns 401.
// All Supabase calls wrapped with withTimeout + correlation id.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { deriveScanComposition } from '@/lib/body-tracker/composition/deriveScanComposition';
import { buildScanWrite } from '@/lib/body-tracker/composition/buildScanWrite';
import { newCorrelationId, logScanEvent } from '@/lib/body-tracker/composition/correlation';
import type { BodyScanEstimate } from '@/components/body-tracker/BodyScanUploader';

export async function POST(req: Request): Promise<NextResponse> {
  let correlationId = 'scan_unresolved';

  try {
    // Parse and validate body
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ ok: false, reason: 'bad_request' }, { status: 400 });
    }

    const scanId = typeof body.scanId === 'string' ? body.scanId.trim() : '';
    if (!scanId) {
      return NextResponse.json({ ok: false, reason: 'bad_request' }, { status: 400 });
    }

    correlationId = newCorrelationId(scanId);

    // Auth - fail closed: timeout or missing user both return 401
    const supabase = createClient();
    let user: { id: string } | null = null;
    try {
      const authResult = await withTimeout(
        supabase.auth.getUser(),
        5000,
        'scan.persist.auth'
      );
      user = authResult.data.user;
    } catch (err) {
      if (isTimeoutError(err)) {
        safeLog.warn('scan.persist', 'auth timeout', { correlationId, reason: 'timeout' });
      } else {
        safeLog.error('scan.persist', 'auth error', { correlationId, error: err instanceof Error ? err.message : String(err) });
      }
      return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // Read the photo scan audit row - scoped to this user for security
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scanReadResult = await withTimeout(
      Promise.resolve(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from('body_tracker_photo_scans')
          .select('id, scan_date, full_response')
          .eq('id', scanId)
          .eq('user_id', userId)
          .maybeSingle()
      ),
      5000,
      'scan.persist.read_scan'
    );

    if (scanReadResult.error || !scanReadResult.data) {
      logScanEvent('failed', correlationId, { userId, scanId, reason: 'scan_not_found' });
      return NextResponse.json({ ok: false, reason: 'scan_not_found' }, { status: 404 });
    }

    const scanRow = scanReadResult.data as {
      id: string;
      scan_date: string;
      full_response: BodyScanEstimate;
    };

    // Idempotency check - if an entry already exists for this scan, return it
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const idempotencyResult = await withTimeout(
      Promise.resolve(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from('body_tracker_entries')
          .select('id')
          .eq('scan_id', scanId)
          .eq('user_id', userId)
          .maybeSingle()
      ),
      5000,
      'scan.persist.idempotency_check'
    );

    if (idempotencyResult.error) {
      safeLog.warn('scan.persist', 'idempotency_check_error', { correlationId, error: idempotencyResult.error.message });
    }

    if (idempotencyResult.data) {
      const entryId = (idempotencyResult.data as { id: string }).id;
      logScanEvent('completed', correlationId, { userId, scanId, entryId, idempotent: true });
      return NextResponse.json({ ok: true, entryId });
    }

    // Derive composition from the scan's AI estimate
    const derived = deriveScanComposition(scanRow.full_response);
    const { entry, segFat } = buildScanWrite({
      userId,
      scanId,
      scanDate: scanRow.scan_date,
      derived,
    });

    // Insert the canonical body_tracker_entries row
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entryInsertResult = await withTimeout(
      Promise.resolve(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from('body_tracker_entries')
          .insert(entry)
          .select('id')
          .single()
      ),
      5000,
      'scan.persist.insert_entry'
    );

    // Handle unique-violation race (Postgres code 23505): treat as idempotent success
    if (entryInsertResult.error) {
      const pgCode = entryInsertResult.error.code;
      if (pgCode === '23505') {
        // Race - another request already inserted; read back the existing entry
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raceRead = await withTimeout(
          Promise.resolve(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (supabase as any)
              .from('body_tracker_entries')
              .select('id')
              .eq('scan_id', scanId)
              .eq('user_id', userId)
              .maybeSingle()
          ),
          5000,
          'scan.persist.race_read'
        );
        const entryId: string | undefined = raceRead.data?.id;
        logScanEvent('completed', correlationId, { userId, scanId, entryId: entryId ?? null, race: true });
        return NextResponse.json({ ok: true, entryId: entryId ?? null });
      }
      logScanEvent('failed', correlationId, { userId, scanId, reason: 'entry_insert_error', pgCode });
      return NextResponse.json({ ok: false, reason: 'persist_failed' });
    }

    const entryId = (entryInsertResult.data as { id: string }).id;

    // Insert the segmental fat detail row
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const segInsertResult = await withTimeout(
      Promise.resolve(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from('body_tracker_segmental_fat')
          .insert({ ...segFat, entry_id: entryId })
      ),
      5000,
      'scan.persist.insert_segfat'
    );

    if (segInsertResult.error) {
      // The entry row is committed; log but treat as partial success so the
      // canonical entry exists and the surface can display total body fat.
      safeLog.warn('scan.persist', 'segmental fat insert failed', {
        correlationId,
        userId,
        scanId,
        entryId,
        error: segInsertResult.error.message,
      });
    }

    logScanEvent('completed', correlationId, {
      userId,
      scanId,
      entryId,
      totalBodyFatPct: derived.totalBodyFatPct,
    });

    return NextResponse.json({ ok: true, entryId });

  } catch (err) {
    safeLog.error('scan.persist', 'unhandled error', {
      correlationId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ ok: false, reason: 'persist_failed' });
  }
}
