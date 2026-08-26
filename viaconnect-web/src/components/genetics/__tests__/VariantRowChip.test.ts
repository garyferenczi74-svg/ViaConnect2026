import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const CHIP = path.resolve(__dirname, '..', 'VariantRowChip.tsx');
const CARD = path.resolve(__dirname, '..', 'hub', 'YourVariantsCard.tsx');

describe('VariantRowChip source', () => {
  const source = readFileSync(CHIP, 'utf-8');

  it('renders locked Brief 51 chips with Lucide 1.5 and GeneXM, not GeneX-M', () => {
    expect(source).toContain('Demo');
    expect(source).toContain('Unanalyzed');
    expect(source).toContain('Reference');
    expect(source).toContain('your upload');
    expect(source).toContain('GENEX360');
    expect(source).toContain('GeneXM');
    expect(source).not.toContain('GeneX-M');
    expect(source).toContain('Not a diagnosis.');
    expect(source).toContain('strokeWidth={1.5}');
    expect(source).not.toContain('Your variant');
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });

  it('uses the existing teal and copper tokens', () => {
    expect(source).toContain('#2DA5A0');
    expect(source).toContain('#B75E18');
  });
});

describe('Your Variants mounts a chip on every SNP row', () => {
  it('never renders a Your variant label without Result or Demo', () => {
    const card = readFileSync(CARD, 'utf-8');
    expect(card).toContain('<VariantRowChip');
    expect(card).not.toContain('Your variant');
    expect(card).not.toContain('GeneX-M');
  });
});
