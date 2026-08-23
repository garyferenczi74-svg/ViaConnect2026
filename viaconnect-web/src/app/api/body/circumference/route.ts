// Prompt 210c Task 10: Circumference persistence route.
// POST { scanId, measurements } -> looks up the body_tracker_entries row for
// this scan (created by the composition persist route), then writes
// body_tracker_circumference (12 girths + per-field confidence + calibration version)
// and body_tracker_weight.hips_in + hips_confidence (hip is stored in that table
// per MEASUREMENT_EXTERNAL_KEYS, Prompt 85d).
//
// Fail-open: any persistence failure is logged and returns ok:false without throwing.
// Auth: session cookie (same-origin Next.js route - no explicit token required).
// Resilience: withTimeout on every Supabase call; entry lookup retries to handle
// the race where this route fires before the composition persist route commits.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { buildCircumferenceWrite } from '@/lib/body-tracker/composition/buildScanWrite';
import type { ExtractedMeasurements } from '@/lib/arnold/scanning/types';

export const dynamic = 'force-dynamic';

const SCOPE = 'body.circumference.persist';
const TIMEOUT_MS = 5000;

// Entry lookup retries: the composition persist route runs concurrently.
// Prompt 210l: geometric girths often finish before persist commits the entry.
// Prior window was 5 x 600ms (3s) and dropped girths while persist still ran.
// 15 x 1000ms = 15s covers multi-step persist without lengthening global timeouts.
const ENTRY_LOOKUP_RETRIES = 15;
const ENTRY_LOOKUP_DELAY_MS = 1000;

export async function POST(req: Request): Promise<NextResponse> {
  try {
    // Parse request body
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ ok: false, reason: 'bad_request' }, { status: 400 });
    }

    const scanId = typeof body.scanId === 'string' ? body.scanId.trim() : '';

    // Validate the measurements payload shape before trusting it. A malformed
    // payload returns ok:false cleanly rather than throwing inside buildCircumferenceWrite.
    const rawMeasurements = body.measurements;
    if (
      !scanId ||
      typeof rawMeasurements !== 'object' ||
      rawMeasurements === null ||
      // minimal shape check: neckCirc is a MeasuredValue with a `cm` field
      typeof (rawMeasurements as Record<string, unknown>).neckCirc !== 'object' ||
      (rawMeasurements as Record<string, unknown>).neckCirc === null
    ) {
      return NextResponse.json({ ok: false, reason: 'bad_request' }, { status: 400 });
    }
    const measurements = rawMeasurements as ExtractedMeasurements;

    // Auth - fail closed
    const supabase = await createClient();
    let user: { id: string } | null = null;
    try {
      const authResult = await withTimeout(supabase.auth.getUser(), TIMEOUT_MS, `${SCOPE}.auth`);
      user = authResult.data.user;
    } catch (err) {
      safeLog.warn(SCOPE, 'auth timeout or error', { error: err instanceof Error ? err.message : String(err) });
      return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
    }
    if (!user) {
      return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
    }
    const userId = user.id;

    // Look up entry_id. The composition persist route creates the entry concurrently.
    // Retry to handle the race (geometric pipeline can finish before the entry is committed).
    let entryId: string | null = null;
    for (let attempt = 0; attempt < ENTRY_LOOKUP_RETRIES && !entryId; attempt++) {
      if (attempt > 0) {
        await new Promise<void>((resolve) => { setTimeout(resolve, ENTRY_LOOKUP_DELAY_MS); });
      }
      try {
        type EntryRow = { id: string };
        const result = await withTimeout(
          (supabase as unknown as {
            from: (t: string) => {
              select: (c: string) => {
                eq: (c: string, v: string) => {
                  eq: (c: string, v: string) => {
                    maybeSingle: () => Promise<{ data: EntryRow | null; error: { message: string } | null }>;
                  };
                };
              };
            };
          })
            .from('body_tracker_entries')
            .select('id')
            .eq('scan_id', scanId)
            .eq('user_id', userId)
            .maybeSingle(),
          TIMEOUT_MS,
          `${SCOPE}.entry_lookup`
        );
        if (!result.error && result.data) {
          entryId = result.data.id;
        } else if (result.error) {
          safeLog.warn(SCOPE, 'entry lookup attempt error', {
            scanId,
            attempt,
            error: result.error.message,
          });
        }
      } catch (err) {
        safeLog.warn(SCOPE, 'entry lookup attempt timed out', {
          scanId,
          attempt,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    if (!entryId) {
      safeLog.warn(SCOPE, 'entry not found after retries (composition may not have persisted)', {
        scanId,
        userId,
        retriesAttempted: ENTRY_LOOKUP_RETRIES,
      });
      return NextResponse.json({ ok: false, reason: 'entry_not_found' });
    }

    const { circ, hips } = buildCircumferenceWrite({ userId, entryId, scanId, measurements });

    // Write circumferences to body_tracker_circumference (12 girths + confidence + calibration).
    // The route contract is fail-open (never throw) but honest: a failed insert
    // must return ok:false. Swallowing { error } used to report success after a
    // silent miss, so FormaVision thought girths landed on the Body Tracker spine
    // when they did not.
    try {
      const circInsert = await withTimeout(
        (supabase as unknown as {
          from: (t: string) => {
            insert: (row: Record<string, unknown>) => Promise<{ error: { message: string; code?: string } | null }>;
          };
        })
          .from('body_tracker_circumference')
          .insert(circ),
        TIMEOUT_MS,
        `${SCOPE}.insert_circ`
      );
      if (circInsert?.error) {
        safeLog.warn(SCOPE, 'circumference insert returned error', {
          entryId,
          error: circInsert.error.message,
        });
        return NextResponse.json({ ok: false, reason: 'circ_insert_failed', entryId });
      }
    } catch (err) {
      safeLog.warn(SCOPE, 'circumference insert failed (fail-open)', {
        entryId,
        error: err instanceof Error ? err.message : String(err),
      });
      return NextResponse.json({ ok: false, reason: 'circ_insert_failed', entryId });
    }

    // Write hip to body_tracker_weight.hips_in + hips_confidence.
    // Only fires when the hip measurement is present (non-null).
    //
    // The scan composition-persist route does NOT create a per-entry weight row,
    // so normally no row exists for this entry. To avoid inserting a SECOND
    // weight row (whose NULL weight_lbs could otherwise become the most-recent
    // row and shadow the real weight for BMI), we UPDATE an existing per-entry
    // row when one is present and only INSERT when none exists. The read guard
    // in useLatestComposition (weight_lbs IS NOT NULL) is the belt-and-braces
    // backstop so a hip-only INSERT can never corrupt BMI either way.
    if (hips.hips_in !== null) {
      try {
        // Check for an existing weight row scoped to this entry.
        type WeightRow = { id: string };
        const existing = await withTimeout(
          (supabase as unknown as {
            from: (t: string) => {
              select: (c: string) => {
                eq: (c: string, v: string) => {
                  eq: (c: string, v: string) => {
                    maybeSingle: () => Promise<{ data: WeightRow | null; error: { message: string } | null }>;
                  };
                };
              };
            };
          })
            .from('body_tracker_weight')
            .select('id')
            .eq('entry_id', entryId)
            .eq('user_id', userId)
            .maybeSingle(),
          TIMEOUT_MS,
          `${SCOPE}.hip_weight_lookup`
        );

        if (!existing.error && existing.data) {
          // UPDATE the existing row so there is at most ONE weight row per entry.
          await withTimeout(
            (supabase as unknown as {
              from: (t: string) => {
                update: (row: Record<string, unknown>) => {
                  eq: (c: string, v: string) => {
                    eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
                  };
                };
              };
            })
              .from('body_tracker_weight')
              .update({ ...hips })
              .eq('entry_id', entryId)
              .eq('user_id', userId),
            TIMEOUT_MS,
            `${SCOPE}.update_hip_weight`
          );
        } else {
          // No per-entry weight row exists: INSERT a hip-only row. Safe because
          // the useLatestComposition read filters weight_lbs IS NOT NULL.
          await withTimeout(
            (supabase as unknown as {
              from: (t: string) => {
                insert: (row: Record<string, unknown>) => Promise<{ error: { message: string; code?: string } | null }>;
              };
            })
              .from('body_tracker_weight')
              .insert({ user_id: userId, entry_id: entryId, ...hips }),
            TIMEOUT_MS,
            `${SCOPE}.insert_hip_weight`
          );
        }
      } catch (err) {
        safeLog.warn(SCOPE, 'hip weight write failed (fail-open)', {
          entryId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    safeLog.info(SCOPE, 'circumference write complete', { entryId, scanId, userId });
    return NextResponse.json({ ok: true, entryId });

  } catch (err) {
    safeLog.error(SCOPE, 'unhandled error', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ ok: false, reason: 'persist_failed' });
  }
}
