// Prompt #101 Workstream C — sensitive note helper tests.

import { describe, it, expect } from 'vitest';
import {
  hashSensitiveContent,
  isSensitiveNotePlausible,
  redactedNotePreview,
} from '@/lib/map/vip/encryption';

describe('hashSensitiveContent', () => {
  it('returns 64-char hex SHA-256', () => {
    const h = hashSensitiveContent('some sensitive note');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });
  it('same input → same hash', () => {
    const a = hashSensitiveContent('same');
    const b = hashSensitiveContent('same');
    expect(a).toBe(b);
  });
  it('different input → different hash', () => {
    expect(hashSensitiveContent('a')).not.toBe(hashSensitiveContent('b'));
  });
});

describe('isSensitiveNotePlausible', () => {
  it('rejects too short (< 20 chars)', () => {
    expect(isSensitiveNotePlausible('short')).toBe(false);
  });
  it('accepts minimum length', () => {
    expect(isSensitiveNotePlausible('a'.repeat(20))).toBe(true);
  });
  it('rejects too long (> 4000 chars)', () => {
    expect(isSensitiveNotePlausible('a'.repeat(4001))).toBe(false);
  });
  it('trims whitespace before checking length', () => {
    expect(isSensitiveNotePlausible('   ' + 'a'.repeat(19) + '   ')).toBe(false);
  });
});

describe('redactedNotePreview', () => {
  it('shows length + 8-char hash prefix, no plaintext', () => {
    const hash = 'abcdef0123456789'.repeat(4);
    const preview = redactedNotePreview(hash, 150);
    expect(preview).toContain('150 chars');
    expect(preview).toContain('abcdef01');
    expect(preview).not.toContain('0123456789a'); // no tail beyond prefix
  });
});
