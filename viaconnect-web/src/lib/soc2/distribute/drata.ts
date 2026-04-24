// Prompt #122 P5: Drata distribution pusher.
//
// Publishes a generated packet's metadata + signed manifest reference to
// Drata's evidence-ingest API. When the target is disabled or missing
// credentials, we record a skipped attempt and return without error so
// the rest of the pipeline proceeds.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { DistributionResult } from './types';
import { loadDistributionTarget, postJson, recordDistributionAttempt, resolveVaultRef } from './helpers';

export interface DrataPushInput {
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

export async function pushToDrata(input: DrataPushInput): Promise<DistributionResult> {
  const target = await loadDistributionTarget(input.supabase, 'drata');
  if (!target.enabled || !target.api_url || !target.api_key_ref) {
    await recordDistributionAttempt({
      supabase: input.supabase,
      packetId: input.packetId,
      platform: 'drata',
      status: 'failed',
      errorMessage: `target disabled or missing credentials: ${target.notes ?? ''}`,
    });
    return { platform: 'drata', status: 'skipped', errorMessage: 'target disabled' };
  }

  const apiKey = await resolveVaultRef(input.supabase, target.api_key_ref);
  if (!apiKey) {
    await recordDistributionAttempt({
      supabase: input.supabase,
      packetId: input.packetId,
      platform: 'drata',
      status: 'failed',
      errorMessage: 'vault resolution returned null',
    });
    return { platform: 'drata', status: 'skipped', errorMessage: 'vault read failed' };
  }

  const payload = {
    evidence_type: 'soc2_auto_packet',
    packet_uuid: input.packetUuid,
    period: { start: input.periodStart, end: input.periodEnd },
    root_hash: input.rootHash,
    signature_jwt: input.signatureJwt,
    download_ref: {
      bucket: 'soc2-packets',
      key: input.storageKey,
      size_bytes: input.sizeBytes,
    },
    tsc_in_scope: input.tscInScope,
    source: 'viaconnect-soc2-exporter',
  };

  try {
    const { status, text } = await postJson(
      target.api_url,
      { authorization: `Bearer ${apiKey}` },
      payload,
    );
    const ok = status >= 200 && status < 300;
    await recordDistributionAttempt({
      supabase: input.supabase,
      packetId: input.packetId,
      platform: 'drata',
      status: ok ? 'succeeded' : 'failed',
      httpStatus: status,
      responseExcerpt: text,
      errorMessage: ok ? undefined : `HTTP ${status}`,
    });
    return { platform: 'drata', status: ok ? 'succeeded' : 'failed', httpStatus: status };
  } catch (err) {
    const msg = (err as Error).message;
    await recordDistributionAttempt({
      supabase: input.supabase,
      packetId: input.packetId,
      platform: 'drata',
      status: 'failed',
      errorMessage: msg,
    });
    return { platform: 'drata', status: 'failed', errorMessage: msg };
  }
}
