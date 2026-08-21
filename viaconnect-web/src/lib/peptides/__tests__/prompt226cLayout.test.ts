/**
 * Prompt 226c (Gary correction): true 2x2 field tabs.
 * Left: Compound / Vial. Right: Diluent+chips / Dose+note.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONVERTER_COPY } from '@/lib/peptides/converterMath';

function read(rel: string): string {
  return readFileSync(path.join(process.cwd(), rel), 'utf8');
}

const APPENDIX_A_STRINGS = [
  'You enter the dose from your prescription. ViaConnect converts units only.',
  'Common volumes, choose one.',
  'Empty until you type. No presets. No suggestions.',
  'Dose (your number)',
  'This is where your entered dose lands on the barrel.',
  'Scale shows 1-unit ticks like a syringe barrel. Use the numeric result above. Indicator is not draggable.',
] as const;

describe('Prompt 226c true 2x2 layout', () => {
  const converter = read(
    'src/components/peptide-protocol/converter/ConcentrationConverterClient.tsx',
  );
  const css = read('src/styles/peptide-converter-226c.css');
  const globals = read('src/app/globals.css');

  it('imports 226c stylesheet', () => {
    expect(globals).toContain('peptide-converter-226c.css');
  });

  it('wires 2x2 field classes without helper-strip or reserved cell', () => {
    expect(converter).toContain('converter-fields');
    expect(converter).toContain('field--compound');
    expect(converter).toContain('field--vial');
    expect(converter).toContain('field--diluent');
    expect(converter).toContain('field--dose');
    expect(converter).toContain('true 2x2');
    expect(converter).not.toContain('helper-strip');
    expect(converter).not.toContain('cell--reserved');
    expect(converter).not.toContain('converter-reserved-cell');
  });

  it('CSS places Compound/Vial left and Diluent/Dose right', () => {
    expect(css).toMatch(/\.field--compound\s*\{[^}]*grid-column:\s*1/s);
    expect(css).toMatch(/\.field--compound\s*\{[^}]*grid-row:\s*1/s);
    expect(css).toMatch(/\.field--diluent\s*\{[^}]*grid-column:\s*2/s);
    expect(css).toMatch(/\.field--diluent\s*\{[^}]*grid-row:\s*1/s);
    expect(css).toMatch(/\.field--vial\s*\{[^}]*grid-column:\s*1/s);
    expect(css).toMatch(/\.field--vial\s*\{[^}]*grid-row:\s*2/s);
    expect(css).toMatch(/\.field--dose\s*\{[^}]*grid-column:\s*2/s);
    expect(css).toMatch(/\.field--dose\s*\{[^}]*grid-row:\s*2/s);
    expect(css).not.toContain('helper-strip');
    expect(css).not.toContain('cell--reserved');
  });

  it('keeps common volumes under Diluent and prescription note under Dose', () => {
    expect(converter).toContain('field--diluent-extras');
    expect(converter).toContain('converter-diluent-chips');
    expect(converter).toContain('field--dose-note');
    expect(converter).toContain('id="dose-note"');
    expect(converter).toContain('aria-describedby="dose-note dose-helper"');
  });
});

describe('Prompt 226c copy integrity (byte-equality)', () => {
  const converter = read(
    'src/components/peptide-protocol/converter/ConcentrationConverterClient.tsx',
  );
  const scale = read(
    'src/components/peptide-protocol/converter/SyringeUnitScale.tsx',
  );

  it('Appendix A strings remain byte-identical', () => {
    for (const s of APPENDIX_A_STRINGS) {
      const hit =
        converter.includes(s) ||
        scale.includes(s) ||
        Object.values(CONVERTER_COPY).some((v) => v === s || String(v).includes(s));
      expect(hit, `Missing verbatim string: ${s}`).toBe(true);
    }
  });
});

describe('Prompt 226c does not regress 226 / 226b', () => {
  const converter = read(
    'src/components/peptide-protocol/converter/ConcentrationConverterClient.tsx',
  );
  const scale = read(
    'src/components/peptide-protocol/converter/SyringeUnitScale.tsx',
  );

  it('226 dose boundary and 226b glass remain', () => {
    expect(converter).toContain("setDoseAmount] = useState('')");
    expect(converter).toContain('MUST stay empty until user types');
    expect(converter).toContain('pep-glass-input');
    expect(converter).toContain('pep-disclaimer-panel');
    expect(scale).toContain('NOT draggable');
    expect(scale).toContain('pep-glass--subtle');
  });
});
