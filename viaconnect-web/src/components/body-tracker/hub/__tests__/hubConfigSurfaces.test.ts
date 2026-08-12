// Prompt 210j: hub card set has one composition entry branded FormaVision, no standalone card.
import { describe, it, expect } from 'vitest';
import { SURFACES } from '../hubConfig';

describe('hub SURFACES (210j consolidation)', () => {
  it('has no standalone formavision card', () => {
    expect(SURFACES.some((s) => s.id === 'formavision')).toBe(false);
  });

  it('renames composition card to FormaVision Body Composition and keeps composition href', () => {
    const composition = SURFACES.find((s) => s.id === 'composition');
    expect(composition).toBeDefined();
    expect(composition!.title).toBe('FormaVision Body Composition');
    expect(composition!.href).toBe('/body-tracker/composition');
  });

  it('keeps the other hub surface ids stable', () => {
    const ids = SURFACES.map((s) => s.id);
    expect(ids).toContain('dashboard');
    expect(ids).toContain('composition');
    expect(ids).toContain('progress');
    expect(ids).toContain('weight');
    expect(ids).toContain('milestones');
    expect(ids).toContain('metabolic');
    expect(ids).not.toContain('formavision');
  });
});
