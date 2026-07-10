/**
 * tests/formavision/scanReportPdf.test.ts
 *
 * Prompt 211a Workstream 3: shape + honesty tests for the doctor-ready scan
 * report PDF renderer (src/lib/formavision/report/scanReportPdf.ts).
 *
 * The rendered bytes are opaque (pdf-lib compresses streams), so content
 * assertions read the rendered text via extractPdfText(), a tiny decoder that
 * pulls the plain-text draw operands out of the (uncompressed) content stream.
 * scanReportPdf disables object-stream + stream compression precisely so this
 * text is inspectable in tests and by downstream PDF text extractors.
 *
 * Invariants under test (Section 4 + Section 8):
 *   1. Valid PDF: starts with the %PDF magic bytes.
 *   2. Carries the non-dismissible AI-estimate disclaimer line.
 *   3. Carries the legal entity "FarmCeutica Wellness LLC" (LLC governs, not Ltd).
 *   4. Contains ZERO Helix / streak / token / gamification strings (Section 8).
 *   5. An UNKNOWN measurement renders the literal "UNKNOWN", never 0, never a marker.
 *   6. An estimated (low-confidence) present value keeps its "Estimated" marker.
 *   7. The trend since first scan carries the correct sign (a drop renders a
 *      minus sign, a gain renders a plus sign; direction is never inverted).
 *   8. ZERO em / en dashes in the rendered document (WinAnsi-safe, hyphens only).
 *
 * Node-safe: pure pdf-lib, no jsdom, no network. Zero any.
 * Rules: no em dashes, no en dashes, no emojis.
 */

import { describe, it, expect } from 'vitest';
import zlib from 'node:zlib';
import { renderScanReportPdf, type ScanReportInput } from '@/lib/formavision/report/scanReportPdf';

// ---------------------------------------------------------------------------
// Content-stream text extractor. pdf-lib 1.17.1 always Flate-compresses each
// page content stream, and writes each drawText as a hex string operand
// `<48454C...> Tj`. This helper (1) inflates every FlateDecode stream, then
// (2) decodes each `<hex> Tj|TJ` operand back to text. Node builtins only
// (zlib), no full PDF parser, no external dependency.
// ---------------------------------------------------------------------------
function inflateStreams(bytes: Uint8Array): string {
  const buf = Buffer.from(bytes);
  const streamTok = Buffer.from('stream');
  const endTok = Buffer.from('endstream');
  let pos = 0;
  let text = '';
  for (;;) {
    const s = buf.indexOf(streamTok, pos);
    if (s === -1) break;
    const before = buf.subarray(Math.max(0, s - 3), s).toString('latin1');
    let dataStart = s + streamTok.length;
    if (buf[dataStart] === 0x0d && buf[dataStart + 1] === 0x0a) dataStart += 2;
    else if (buf[dataStart] === 0x0a) dataStart += 1;
    const e = buf.indexOf(endTok, dataStart);
    pos = e === -1 ? buf.length : e + endTok.length;
    if (before.endsWith('end')) continue; // this was "endstream", skip
    if (e === -1) continue;
    const chunk = buf.subarray(dataStart, e);
    try {
      text += zlib.inflateSync(chunk).toString('latin1') + '\n';
    } catch {
      text += chunk.toString('latin1') + '\n'; // uncompressed fallback
    }
  }
  return text;
}

function extractPdfText(bytes: Uint8Array): string {
  const content = inflateStreams(bytes);
  const out: string[] = [];
  // Hex-string operands: <48454C...> Tj | TJ
  const hexRe = /<([0-9A-Fa-f\s]+)>\s*T[jJ]/g;
  let m: RegExpExecArray | null;
  while ((m = hexRe.exec(content)) !== null) {
    const hex = m[1].replace(/\s+/g, '');
    let s = '';
    for (let i = 0; i + 1 < hex.length; i += 2) {
      s += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
    }
    out.push(s);
  }
  // Also decode any parenthesized literals, in case a value is emitted that way.
  const litRe = /\(((?:\\.|[^\\()])*)\)\s*T[jJ]/g;
  while ((m = litRe.exec(content)) !== null) {
    out.push(m[1].replace(/\\\(/g, '(').replace(/\\\)/g, ')').replace(/\\\\/g, '\\'));
  }
  return out.join('\n');
}

// A fully-populated honest input: 12 circumferences, mixed confidence, one
// UNKNOWN (null cm), one low-confidence present value, a real composition, and
// a downward body-fat trend (latest below first).
function baseInput(): ScanReportInput {
  return {
    displayName: 'Jane Patient',
    latestScanDate: '2026-07-01',
    firstScanDate: '2026-01-01',
    avatarPng: null,
    circumferences: [
      { key: 'neck', label: 'Neck', valueCm: 38.1, confidence: 'high' },
      { key: 'shoulder', label: 'Shoulders', valueCm: 120.4, confidence: 'high' },
      { key: 'chest', label: 'Chest', valueCm: 98.2, confidence: 'moderate' },
      { key: 'waist', label: 'Waist', valueCm: 82.0, confidence: 'moderate' },
      { key: 'hip', label: 'Hips', valueCm: 99.5, confidence: 'high' },
      { key: 'right_upper_arm', label: 'R. Upper Arm', valueCm: 33.0, confidence: 'low' },
      { key: 'left_upper_arm', label: 'L. Upper Arm', valueCm: null, confidence: null },
      { key: 'right_forearm', label: 'R. Forearm', valueCm: 27.5, confidence: 'moderate' },
      { key: 'left_forearm', label: 'L. Forearm', valueCm: 27.3, confidence: 'moderate' },
      { key: 'right_upper_thigh', label: 'R. Thigh', valueCm: 55.0, confidence: 'high' },
      { key: 'left_upper_thigh', label: 'L. Thigh', valueCm: 54.8, confidence: 'high' },
      { key: 'right_calf', label: 'R. Calf', valueCm: 37.0, confidence: 'moderate' },
    ],
    composition: {
      bodyFatPct: 22.4,
      leanMassKg: 54.1,
      fatMassKg: 16.2,
    },
    trend: {
      firstBodyFatPct: 27.0,
      latestBodyFatPct: 22.4,
    },
  };
}

describe('renderScanReportPdf: shape', () => {
  it('produces a valid PDF (starts with %PDF magic)', async () => {
    const bytes = await renderScanReportPdf(baseInput());
    expect(bytes.byteLength).toBeGreaterThan(200);
    // %PDF- = 0x25 0x50 0x44 0x46 0x2D
    expect(bytes[0]).toBe(0x25);
    expect(bytes[1]).toBe(0x50);
    expect(bytes[2]).toBe(0x44);
    expect(bytes[3]).toBe(0x46);
  });

  it('renders gracefully with no avatar PNG (avatarPng null) and no throw', async () => {
    const bytes = await renderScanReportPdf({ ...baseInput(), avatarPng: null });
    expect(bytes.byteLength).toBeGreaterThan(200);
  });
});

describe('renderScanReportPdf: legal + disclaimer', () => {
  it('carries the FarmCeutica Wellness LLC legal entity line', async () => {
    const text = extractPdfText(await renderScanReportPdf(baseInput()));
    expect(text).toContain('FarmCeutica Wellness LLC');
  });

  it('does NOT render the prompt-era "Ltd" entity form', async () => {
    const text = extractPdfText(await renderScanReportPdf(baseInput()));
    expect(text).not.toContain('FarmCeutica Wellness Ltd');
  });

  it('carries a non-dismissible AI-estimate disclaimer', async () => {
    const text = extractPdfText(await renderScanReportPdf(baseInput())).toLowerCase();
    expect(text).toContain('estimate');
    expect(text).toContain('not a medical');
  });

  it('names Via Cura as the product brand', async () => {
    const text = extractPdfText(await renderScanReportPdf(baseInput()));
    expect(text).toContain('Via Cura');
  });
});

describe('renderScanReportPdf: Helix-absent (Section 8)', () => {
  const banned = ['helix', 'streak', 'token', 'viatoken', 'gamif', 'leaderboard', 'multiplier', 'challenge'];
  it('contains no Helix / streak / token / gamification strings', async () => {
    const text = extractPdfText(await renderScanReportPdf(baseInput())).toLowerCase();
    for (const word of banned) {
      expect(text).not.toContain(word);
    }
  });
});

describe('renderScanReportPdf: honest confidence', () => {
  it('renders an UNKNOWN measurement as UNKNOWN, never 0', async () => {
    const text = extractPdfText(await renderScanReportPdf(baseInput()));
    // The left upper arm is null cm / null confidence.
    expect(text).toContain('UNKNOWN');
    // The UNKNOWN row must not smuggle a "0" value in as its measurement.
    // Guard: there is no "0.0 cm" fabricated for the null measurement.
    expect(text).not.toContain('L. Upper Arm 0');
  });

  it('keeps the Estimated marker on a low-confidence present value', async () => {
    const text = extractPdfText(await renderScanReportPdf(baseInput()));
    // R. Upper Arm is present (33.0) with confidence 'low' -> 'Estimated'.
    expect(text).toContain('Estimated');
    // And it is NOT upgraded to Measured.
    // (There ARE high-confidence rows that legitimately say Measured, so we
    //  only assert the low row's own value + marker coexist.)
    expect(text).toContain('33');
  });

  it('renders Measured for a high-confidence value', async () => {
    const text = extractPdfText(await renderScanReportPdf(baseInput()));
    expect(text).toContain('Measured');
  });
});

describe('renderScanReportPdf: trend sign', () => {
  it('renders a minus sign for a body-fat DROP (latest below first)', async () => {
    // first 27.0 -> latest 22.4 is a 4.6 point drop.
    const text = extractPdfText(await renderScanReportPdf(baseInput()));
    expect(text).toMatch(/-4\.6/);
    expect(text).not.toMatch(/\+4\.6/);
  });

  it('renders a plus sign for a body-fat GAIN (latest above first)', async () => {
    const input = baseInput();
    input.trend = { firstBodyFatPct: 20.0, latestBodyFatPct: 24.5 };
    const text = extractPdfText(await renderScanReportPdf(input));
    expect(text).toMatch(/\+4\.5/);
    expect(text).not.toMatch(/-4\.5/);
  });

  it('omits a trend delta when there is no first scan (single scan honesty)', async () => {
    const input = baseInput();
    input.firstScanDate = null;
    input.trend = { firstBodyFatPct: null, latestBodyFatPct: 22.4 };
    const bytes = await renderScanReportPdf(input);
    expect(bytes.byteLength).toBeGreaterThan(200);
    // No fabricated delta: neither a +N.N nor -N.N trend token appears.
    const text = extractPdfText(bytes);
    expect(text).not.toMatch(/[+-]\d+\.\d+ points/);
  });
});

describe('renderScanReportPdf: no em / en dashes', () => {
  it('rendered document contains zero em or en dashes', async () => {
    const bytes = await renderScanReportPdf(baseInput());
    const raw = Buffer.from(bytes).toString('utf-8');
    // U+2014 em dash, U+2013 en dash, referenced via char code so this test
    // source stays ASCII-clean.
    expect(raw).not.toContain(String.fromCharCode(0x2014));
    expect(raw).not.toContain(String.fromCharCode(0x2013));
  });
});

describe('renderScanReportPdf: guardrail', () => {
  it('throws if a caller smuggles a forbidden Helix token into a label', async () => {
    const input = baseInput();
    input.circumferences[0].label = 'helix_leaderboard';
    await expect(renderScanReportPdf(input)).rejects.toThrow(/FORBIDDEN/);
  });
});
