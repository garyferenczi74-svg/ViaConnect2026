// Prompt #125 P2: Interception dispatcher.
//
// Given a scan + adapter + live OAuth token, attempt the platform's hold
// mechanism and persist the attempt to scheduler_interceptions. Never
// throws: platform-side failure is captured in the row so the caller can
// fall back to notification-only.

import type { SupabaseClient } from '@supabase/supabase-js';
import { schedulerLogger } from './logging';
import type { SchedulerAdapter } from './adapters/types';
import type { InterceptionResult } from './types';

export interface InterceptInput {
  supabase: SupabaseClient;
  adapter: SchedulerAdapter;
  scanId: string;
  connectionId: string;
  externalPostId: string;
  accessToken: string;
  reason: string;
}

export interface InterceptOutcome {
  interceptionId: string;
  result: InterceptionResult;
}

export async function attemptInterception(input: InterceptInput): Promise<InterceptOutcome> {
  const result = await input.adapter.attemptInterception({
    connectionId: input.connectionId,
    externalPostId: input.externalPostId,
    accessToken: input.accessToken,
    reason: input.reason,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = input.supabase as any;
  const { data, error } = await sb
    .from('scheduler_interceptions')
    .insert({
      scan_id: input.scanId,
      platform: input.adapter.platform,
      mechanism: result.mechanism,
      succeeded: result.succeeded,
      platform_response: sanitizePlatformResponse(result.platformResponse),
      error_message: result.errorMessage ?? null,
    })
    .select('id')
    .single();
  if (error) {
    // We still return the interception result so the caller can decide
    // whether to notify the practitioner; only the audit row failed.
    schedulerLogger.error('[intercept] audit insert failed', {
      platform: input.adapter.platform,
      scanId: input.scanId,
      code: error.code,
    });
    return { interceptionId: '', result };
  }
  const row = data as { id: string };
  return { interceptionId: row.id, result };
}

function sanitizePlatformResponse(response: unknown): unknown {
  if (response == null || typeof response !== 'object') return response;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(response as Record<string, unknown>)) {
    if (/token|secret|credential|api_?key|bearer|authorization/i.test(k)) {
      out[k] = '[REDACTED:secret_like_key]';
      continue;
    }
    out[k] = v;
  }
  return out;
}
