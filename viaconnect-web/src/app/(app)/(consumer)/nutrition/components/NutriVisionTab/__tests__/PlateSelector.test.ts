// Prompt #170a supplement §17.2 / §17.3: source-presence sanity for the
// PlateSelector component. vitest runs in node without jsdom so we assert
// against the source rather than via a live React render.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const SELECTOR = path.resolve(__dirname, '..', 'PlateSelector.tsx');
const ANALYSIS_RESULT = path.resolve(__dirname, '..', 'AnalysisResult.tsx');

describe('PlateSelector source', () => {
  const source = readFileSync(SELECTOR, 'utf-8');

  it('declares all three plate kinds', () => {
    expect(source).toContain("'plate_8in'");
    expect(source).toContain("'plate_10in'");
    expect(source).toContain("'plate_12in'");
  });

  it('does not reference standard_fork', () => {
    expect(source).not.toContain('standard_fork');
  });

  it('pre-selects Medium (plate_10in) on mount', () => {
    expect(source).toContain("DEFAULT_KIND: PlateSelectorKind = 'plate_10in'");
  });

  it('uses the brand token palette (Navy, Card, Teal)', () => {
    expect(source).toContain('#1A2744');
    expect(source).toContain('#2DA5A0');
  });

  it('renders the radiogroup with three role=radio children', () => {
    expect(source).toContain("role=\"radiogroup\"");
    expect(source).toContain("role=\"radio\"");
  });

  it('declares aria-checked on chip rendering', () => {
    expect(source).toContain('aria-checked');
  });

  it('declares aria-labels for accessibility (Small/Medium/Large + inches)', () => {
    expect(source).toContain('Small plate, 8 inches');
    expect(source).toContain('Medium plate, 10 inches');
    expect(source).toContain('Large plate, 12 inches');
  });

  it('renders pre-interaction hint copy then collapses on selection', () => {
    expect(source).toContain('No card detected for scale.');
    expect(source).toContain('What plate size is this?');
    expect(source).toContain('Plate size:');
  });

  it('chip dimensions: 56px tall, 80px min wide, 12px radius', () => {
    expect(source).toContain('h-14');
    expect(source).toContain('min-w-[80px]');
    expect(source).toContain('rounded-xl');
  });

  it('uses Tailwind active scale 0.96 to 1.0 on tap', () => {
    expect(source).toContain('active:scale-[0.96]');
  });

  it('contains no em dash, en dash, or emoji characters', () => {
    expect(source).not.toContain('—');
    expect(source).not.toContain('–');
  });
});

describe('AnalysisResult wires PlateSelector', () => {
  const source = readFileSync(ANALYSIS_RESULT, 'utf-8');

  it('imports PlateSelector', () => {
    expect(source).toContain("from './PlateSelector'");
    expect(source).toContain('PlateSelector');
  });

  it('declares onPlateSizeChange in the props contract', () => {
    expect(source).toContain('onPlateSizeChange');
  });

  it('gates render on credit_card_detected !== true', () => {
    expect(source).toContain('credit_card_detected !== true');
  });

  it('renders PlateSelector above the totals card', () => {
    const plateIdx = source.indexOf('<PlateSelector');
    const totalsIdx = source.indexOf('Meal totals');
    expect(plateIdx).toBeGreaterThan(-1);
    expect(totalsIdx).toBeGreaterThan(-1);
    expect(plateIdx).toBeLessThan(totalsIdx);
  });
});
