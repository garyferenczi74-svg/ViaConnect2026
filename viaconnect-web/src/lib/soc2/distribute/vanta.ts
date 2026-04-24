// Prompt #122 P5: Vanta distribution pusher. Mirrors Drata pusher shape.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { DistributionResult } from './types';
import { loadDistributionTarget, postJson, recordDistributionAttempt, resolveVaultRef } from './helpers';

export interface VantaPushInput {
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

export async function pushToVanta(input: VantaPushInput): Promise<DistributionResult> {
  const target = await loadDistributionTarget(input.supabase, 'vanta');
  if (!target.enabled || !target.api_url || !target.api_key_ref) {
    await recordDistributionAttempt({
      supabase: input.supabase,
      packetId: input.packetId,
      platform: 'vanta',
      status: 'failed',
      errorMessage: `target disabled or missing credentials: ${target.notes ?? ''}`,
    });
    return { platform: 'vanta', status: 'skipped', errorMessage: 'target disabled' };
  }

  const apiKey = await resolveVaultRef(input.supabase, target.api_key_ref);
  if (!apiKey) {
    await recordDistributionAttempt({
      supabase: input.supabase,
      packetId: input.packetId,
      platform: 'vanta',
      status: 'failed',
      errorMessage: 'vault resolution returned null',
    });
    return { platform: 'vanta', status: 'skipped', errorMessage: 'vault read failed' };
  }

  const payload = {
    kind: 'external_soc2_packet',
    id: input.packetUuid,
    window: { from: input.periodStart, to: input.periodEnd },
    hash: input.rootHash,
    signature: input.signatureJwt,
    artifact: {
      bucket: 'soc2-packets',
      key: input.storageKey,
      bytes: input.sizeBytes,
    },
    framework: 'SOC2',
    categories: input.tscInScope,
    source_system: 'viaconnect',
  };

  try {
    const { status, text } = await postJson(
      target.api_url,
      { 'x-vanta-api-key': apiKey },
      payload,
    );
    const ok = status >= 200 && status < 300;
    await recordDistributionAttempt({
      supabase: input.supabase,
      packetId: input.packetId,
      platform: 'vanta',
      status: ok ? 'succeeded' : 'failed',
      httpStatus: status,
      responseExcerpt: text,
      errorMessage: ok ? undefined : `HTTP ${status}`,
    });
    return { platform: 'vanta', status: ok ? 'succeeded' : 'failed', httpStatus: status };
  } catch (err) {
    const msg = (err as Error).message;
    await recordDistributionAttempt({
      supabase: input.supabase,
      packetId: input.packetId,
      platform: 'vanta',
      status: 'failed',
      errorMessage: msg,
    });
    return { platform: 'vanta', status: 'failed', errorMessage: msg };
  }
}
