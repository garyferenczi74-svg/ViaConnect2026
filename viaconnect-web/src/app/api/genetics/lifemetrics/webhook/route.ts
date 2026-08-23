/**
 * POST /api/genetics/lifemetrics/webhook
 *
 * Inbound LifeMetrics receiver for Farmceutica Wellness (y0urbrand tenant 355).
 * Existing POST /api/genex/genemetrics outbound poll stays. This route is the
 * webhook they can point at once tenant 355 has a key and a webhook secret.
 *
 * How to set the webhook URL once keys exist:
 *   1. Set LIFEMETRICS_WEBHOOK_SECRET (and LIFEMETRICS_API_KEY if you want the
 *      optional pull helper) in the ViaConnect host env. Do not commit secrets.
 *   2. In https://farmceutica-wellness.labs.y0urbrand.com/admin/tenants/355
 *      create a webhook subscription to:
 *      https://www.viaconnectapp.com/api/genetics/lifemetrics/webhook
 *   3. Subscribe to genetics_result.uploaded, genome_result.processing_succeeded,
 *      lab_results.received, lab_order.results_ready. Optional metadata-only
 *      event: insight_report.generation_succeeded.
 *   LifeMetrics may sign with X-LifeMetrics-Signature or X-Webhook-Signature
 *   (HMAC-SHA256 of the raw body). This receiver accepts either.
 *
 * Fail closed on a missing or bad HMAC. Idempotent on event_id. No genetics
 * in logs. UNKNOWN counts stay null, never a fabricated 0.
 *
 * Standing rules: no em or en dashes, TypeScript strict (no any).
 */

import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import { withTimeout } from '@/lib/utils/with-timeout';
import {
  readLifemetricsWebhookSecret,
  verifyLifemetricsWebhookSignature,
} from '@/lib/genetics/lifemetricsWebhookSignature';
import {
  extractLifemetricsIdentityHints,
  resolveLifemetricsUserId,
} from '@/lib/genetics/lifemetricsIdentity';
import { createLifemetricsIdentityLookups } from '@/lib/genetics/lifemetricsLookups';
import {
  extractLifemetricsEventId,
  extractLifemetricsEventType,
  extractLifemetricsTenantId,
  isLifemetricsIngestEvent,
  mapLifemetricsImport,
} from '@/lib/genetics/lifemetricsImport';
import {
  extractLifemetricsPullPointer,
  pullLifemetricsResult,
} from '@/lib/genetics/lifemetricsClient';
import { persistLifemetricsImport } from '@/lib/genetics/lifemetricsPersist';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const SCOPE = 'api.genetics.lifemetrics.webhook';

function payloadDigest(rawBody: string): string {
  return createHash('sha256').update(rawBody).digest('hex');
}

function unknownCounts(): { variants: null; hormoneMarkers: null; epigeneticMarkers: null } {
  return { variants: null, hormoneMarkers: null, epigeneticMarkers: null };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = readLifemetricsWebhookSecret();
  const rawBody = await request.text();
  if (!verifyLifemetricsWebhookSignature(rawBody, request.headers, secret)) {
    safeLog.warn(SCOPE, 'signature rejected', {});
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const eventId = extractLifemetricsEventId(payload);
  const eventType = extractLifemetricsEventType(payload);
  const tenantId = extractLifemetricsTenantId(payload);
  if (!eventId) {
    return NextResponse.json({ error: 'missing_event_id' }, { status: 400 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    safeLog.warn(SCOPE, 'admin client unavailable', { event_id: eventId });
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }

  const claimed = await claimEvent(admin, {
    eventId,
    eventType: eventType ?? 'unknown',
    tenantId,
    digest: payloadDigest(rawBody),
  });
  if (claimed === 'duplicate') {
    return NextResponse.json({
      ok: true,
      duplicate: true,
      event_id: eventId,
      applied: unknownCounts(),
    });
  }
  if (claimed === 'failed') {
    return NextResponse.json({ error: 'ledger_unavailable' }, { status: 503 });
  }

  if (eventType && !isLifemetricsIngestEvent(eventType)) {
    await finalizeEvent(admin, eventId, 'ignored', 'unsupported_event', null);
    return NextResponse.json({
      ok: true,
      ignored: true,
      event_id: eventId,
      applied: unknownCounts(),
    });
  }

  try {
    const hints = extractLifemetricsIdentityHints(payload);
    let userId = await resolveLifemetricsUserId(hints, createLifemetricsIdentityLookups(admin));

    let workPayload = payload;
    const mappedFirst = userId ? mapLifemetricsImport(payload, userId) : null;
    const needsPull =
      Boolean(userId) &&
      mappedFirst &&
      !mappedFirst.metadataOnly &&
      mappedFirst.variants.length === 0 &&
      mappedFirst.hormoneMarkers.length === 0 &&
      mappedFirst.epigeneticMarkers.length === 0;

    if (needsPull) {
      const pulled = await pullLifemetricsResult(
        extractLifemetricsPullPointer(payload),
        eventType,
      );
      if (pulled) workPayload = pulled;
      if (!userId) {
        userId = await resolveLifemetricsUserId(
          extractLifemetricsIdentityHints(workPayload),
          createLifemetricsIdentityLookups(admin),
        );
      }
    }

    if (!userId) {
      await finalizeEvent(admin, eventId, 'ignored', 'unresolved_user', null);
      safeLog.info(SCOPE, 'event unmatched, no write', { event_id: eventId, event_type: eventType });
      return NextResponse.json({
        ok: true,
        unmatched: true,
        event_id: eventId,
        applied: unknownCounts(),
      });
    }

    const mapped = mapLifemetricsImport(workPayload, userId);
    if (mapped.metadataOnly) {
      await finalizeEvent(admin, eventId, 'processed', 'metadata_only', userId);
      return NextResponse.json({
        ok: true,
        metadata_only: true,
        event_id: eventId,
        applied: unknownCounts(),
      });
    }

    const applied = await persistLifemetricsImport(admin, userId, mapped);
    await finalizeEvent(admin, eventId, 'processed', null, userId);
    await writeAudit(admin, userId, eventId, eventType, applied);
    safeLog.info(SCOPE, 'event processed', {
      event_id: eventId,
      event_type: eventType,
      user_id: userId,
      variants: applied.variants,
      hormone_markers: applied.hormoneMarkers,
      epigenetic_markers: applied.epigeneticMarkers,
    });
    return NextResponse.json({ ok: true, event_id: eventId, applied });
  } catch (err) {
    await finalizeEvent(admin, eventId, 'failed', 'handler_error', null);
    safeLog.error(SCOPE, 'handler failed', {
      event_id: eventId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'handler_failed' }, { status: 500 });
  }
}

async function claimEvent(
  admin: ReturnType<typeof createAdminClient>,
  input: { eventId: string; eventType: string; tenantId: string | null; digest: string },
): Promise<'claimed' | 'duplicate' | 'failed'> {
  const { error } = await withTimeout(
    admin.from('lifemetrics_webhook_events').insert({
      event_id: input.eventId,
      event_type: input.eventType,
      tenant_id: input.tenantId,
      status: 'received',
      payload_digest: input.digest,
    }),
    5000,
    `${SCOPE}.claim`,
  );
  if (!error) return 'claimed';
  const message = error.message ?? '';
  if (/duplicate|unique/i.test(message) || error.code === '23505') {
    return 'duplicate';
  }
  safeLog.warn(SCOPE, 'ledger insert failed', { event_id: input.eventId, error: message });
  return 'failed';
}

async function finalizeEvent(
  admin: ReturnType<typeof createAdminClient>,
  eventId: string,
  status: 'processed' | 'ignored' | 'failed',
  errorCode: string | null,
  userId: string | null,
): Promise<void> {
  const { error } = await withTimeout(
    admin
      .from('lifemetrics_webhook_events')
      .update({
        status,
        error_code: errorCode,
        user_id: userId,
        processed_at: new Date().toISOString(),
      })
      .eq('event_id', eventId),
    5000,
    `${SCOPE}.finalize`,
  );
  if (error) {
    safeLog.warn(SCOPE, 'ledger update failed', {
      event_id: eventId,
      error: error.message ?? 'supabase error',
    });
  }
}

async function writeAudit(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  eventId: string,
  eventType: string | null,
  applied: { variants: number | null; hormoneMarkers: number | null; epigeneticMarkers: number | null },
): Promise<void> {
  const { error } = await withTimeout(
    admin.from('audit_logs').insert({
      user_id: userId,
      action: 'lifemetrics_import',
      table_name: 'lifemetrics_webhook_events',
      record_id: eventId,
      new_data: {
        event_type: eventType,
        variants: applied.variants,
        hormone_markers: applied.hormoneMarkers,
        epigenetic_markers: applied.epigeneticMarkers,
      },
    }),
    5000,
    `${SCOPE}.audit`,
  );
  if (error) {
    safeLog.warn(SCOPE, 'audit insert failed', {
      event_id: eventId,
      error: error.message ?? 'supabase error',
    });
  }
}
