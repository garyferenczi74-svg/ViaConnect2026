import { describe, it, expect } from 'vitest';
import { redactForTest } from '@/lib/marshall/scheduler/logging';

describe('schedulerLogger redaction', () => {
  it('redacts JWT-shaped values', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghij1234567890';
    const { value, stats } = redactForTest({ token: jwt });
    expect((value as { token: string }).token).toBe('[REDACTED:oauth_token]');
    expect(stats.redacted).toBe(1);
  });

  it('redacts bearer-style tokens mentioned in values', () => {
    const { value } = redactForTest({
      authorization: 'Bearer: abc123def456ghi789jkl012mno345pqr678',
    });
    expect((value as { authorization: string }).authorization).toBe('[REDACTED:oauth_token]');
  });

  it('redacts email addresses within free-form text', () => {
    const { value } = redactForTest({
      note: 'Practitioner jane.doe@example.com requested a re-scan.',
    });
    expect((value as { note: string }).note).toContain('[REDACTED:email]');
    expect((value as { note: string }).note).not.toContain('jane.doe');
  });

  it('truncates caption text over 200 characters', () => {
    const long = 'x'.repeat(500);
    const { value, stats } = redactForTest({ captionText: long });
    const captured = (value as { captionText: string }).captionText;
    expect(captured.length).toBeLessThan(long.length);
    expect(captured).toContain('[TRUNCATED 400 chars]');
    expect(stats.truncated).toBe(1);
  });

  it('does not truncate short caption text', () => {
    const { value, stats } = redactForTest({ captionText: 'Short caption.' });
    expect((value as { captionText: string }).captionText).toBe('Short caption.');
    expect(stats.truncated).toBe(0);
  });

  it('walks into nested arrays and objects', () => {
    const input = {
      events: [
        { token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.signaturepartpartpart', level: 'info' },
        { captionText: 'y'.repeat(300) },
      ],
      user: { email: 'admin@example.com' },
    };
    const { value, stats } = redactForTest(input);
    expect(stats.redacted).toBeGreaterThanOrEqual(2);
    expect(stats.truncated).toBe(1);
    expect(JSON.stringify(value)).not.toContain('admin@example.com');
    expect(JSON.stringify(value)).not.toContain('eyJhbGci');
  });

  it('passes through primitives, null, and undefined', () => {
    expect(redactForTest(null).value).toBeNull();
    expect(redactForTest(undefined).value).toBeUndefined();
    expect(redactForTest(42).value).toBe(42);
    expect(redactForTest(true).value).toBe(true);
    expect(redactForTest('plain string').value).toBe('plain string');
  });
});
