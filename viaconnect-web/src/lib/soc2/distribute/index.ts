// Prompt #122 P5: distribution orchestrator.
//
// Fans out a generated packet to every enabled distribution target. Each
// push is best-effort: a failure on Drata does not block Vanta, and vice
// versa. Every outcome is recorded in soc2_distribution_attempts.

import type { SupabaseClient } from '@supabase/supabase-js';
import { pushToDrata } from './drata';
import { pushToVanta } from './vanta';
import type { DistributionResult } from './types';

export type { DistributionResult, DistributionPlatform, DistributionTargetRow } from './types';

export interface DistributeInput {
  supabase: SupabaseClient;
  packetId: string;
  packetUuid: string;
  rootHash: string;
  signatureJwt: string;
  storageKey: string;
  sizeBytes: number;
  periodStart: string;
  periodEnd: string;
  tscInScope: readonly string[];
}

export async function distributePacket(input: DistributeInput): Promise<DistributionResult[]> {
  const results = await Promise.allSettled([
    pushToDrata(input),
    pushToVanta(input),
  ]);

  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    const platform = i === 0 ? 'drata' : 'vanta';
    return { platform, status: 'failed' as const, errorMessage: String(r.reason) };
  });
}
