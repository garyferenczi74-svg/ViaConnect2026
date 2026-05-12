// Tests for src/lib/scoring/sanitize-error.ts.
//
// The sanitizer is run before any insert into bos_write_telemetry so that
// persisted error_message values are free of UUIDs and bounded in length.
// A parallel SQL function bos_sanitize_error_message lives in the
// migration paired with #161b for future trigger writes; both
// implementations apply the same rule sequence.

import { describe, it, expect } from 'vitest';
import { sanitizeErrorMessage } from '../sanitize-error';

describe('sanitizeErrorMessage null and non string input', () => {
  it('returns null when input is null', () => {
    expect(sanitizeErrorMessage(null)).toBeNull();
  });

  it('returns null when input is undefined', () => {
    expect(sanitizeErrorMessage(undefined)).toBeNull();
  });

  it('returns null when input is a non string value', () => {
    expect(sanitizeErrorMessage(42 as unknown as string)).toBeNull();
    expect(sanitizeErrorMessage({} as unknown as string)).toBeNull();
    expect(sanitizeErrorMessage([] as unknown as string)).toBeNull();
    expect(sanitizeErrorMessage(true as unknown as string)).toBeNull();
  });
});

describe('sanitizeErrorMessage empty string', () => {
  it('returns empty string when input is empty', () => {
    expect(sanitizeErrorMessage('')).toBe('');
  });
});

describe('sanitizeErrorMessage UUID redaction', () => {
  it('redacts a lowercase UUID', () => {
    expect(sanitizeErrorMessage('failed for 550e8400-e29b-41d4-a716-446655440000')).toBe(
      'failed for <uuid>',
    );
  });

  it('redacts an uppercase UUID', () => {
    expect(sanitizeErrorMessage('failed for 550E8400-E29B-41D4-A716-446655440000')).toBe(
      'failed for <uuid>',
    );
  });

  it('redacts a mixed case UUID', () => {
    expect(sanitizeErrorMessage('failed for 550e8400-E29B-41d4-A716-446655440000')).toBe(
      'failed for <uuid>',
    );
  });

  it('redacts multiple UUIDs in a single message', () => {
    const input =
      'compare 550e8400-e29b-41d4-a716-446655440000 and 6ba7b810-9dad-11d1-80b4-00c04fd430c8';
    expect(sanitizeErrorMessage(input)).toBe('compare <uuid> and <uuid>');
  });

  it('redacts a UUID at the start of the message', () => {
    expect(sanitizeErrorMessage('550e8400-e29b-41d4-a716-446655440000 not found')).toBe(
      '<uuid> not found',
    );
  });

  it('does not match almost UUID patterns (wrong segment length)', () => {
    // Last segment is 11 chars instead of 12; this must NOT match.
    const almost = 'almost 550e8400-e29b-41d4-a716-44665544000';
    expect(sanitizeErrorMessage(almost)).toBe(almost);
  });
});

describe('sanitizeErrorMessage truncation', () => {
  it('passes a 499 char message through unchanged', () => {
    const msg = 'a'.repeat(499);
    const out = sanitizeErrorMessage(msg);
    expect(out).toBe(msg);
    expect(out?.length).toBe(499);
  });

  it('passes a 500 char message through unchanged', () => {
    const msg = 'a'.repeat(500);
    const out = sanitizeErrorMessage(msg);
    expect(out).toBe(msg);
    expect(out?.length).toBe(500);
  });

  it('truncates a 501 char message to 500 chars with " ..." suffix', () => {
    const msg = 'a'.repeat(501);
    const out = sanitizeErrorMessage(msg);
    expect(out?.length).toBe(500);
    expect(out?.endsWith(' ...')).toBe(true);
    expect(out?.startsWith('a'.repeat(496))).toBe(true);
  });

  it('truncates a 5000 char message to exactly 500 chars', () => {
    const msg = 'a'.repeat(5000);
    const out = sanitizeErrorMessage(msg);
    expect(out?.length).toBe(500);
    expect(out?.endsWith(' ...')).toBe(true);
  });
});

describe('sanitizeErrorMessage combined UUID redaction + truncation', () => {
  it('redacts UUID at position 100 then truncates to 500 chars', () => {
    const prefix = 'x'.repeat(100);
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    const suffix = 'y'.repeat(600);
    const input = prefix + uuid + suffix;
    const out = sanitizeErrorMessage(input);
    expect(out?.length).toBe(500);
    expect(out).toContain('<uuid>');
    expect(out?.endsWith(' ...')).toBe(true);
    expect(out?.startsWith(prefix + '<uuid>')).toBe(true);
  });

  it('truncates before UUID position; no redaction needed', () => {
    // UUID starts at position 550, so the 500 char truncated output
    // ends before the UUID begins. Output is just the leading 496 x
    // characters + ' ...' suffix; no '<uuid>' token in output.
    const prefix = 'x'.repeat(550);
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    const input = prefix + uuid + 'tail';
    const out = sanitizeErrorMessage(input);
    expect(out?.length).toBe(500);
    expect(out).not.toContain('<uuid>');
    expect(out?.startsWith('x'.repeat(496))).toBe(true);
    expect(out?.endsWith(' ...')).toBe(true);
  });
});

describe('sanitizeErrorMessage truncation length invariant', () => {
  it('every truncated output is exactly 500 chars long', () => {
    for (const n of [501, 600, 1000, 4096, 10000]) {
      const out = sanitizeErrorMessage('a'.repeat(n));
      expect(out?.length).toBe(500);
    }
  });
});
