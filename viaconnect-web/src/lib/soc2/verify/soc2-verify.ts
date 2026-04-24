// Prompt #122 P2: soc2-verify — standalone packet verifier.
//
// Given a packet ZIP and a JWKS, verify end-to-end:
//   1. Every file inside the ZIP hashes to what manifest.json claims.
//   2. Per-category Merkle root matches the claimed categoryHashes.
//   3. Packet root Merkle root matches rootHash.
//   4. manifest.signature.jwt is a valid ES256 signature over the
//      canonical manifest payload (signature field stripped).
//
// Any failure returns a precise `failedFile` / `failedCategory` so an
// auditor can pinpoint exactly what was tampered with.
//
// Runs in Node (no browser APIs). Usable from tests, from the admin
// /admin/soc2/packets/[id]/verify page, and as a standalone CLI bundled
// inside each packet as raw-proofs/soc2-verify.js.

import { unzipPacket } from '../assemble/zipper';
import { categoryRoot, packetRoot, sha256 } from '../assemble/merkle';
import { stableStringify } from '../assemble/manifest';
import { verifyJwtCompact } from '../assemble/sign';
import { jwksToKidPemMap, type Jwks } from '../assemble/jwks';
import type { PacketManifest } from '../types';

export interface VerificationOutcome {
  ok: boolean;
  signatureValid: boolean;
  rootHashValid: boolean;
  categoryHashesValid: boolean;
  allFileHashesValid: boolean;
  failedFile?: string;
  failedCategory?: string;
  manifest?: PacketManifest;
  error?: string;
}

/**
 * Verify an entire packet ZIP against a JWKS.
 */
export async function verifyPacket(
  zipBytes: Uint8Array,
  jwks: Jwks,
): Promise<VerificationOutcome> {
  try {
    const files = unzipPacket(zipBytes);

    // Locate and parse manifest.json.
    const manifestBytes = files['manifest.json'];
    if (!manifestBytes) {
      return failOutcome('manifest.json missing from packet');
    }
    let manifest: PacketManifest;
    try {
      manifest = JSON.parse(Buffer.from(manifestBytes).toString('utf8')) as PacketManifest;
    } catch (e) {
      return failOutcome(`manifest.json not parseable: ${(e as Error).message}`);
    }

    // 1. Verify each file hash in the manifest matches the bytes in the ZIP.
    const fileHashesValid = { ok: true as boolean, failed: undefined as string | undefined };
    for (const f of manifest.files) {
      const contents = files[f.path];
      if (!contents) {
        fileHashesValid.ok = false;
        fileHashesValid.failed = f.path;
        break;
      }
      const actualHash = sha256(contents);
      if (actualHash !== f.sha256) {
        fileHashesValid.ok = false;
        fileHashesValid.failed = f.path;
        break;
      }
    }

    // 2. Verify per-category Merkle hashes.
    const categoryHashesValid = { ok: true as boolean, failed: undefined as string | undefined };
    if (fileHashesValid.ok) {
      const categoryBuckets = new Map<string, { path: string; sha256: string }[]>();
      for (const f of manifest.files) {
        const category = f.path.split('/')[0] ?? '';
        if (!categoryBuckets.has(category)) categoryBuckets.set(category, []);
        categoryBuckets.get(category)!.push({ path: f.path, sha256: f.sha256 });
      }
      for (const [category, claimed] of Object.entries(manifest.categoryHashes)) {
        const filesInCategory = categoryBuckets.get(category) ?? [];
        const recomputed = categoryRoot(filesInCategory);
        if (recomputed !== claimed) {
          categoryHashesValid.ok = false;
          categoryHashesValid.failed = category;
          break;
        }
      }
    }

    // 3. Verify root hash.
    const recomputedRoot = packetRoot(manifest.categoryHashes);
    const rootHashValid = recomputedRoot === manifest.rootHash;

    // 4. Verify signature.
    let signatureValid = false;
    if (manifest.signature && manifest.signature.jwt) {
      const kidPemMap = jwksToKidPemMap(jwks);
      const canonicalPayload = Buffer.from(
        stableStringify({ ...manifest, signature: undefined }),
        'utf8',
      );
      const result = verifyJwtCompact(manifest.signature.jwt, canonicalPayload, kidPemMap);
      signatureValid = result.ok;
    }

    const ok =
      fileHashesValid.ok && categoryHashesValid.ok && rootHashValid && signatureValid;

    return {
      ok,
      signatureValid,
      rootHashValid,
      categoryHashesValid: categoryHashesValid.ok,
      allFileHashesValid: fileHashesValid.ok,
      failedFile: fileHashesValid.failed,
      failedCategory: categoryHashesValid.failed,
      manifest,
    };
  } catch (e) {
    return failOutcome((e as Error).message);
  }
}

function failOutcome(message: string): VerificationOutcome {
  return {
    ok: false,
    signatureValid: false,
    rootHashValid: false,
    categoryHashesValid: false,
    allFileHashesValid: false,
    error: message,
  };
}
