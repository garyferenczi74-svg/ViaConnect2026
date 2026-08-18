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

  it('adds Hormones surface for 221B', () => {
    const hormones = SURFACES.find((s) => s.id === 'hormones');
    expect(hormones).toBeDefined();
    expect(hormones!.href).toBe('/body-tracker/hormones');
    expect(hormones!.title).toBe('Hormones');
  });

  it('221C: Weight Milestones Metabolic Hormones share equal four-card row spans', () => {
    const ids = ['weight', 'milestones', 'metabolic', 'hormones'] as const;
    const order = SURFACES.map((s) => s.id);
    expect(order.indexOf('weight')).toBeLessThan(order.indexOf('milestones'));
    expect(order.indexOf('milestones')).toBeLessThan(order.indexOf('metabolic'));
    expect(order.indexOf('metabolic')).toBeLessThan(order.indexOf('hormones'));
    for (const id of ids) {
      const card = SURFACES.find((s) => s.id === id);
      expect(card?.gridClass).toMatch(/md:col-span-1/);
      expect(card?.gridClass).toMatch(/lg:col-span-3/);
    }
    const hormones = SURFACES.find((s) => s.id === 'hormones');
    expect(hormones?.media.kind).toBe('video');
    expect(hormones?.media.src).toBeTruthy();
  });

  it('221C: featured stack uses 12-col spans (dashboard 8, side cards 4)', () => {
    expect(SURFACES.find((s) => s.id === 'dashboard')?.gridClass).toMatch(
      /lg:col-span-8/,
    );
    expect(SURFACES.find((s) => s.id === 'composition')?.gridClass).toMatch(
      /lg:col-span-4/,
    );
    expect(SURFACES.find((s) => s.id === 'progress')?.gridClass).toMatch(
      /lg:col-span-4/,
    );
  });
});
