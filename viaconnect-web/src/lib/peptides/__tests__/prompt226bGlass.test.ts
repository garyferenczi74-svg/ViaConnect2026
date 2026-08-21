/**
 * Prompt 226b: glass presentation wiring + contrast floors.
 * Presentation only. 226 behavioural guards must remain intact.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function read(rel: string): string {
  return readFileSync(path.join(process.cwd(), rel), 'utf8');
}

/** Relative luminance (sRGB), WCAG 2.x. */
function luminance(r: number, g: number, b: number): number {
  const lin = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0]! + 0.7152 * lin[1]! + 0.0722 * lin[2]!;
}

function contrastRatio(
  fg: [number, number, number],
  bg: [number, number, number],
): number {
  const L1 = luminance(...fg);
  const L2 = luminance(...bg);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Alpha-composite src over dst. */
function over(
  src: [number, number, number, number],
  dst: [number, number, number],
): [number, number, number] {
  const a = src[3];
  return [
    Math.round(src[0] * a + dst[0] * (1 - a)),
    Math.round(src[1] * a + dst[1] * (1 - a)),
    Math.round(src[2] * a + dst[2] * (1 - a)),
  ];
}

const SCRIM: [number, number, number, number] = [26, 39, 68, 0.62];
const GLASS_SURFACE: [number, number, number, number] = [30, 48, 84, 0.58];
const GLASS_STRONG: [number, number, number, number] = [30, 48, 84, 0.76];
const CARD: [number, number, number] = [30, 48, 84];
const WHITE: [number, number, number] = [255, 255, 255];

describe('Prompt 226b tokens and classes', () => {
  const globals = read('src/app/globals.css');
  const css = read('src/styles/peptide-converter-226b.css');
  const converter = read(
    'src/components/peptide-protocol/converter/ConcentrationConverterClient.tsx',
  );
  const scale = read(
    'src/components/peptide-protocol/converter/SyringeUnitScale.tsx',
  );
  const hero = read('src/components/peptide-protocol/PeptideProtocolHeroShell.tsx');

  it('defines 226b tokens in the design token layer', () => {
    expect(globals).toContain('--scrim-base:');
    expect(globals).toContain('--scrim-base-mobile:');
    expect(globals).toContain('--glass-subtle:');
    expect(globals).toContain('--glass-surface:');
    expect(globals).toContain('--glass-strong:');
    expect(globals).toContain('--glass-selected:');
    expect(globals).toContain('--glass-border-selected:');
    expect(globals).toContain('--glass-inset:');
    expect(globals).toContain('peptide-converter-226b.css');
  });

  it('ships webkit backdrop-filter, supports fallback, and reduced transparency', () => {
    expect(css).toContain('-webkit-backdrop-filter');
    expect(css).toContain('@supports not (backdrop-filter: blur(1px))');
    expect(css).toContain('prefers-reduced-transparency: reduce');
    expect(css).toContain('.pep-disclaimer-panel');
    expect(css).toContain('.pep-scrim');
  });

  it('converter uses glass classes and keeps disclaimer solid', () => {
    expect(converter).toContain('pep-glass-input');
    expect(converter).toContain('GlassSegmentedControl');
    expect(converter).toContain('pep-disclaimer-panel');
    expect(converter).toContain('data-peptide-converter');
    expect(converter).toContain('glass');
    // Layer 2 / history must not use translucent black wash
    expect(converter).not.toMatch(/bg-black\/20/);
  });

  it('hero uses pep-scrim token class (no inline rgba overlay)', () => {
    expect(hero).toContain('pep-scrim');
    expect(hero).not.toContain("backgroundColor: 'rgba(0, 0, 0, 0.40)'");
    expect(hero).not.toMatch(/rgba?\(/);
  });

  it('scale card is glass-subtle; ticks remain opaque deep-navy', () => {
    expect(scale).toContain('pep-glass--subtle');
    expect(scale).toContain('var(--deep-navy)');
    expect(scale).toContain('NOT draggable');
    expect(scale).toContain('data-interactive="false"');
  });

  it('converter TSX avoids raw rgba() literals (tokens/classes only)', () => {
    expect(converter).not.toMatch(/rgba?\(/);
  });
});

describe('Prompt 226b contrast floors (composited)', () => {
  const samples: Array<{ name: string; photo: [number, number, number] }> = [
    { name: 'darkest', photo: [8, 12, 20] },
    { name: 'brightest', photo: [240, 245, 250] },
    { name: 'mid detail', photo: [90, 110, 130] },
    { name: 'mobile crop mid', photo: [60, 80, 100] },
  ];

  it('body text on glass-surface meets 4.5:1 over scrim at all sample points', () => {
    for (const sample of samples) {
      const afterScrim = over(SCRIM, sample.photo);
      const afterGlass = over(GLASS_SURFACE, afterScrim);
      const ratio = contrastRatio(WHITE, afterGlass);
      expect(ratio, sample.name).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('disclaimer on solid card meets 7:1 target against white text', () => {
    const ratio = contrastRatio(WHITE, CARD);
    expect(ratio).toBeGreaterThanOrEqual(7);
  });

  it('glass-strong still meets 4.5:1 body floor at bright sample', () => {
    const afterScrim = over(SCRIM, [240, 245, 250]);
    const afterGlass = over(GLASS_STRONG, afterScrim);
    expect(contrastRatio(WHITE, afterGlass)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('Prompt 226b does not regress 226 behaviour wiring', () => {
  it('dose stays empty by default and scale stays non-interactive', () => {
    const converter = read(
      'src/components/peptide-protocol/converter/ConcentrationConverterClient.tsx',
    );
    const scale = read(
      'src/components/peptide-protocol/converter/SyringeUnitScale.tsx',
    );
    expect(converter).toContain("setDoseAmount] = useState('')");
    expect(converter).toContain('MUST stay empty until user types');
    expect(scale).not.toMatch(/onDrag/);
    expect(scale).not.toMatch(/setDose|doseAmount/);
  });
});
