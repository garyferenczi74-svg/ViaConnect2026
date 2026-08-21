/**
 * Prompt 226c: converter 2x2 field grid + helper strip (layout only).
 * No copy edits. Reading A. 226 / 226b guards must stay green.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONVERTER_COPY } from '@/lib/peptides/converterMath';

function read(rel: string): string {
  return readFileSync(path.join(process.cwd(), rel), 'utf8');
}

/** Lex-controlled / Appendix A strings that must move verbatim (byte-equal). */
const APPENDIX_A_STRINGS = [
  'You enter the dose from your prescription. ViaConnect converts units only.',
  'Common volumes, choose one.',
  'Empty until you type. No presets. No suggestions.',
  'Dose (your number)',
  'This is where your entered dose lands on the barrel.',
  'Scale shows 1-unit ticks like a syringe barrel. Use the numeric result above. Indicator is not draggable.',
] as const;

describe('Prompt 226c layout wiring (Reading A)', () => {
  const converter = read(
    'src/components/peptide-protocol/converter/ConcentrationConverterClient.tsx',
  );
  const css = read('src/styles/peptide-converter-226c.css');
  const globals = read('src/app/globals.css');
  const scale = read(
    'src/components/peptide-protocol/converter/SyringeUnitScale.tsx',
  );

  it('imports 226c stylesheet', () => {
    expect(globals).toContain('peptide-converter-226c.css');
  });

  it('uses converter-fields grid with Reading A placement classes', () => {
    expect(converter).toContain('converter-fields');
    expect(converter).toContain('field--compound');
    expect(converter).toContain('field--vial');
    expect(converter).toContain('field--diluent');
    expect(converter).toContain('helper-strip');
    expect(converter).toContain('field--dose');
    expect(converter).toContain('cell--reserved');
    expect(converter).toContain('Reading A');
  });

  it('CSS places Dose under Vial (col 1) and reserved empty (col 2)', () => {
    expect(css).toContain('.field--dose');
    expect(css).toMatch(/\.field--dose\s*\{[^}]*grid-column:\s*1/);
    expect(css).toMatch(/\.cell--reserved\s*\{[^}]*grid-column:\s*2/s);
    expect(css).toContain('min-width: 900px');
    expect(css).toContain('helper-strip__note');
    expect(css).toContain('0.8125rem');
    expect(css).toContain('Reading B');
  });

  it('reserved cell is empty and hidden on mobile', () => {
    expect(converter).toContain('converter-reserved-cell');
    expect(converter).toContain('aria-hidden="true"');
    expect(css).toContain('.cell--reserved');
    expect(css).toMatch(/\.cell--reserved\s*\{\s*display:\s*none/);
  });

  it('dose input aria-describedby points at note and helper', () => {
    expect(converter).toContain('id="dose-input"');
    expect(converter).toContain('id="dose-note"');
    expect(converter).toContain('id="dose-helper"');
    expect(converter).toContain('aria-describedby="dose-note dose-helper"');
  });

  it('prescription note sits in helper strip, not beside Compound', () => {
    const note =
      'You enter the dose from your prescription. ViaConnect converts units only.';
    const noteAt = converter.indexOf(note);
    const stripAt = converter.indexOf('helper-strip');
    const compoundAt = converter.indexOf('field--compound');
    expect(noteAt).toBeGreaterThan(stripAt);
    expect(stripAt).toBeGreaterThan(compoundAt);
    expect(converter).toContain('helper-strip__note');
  });
});

describe('Prompt 226c copy integrity (byte-equality)', () => {
  const converter = read(
    'src/components/peptide-protocol/converter/ConcentrationConverterClient.tsx',
  );
  const scale = read(
    'src/components/peptide-protocol/converter/SyringeUnitScale.tsx',
  );

  it('Appendix A / Lex-controlled strings are byte-identical in UI sources', () => {
    for (const s of APPENDIX_A_STRINGS) {
      const inConverter = converter.includes(s);
      const inScale = scale.includes(s);
      const inCopy =
        Object.values(CONVERTER_COPY).some((v) => v === s || String(v).includes(s));
      expect(
        inConverter || inScale || inCopy,
        `Missing verbatim string: ${s}`,
      ).toBe(true);
    }
    expect(converter).toContain(
      'You enter the dose from your prescription. ViaConnect converts units only.',
    );
    expect(converter).toContain(
      'Empty until you type. No presets. No suggestions.',
    );
    expect(CONVERTER_COPY.bacShortcutsLabel).toBe('Common volumes, choose one.');
    expect(CONVERTER_COPY.scaleInstruction).toBe(
      'This is where your entered dose lands on the barrel.',
    );
  });
});

describe('Prompt 226c does not regress 226 / 226b', () => {
  const converter = read(
    'src/components/peptide-protocol/converter/ConcentrationConverterClient.tsx',
  );
  const scale = read(
    'src/components/peptide-protocol/converter/SyringeUnitScale.tsx',
  );

  it('226 dose boundary and scale read-only guards remain', () => {
    expect(converter).toContain("setDoseAmount] = useState('')");
    expect(converter).toContain('MUST stay empty until user types');
    expect(converter).toContain('pep-glass-input');
    expect(converter).toContain('pep-disclaimer-panel');
    expect(scale).toContain('NOT draggable');
    expect(scale).toContain('data-interactive="false"');
    expect(scale).toContain('pep-glass--subtle');
  });
});
