// Prompt #122 P5: Packet persistence layer.
//
// Writes a generated packet to Supabase:
//   1. Upload the ZIP to Storage bucket 'soc2-packets' at packetStorageKey(...)
//   2. Insert one row into soc2_packets
//   3. Insert one row per file into soc2_packet_files
//   4. Insert one row per collector run into soc2_collector_runs
//   5. Insert one row into soc2_pseudonym_keys with a Vault ref placeholder
//   6. Append a packet_generate_complete event to compliance_audit_log
//
// All writes are performed via the service-role Supabase client passed in
// by the caller (Edge Function / server action). The caller owns the client.

import type { SupabaseClient } from '@supabase/supabase-js';

import type { GeneratedPacket } from './orchestrator';
import type { Period } from '../types';
import { packetStorageKey } from './orchestrator';

export const SOC2_PACKET_BUCKET = 'soc2-packets';

export interface PersistPacketInput {
  supabase: SupabaseClient;
  period: Period;
  packet: GeneratedPacket;
  signingKeyId: string;
  /** Retention date; SOC 2 is typically 7 years from the period end. */
  retentionUntil: string;
  /** Human-identifying string for generatedBy column, e.g. 'cron:monthly' or 'admin:<userId>'. */
  generatedBy: string;
  /** Vault path that will hold the pseudonym key material. */
  pseudonymKeyVaultRef: string;
}

export interface PersistPacketResult {
  packetId: string;
  storageKey: string;
  sizeBytes: number;
}

export async function persistPacket(input: PersistPacketInput): Promise<PersistPacketResult> {
  const { supabase, period, packet } = input;
  const storageKey = packetStorageKey(period, packet.packetUuid);
  const sizeBytes = packet.zipBytes.byteLength;

  // 1. Upload ZIP to Storage.
  const { error: uploadErr } = await supabase.storage
    .from(SOC2_PACKET_BUCKET)
    .upload(storageKey, packet.zipBytes, {
      contentType: 'application/zip',
      cacheControl: 'private, max-age=31536000, immutable',
      upsert: false,
    });
  if (uploadErr && !isAlreadyExists(uploadErr)) {
    throw new Error(`soc2 persist: storage upload failed — ${uploadErr.message}`);
  }

  // 2. Insert soc2_packets row.
  const { data: packetRow, error: packetErr } = await supabase
    .from('soc2_packets')
    .insert({
      packet_uuid: packet.packetUuid,
      period_start: period.start,
      period_end: period.end,
      attestation_type: packet.manifest.period.attestationType,
      tsc_in_scope: packet.tscInScope,
      generated_by: input.generatedBy,
      rule_registry_version: packet.manifest.ruleRegistryVersion,
      root_hash: packet.rootHash,
      category_hashes: packet.categoryHashes,
      signing_key_id: input.signingKeyId,
      signature_jwt: packet.signatureJwt,
      storage_key: storageKey,
      storage_sha256: packet.zipSha256,
      size_bytes: sizeBytes,
      retention_until: input.retentionUntil,
      status: 'generated',
    })
    .select('id')
    .single();
  if (packetErr) {
    throw new Error(`soc2 persist: soc2_packets insert failed — ${packetErr.message}`);
  }
  const packetId: string = packetRow.id;

  // 3. Insert soc2_packet_files rows (batched).
  const fileRows = packet.manifestFiles.map((f) => ({
    packet_id: packetId,
    relative_path: f.path,
    content_type: contentTypeForPath(f.path),
    sha256: f.sha256,
    size_bytes: f.sizeBytes,
    collector_id: f.collector ?? null,
    deterministic_query_hash: f.deterministicQueryHash ?? null,
    controls: f.controls,
  }));
  if (fileRows.length > 0) {
    const { error: filesErr } = await supabase
      .from('soc2_packet_files')
      .insert(fileRows);
    if (filesErr) {
      throw new Error(`soc2 persist: soc2_packet_files insert failed — ${filesErr.message}`);
    }
  }

  // 4. Insert soc2_collector_runs rows.
  const runRows = packet.collectorRuns.map((a) => ({
    packet_id: packetId,
    collector_id: a.collectorId,
    collector_version: a.collectorVersion,
    data_source: a.dataSource,
    query: a.query,
    query_hash: a.queryHash,
    parameters: a.parameters,
    row_count: a.rowCount,
    output_sha256: a.outputSha256,
    deterministic_replay_proof: a.deterministicReplayProof,
    executed_at: a.executedAt,
    duration_ms: a.durationMs,
  }));
  if (runRows.length > 0) {
    const { error: runsErr } = await supabase
      .from('soc2_collector_runs')
      .insert(runRows);
    if (runsErr) {
      throw new Error(`soc2 persist: soc2_collector_runs insert failed — ${runsErr.message}`);
    }
  }

  // 5. Pseudonym key record. key_ref is a Vault pointer; the raw key material
  //    is written to Vault by the caller (Edge Function) BEFORE calling this.
  const { error: pkErr } = await supabase
    .from('soc2_pseudonym_keys')
    .insert({
      packet_id: packetId,
      key_ref: input.pseudonymKeyVaultRef,
    });
  if (pkErr) {
    throw new Error(`soc2 persist: soc2_pseudonym_keys insert failed — ${pkErr.message}`);
  }

  // 6. Audit log event. Direct INSERT; the compliance_audit_chain trigger
  //    computes prev_hash + row_hash automatically.
  const { error: auditErr } = await supabase.from('compliance_audit_log').insert({
    event_type: 'soc2_packet_generated',
    actor_type: 'system',
    actor_id: null,
    payload: {
      packet_uuid: packet.packetUuid,
      packet_id: packetId,
      period_start: period.start,
      period_end: period.end,
      root_hash: packet.rootHash,
      signing_key_id: input.signingKeyId,
      storage_key: storageKey,
      size_bytes: sizeBytes,
      total_files: packet.totalFiles,
      collector_error_count: packet.collectorErrors.length,
    },
  });
  if (auditErr) {
    // Non-fatal: audit append failure should not roll back the packet, but
    // we surface it so the caller can page SecOps.
    // eslint-disable-next-line no-console
    console.error('soc2 persist: compliance_audit_append failed', auditErr);
  }

  return { packetId, storageKey, sizeBytes };
}

function isAlreadyExists(err: { message: string; statusCode?: string | number }): boolean {
  const m = err.message.toLowerCase();
  return m.includes('already exists') || m.includes('duplicate') || String(err.statusCode ?? '').startsWith('409');
}

function contentTypeForPath(path: string): string {
  if (path.endsWith('.csv')) return 'text/csv';
  if (path.endsWith('.json')) return 'application/json';
  if (path.endsWith('.pdf')) return 'application/pdf';
  if (path.endsWith('.md')) return 'text/markdown';
  return 'application/octet-stream';
}
