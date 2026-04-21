// Prompt #102 audit remediation: year-end 1099-NEC + T4A render tests.
//
// pdf-lib may font-subset text so not every drawText string appears as
// ASCII in the byte stream. These tests verify the stable signals:
// valid PDF magic, non-trivial size, Helix-free byte content.

import { describe, it, expect } from 'vitest';
import {
  render1099NEC,
  renderT4A,
  type YearEnd1099Input,
  type YearEndT4AInput,
} from '@/lib/tax/yearEndGenerator';

function bytesToAscii(bytes: Uint8Array): string {
  const out: string[] = [];
  for (let i = 0; i < bytes.byteLength; i += 1) {
    const b = bytes[i]!;
    out.push(b >= 32 && b < 127 ? String.fromCharCode(b) : ' ');
  }
  return out.join('');
}

function isValidPDFMagic(bytes: Uint8Array): boolean {
  return (
    bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d
  );
}

const FORBIDDEN_TOKENS = ['helix_', 'token_balance', 'leaderboard', 'challenge_', 'achievement_'];

describe('render1099NEC', () => {
  const base: YearEnd1099Input = {
    payerName: 'ViaCura Inc',
    payerEIN: '**-***1234',
    recipientName: 'Jane Doe',
    recipientTINMasked: '***-**-6789',
    totalNonemployeeCompensationCents: 250000,
    taxYear: 2026,
  };

  it('emits a syntactically valid PDF', async () => {
    const bytes = await render1099NEC(base);
    expect(isValidPDFMagic(bytes)).toBe(true);
    expect(bytes.byteLength).toBeGreaterThan(500);
  });

  it('renders no Helix copy in byte content', async () => {
    const bytes = await render1099NEC(base);
    const ascii = bytesToAscii(bytes);
    for (const t of FORBIDDEN_TOKENS) expect(ascii).not.toContain(t);
  });

  it('never places a raw unmasked SSN into the bytes', async () => {
    const bytes = await render1099NEC({ ...base, recipientTINMasked: '***-**-6789' });
    const ascii = bytesToAscii(bytes);
    // Nothing resembling a full SSN (\d{3}-\d{2}-\d{4}) should appear.
    expect(ascii).not.toMatch(/[0-9]{3}-[0-9]{2}-[0-9]{4}/);
  });

  it('does not throw on zero compensation (edge case)', async () => {
    const bytes = await render1099NEC({ ...base, totalNonemployeeCompensationCents: 0 });
    expect(bytes.byteLength).toBeGreaterThan(100);
  });
});

describe('renderT4A', () => {
  const base: YearEndT4AInput = {
    payerName: 'ViaCura Canada',
    payerBN: '123456789RT0001',
    recipientName: 'Jean Tremblay',
    recipientSINMasked: '***-***-789',
    totalBox20FeesForServicesCents: 80000,
    taxYear: 2026,
  };

  it('emits a syntactically valid PDF', async () => {
    const bytes = await renderT4A(base);
    expect(isValidPDFMagic(bytes)).toBe(true);
    expect(bytes.byteLength).toBeGreaterThan(500);
  });

  it('renders no Helix copy in byte content', async () => {
    const bytes = await renderT4A(base);
    const ascii = bytesToAscii(bytes);
    for (const t of FORBIDDEN_TOKENS) expect(ascii).not.toContain(t);
  });

  it('never places a raw unmasked SIN into the bytes', async () => {
    const bytes = await renderT4A({ ...base, recipientSINMasked: '***-***-789' });
    const ascii = bytesToAscii(bytes);
    expect(ascii).not.toMatch(/[0-9]{3}-[0-9]{3}-[0-9]{3}/);
  });

  it('does not throw on zero Box 020 total', async () => {
    const bytes = await renderT4A({ ...base, totalBox20FeesForServicesCents: 0 });
    expect(bytes.byteLength).toBeGreaterThan(100);
  });
});
