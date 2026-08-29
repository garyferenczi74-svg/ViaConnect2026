/**
 * Render tests for PoseTitleCard.
 *
 * Uses react-dom/server renderToStaticMarkup (node-safe, no jsdom).
 *
 * Key assertions:
 *   - renders the pose label and hint from POSES
 *   - uses the Instrument Sans scoped class (font-instrument), never global
 *   - uses var(--card) for the card background, no raw hex
 */

import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PoseTitleCard } from '../PoseTitleCard';
import { POSES } from '@/lib/scan/poses';

describe('PoseTitleCard', () => {
  const html = renderToStaticMarkup(
    React.createElement(PoseTitleCard, { pose: 'right', index: 1 }),
  );

  it('renders the pose label', () => {
    expect(html).toContain(POSES[1].label);
  });

  it('renders the pose hint', () => {
    expect(html).toContain(POSES[1].hint);
  });

  it('applies the Instrument Sans scoped class', () => {
    expect(html).toContain('font-instrument');
  });

  it('uses var(--card) for the card background', () => {
    expect(html).toContain('var(--card)');
  });

  it('contains no raw hex color literals', () => {
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });
});
