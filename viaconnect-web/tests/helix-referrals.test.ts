// Prompt #92 Phase 4: pure-logic tests for the referral engine.
// DB integration paths are exercised by the integration suite when
// SUPABASE_SERVICE_ROLE_KEY is set.

import { describe, it, expect } from 'vitest';
import { generateCodeString, normalizeCode } from '@/lib/helix/referrals';

describe('generateCodeString', () => {
  it('is 6 characters long', () => {
    const code = generateCodeString();
    expect(code).toHaveLength(6);
  });

  it('only uses legible A-Z 2-9 characters (no 0/O/1/I)', () => {
    for (let i = 0; i < 500; i++) {
      const code = generateCodeString();
      expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    }
  });

  it('produces deterministic output when given a deterministic RNG', () => {
    // Byte stream yielding 0,1,2,3,4,5 maps to first six chars of CODE_CHARS
    let i = 0;
    const code = generateCodeString(() => i++);
    expect(code).toBe('ABCDEF');
  });

  it('distribution is not badly skewed across 10k samples', () => {
    const counts: Record<string, number> = {};
    for (let i = 0; i < 10_000; i++) {
      const c = generateCodeString();
      counts[c] = (counts[c] ?? 0) + 1;
    }
    // 10k samples from 32^6 = ~10^9 space; expect near-zero collisions
    const collisions = Object.values(counts).filter((n) => n > 1).length;
    expect(collisions).toBeLessThan(3);
  });
});

describe('normalizeCode', () => {
  it('uppercases and strips non-alphanumeric', () => {
    expect(normalizeCode('abc-123')).toBe('ABC123');
    expect(normalizeCode(' aBc 12 ')).toBe('ABC12');
    expect(normalizeCode('xyz!@#')).toBe('XYZ');
  });
  it('truncates to 6 characters', () => {
    expect(normalizeCode('ABCDEFGHIJ')).toBe('ABCDEF');
  });
  it('returns empty string for null/undefined/empty', () => {
    expect(normalizeCode(null)).toBe('');
    expect(normalizeCode(undefined)).toBe('');
    expect(normalizeCode('')).toBe('');
    expect(normalizeCode('   ')).toBe('');
  });
  it('strips non-alphanumeric but keeps what fits', () => {
    expect(normalizeCode('a-b-c-d-e-f-g')).toBe('ABCDEF');
  });
});
