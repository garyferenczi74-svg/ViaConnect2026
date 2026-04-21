// Prompt #104 Phase 1: Evidence chain-of-custody hash tests.
// Critical hard-stop: hash mismatch must surface as a flag, not be
// silently ignored.

import { describe, it, expect } from 'vitest';
import { sha256Hex, verifyEvidenceHash } from '@/lib/legal/evidence/hashing';

const enc = new TextEncoder();

describe('sha256Hex', () => {
  it('produces a stable 64-char hex digest for known input', async () => {
    const h = await sha256Hex(enc.encode('viacura'));
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic across calls', async () => {
    const a = await sha256Hex(enc.encode('packaging-proof-001.png'));
    const b = await sha256Hex(enc.encode('packaging-proof-001.png'));
    expect(a).toBe(b);
  });

  it('differs for different inputs', async () => {
    const a = await sha256Hex(enc.encode('a'));
    const b = await sha256Hex(enc.encode('b'));
    expect(a).not.toBe(b);
  });
});

describe('verifyEvidenceHash', () => {
  it('returns ok when bytes match expected hash', async () => {
    const bytes = enc.encode('immutable evidence content');
    const expected = await sha256Hex(bytes);
    const r = await verifyEvidenceHash({ bytes, expected_sha256: expected });
    expect(r.ok).toBe(true);
    expect(r.mismatch).toBe(false);
    expect(r.actual).toBe(expected);
  });

  it('flags mismatch when bytes have been tampered (HARD STOP)', async () => {
    const original = enc.encode('immutable evidence content');
    const tampered = enc.encode('tampered evidence content');
    const expected = await sha256Hex(original);
    const r = await verifyEvidenceHash({ bytes: tampered, expected_sha256: expected });
    expect(r.ok).toBe(false);
    expect(r.mismatch).toBe(true);
    expect(r.actual).not.toBe(expected);
  });

  it('case-insensitively compares hex strings', async () => {
    const bytes = enc.encode('case-test');
    const expected = (await sha256Hex(bytes)).toUpperCase();
    const r = await verifyEvidenceHash({ bytes, expected_sha256: expected });
    expect(r.ok).toBe(true);
  });
});
