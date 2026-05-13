// Prompt #164 (#163 fold-in): write one row to ai_route_audit per request.
// Infallible: any Supabase or serialization error is swallowed and logged.

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';

export type Provider = 'google' | 'anthropic' | 'usda';
export type Outcome = 'success' | 'failure';

export interface AuditRecord {
  requestId: string;
  userId?: string | null;
  route: string;
  provider: Provider;
  model?: string | null;
  outcome: Outcome;
  errorCode?: string | null;
  httpStatus?: number | null;
  inputChars?: number | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  latencyMs?: number | null;
  costUsd?: number | null;
}

export function newRequestId(): string {
  const rand = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `req-${rand}`;
}

export async function recordAudit(record: AuditRecord): Promise<void> {
  try {
    const client = createAdminClient();
    const { error } = await client.from('ai_route_audit').insert({
      request_id: record.requestId,
      user_id: record.userId ?? null,
      route: record.route,
      provider: record.provider,
      model: record.model ?? null,
      outcome: record.outcome,
      error_code: record.errorCode ?? null,
      http_status: record.httpStatus ?? null,
      input_chars: record.inputChars ?? null,
      input_tokens: record.inputTokens ?? null,
      output_tokens: record.outputTokens ?? null,
      latency_ms: record.latencyMs ?? null,
      cost_usd: record.costUsd ?? null,
    });
    if (error) {
      safeLog.warn('observability.audit-recorder', 'insert failed', { error, requestId: record.requestId });
    }
  } catch (err) {
    safeLog.warn('observability.audit-recorder', 'unexpected', { error: err, requestId: record.requestId });
  }
}
