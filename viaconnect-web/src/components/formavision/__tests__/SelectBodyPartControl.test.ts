// Tests for the Select Body Part control + its key set (Prompt 210b, P2-T4a).
//
// Two concerns: (1) the picker's region keys can never drift from the camera
// framing map, and (2) the controlled-component contract (region -> key, All ->
// null, value reflected in the rendered select). The node harness has no client
// reconciler, so the onChange semantics are tested through the pure resolveSelection
// helper the control delegates to, and the controlled value via static markup.

import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  SelectBodyPartControl,
  SELECT_BODY_PART_REGIONS,
  ALL_VALUE,
  resolveSelection,
} from '../SelectBodyPartControl';
import { framingForRegion, FULL_BODY_FRAMING } from '@/lib/formavision/motion/regionFraming';

describe('SELECT_BODY_PART_REGIONS', () => {
  it('lists the twelve canonical selectable regions', () => {
    expect(SELECT_BODY_PART_REGIONS.map((r) => r.key)).toEqual([
      'neck', 'chest', 'waist', 'hip',
      'rBicep', 'lBicep', 'rForearm', 'lForearm',
      'rThigh', 'lThigh', 'rCalf', 'lCalf',
    ]);
  });

  it('every picker key resolves to a real per-region framing, never the full-body fallback (drift-proof)', () => {
    // If a picker key did not exist in the camera-framing map it would fall back
    // to FULL_BODY_FRAMING, so this pins the picker keys and the framing map keys
    // to the same canonical set: they cannot diverge without failing here.
    for (const region of SELECT_BODY_PART_REGIONS) {
      expect(framingForRegion(region.key)).not.toEqual(FULL_BODY_FRAMING);
    }
  });

  it('has no duplicate keys', () => {
    const keys = SELECT_BODY_PART_REGIONS.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('resolveSelection', () => {
  it('maps the All sentinel to null (full body)', () => {
    expect(resolveSelection(ALL_VALUE)).toBeNull();
  });

  it('passes a region key through unchanged', () => {
    expect(resolveSelection('rThigh')).toBe('rThigh');
    expect(resolveSelection('neck')).toBe('neck');
  });
});

describe('SelectBodyPartControl rendering', () => {
  function render(value: string | null): string {
    return renderToStaticMarkup(
      React.createElement(SelectBodyPartControl, { value, onChange: () => {} }),
    );
  }

  it('renders an All option plus every selectable region label', () => {
    const markup = render(null);
    expect(markup).toContain('All (full body)');
    for (const region of SELECT_BODY_PART_REGIONS) {
      expect(markup).toContain(region.label);
    }
  });

  it('reflects the controlled value (the All option is selected when value is null)', () => {
    const markup = render(null);
    // renderToStaticMarkup marks the matching option selected, not the select.
    expect(markup).toContain(`<option value="${ALL_VALUE}" selected="">`);
    expect(markup).not.toContain('<option value="waist" selected="">');
  });

  it('reflects a selected region (the matching option is selected)', () => {
    const markup = render('waist');
    expect(markup).toContain('<option value="waist" selected="">');
    expect(markup).not.toContain(`<option value="${ALL_VALUE}" selected="">`);
  });
});
