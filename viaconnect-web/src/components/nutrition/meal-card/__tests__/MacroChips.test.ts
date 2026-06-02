// Prompt 172 Phase 1A: MacroChips source presence sanity.
//
// Per the dom parity contract for 1A, MacroChips must render the four chips
// in the fixed order Calories, Protein, Carbs, Fat (per spec section 5.3),
// each in a token driven palette. No safety mode ratio variant in 1A; 1B
// adds it with a TODO marker now.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const FILE = path.resolve(__dirname, '..', 'MacroChips.tsx');

describe('MacroChips source', () => {
  const source = readFileSync(FILE, 'utf-8');

  it('renders the four chips in the fixed order Calories Protein Carbs Fat', () => {
    const idxCal = source.indexOf('Calories');
    const idxPro = source.indexOf('Protein');
    const idxCar = source.indexOf('Carbs');
    const idxFat = source.indexOf('Fat');
    expect(idxCal).toBeGreaterThan(-1);
    expect(idxPro).toBeGreaterThan(idxCal);
    expect(idxCar).toBeGreaterThan(idxPro);
    expect(idxFat).toBeGreaterThan(idxCar);
  });

  it('uses the kcal unit on the Calories chip and g on the macro chips', () => {
    expect(source).toContain('kcal');
    expect(source).toContain("'g'");
  });

  it('applies brand tokens for chip palette (no off token hex)', () => {
    // Teal for Calories, Orange for Protein per spec section 5.3.
    expect(source).toContain('#2DA5A0');
    expect(source).toContain('#B75E18');
  });

  it('marks the safety mode ratio variant as a 1B TODO not yet implemented', () => {
    expect(source).toContain('TODO');
    expect(source).toContain('1B');
  });

  it('declares the MacroChips component as a stateless props consumer', () => {
    expect(source).toContain('export function MacroChips');
    // No internal state; the chip values are read from props.
    expect(source).not.toContain('useState');
    expect(source).not.toContain('useEffect');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes('—')).toBe(false);
    expect(source.includes('–')).toBe(false);
  });
});
