import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { VariantRowChip } from '../VariantRowChip';

describe('VariantRowChip render', () => {
  it('renders all four honesty chips and never Your variant', () => {
    const html = ['demo', 'result', 'unanalyzed', 'reference']
      .map((kind) =>
        renderToStaticMarkup(
          <VariantRowChip kind={kind as 'demo' | 'result' | 'unanalyzed' | 'reference'} />,
        ),
      )
      .join(' ');
    expect(html).toContain('Demo');
    expect(html).toContain('Result');
    expect(html).toContain('Unanalyzed');
    expect(html).toContain('Reference');
    expect(html).not.toContain('Your variant');
    expect(html).toContain('stroke-width="1.5"');
  });
});
