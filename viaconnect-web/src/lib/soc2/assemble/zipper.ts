// Prompt #122 P2: Deterministic ZIP assembly via fflate.
//
// Requirements (spec §4 + §18 determinism test):
//   1. Files MUST be written in alphabetical order by path.
//   2. Modification time MUST be a fixed epoch-zero date, not Date.now().
//   3. OS field MUST be fixed (we use 0 = MS-DOS / FAT) across platforms.
//   4. Compression level MUST be 0 (STORE). Any DEFLATE level introduces
//      non-determinism from the zlib library version shipped with Node,
//      which is unacceptable for auditor reproducibility.
//
// With these constraints, zipSync of the same input produces byte-identical
// output across any Node runtime running the same fflate version.

import { zipSync, unzipSync, type ZipAttributes } from 'fflate';

// Fixed epoch: 2020-01-01T00:00:00Z. Arbitrary but stable. Never uses Date.now().
const FIXED_MTIME = new Date(Date.UTC(2020, 0, 1, 0, 0, 0));

export interface PacketFileInput {
  relativePath: string;
  bytes: Uint8Array;
}

/**
 * Build a deterministic ZIP archive from a list of files.
 * Input order is irrelevant; the output byte order depends only on the
 * set of (relativePath, bytes) tuples.
 */
export function assembleDeterministicZip(files: readonly PacketFileInput[]): Uint8Array {
  // Dedup by path (last wins) + sort alphabetically.
  const byPath = new Map<string, Uint8Array>();
  for (const f of files) {
    byPath.set(f.relativePath, f.bytes);
  }
  const sortedPaths = Array.from(byPath.keys()).sort();

  // Build the entries object with deterministic per-file ZipAttributes.
  // Per-file attrs carry mtime + os; compression level is set at the
  // archive level (fflate types confine `level` to the top-level options).
  const entries: Record<string, [Uint8Array, ZipAttributes]> = {};
  for (const path of sortedPaths) {
    const bytes = byPath.get(path)!;
    entries[path] = [
      bytes,
      {
        mtime: FIXED_MTIME,
        os: 0, // MS-DOS / FAT — stable across host OSes
      },
    ];
  }

  return zipSync(entries, {
    level: 0,           // STORE (no compression) — deterministic
    mtime: FIXED_MTIME,
    os: 0,
  });
}

/**
 * Unzip a packet ZIP back into an in-memory file map. Used by soc2-verify.
 */
export function unzipPacket(zipBytes: Uint8Array): Record<string, Uint8Array> {
  return unzipSync(zipBytes);
}
