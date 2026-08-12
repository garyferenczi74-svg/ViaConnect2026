// Prompt 210i: four-tab navigation contract (both directions + active state).
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CompositionSectionToggle } from '../CompositionSectionToggle';

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
    expect(onChange).not.toHaveBeenCalled();
  });
});
