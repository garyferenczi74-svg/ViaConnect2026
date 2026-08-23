/**
 * src/lib/genetics/lifemetricsWebhookHandler.ts
 *
 * Next-free LifeMetrics webhook handler. The route reads the raw body and
 * delegates here so signature, dedupe, mapping, and persist can be tested
 * without the Next runtime.
 *
 * Standing rules: no em or en dashes, TypeScript strict (no any).
 */

import { createHash } from 'node:crypto';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { verifyLifemetricsWebhookSignature } from './lifemetricsWebhookSignature';
import {
  extractLifemetricsIdentityHints,
  resolveLifemetricsUserId,
} from './lifemetricsIdentity';
import { createLifemetricsIdentityLookups } from './lifemetricsLookups';
import {
  extractLifemetricsEventId,
  extractLifemetricsEventType,
  extractLifemetricsTenantId,
  isLifemetricsIngestEvent,
  mapLifemetricsImport,
} from './lifemetricsImport';
import {
  extractLifemetricsPullPointer,
  pullLifemetricsResult,
} from './lifemetricsClient';
import { persistLifemetricsImport } from './lifemetricsPersist';

const SCOPE = 'api.genetics.lifemetrics.webhook';

export interface LifemetricsWebhookResult {
  status: number;
  body: Record<string, unknown>;
}

function payloadDigest(rawBody: string): string {
  return createHash('sha256').update(rawBody).digest('hex');
}

function unknownCounts(): { variants: null; hormoneMarkers: null; epigeneticMarkers: null } {
  return { variants: null, hormoneMarkers: null, epigeneticMarkers: null };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminLike = any;

export async function handleLifemetricsWebhook(
  rawBody: string,
  headers: Headers,
  secret: string,
  admin: AdminLike | null,
): Promise<LifemetricsWebhookResult> {
  if (!verifyLifemetricsWebhookSignature(rawBody, headers, secret)) {
    safeLog.warn(SCOPE, 'signature rejected', {});
    return { status: 401, body: { error: 'invalid_signature' } };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return { status: 400, body: { error: 'invalid_json' } };
  }

  const eventId = extractLifemetricsEventId(payload);
  const eventType = extractLifemetricsEventType(payload);
  const tenantId = extractLifemetricsTenantId(payload);
  if (!eventId) {
    return { status: 400, body: { error: 'missing_event_id' } };
  }
  if (!admin) {
    safeLog.warn(SCOPE, 'admin client unavailable', { event_id: eventId });
    return { status: 503, body: { error: 'not_configured' } };
  }

  const claimed = await claimEvent(admin, {
    eventId,
    eventType: eventType ?? 'unknown',
    tenantId,
    digest: payloadDigest(rawBody),
  });
  if (claimed === 'duplicate') {
    return {
      status: 200,
      body: { ok: true, duplicate: true, event_id: eventId, applied: unknownCounts() },
    };
  }
  if (claimed === 'failed') {
    return { status: 503, body: { error: 'ledger_unavailable' } };
  }

  if (eventType && !isLifemetricsIngestEvent(eventType)) {
    await finalizeEvent(admin, eventId, 'ignored', 'unsupported_event', null);
    return {
      status: 200,
      body: { ok: true, ignored: true, event_id: eventId, applied: unknownCounts() },
    };
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
      return {
        status: 200,
        body: { ok: true, unmatched: true, event_id: eventId, applied: unknownCounts() },
      };
    }

    const mapped = mapLifemetricsImport(workPayload, userId);
    if (mapped.metadataOnly) {
      await finalizeEvent(admin, eventId, 'processed', 'metadata_only', userId);
      return {
        status: 200,
        body: { ok: true, metadata_only: true, event_id: eventId, applied: unknownCounts() },
      };
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
    return { status: 200, body: { ok: true, event_id: eventId, applied } };
  } catch (err) {
    await finalizeEvent(admin, eventId, 'failed', 'handler_error', null);
    safeLog.error(SCOPE, 'handler failed', {
      event_id: eventId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { status: 500, body: { error: 'handler_failed' } };
  }
}

async function claimEvent(
  admin: AdminLike,
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
  admin: AdminLike,
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
  admin: AdminLike,
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
