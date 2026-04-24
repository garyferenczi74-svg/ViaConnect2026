// Prompt #125 P2: Generic scheduler webhook handler.
//
// Flow:
//   1. Adapter verifies HMAC/timing-safe signature against raw body.
//   2. Adapter parses payload into SchedulerEvent.
//   3. We insert into scheduler_events with ON CONFLICT DO NOTHING on
//      (platform, external_event_id); the conflict path returns
//      'deduplicated' so the orchestrator is not called twice for a
//      retry storm.
//   4. On fresh insert, we dispatch the event to the caller for
//      orchestration. The handler itself does not call the orchestrator
//      directly so tests can assert dispatch behavior without pulling
//      in the orchestrator.

import type { SupabaseClient } from '@supabase/supabase-js';
import { schedulerLogger } from './logging';
import type { SchedulerAdapter } from './adapters/types';
import type { SchedulerEvent, SchedulerPlatform } from './types';

export type WebhookOutcome =
  | { outcome: 'rejected_invalid_signature' }
  | { outcome: 'rejected_parse_error'; error: string }
  | { outcome: 'deduplicated'; externalEventId: string }
  | { outcome: 'accepted'; eventRowId: string; event: SchedulerEvent };

export interface WebhookHandlerInput {
  supabase: SupabaseClient;
  adapter: SchedulerAdapter;
  rawBody: Buffer;
  headers: Headers;
  signingSecret: string;
}

export async function handleSchedulerWebhook(input: WebhookHandlerInput): Promise<WebhookOutcome> {
  if (!input.adapter.verifyWebhookSignature({
    rawBody: input.rawBody,
    headers: input.headers,
    signingSecret: input.signingSecret,
  })) {
    schedulerLogger.warn('[webhook] signature rejected', { platform: input.adapter.platform });
    return { outcome: 'rejected_invalid_signature' };
  }

  let event: SchedulerEvent;
  try {
    event = input.adapter.parseWebhookEvent(input.rawBody, input.headers);
  } catch (err) {
    schedulerLogger.warn('[webhook] parse failed', { platform: input.adapter.platform, error: (err as Error).message });
    return { outcome: 'rejected_parse_error', error: (err as Error).message };
  }

  const insertRow = {
    platform: event.platform,
    external_event_id: event.externalEventId,
    event_type: event.eventType,
    connection_id: event.connectionId ?? null,
    external_post_id: event.externalPostId ?? null,
    raw_payload: sanitizeRawPayload(event.rawPayload),
    received_at: event.receivedAt,
    processing_status: 'pending' as const,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = input.supabase as any;
  const { data, error } = await sb
    .from('scheduler_events')
    .insert(insertRow)
    .select('id')
    .maybeSingle();
  if (error) {
    // 23505 unique_violation on (platform, external_event_id) = retry storm.
    if (error.code === '23505' || /unique|duplicate/i.test(error.message ?? '')) {
      return { outcome: 'deduplicated', externalEventId: event.externalEventId };
    }
    schedulerLogger.error('[webhook] insert failed', { platform: event.platform, code: error.code });
    throw new Error(`webhook_persist_failed:${error.code ?? 'unknown'}`);
  }
  const row = data as { id: string } | null;
  if (!row) {
    return { outcome: 'deduplicated', externalEventId: event.externalEventId };
  }
  return { outcome: 'accepted', eventRowId: row.id, event };
}

/**
 * Strip anything that looks like a token or signing secret before the
 * payload lands in scheduler_events.raw_payload. We still want a copy for
 * debugging but it must not leak OAuth material.
 */
function sanitizeRawPayload(raw: unknown): unknown {
  if (raw == null || typeof raw !== 'object') return raw;
  const seen = new WeakSet();
  const walk = (val: unknown): unknown => {
    if (val == null) return val;
    if (typeof val === 'string') return scrubSecretLike(val);
    if (Array.isArray(val)) return val.map((v) => walk(v));
    if (typeof val === 'object') {
      if (seen.has(val as object)) return '[circular]';
      seen.add(val as object);
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
        if (/token|secret|credential|api_?key|bearer|authorization/i.test(k)) {
          out[k] = '[REDACTED:secret_like_key]';
        } else {
          out[k] = walk(v);
        }
      }
      return out;
    }
    return val;
  };
  return walk(raw);
}

function scrubSecretLike(value: string): string {
  if (/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/.test(value)) {
    return '[REDACTED:jwt]';
  }
  return value;
}

export type { SchedulerEvent, SchedulerPlatform };
