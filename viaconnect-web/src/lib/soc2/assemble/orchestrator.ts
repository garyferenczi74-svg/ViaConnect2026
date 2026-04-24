// Prompt #122 P5: Assembly orchestrator.
//
// Takes a period, a CollectorFetcher, a set of manual evidence files, the
// active signing key, and produces a complete signed packet:
//   1. Runs all 24 collectors via runAllCollectors
//   2. Collects CollectorOutput.files + attestations
//   3. Merges with manual evidence files (pre-redacted by upload flow)
//   4. Computes per-file sha256 → per-category Merkle → packet rootHash
//   5. Builds canonical manifest (unsigned)
//   6. Signs manifest with active ES256 key
//   7. Serializes signed manifest → manifest.json file
//   8. Assembles deterministic ZIP: manifest.json + collector CSVs + attestations + manual evidence
//   9. Computes ZIP SHA-256
//
// Return value: everything callers need to persist to DB + Storage + distribute.

import { randomUUID } from 'node:crypto';

import type {
  CollectorAttestation,
  PacketManifest,
  PacketManifestFile,
  Period,
  Soc2TscCode,
} from '../types';
import { SOC2_CATEGORY_DIRS, SOC2_TSC_CODES } from '../types';
import type { CollectorRunCtx } from '../collectors/types';
import { runAllCollectors, type RunAllResult } from '../collectors/runAll';
import {
  buildManifest,
  manifestFileFromBytes,
  manifestSigningBytes,
  serializeSignedManifest,
  validateManifestCoverage,
} from './manifest';
import { signPayload } from './sign';
import { assembleDeterministicZip, type PacketFileInput } from './zipper';
import { sha256 } from './merkle';
import { frozenTimer, sha256Hex, utf8 } from '../collectors/helpers';
import { generatePacketHmacKey } from '../redaction/pseudonymize';
import { loadRegistry } from '@/lib/compliance/frameworks/registry';
import type { FrameworkId } from '@/lib/compliance/frameworks/types';

export interface ManualEvidenceFile {
  /** Relative path inside the ZIP, starting with one of SOC2_CATEGORY_DIRS values. */
  relativePath: string;
  /**
   * Currently narrow on purpose: the four types we guarantee render in every
   * auditor PDF reader. The P6 loader coerces xlsx/docx/pptx/jpg/png/webp
   * inputs to `application/pdf` in the manifest entry (the ZIP still carries
   * the original bytes + correct file extension). Broaden this union rather
   * than extending the coercion fallback when auditors accept Office docs
   * natively.
   */
  contentType: 'application/pdf' | 'text/csv' | 'application/json' | 'text/markdown';
  bytes: Uint8Array;
  controls: readonly string[];
  /** Soc2_manual_evidence.id for DB cross-reference; unset for programmatically-generated files. */
  manualEvidenceId?: string;
}

export interface OrchestratorInput {
  period: Period;
  attestationType?: 'Type I' | 'Type II';
  tscInScope?: readonly Soc2TscCode[];
  ruleRegistryVersion: string;
  generatedBy: string;
  systemBoundary: string;

  activeSigningKey: {
    id: string;
    privateKeyPem: string;
  };

  /** Supplies the per-packet HMAC key. Defaults to generating a fresh one. */
  pseudonymKey?: Buffer;

  /** Fetcher used by all collectors. In prod: Supabase-backed. In tests: fixtures. */
  fetch: CollectorRunCtx['fetch'];

  manualEvidence?: readonly ManualEvidenceFile[];

  /** Override packet UUID (for idempotent retries / fixtures). */
  packetUuid?: string;

  /** Override generatedAt timestamp (for tests). */
  nowIso?: string;

  /**
   * #127 P2: optional framework identifier. When set to 'soc2' (or unset),
   * this orchestrator produces a SOC 2 packet with byte-identical output
   * to pre-refactor. Future phases (P3 HIPAA, P5 ISO) either extend this
   * orchestrator or ship separate assemblers; the framework_id is pinned
   * on the GeneratedPacket regardless.
   */
  frameworkId?: FrameworkId;
}

export interface GeneratedPacket {
  packetUuid: string;
  zipBytes: Uint8Array;
  zipSha256: string;
  manifest: PacketManifest;
  manifestJsonBytes: Uint8Array;
  signatureJwt: string;
  rootHash: string;
  categoryHashes: Record<string, string>;
  manifestFiles: readonly PacketManifestFile[];
  collectorRuns: RunAllResult['attestations'];
  collectorErrors: ReadonlyArray<{ collectorId: string; error: string }>;
  pseudonymKey: Buffer;
  tscInScope: readonly Soc2TscCode[];
  coverageGaps: readonly Soc2TscCode[];
  manualEvidenceIds: readonly string[];
  totalFiles: number;
  /** #127 P2: framework ID pinned into the packet (defaults to 'soc2'). */
  frameworkId: FrameworkId;
  /** #127 P2: registry version at generation time. Auditors reviewing a historical packet can reproduce the exact rule set. */
  frameworkRegistryVersion: string;
}

/**
 * Full packet generation. Pure: no DB writes, no Storage I/O, no network.
 * The caller (persist.ts + distribute/*.ts) does all I/O based on the result.
 */
export async function generateSoc2Packet(input: OrchestratorInput): Promise<GeneratedPacket> {
  const packetUuid = input.packetUuid ?? randomUUID();
  const pseudonymKey = input.pseudonymKey ?? generatePacketHmacKey();
  const attestationType = input.attestationType ?? 'Type II';
  const tscInScope = (input.tscInScope ?? SOC2_TSC_CODES).slice();
  const nowIso = input.nowIso ?? new Date().toISOString();

  // #127 P2: resolve the framework ID + registry version. Defaulting to
  // 'soc2' makes this a no-op for pre-refactor callers. The registry is
  // validated at load time so `loadRegistry()` either returns a
  // well-formed record or throws; we only pin the version string here.
  const frameworkId: FrameworkId = input.frameworkId ?? 'soc2';
  const registry = loadRegistry();
  const frameworkRegistryVersion = registry.frameworks[frameworkId]?.registryVersion
    ?? registry.registryVersion;

  // 1. Run every collector against the real-or-fixture fetcher. When nowIso
  //    is provided, thread a frozen timer through ctx so every collector's
  //    attestation uses the same executedAt — otherwise identical inputs
  //    would still produce different attestations.json bytes on re-runs.
  const ctx: CollectorRunCtx = {
    packetUuid,
    pseudonymKey,
    ruleRegistryVersion: input.ruleRegistryVersion,
    fetch: input.fetch,
    ...(input.nowIso ? { timer: frozenTimer(input.nowIso, 0) } : {}),
  };
  const collectorResult = await runAllCollectors(input.period, ctx);

  // 2. Build the manifest file list: collector outputs + manual evidence +
  //    one attestations.json containing every CollectorAttestation.
  const manifestFiles: PacketManifestFile[] = [];
  const zipInputs: PacketFileInput[] = [];

  for (const f of collectorResult.files) {
    const mf = manifestFileFromBytes(
      f.relativePath,
      f.contentType,
      f.bytes,
      f.controls,
      f.collectorId,
      // The collector-specific query hash lives in its attestation; we don't
      // duplicate it on the manifest file entry to avoid drift.
      undefined,
    );
    manifestFiles.push(mf);
    zipInputs.push({ relativePath: f.relativePath, bytes: f.bytes });
  }

  const manualIds: string[] = [];
  for (const m of input.manualEvidence ?? []) {
    manifestFiles.push(
      manifestFileFromBytes(
        m.relativePath,
        m.contentType,
        m.bytes,
        m.controls,
      ),
    );
    zipInputs.push({ relativePath: m.relativePath, bytes: m.bytes });
    if (m.manualEvidenceId) manualIds.push(m.manualEvidenceId);
  }

  // attestations.json — one canonical object per packet with every collector run.
  const attestationsJson = JSON.stringify(
    { packetUuid, attestations: collectorResult.attestations, errors: collectorResult.errors },
    null,
    2,
  ) + '\n';
  const attestationsBytes = utf8(attestationsJson);
  const attestationsPath = 'attestations.json';
  manifestFiles.push(
    manifestFileFromBytes(
      attestationsPath,
      'application/json',
      attestationsBytes,
      [], // meta-file; no single TSC
    ),
  );
  zipInputs.push({ relativePath: attestationsPath, bytes: attestationsBytes });

  // 3. Build manifest (unsigned).
  const manifestUnsigned = buildManifest({
    packetUuid,
    period: { start: input.period.start, end: input.period.end, attestationType },
    tscInScope,
    generatedAt: nowIso,
    generatedBy: input.generatedBy,
    ruleRegistryVersion: input.ruleRegistryVersion,
    systemBoundary: input.systemBoundary,
    files: manifestFiles,
  });

  // 4. Sign.
  const signingBytes = manifestSigningBytes(manifestUnsigned);
  const signatureJwt = signPayload(signingBytes, {
    signingKeyId: input.activeSigningKey.id,
    privateKeyPem: input.activeSigningKey.privateKeyPem,
  });

  const manifestSigned: PacketManifest = {
    ...manifestUnsigned,
    signature: { alg: 'ES256', kid: input.activeSigningKey.id, jwt: signatureJwt },
  };

  // 5. Serialize the signed manifest → manifest.json inside the ZIP.
  const manifestJsonBytes = serializeSignedManifest(manifestSigned);
  zipInputs.push({ relativePath: 'manifest.json', bytes: manifestJsonBytes });

  // 6. Assemble deterministic ZIP.
  const zipBytes = assembleDeterministicZip(zipInputs);
  const zipSha256 = sha256(zipBytes);

  // 7. Coverage check (returned to caller for optional enforcement).
  const coverageGaps = validateManifestCoverage(manifestSigned) as Soc2TscCode[];

  return {
    packetUuid,
    zipBytes,
    zipSha256,
    manifest: manifestSigned,
    manifestJsonBytes,
    signatureJwt,
    rootHash: manifestSigned.rootHash,
    categoryHashes: manifestSigned.categoryHashes,
    manifestFiles,
    collectorRuns: collectorResult.attestations,
    collectorErrors: collectorResult.errors,
    pseudonymKey,
    tscInScope,
    coverageGaps,
    manualEvidenceIds: manualIds,
    totalFiles: zipInputs.length,
    frameworkId,
    frameworkRegistryVersion,
  };
}

/**
 * Convenience: build the Storage key for a packet ZIP. Keyed by packet UUID
 * so a packet can be referenced by a stable URL throughout its lifetime.
 * Path discipline: `soc2-packets/<yyyy>/<mm>/<packetUuid>.zip`
 */
export function packetStorageKey(period: Period, packetUuid: string): string {
  const year = period.start.slice(0, 4);
  const month = period.start.slice(5, 7);
  return `${year}/${month}/${packetUuid}.zip`;
}

/** Re-export the outputSha256 helper under a more-specific name. */
export { sha256Hex as packetSha256Hex };
