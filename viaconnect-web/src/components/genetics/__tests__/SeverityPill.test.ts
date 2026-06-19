// Prompt 204g (2026-06-19): contract tests for the shared SeverityPill.
//
// Source-as-text assertions per the repo convention. They lock that the pill
// reads color only through severityToken(), always renders a text label (so
// severity is never color alone), and shows a neutral Unscored chip when the
// variant has no validated tier yet.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const COMPONENT = path.resolve(__dirname, '..', 'SeverityPill.tsx');

describe('SeverityPill source', () => {
  const source = readFileSync(COMPONENT, 'utf-8');

  it('reads color only through severityToken (no inline severity hex)', () => {
    expect(source).toContain("import { severityToken, severityLabel } from '@/lib/genetics/severity'");
    expect(source).toContain('severityToken(tier).badge');
    expect(source).not.toContain('#F87171');
    expect(source).not.toContain('#FBBF24');
    expect(source).not.toContain('#4ADE80');
  });

  it('always renders an uppercase text label, including the unscored fallback', () => {
    expect(source).toContain('severityLabel(tier)');
    expect(source).toContain("'UNSCORED'");
  });

  it('uses a neutral, non-alarm tone for the unscored chip', () => {
    expect(source).toContain('text-white/55');
    // The unscored chip must not borrow a severity or brand color.
    expect(source).not.toContain('#2DA5A0');
    expect(source).not.toContain('#B75E18');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
