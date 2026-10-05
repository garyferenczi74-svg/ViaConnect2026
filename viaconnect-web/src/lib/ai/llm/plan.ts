/**
 * Pure route decision. No I/O.
 *
 * xAI is primary only when the feature enabled flag is on, the kill switch
 * is off, and the data class is allowed. Shadow calls both providers and
 * the router returns Claude. A user key is canaried; an admin call with no
 * user key is not (canary percent defaults to 0 and would otherwise block
 * every internal job).
 */

import { xaiAllowsDataClass, isCanarySelected } from './flags';
import type { DataClass, LlmFeatureId, RoutePlan } from './types';

export interface RoutePlanInput {
  featureId: LlmFeatureId;
  dataClass: DataClass;
  kill: boolean;
  enabled: boolean;
  shadow: boolean;
  memberDataAllowed: boolean;
  canaryPercent: number;
  userKeyHash: string | null;
  allowlisted: boolean;
}

export function planLlmRoute(input: RoutePlanInput): RoutePlan {
  if (input.kill) return { mode: 'anthropic_only', reason: 'kill' };

  const wantsXai = input.enabled || input.shadow;
  if (!xaiAllowsDataClass(input.dataClass, input.memberDataAllowed)) {
    return {
      mode: 'anthropic_only',
      reason: wantsXai ? 'member_data_blocked' : 'flag_off',
    };
  }

  if (!wantsXai) return { mode: 'anthropic_only', reason: 'flag_off' };

  if (input.userKeyHash && !input.allowlisted && !isCanarySelected(input.userKeyHash, input.canaryPercent)) {
    return { mode: 'anthropic_only', reason: 'canary_miss' };
  }

  // Shadow wins when both are on so the caller still receives Claude.
  if (input.shadow) return { mode: 'shadow', reason: 'shadow' };
  return { mode: 'xai_primary', reason: 'enabled' };
}
