/**
 * Brief 18: browse cards open live educational monographs.
 * Count is consumer_safe + educational only. No ops jargon on browse chrome.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  isSafePeptideSlug,
  parseHonestyLayer,
} from '@/lib/kb/peptides/types';

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), 'utf8');
}

const BROWSE_CHROME = [
  'src/components/peptide-protocol/KbPeptideCatalogSection.tsx',
  'src/components/peptide-protocol/PeptideProtocolHeroShell.tsx',
  'src/components/peptide-protocol/KbPeptideMonograph.tsx',
  'src/app/(app)/(consumer)/peptide-protocol/browse/page.tsx',
  'src/app/(app)/(consumer)/peptide-protocol/browse/[slug]/page.tsx',
] as const;

const OPS_JARGON =
  /Marshall-gated|Collection 14|Education Seed|seeded-corpus|seeded corpus/i;

const NUMERIC_DOSE_LEXICON =
  /\b\d+(\.\d+)?\s*(mcg|mg\/kg|IU|ml BAC|BAC water)\b/i;

const PURCHASE =
  /\/shop\/product|add to cart|checkout|buy now|priceRange|Add to bag/i;

describe('Brief 18 browse cards open monographs', () => {
  const catalog = read('src/components/peptide-protocol/KbPeptideCatalogSection.tsx');
  const monographPage = read(
    'src/app/(app)/(consumer)/peptide-protocol/browse/[slug]/page.tsx',
  );
  const monograph = read('src/components/peptide-protocol/KbPeptideMonograph.tsx');
  const loader = read('src/lib/kb/peptides/loadConsumerPeptides.ts');

  it('catalog cards are links to /peptide-protocol/browse/[slug]', () => {
    expect(catalog).toContain("from 'next/link'");
    expect(catalog).toContain(
      'href={`/peptide-protocol/browse/${encodeURIComponent(peptide.slug)}`}',
    );
    expect(catalog).toContain('data-testid={`kb-peptide-card-${peptide.slug}`}');
    expect(catalog).toMatch(/<Link[\s\S]*kb-peptide-card-/);
  });

  it('does not leave EducationCard as a static unclickable div', () => {
    expect(catalog).not.toMatch(
      /function EducationCard[\s\S]*<div\s+data-testid={`kb-peptide-card/,
    );
  });

  it('monograph route loads consumer_safe educational rows only', () => {
    expect(monographPage).toContain('loadConsumerPeptideBySlug');
    expect(monographPage).toContain('KbPeptideMonograph');
    expect(monographPage).toContain('notFound');
    expect(loader).toContain('export async function loadConsumerPeptideBySlug');
    expect(loader).toContain(".eq('consumer_safe', true)");
    expect(loader).toContain(".eq('exclusion_tier', 'educational')");
  });

  it('keeps existing chrome and Lucide 1.5', () => {
    expect(monographPage).toContain('PeptideProtocolHeroShell');
    expect(monographPage).toContain('PeptideEducationTabs');
    expect(monograph).toContain('strokeWidth={1.5}');
    expect(monograph).not.toMatch(/strokeWidth=\{(?:1|2|2\.5|3)\}/);
    expect(catalog).toContain('strokeWidth={1.5}');
  });

  it('uses 390 and 1280 responsive stacks', () => {
    expect(catalog).toContain('grid-cols-1');
    expect(catalog).toContain('sm:grid-cols-2');
    expect(catalog).toContain('min-h-[44px]');
    expect(monograph).toContain('grid-cols-1');
    expect(monograph).toContain('sm:grid-cols-2');
    expect(monograph).toContain('sm:flex-row');
    expect(monograph).toContain('min-h-[44px]');
  });
});

describe('Brief 18 live count and copy guards', () => {
  it('does not hardcode monograph counts 114, 112, or 21 on browse chrome', () => {
    for (const rel of BROWSE_CHROME) {
      const src = read(rel);
      expect(src, rel).not.toMatch(/\b114\b/);
      expect(src, rel).not.toMatch(/\b112\b/);
      expect(src, rel).not.toMatch(/\b21\b/);
    }
    const bento = read('src/components/peptide-protocol/PeptideEducationBento.tsx');
    const config = read('src/components/peptide-protocol/peptideEducationBentoConfig.ts');
    expect(bento).not.toMatch(/\b114\b/);
    expect(config).not.toMatch(/\b114\b/);
    expect(bento).toContain('countsOk');
  });

  it('strips ops jargon from browse chrome and hero', () => {
    for (const rel of BROWSE_CHROME) {
      expect(read(rel), rel).not.toMatch(OPS_JARGON);
    }
  });

  it('browse and monograph stay educational: no catalog doses, purchase, or Semaglutide', () => {
    const files = [
      ...BROWSE_CHROME,
      'src/lib/kb/peptides/loadConsumerPeptides.ts',
      'src/components/peptide-protocol/PeptideSuggestionsClient.tsx',
      'src/lib/peptides/protocolLiteracy.ts',
    ];
    for (const rel of files) {
      const src = read(rel);
      expect(src, rel).not.toMatch(NUMERIC_DOSE_LEXICON);
      expect(src, rel).not.toMatch(PURCHASE);
      expect(src, rel).not.toMatch(/semaglutide/i);
    }
  });

  it('does not expand converter syringe math onto browse or monograph', () => {
    const catalog = read('src/components/peptide-protocol/KbPeptideCatalogSection.tsx');
    const monograph = read('src/components/peptide-protocol/KbPeptideMonograph.tsx');
    const page = read('src/app/(app)/(consumer)/peptide-protocol/browse/page.tsx');
    const slugPage = read(
      'src/app/(app)/(consumer)/peptide-protocol/browse/[slug]/page.tsx',
    );
    for (const src of [catalog, monograph, page, slugPage]) {
      expect(src).not.toContain('ConcentrationConverterClient');
      expect(src).not.toContain('converterMath');
      expect(src).not.toContain('SyringeUnitScale');
    }
    expect(monograph.toLowerCase()).not.toContain('how to reconstitute');
  });
});

describe('Brief 18 monograph helpers', () => {
  it('accepts live slugs and rejects unsafe paths', () => {
    expect(isSafePeptideSlug('bpc-157-arginate')).toBe(true);
    expect(isSafePeptideSlug('epitalon')).toBe(true);
    expect(isSafePeptideSlug('../secret')).toBe(false);
    expect(isSafePeptideSlug('semaglutide?buy=1')).toBe(false);
    expect(isSafePeptideSlug('')).toBe(false);
  });

  it('parses honesty counts without inventing numbers', () => {
    expect(parseHonestyLayer(null)).toEqual({
      trialsRegistered: null,
      trialsCompleted: null,
      trialsWithResultsPosted: null,
      publicationsHuman: null,
    });
    expect(
      parseHonestyLayer({
        trials_registered: 3,
        trials_completed: 1,
        trials_with_results_posted: 'UNKNOWN',
        publications_human: 0,
      }),
    ).toEqual({
      trialsRegistered: 3,
      trialsCompleted: 1,
      trialsWithResultsPosted: 'UNKNOWN',
      publicationsHuman: 0,
    });
  });
});
