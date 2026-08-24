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
import { PeptideEducationEntryDetail } from '../PeptideEducationEntryDetail';
import type { EducationEntry } from '@/lib/peptides/educationEntryFields';

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

function readMechanism(html: string, entryKey: string): string | undefined {
  return html.match(
    new RegExp(`data-testid="kb-peptide-card-mechanism-${entryKey}"[^>]*>([^<]*)<`),
  )?.[1];
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
            mechanism: 'Live educational purpose from peptide_education_entries.mechanism.',
          }),
        ]}
      />,
    );
    expect(html).toContain('kb-peptide-card-mechanism-edu-bpc157');
    expect(html).toContain('Used for');
    expect(html).toContain('Live educational purpose from peptide_education_entries.mechanism.');
    expect(html).toContain('Open entry');
    expect(html).not.toContain('Not a peptide');
    expect(html).not.toContain('mechanismSummary');
    expect(html).not.toMatch(/gastric-derived peptide|purpose-rewritten/i);
    const mechanism = readMechanism(html, 'edu-bpc157');
    expect(mechanism).toBe(
      'Live educational purpose from peptide_education_entries.mechanism.',
    );
    expect(mechanism?.toLowerCase()).not.toContain('add to cart');
    expect(mechanism?.toLowerCase()).not.toContain('sku');
    expect(mechanism?.toLowerCase()).not.toContain('reconstitution');
  });

  it('renders Not available when mechanism is empty, whitespace, or null', () => {
    for (const mechanism of [null, '', '   ']) {
      const html = renderToStaticMarkup(
        <KbPeptideCatalogSection
          total={1}
          entries={[
            entry({
              entryKey: 'edu-tesofensine-pause',
              title: 'Tesofensine regulatory timing note',
              isPeptide: false,
              mechanism,
            }),
          ]}
        />,
      );
      expect(html).toContain('kb-peptide-card-mechanism-edu-tesofensine-pause');
      expect(readMechanism(html, 'edu-tesofensine-pause')).toBe('Not available');
      expect(html).toContain('Used for');
      expect(html).toContain('Not a peptide');
      expect(html).toContain('Tesofensine regulatory timing note');
      expect(html).not.toContain('depth-');
      expect(html).not.toMatch(/Collection 14/i);
    }
  });

  it('keeps the same live mechanism field on the detail page', () => {
    const populated = renderToStaticMarkup(
      <PeptideEducationEntryDetail
        entry={entry({
          entryKey: 'edu-bpc157',
          title: 'BPC-157 educational overview',
          mechanism: 'Live educational purpose from peptide_education_entries.mechanism.',
        })}
      />,
    );
    expect(populated).toContain('entry-mechanism');
    expect(populated).toContain('Used for');
    expect(populated).toContain(
      'Live educational purpose from peptide_education_entries.mechanism.',
    );
    expect(populated).not.toContain('mechanismSummary');

    const empty = renderToStaticMarkup(
      <PeptideEducationEntryDetail
        entry={entry({
          entryKey: 'edu-tesofensine-pause',
          title: 'Tesofensine regulatory timing note',
          isPeptide: false,
          mechanism: '  ',
        })}
      />,
    );
    expect(empty).toContain('entry-mechanism');
    expect(empty).toContain('Not available');
    expect(empty).toContain('Not a peptide');
  });
});
