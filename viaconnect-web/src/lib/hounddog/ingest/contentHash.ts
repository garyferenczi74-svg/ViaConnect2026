/**
 * Prompt 214b: content hash for idempotent staging.
 */

import { createHash } from 'node:crypto';

export function contentHash(parts: string[]): string {
  const h = createHash('sha256');
  for (const p of parts) {
    h.update(p ?? '');
    h.update('\n');
  }
  return h.digest('hex');
}
