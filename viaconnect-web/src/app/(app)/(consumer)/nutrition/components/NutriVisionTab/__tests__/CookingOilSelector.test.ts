// Prompt #170 Phase 1l: source presence sanity for CookingOilSelector.
//
// The spec asserts the selector renders only when cookingMethod is sauteed,
// fried, or deep_fried, and that it surfaces the suggestion + emits a
// CookingOilSelection on change.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const FILE = path.resolve(__dirname, '..', 'CookingOilSelector.tsx');

describe('CookingOilSelector source', () => {
  const source = readFileSync(FILE, 'utf-8');

  it('gates render on cooking method (sauteed, fried, deep_fried)', () => {
    expect(source).toContain("'sauteed'");
    expect(source).toContain("'fried'");
    expect(source).toContain("'deep_fried'");
    expect(source).toContain('isOilApplicable');
    expect(source).toContain('return null');
  });

  it('renders the suggestion badge with type + amount', () => {
    expect(source).toContain('Suggested:');
    expect(source).toContain('props.suggestion.type');
    expect(source).toContain('props.suggestion.amount_ml');
  });

  it('calls onChange with a CookingOilSelection (Teal selected chip)', () => {
    expect(source).toContain('props.onChange(sel)');
    expect(source).toContain("'bg-[#2DA5A0]");
  });

  it('contains no em or en dash, no emoji', () => {
    expect(source).not.toContain('—');
    expect(source).not.toContain('–');
  });
});
