/**
 * Admin Marshall remediate adapter. Called only when the feature flag is on.
 * Marketing-copy remediation is P0. No member key is attached.
 */

import { newRequestId, recordAudit } from '@/lib/observability/audit-recorder';
import { routeLlm } from './router';
import type { LlmAuditEvent } from './types';

/** Documented flagship in OBSERVE 7.2. Not a member-facing model choice. */
export const MARSHALL_XAI_MODEL = 'grok-4.7';

export interface MarshallRemediateInput {
  systemPrompt: string;
  userText: string;
  anthropicModel: string;
  maxOutputTokens: number;
  timeoutMs: number;
}

export async function completeMarshallRemediate(input: MarshallRemediateInput): Promise<string | null> {
  const outcome = await routeLlm(
    {
      featureId: 'admin_marshall_remediate',
      dataClass: 'P0',
      anthropicModel: input.anthropicModel,
      xaiModel: MARSHALL_XAI_MODEL,
      system: input.systemPrompt,
      messages: [{ role: 'user', content: [{ type: 'text', text: input.userText }] }],
      maxOutputTokens: input.maxOutputTokens,
      timeoutMs: input.timeoutMs,
      reasoningEffort: 'low',
      requireJson: true,
    },
    { audit: persistLlmAudit },
  );
  if (!outcome.ok) return null;
  return outcome.text;
}

export function persistLlmAudit(event: LlmAuditEvent): void {
  if (event.provider !== 'anthropic' && event.provider !== 'xai') return;
  void recordAudit({
    requestId: newRequestId(),
    route: event.route,
    provider: event.provider,
    model: event.model,
    outcome: event.outcome,
    errorCode: event.errorCode,
    httpStatus: event.httpStatus,
    inputTokens: event.inputTokens,
    outputTokens: event.outputTokens,
    latencyMs: event.latencyMs,
    costUsd: event.costUsd,
  });
}
