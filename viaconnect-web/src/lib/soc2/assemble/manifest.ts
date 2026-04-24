// Prompt #122 P2: Packet manifest builder with stable JSON.
//
// manifest.json is the signed payload. Two properties are non-negotiable:
//   1. The serialized bytes must be stable — same inputs → identical bytes
//      — so that the signature verifies byte-for-byte on any machine.
//   2. Before signing, the `signature` field is absent. After signing it
//      contains the JWT. This is standard JWS-over-JSON envelope pattern.
//
// We implement stable JSON as: keys always sorted alphabetically, no
// trailing whitespace, LF line endings, UTF-8 encoding. `files` array
// preserves insertion order (already sorted by caller).

import type {
  PacketManifest,
  PacketManifestFile,
  Soc2TscCode,
} from '../types';
import { SOC2_CATEGORY_DIRS } from '../types';
import { categoryRoot, packetRoot, sha256 } from './merkle';

export interface BuildManifestInput {
  packetUuid: string;
  period: { start: string; end: string; attestationType: 'Type I' | 'Type II' };
  tscInScope: readonly Soc2TscCode[];
  generatedAt: string;
  generatedBy: string;
  ruleRegistryVersion: string;
  systemBoundary: string;
  files: readonly PacketManifestFile[];
}

/**
 * Build the manifest object (unsigned). Adds computed categoryHashes and rootHash.
 */
export function buildManifest(input: BuildManifestInput): PacketManifest {
  // Group files by category (first path segment) and compute per-category roots.
  const categoryBuckets = new Map<string, PacketManifestFile[]>();
  for (const f of input.files) {
    const category = f.path.split('/')[0] ?? '';
    if (!categoryBuckets.has(category)) categoryBuckets.set(category, []);
    categoryBuckets.get(category)!.push(f);
  }

  const categoryHashes: Record<string, string> = {};
  for (const [category, filesInCategory] of categoryBuckets.entries()) {
    categoryHashes[category] = categoryRoot(filesInCategory);
  }

  const rootHash = packetRoot(categoryHashes);

  // Files array: sort by path for manifest stability.
  const sortedFiles = input.files
    .slice()
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

  const manifest: PacketManifest = {
    packetVersion: '1.0.0',
    packetUuid: input.packetUuid,
    entity: {
      legalName: 'FarmCeutica Wellness LLC',
      platform: 'ViaConnect',
      systemBoundary: input.systemBoundary,
    },
    period: input.period,
    tscInScope: input.tscInScope.slice(),
    generatedAt: input.generatedAt,
    generatedBy: input.generatedBy,
    ruleRegistryVersion: input.ruleRegistryVersion,
    files: sortedFiles,
    categoryHashes,
    rootHash,
  };

  return manifest;
}

/**
 * Stable JSON.stringify: sorts object keys recursively, preserves array order.
 * Uses LF line endings (JSON standard) and no indentation (compact).
 */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortValueKeys(value));
}

function sortValueKeys(v: unknown): unknown {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(sortValueKeys);
  const sorted: Record<string, unknown> = {};
  for (const k of Object.keys(v as Record<string, unknown>).sort()) {
    sorted[k] = sortValueKeys((v as Record<string, unknown>)[k]);
  }
  return sorted;
}

/**
 * Serialize a manifest to the canonical signing payload (bytes). Signature
 * field is stripped before signing; otherwise the signature would need to
 * include itself.
 */
export function manifestSigningBytes(manifest: PacketManifest): Buffer {
  const withoutSignature: Omit<PacketManifest, 'signature'> & { signature?: undefined } = {
    ...manifest,
    signature: undefined,
  };
  return Buffer.from(stableStringify(withoutSignature), 'utf8');
}

/**
 * Final manifest serialization (after signing) with the signature embedded.
 */
export function serializeSignedManifest(manifest: PacketManifest): Buffer {
  return Buffer.from(stableStringify(manifest), 'utf8');
}

/**
 * Helper: compute sha256 of a file buffer and its relative path.
 */
export function manifestFileFromBytes(
  path: string,
  contentType: string,
  bytes: Uint8Array,
  controls: readonly string[],
  collector?: string,
  deterministicQueryHash?: string,
): PacketManifestFile {
  return {
    path,
    sha256: sha256(bytes),
    sizeBytes: bytes.byteLength,
    collector,
    deterministicQueryHash,
    controls: controls.slice(),
  };
}

/**
 * Validate that every category in tscInScope has at least one file.
 */
export function validateManifestCoverage(manifest: PacketManifest): string[] {
  const missing: string[] = [];
  for (const tsc of manifest.tscInScope) {
    const expectedDir = SOC2_CATEGORY_DIRS[tsc];
    const has = manifest.files.some((f) => f.path.startsWith(expectedDir + '/'));
    if (!has) missing.push(tsc);
  }
  return missing;
}
