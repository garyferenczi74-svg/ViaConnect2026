import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('Prompt 226 SyringeUnitScale boundary', () => {
  it('is marked non-interactive and has no drag handlers that set dose', () => {
    const src = readFileSync(
      path.join(
        process.cwd(),
        'src/components/peptide-protocol/converter/SyringeUnitScale.tsx',
      ),
      'utf8',
    );
    expect(src).toContain('data-interactive="false"');
    expect(src).toContain('NOT draggable');
    expect(src).not.toMatch(/onDrag/);
    expect(src).not.toMatch(/setDose|doseAmount/);
    expect(src).toContain('pointer-events-none');
  });

  it('converter client keeps dose empty by default with no presets', () => {
    const src = readFileSync(
      path.join(
        process.cwd(),
        'src/components/peptide-protocol/converter/ConcentrationConverterClient.tsx',
      ),
      'utf8',
    );
    expect(src).toContain("setDoseAmount] = useState('')");
    expect(src).toContain('MUST stay empty until user types');
    expect(src).toContain('No presets. No suggestions.');
    expect(src).toContain('CONVERTER_COPY.bacShortcutsLabel');
    expect(src.toLowerCase()).not.toContain('recommended dose');
    expect(src.toLowerCase()).not.toContain('typical volume');
  });
});
