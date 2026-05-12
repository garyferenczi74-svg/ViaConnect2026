// Tests for src/lib/scoring/sanitize-explanation.ts.
//
// The sanitizer is a defense in depth XSS strip applied at the
// /api/bos/current API boundary. It removes script + style blocks,
// strips remaining HTML tags, decodes a small set of named entities,
// strips ASCII control characters, and collapses runs of spaces.
//
// The persisted breakdown.hannah_output.explanation column is left
// raw; sanitization happens only on the read path.

import { describe, it, expect } from 'vitest';
import { sanitizeExplanation } from '../sanitize-explanation';

describe('sanitizeExplanation null and non string input', () => {
  it('returns empty string when input is null', () => {
    expect(sanitizeExplanation(null)).toBe('');
  });

  it('returns empty string when input is undefined', () => {
    expect(sanitizeExplanation(undefined)).toBe('');
  });

  it('returns empty string when input is the empty string', () => {
    expect(sanitizeExplanation('')).toBe('');
  });

  it('returns empty string when input is a non string value', () => {
    expect(sanitizeExplanation(42 as unknown as string)).toBe('');
    expect(sanitizeExplanation({} as unknown as string)).toBe('');
    expect(sanitizeExplanation([] as unknown as string)).toBe('');
    expect(sanitizeExplanation(true as unknown as string)).toBe('');
  });
});

describe('sanitizeExplanation clean input passthrough', () => {
  it('passes a single line clean explanation through unchanged', () => {
    const clean = 'Your Nutrition lever climbed because you logged 4 meals this week.';
    expect(sanitizeExplanation(clean)).toBe(clean);
  });

  it('passes a multi line clean explanation through unchanged', () => {
    const clean = 'Your score went up.\nKeep logging meals.';
    expect(sanitizeExplanation(clean)).toBe(clean);
  });

  it('passes a Hannah exemplar through unchanged', () => {
    const exemplar =
      'Your Bio Optimization Score moved up because Nutrition and Body Tracker stayed steady. Keep logging meals to grow the score further.';
    expect(sanitizeExplanation(exemplar)).toBe(exemplar);
  });
});

describe('sanitizeExplanation script block strip', () => {
  it('strips a basic script block', () => {
    expect(sanitizeExplanation('Hi<script>alert(1)</script>there')).toBe('Hithere');
  });

  it('strips a script block with content + spaces', () => {
    expect(sanitizeExplanation('a <script>var x = 1; alert(x);</script> b')).toBe('a b');
  });

  it('strips an uppercase SCRIPT block', () => {
    expect(sanitizeExplanation('Hi<SCRIPT>alert(1)</SCRIPT>there')).toBe('Hithere');
  });

  it('strips a script block with a src attribute', () => {
    expect(sanitizeExplanation('go <script src="//evil.com/x.js"></script> on')).toBe('go on');
  });

  it('strips an unterminated script block', () => {
    expect(sanitizeExplanation('Hi <script>alert(1)')).toBe('Hi');
  });
});

describe('sanitizeExplanation style block strip', () => {
  it('strips a basic style block', () => {
    expect(sanitizeExplanation('a<style>body{display:none}</style>b')).toBe('ab');
  });

  it('strips a style block with content', () => {
    expect(sanitizeExplanation('begin <style> .x { color: red } </style> end')).toBe(
      'begin end',
    );
  });
});

describe('sanitizeExplanation generic tag strip', () => {
  it('strips bold tags', () => {
    expect(sanitizeExplanation('Hello <b>world</b>')).toBe('Hello world');
  });

  it('strips paragraph tags', () => {
    expect(sanitizeExplanation('<p>one</p><p>two</p>')).toBe('onetwo');
  });

  it('strips self closing img tags', () => {
    expect(sanitizeExplanation('a <img src="x" /> b')).toBe('a b');
  });

  it('strips anchor tags', () => {
    expect(sanitizeExplanation('Click <a href="//e.com">here</a> now')).toBe(
      'Click here now',
    );
  });
});

describe('sanitizeExplanation nested tag evasion', () => {
  it('does not leave a script substring after iterative stripping', () => {
    const evasion = '<scr<script>ipt>alert(1)</script>';
    const out = sanitizeExplanation(evasion);
    expect(out.toLowerCase()).not.toContain('<script');
    expect(out.toLowerCase()).not.toContain('</script>');
  });
});

describe('sanitizeExplanation entity decode', () => {
  it('decodes &amp; to &', () => {
    expect(sanitizeExplanation('a &amp; b')).toBe('a & b');
  });

  it('decodes &lt; to <', () => {
    expect(sanitizeExplanation('1 &lt; 2')).toBe('1 < 2');
  });

  it('decodes &gt; to >', () => {
    expect(sanitizeExplanation('3 &gt; 2')).toBe('3 > 2');
  });

  it('decodes &quot; to a double quote', () => {
    expect(sanitizeExplanation('she said &quot;hi&quot;')).toBe('she said "hi"');
  });

  it('decodes &#39; to an apostrophe', () => {
    expect(sanitizeExplanation("it&#39;s ok")).toBe("it's ok");
  });

  it('decodes &apos; to an apostrophe', () => {
    expect(sanitizeExplanation("it&apos;s ok")).toBe("it's ok");
  });
});

describe('sanitizeExplanation control character strip', () => {
  it('strips a null byte', () => {
    expect(sanitizeExplanation('hi\x00there')).toBe('hithere');
  });

  it('preserves a tab character as whitespace', () => {
    // Tab is preserved by the control char strip but the whitespace
    // collapse turns tabs + spaces into a single space.
    expect(sanitizeExplanation('a\tb')).toBe('a b');
  });

  it('preserves a newline character', () => {
    expect(sanitizeExplanation('a\nb')).toBe('a\nb');
  });
});

describe('sanitizeExplanation whitespace collapse', () => {
  it('collapses runs of spaces to a single space', () => {
    expect(sanitizeExplanation('a     b')).toBe('a b');
  });

  it('trims leading and trailing whitespace', () => {
    expect(sanitizeExplanation('   hi   ')).toBe('hi');
  });

  it('preserves multiple newlines as line breaks', () => {
    // Each line is trimmed but the newlines are preserved.
    expect(sanitizeExplanation('line one\n\nline two')).toBe('line one\n\nline two');
  });
});

describe('sanitizeExplanation OWASP style payloads', () => {
  it('strips img onerror payloads', () => {
    expect(sanitizeExplanation('<img src=x onerror=alert(1)>')).toBe('');
  });

  it('strips svg onload payloads', () => {
    expect(sanitizeExplanation('<svg/onload=alert(1)>')).toBe('');
  });

  it('strips iframe payloads', () => {
    expect(sanitizeExplanation('<iframe src=//evil.com></iframe>')).toBe('');
  });

  it('leaves literal javascript URL text in place (markup strip only)', () => {
    // We strip markup, not URL schemes. Downstream callers are
    // responsible for URL scheme validation. The sanitizer's job is to
    // make sure no executable tag remains.
    expect(sanitizeExplanation('javascript:alert(1)')).toBe('javascript:alert(1)');
  });
});

describe('sanitizeExplanation DoS guard', () => {
  it('completes a 10000 nested tag input under 100ms', () => {
    const payload = '<a>'.repeat(10_000) + 'hi' + '</a>'.repeat(10_000);
    const start = performance.now();
    const out = sanitizeExplanation(payload);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100);
    expect(out).toBe('hi');
  });
});
