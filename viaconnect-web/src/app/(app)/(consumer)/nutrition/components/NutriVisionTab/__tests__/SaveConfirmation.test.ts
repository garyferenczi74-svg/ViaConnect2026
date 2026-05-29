// Prompt #170 Phase 1l: source presence sanity for SaveConfirmation.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const FILE = path.resolve(__dirname, '..', 'SaveConfirmation.tsx');

describe('SaveConfirmation source', () => {
  const source = readFileSync(FILE, 'utf-8');

  it('renders the Bio Optimization phrase verbatim', () => {
    // The standing copy rule requires the phrase rendered exactly. It must
    // not be abbreviated to BioOpt or rephrased.
    expect(source).toContain('Bio Optimization');
    expect(source).not.toContain('BioOpt');
    expect(source).not.toContain('Bio Opt ');
  });

  it('renders the Gordon delta from response.gordon.bio_optimization_delta', () => {
    expect(source).toContain('response.gordon.bio_optimization_delta');
  });

  it('renders four target rings (Cal, Protein, Carbs, Fat)', () => {
    expect(source).toContain('label="Calories"');
    expect(source).toContain('label="Protein"');
    expect(source).toContain('label="Carbs"');
    expect(source).toContain('label="Fat"');
  });

  it('contains no em or en dash', () => {
    expect(source).not.toContain('—');
    expect(source).not.toContain('–');
  });
});
