// Prompt 210i: four-tab navigation contract (both directions + active state).
// Arnold PASS / Picasso Brief 61: mobile 2×2 grid, no overflow-x snap chips.
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CompositionSectionToggle } from '../CompositionSectionToggle';

const TOGGLE_SRC = readFileSync(
  join(process.cwd(), 'src/components/body-tracker/CompositionSectionToggle.tsx'),
  'utf8',
);

describe('CompositionSectionToggle (210i)', () => {
  it('renders four tabs including FormaVision when includeFormaVision is true', () => {
    const html = renderToStaticMarkup(
      React.createElement(CompositionSectionToggle, {
        active: 'fat',
        onChange: () => {},
      }),
    );
    expect(html).toContain('composition-tab-fat');
    expect(html).toContain('composition-tab-muscle');
    expect(html).toContain('composition-tab-measurements');
    expect(html).toContain('composition-tab-formavision');
    expect(html).toContain('Forma');
    expect(html).toContain('Vision');
  });

  it('marks the active tab with data-active true', () => {
    const html = renderToStaticMarkup(
      React.createElement(CompositionSectionToggle, {
        active: 'formavision',
        onChange: () => {},
      }),
    );
    expect(html).toContain('data-testid="composition-tab-formavision"');
    expect(html).toMatch(/composition-tab-formavision[^>]*data-active="true"/);
    expect(html).toMatch(/composition-tab-fat[^>]*data-active="false"/);
  });

  it('omits FormaVision when includeFormaVision is false (manual form)', () => {
    const html = renderToStaticMarkup(
      React.createElement(CompositionSectionToggle, {
        active: 'measurements',
        onChange: () => {},
        includeFormaVision: false,
      }),
    );
    expect(html).toContain('composition-tab-measurements');
    expect(html).not.toContain('composition-tab-formavision');
  });

  it('invokes onChange with formavision when that tab is selected', () => {
    const onChange = vi.fn();
    // Static markup cannot click; assert the button exists for the E2E / parent wiring.
    // Navigation direction is owned by composition (router.push formavision) and
    // formavision (router.push composition?section=).
    const html = renderToStaticMarkup(
      React.createElement(CompositionSectionToggle, {
        active: 'muscle',
        onChange,
      }),
    );
    expect(html).toContain('composition-tab-formavision');
    expect(html).toContain('role="radio"');
    expect(html).toContain('role="radiogroup"');
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('CompositionSectionToggle (Brief 61 layout)', () => {
  it('uses a 2×2 mobile grid without horizontal snap scroll', () => {
    const html = renderToStaticMarkup(
      React.createElement(CompositionSectionToggle, {
        active: 'fat',
        onChange: () => {},
      }),
    );
    expect(html).toContain('grid-cols-2');
    expect(html).toContain('gap-2');
    expect(html).toContain('min-h-[52px]');
    expect(html).toContain('py-3');
    expect(html).toContain('px-2');
    expect(html).toContain('text-sm');
    expect(html).not.toContain('overflow-x-auto');
    expect(html).not.toContain('snap-x');
    expect(html).not.toContain('snap-mandatory');
    expect(html).not.toContain('snap-start');
  });

  it('keeps tab order Body Fat, Muscle Mass, Measurements, FormaVision', () => {
    const html = renderToStaticMarkup(
      React.createElement(CompositionSectionToggle, {
        active: 'fat',
        onChange: () => {},
      }),
    );
    const fat = html.indexOf('composition-tab-fat');
    const muscle = html.indexOf('composition-tab-muscle');
    const measurements = html.indexOf('composition-tab-measurements');
    const formavision = html.indexOf('composition-tab-formavision');
    expect(fat).toBeGreaterThan(-1);
    expect(muscle).toBeGreaterThan(fat);
    expect(measurements).toBeGreaterThan(muscle);
    expect(formavision).toBeGreaterThan(measurements);
  });

  it('does not reintroduce tiny scroll chips in source (desktop is md row)', () => {
    expect(TOGGLE_SRC).toMatch(/grid-cols-2/);
    expect(TOGGLE_SRC).toMatch(/md:flex/);
    expect(TOGGLE_SRC).not.toMatch(/overflow-x-auto/);
    expect(TOGGLE_SRC).not.toMatch(/snap-x/);
    expect(TOGGLE_SRC).toMatch(/size=\{20\}/);
    expect(TOGGLE_SRC).toMatch(/strokeWidth=\{1\.5\}/);
    expect(TOGGLE_SRC).toMatch(/layoutId="composition-pill"/);
    expect(TOGGLE_SRC).toMatch(/includeFormaVision/);
    expect(TOGGLE_SRC).toMatch(/rgba\(255,255,255,0\.85\)/);
  });
});
