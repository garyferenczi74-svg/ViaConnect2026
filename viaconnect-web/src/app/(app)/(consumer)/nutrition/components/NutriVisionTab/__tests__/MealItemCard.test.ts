// Prompt #170 Phase 1l: source presence sanity for MealItemCard.
//
// We assert the contract the spec calls out: item name, source flag, four
// macros, portion slider hook-up, and confidence badge classification.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const FILE = path.resolve(__dirname, '..', 'MealItemCard.tsx');

describe('MealItemCard source', () => {
  const source = readFileSync(FILE, 'utf-8');

  it('renders item name + source label + macros', () => {
    // food_name + SOURCE_LABEL + the four macro grid entries.
    expect(source).toContain('item.food_name');
    expect(source).toContain('SOURCE_LABEL');
    expect(source).toContain('Protein');
    expect(source).toContain('Carbs');
    expect(source).toContain('Fat');
    expect(source).toContain('Cal');
  });

  it('wires the portion slider to onPortionChange', () => {
    expect(source).toContain('PortionSlider');
    expect(source).toContain('onChange={onPortionChange}');
  });

  it('renders a ConfidenceBadge with band + score', () => {
    expect(source).toMatch(/<ConfidenceBadge\s+band=\{item\.confidence_band\}/);
    expect(source).toContain('score={item.recognition_confidence}');
  });

  it('uses Teal + Orange brand tokens, never em or en dash', () => {
    expect(source).toContain('#2DA5A0');
    expect(source).toContain('#B75E18');
    expect(source).not.toContain('—');
    expect(source).not.toContain('–');
  });
});
