import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  formatPersonalGreeting,
  resolveDisplayName,
} from '../get-display-name';

describe('resolveDisplayName name fallback', () => {
  it('uses the first token of full name', () => {
    expect(resolveDisplayName({ fullName: 'Gary Ferenczi' })).toBe('Gary');
  });

  it('uses metadata name when full name is missing', () => {
    expect(resolveDisplayName({ metadataName: 'Alex Rivera' })).toBe('Alex');
  });

  it('uses the email local-part when no name is on file', () => {
    expect(resolveDisplayName({ email: 'gary@farmceutica.com' })).toBe('gary');
  });

  it('returns an empty string, never "there", when nothing is available', () => {
    expect(resolveDisplayName({})).toBe('');
    expect(resolveDisplayName({ fullName: null, metadataName: null, email: null })).toBe('');
    expect(resolveDisplayName({ fullName: 'there' })).toBe('');
    expect(resolveDisplayName({ metadataName: 'There' })).toBe('');
    expect(resolveDisplayName({ email: 'there@example.com' })).toBe('');
  });

  it('prefers full name over email', () => {
    expect(
      resolveDisplayName({
        fullName: 'Sam Lee',
        email: 'other@example.com',
      }),
    ).toBe('Sam');
  });
});

describe('formatPersonalGreeting', () => {
  it('includes the name when present', () => {
    expect(formatPersonalGreeting('Good morning', 'Gary')).toBe('Good morning, Gary');
  });

  it('omits the comma-name when the fallback is empty', () => {
    expect(formatPersonalGreeting('Good morning', '')).toBe('Good morning');
    expect(formatPersonalGreeting('Good evening', '   ')).toBe('Good evening');
  });
});

describe('getDisplayName source contract', () => {
  it('never returns the literal "there"', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/lib/user/get-display-name.ts'),
      'utf8',
    );
    expect(src).not.toMatch(/return ["']there["']/);
  });
});
