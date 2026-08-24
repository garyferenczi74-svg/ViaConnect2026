import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
    ...rest
  }: {
    href: string;
    children?: ReactNode;
    className?: string;
    [key: string]: unknown;
  }) => createElement('a', { href, className, ...rest }, children),
}));

import { KbPeptideCatalogSection } from '../KbPeptideCatalogSection';
import type { EducationEntry } from '@/lib/peptides/educationEntries';

function entry(over: Partial<EducationEntry> & Pick<EducationEntry, 'entryKey' | 'title'>): EducationEntry {
  return {
    isPeptide: true,
    mechanism: null,
    evidenceGrade: 'moderate',
    regulatoryStatus: null,
    safetyContext: null,
    provenanceText: null,
    pmids: [],
    ...over,
  };
}

describe('KbPeptideCatalogSection card mechanism', () => {
  it('renders the live mechanism text on the browse card', () => {
    const html = renderToStaticMarkup(
      <KbPeptideCatalogSection
        total={1}
        entries={[
          entry({
            entryKey: 'edu-bpc157',
            title: 'BPC-157 educational overview',
            mechanism: 'Angiogenic and gut-barrier research signals.',
          }),
        ]}
      />,
    );
    expect(html).toContain('kb-peptide-card-mechanism-edu-bpc157');
    expect(html).toContain('Angiogenic and gut-barrier research signals.');
    expect(html).toContain('Open entry');
    expect(html).not.toContain('Not a peptide');
    const mechanism = html.match(
      /data-testid="kb-peptide-card-mechanism-edu-bpc157"[^>]*>([^<]*)</,
    )?.[1];
    expect(mechanism).toBe('Angiogenic and gut-barrier research signals.');
    expect(mechanism?.toLowerCase()).not.toContain('add to cart');
    expect(mechanism?.toLowerCase()).not.toContain('sku');
    expect(mechanism?.toLowerCase()).not.toContain('reconstitution');
  });

  it('renders Not available when mechanism is empty and keeps the non-peptide badge', () => {
    const html = renderToStaticMarkup(
      <KbPeptideCatalogSection
        total={1}
        entries={[
          entry({
            entryKey: 'edu-tesofensine-pause',
            title: 'Tesofensine regulatory timing note',
            isPeptide: false,
            mechanism: null,
          }),
        ]}
      />,
    );
    expect(html).toContain('kb-peptide-card-mechanism-edu-tesofensine-pause');
    expect(html).toContain('Not available');
    expect(html).toContain('Not a peptide');
    expect(html).toContain('Tesofensine regulatory timing note');
    expect(html).not.toContain('depth-');
    expect(html).not.toMatch(/Collection 14/i);
  });
});
