import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { VariantRowChip } from '../VariantRowChip';
import type { VariantRowChipKind } from '@/lib/genetics/variantRowChip';

describe('VariantRowChip render', () => {
  it('renders locked honesty chips and never Your variant or GeneX-M', () => {
    const kinds: VariantRowChipKind[] = [
      'demo',
      'unanalyzed',
      'reference',
      'your_upload',
      'genex360',
      'genexm',
    ];
    const html = kinds
      .map((kind) => renderToStaticMarkup(<VariantRowChip kind={kind} />))
      .join(' ');
    expect(html).toContain('Demo');
    expect(html).toContain('Unanalyzed');
    expect(html).toContain('Reference');
    expect(html).toContain('your upload');
    expect(html).toContain('GENEX360');
    expect(html).toContain('GeneXM');
    expect(html).not.toContain('GeneX-M');
    expect(html).not.toContain('Result');
    expect(html).not.toContain('Your variant');
    expect(html).toContain('stroke-width="1.5"');
  });
});
