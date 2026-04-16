/**
 * Jeffery-to-Hannah orchestration bridge.
 *
 * This is the single integration point between Jeffery's existing decision
 * layer and the new Hannah Ultrathink + Avatar capabilities.
 *
 * Jeffery calls `jefferyToHannah(...)` and receives a result. If Ultrathink
 * is disabled, the bridge returns a __FALLBACK_TO_EXISTING_HANNAH__ sentinel
 * so Jeffery can re-dispatch to the existing 'hannah' handler.
 */

import { extractFeatures, routeTier } from '@/lib/ai/hannah/ultrathink/router';
import { runUltrathink } from '@/lib/ai/hannah/ultrathink/engine';
import type { UltrathinkResponse } from '@/lib/ai/hannah/ultrathink/types';
import { isFeatureEnabled } from '@/lib/config/feature-flags';

export interface JefferyHannahRequest {
  userId: string;
  query: string;
  modality: 'text' | 'avatar';
  jefferyTraceId: string;
  forceTier?: 'fast' | 'standard' | 'ultrathink';
}

export interface JefferyHannahResponse {
  handler: 'hannah';
  tier: 'fast' | 'standard' | 'ultrathink';
  response: UltrathinkResponse;
}

export async function jefferyToHannah(
  req: JefferyHannahRequest,
): Promise<JefferyHannahResponse> {
  const features = extractFeatures(req.query);
  const autoEscalate = isFeatureEnabled('hannah_ultrathink_auto_escalate', req.userId);
  const ultrathinkEnabled = isFeatureEnabled('hannah_ultrathink_enabled', req.userId);

  // If Ultrathink is globally disabled, bridge collapses to existing behavior:
  // return a signal to Jeffery that it should use the existing Hannah handler.
  if (!ultrathinkEnabled && !req.forceTier) {
    return {
      handler: 'hannah',
      tier: 'standard',
      response: {
        answer: '__FALLBACK_TO_EXISTING_HANNAH__',
        tier: 'standard',
        citations: [],
        confidence: 0,
        critiquePassed: true,
        critiqueNotes: '',
        latencyMs: 0,
        inputTokens: 0,
        outputTokens: 0,
      },
    };
  }

  const decision = req.forceTier
    ? { tier: req.forceTier, reason: 'forced', autoEscalated: false }
    : routeTier(features, autoEscalate);

  const response = await runUltrathink({
    userId: req.userId,
    query: req.query,
    tier: decision.tier,
    modality: req.modality,
    phiAllowed: req.modality === 'text',
    jefferyTraceId: req.jefferyTraceId,
  });

  return { handler: 'hannah', tier: decision.tier, response };
}
