/**
 * Brief 18 (Gary/Hermes correction): browse cards open live
 * peptide_education_entries by entry_key. User chrome is not monographs.
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  dropsEducationCompound,
  extractPmids,
  formatProvenance,
  isAllowlistedNonPeptide,
  isSafeEntryKey,
  isThanosAllowlistedEntryKey,
  mapEducationRow,
  THANOS_CONSUMER_ENTRY_KEYS,
} from '@/lib/peptides/educationEntryFields';

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), 'utf8');
}

const USER_CHROME = [
  'src/components/peptide-protocol/KbPeptideCatalogSection.tsx',
  'src/components/peptide-protocol/PeptideEducationEntryDetail.tsx',
  'src/components/peptide-protocol/PeptideEducationBento.tsx',
  'src/components/peptide-protocol/peptideEducationBentoConfig.ts',
  'src/components/peptide-protocol/PeptideProtocolHeroShell.tsx',
  'src/app/(app)/(consumer)/peptide-protocol/browse/page.tsx',
  'src/app/(app)/(consumer)/peptide-protocol/page.tsx',
  'src/app/(app)/(consumer)/peptide-protocol/peptide/[entryKey]/page.tsx',
  'src/components/landing/LandingNav.tsx',
] as const;

const OPS_JARGON =
  /Marshall-gated|Collection 14|Education Seed|seeded-corpus|seeded corpus/i;

const NUMERIC_DOSE_LEXICON =
  /\b\d+(\.\d+)?\s*(mcg|mg\/kg|IU|ml BAC|BAC water)\b/i;

const PURCHASE =
  /\/shop\/product|add to cart|checkout|buy now|priceRange|Add to bag/i;

describe('Brief 18 cards bind to peptide_education_entries.entry_key', () => {
  const catalog = read('src/components/peptide-protocol/KbPeptideCatalogSection.tsx');
  const browse = read('src/app/(app)/(consumer)/peptide-protocol/browse/page.tsx');
  const detailPage = read(
    'src/app/(app)/(consumer)/peptide-protocol/peptide/[entryKey]/page.tsx',
  );
  const detail = read('src/components/peptide-protocol/PeptideEducationEntryDetail.tsx');
  const loader = read('src/lib/peptides/educationEntries.ts');

  it('catalog cards are links to /peptide-protocol/peptide/:entry_key', () => {
    expect(catalog).toContain("from 'next/link'");
    expect(catalog).toContain(
      'href={`/peptide-protocol/peptide/${encodeURIComponent(entry.entryKey)}`}',
    );
    expect(catalog).toContain('data-testid={`kb-peptide-card-${entry.entryKey}`}');
    expect(catalog).toMatch(/<Link[\s\S]*kb-peptide-card-/);
    expect(catalog).not.toContain('/peptide-protocol/browse/${');
  });

  it('does not leave EducationCard as a static unclickable div', () => {
    expect(catalog).not.toMatch(
      /function EducationCard[\s\S]*<div\s+data-testid={`kb-peptide-card/,
    );
  });

  it('browse and detail load active consumer education rows only', () => {
    expect(browse).toContain('loadConsumerEducationEntries');
    expect(browse).not.toContain('loadConsumerPeptideCatalog');
    expect(browse).not.toContain('loadConsumerPeptideBySlug');
    expect(detailPage).toContain('loadConsumerEducationEntryByKey');
    expect(detailPage).toContain('PeptideEducationEntryDetail');
    expect(detailPage).toContain('notFound');
    expect(loader).toContain(".from('peptide_education_entries')");
    expect(loader).toContain(".eq('is_active', true)");
    expect(loader).toContain(".in('entry_key', [...THANOS_CONSUMER_ENTRY_KEYS])");
    expect(loader).toContain('isThanosAllowlistedEntryKey');
  });

  it('does not keep the kb_peptides slug monograph route', () => {
    expect(
      existsSync(
        path.join(
          ROOT,
          'src/app/(app)/(consumer)/peptide-protocol/browse/[slug]/page.tsx',
        ),
      ),
    ).toBe(false);
    expect(
      existsSync(
        path.join(ROOT, 'src/components/peptide-protocol/KbPeptideMonograph.tsx'),
      ),
    ).toBe(false);
    const consumerLoader = read('src/lib/kb/peptides/loadConsumerPeptides.ts');
    const types = read('src/lib/kb/peptides/types.ts');
    expect(consumerLoader).not.toContain('loadConsumerPeptideBySlug');
    expect(consumerLoader).not.toContain('ConsumerPeptideMonograph');
    expect(consumerLoader).not.toMatch(/Collection 14/i);
    expect(types).not.toContain('ConsumerPeptideMonograph');
    expect(loader).not.toContain('topic_keys');
    expect(loader).not.toContain('topicKeys');
    const fields = read('src/lib/peptides/educationEntryFields.ts');
    expect(fields).not.toContain('topic_keys');
    expect(fields).not.toContain('topicKeys');
  });

  it('keeps existing chrome and Lucide 1.5', () => {
    expect(detailPage).toContain('PeptideProtocolHeroShell');
    expect(detailPage).toContain('PeptideEducationTabs');
    expect(detail).toContain('strokeWidth={1.5}');
    expect(detail).not.toMatch(/strokeWidth=\{(?:1|2|2\.5|3)\}/);
    expect(catalog).toContain('strokeWidth={1.5}');
  });

  it('uses 390 and 1280 responsive stacks', () => {
    expect(catalog).toContain('grid-cols-1');
    expect(catalog).toContain('sm:grid-cols-2');
    expect(catalog).toContain('min-h-[44px]');
    expect(detail).toContain('grid-cols-1');
    expect(detail).toContain('sm:grid-cols-2');
    expect(detail).toContain('sm:flex-row');
    expect(detail).toContain('min-h-[44px]');
  });
});

describe('Brief 18 live count and copy guards', () => {
  it('does not hardcode counts 114, 112, or 21 on user chrome', () => {
    for (const rel of USER_CHROME) {
      const src = read(rel);
      expect(src, rel).not.toMatch(/\b114\b/);
      expect(src, rel).not.toMatch(/\b112\b/);
      expect(src, rel).not.toMatch(/\b21\b/);
    }
  });

  it('search chrome uses live educational-entry count, not monograph/category copy', () => {
    const catalog = read('src/components/peptide-protocol/KbPeptideCatalogSection.tsx');
    const bento = read('src/components/peptide-protocol/PeptideEducationBento.tsx');
    const index = read('src/app/(app)/(consumer)/peptide-protocol/page.tsx');
    expect(catalog).toContain('educational entries');
    expect(bento).toContain('educational entries');
    expect(bento).toContain('entryCount');
    expect(index).toContain('entryCount');
    expect(catalog.toLowerCase()).not.toContain('monograph');
    expect(bento.toLowerCase()).not.toContain('monograph');
    expect(bento.toLowerCase()).not.toContain('categories');
  });

  it('strips ops jargon from browse chrome and hero', () => {
    for (const rel of USER_CHROME) {
      expect(read(rel), rel).not.toMatch(OPS_JARGON);
    }
  });

  it('does not invent Hannah blurbs from summary', () => {
    const catalog = read('src/components/peptide-protocol/KbPeptideCatalogSection.tsx');
    const detail = read('src/components/peptide-protocol/PeptideEducationEntryDetail.tsx');
    const loader = read('src/lib/peptides/educationEntries.ts');
    const fields = read('src/lib/peptides/educationEntryFields.ts');
    expect(catalog).not.toMatch(/entry\.summary|mechanismSummary/);
    expect(detail).not.toMatch(/entry\.summary|mechanismSummary/);
    expect(loader).not.toContain('summary');
    expect(fields).not.toContain('summary');
    expect(catalog).toContain('Open entry');
    expect(detail).toContain('Not available');
    expect(detail).toContain('entry-mechanism');
    expect(detail).toContain('entry-safety');
    expect(detail).toContain('entry-regulatory');
    expect(detail).toContain('entry-pmids');
    expect(detail).toContain('entry-provenance');
  });

  it('browse and entry detail stay educational: no catalog doses, purchase, or Semaglutide copy', () => {
    const files = [
      ...USER_CHROME,
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

  it('does not expand converter syringe math onto browse or entry detail', () => {
    const catalog = read('src/components/peptide-protocol/KbPeptideCatalogSection.tsx');
    const detail = read('src/components/peptide-protocol/PeptideEducationEntryDetail.tsx');
    const page = read('src/app/(app)/(consumer)/peptide-protocol/browse/page.tsx');
    const detailPage = read(
      'src/app/(app)/(consumer)/peptide-protocol/peptide/[entryKey]/page.tsx',
    );
    for (const src of [catalog, detail, page, detailPage]) {
      expect(src).not.toContain('ConcentrationConverterClient');
      expect(src).not.toContain('converterMath');
      expect(src).not.toContain('SyringeUnitScale');
    }
    expect(detail.toLowerCase()).not.toContain('how to reconstitute');
  });
});

describe('Brief 18 practitioner waitlist and marketing nav', () => {
  it('Find a Practitioner points at /practitioners, not /find-practitioner', () => {
    const config = read('src/components/peptide-protocol/peptideEducationBentoConfig.ts');
    expect(config).toContain("href: '/practitioners'");
    expect(config).not.toContain('/find-practitioner');
    const practitioner = config.slice(config.indexOf("id: 'practitioner'"));
    expect(practitioner).toContain('pending: false');
  });

  it('public marketing nav links Peptide Education to /peptide-protocol/browse', () => {
    const nav = read('src/components/landing/LandingNav.tsx');
    expect(nav).toContain('href="/peptide-protocol/browse"');
    expect(nav).toContain('Peptide Education');
    expect(nav).not.toContain("id: 'peptide-education'");
  });

  it('Search tab stays active on the entry_key detail route', () => {
    const tabs = read(
      'src/components/peptide-protocol/converter/PeptideEducationTabs.tsx',
    );
    expect(tabs).toContain("pathname.startsWith('/peptide-protocol/peptide')");
  });
});

describe('Brief 18 Thanos allowlist', () => {
  it('binds only the 35 Thanos entry_keys and no extras', () => {
    const expected = [
      'edu-aod-9604',
      'edu-bpc157',
      'edu-bronchogen-aedl',
      'edu-cdk5-inhibitory-peptides',
      'edu-cerebrolysin',
      'edu-cjc1295-no-dac',
      'edu-dihexa',
      'edu-epitalon',
      'edu-fr-alpha-binding',
      'edu-generative-ai-peptide-design',
      'edu-ghk-cu',
      'edu-ipamorelin',
      'edu-kpv',
      'edu-melanotan-2',
      'edu-mots-c',
      'edu-peptide-drug-conjugates',
      'edu-peptideiq-topic-map',
      'edu-pinealon',
      'edu-pt141-bremelanotide',
      'edu-retatrutide',
      'edu-selank',
      'edu-semax',
      'edu-sermorelin',
      'edu-ss31',
      'edu-tb500-thymosin-beta4',
      'edu-tesamorelin',
      'edu-tesofensine-pause',
      'edu-therapeutic-peptide-chem-strategies',
      'edu-thymosin-alpha1',
      'edu-uacd-acps',
      'edu-vilon-ke',
      'edu-5-amino-1mq-nonpeptide',
      'edu-slu-pp-332-nonpeptide',
      'depth-bpc157-framework',
      'depth-ss31-framework',
    ];
    expect([...THANOS_CONSUMER_ENTRY_KEYS].sort()).toEqual([...expected].sort());
    expect(THANOS_CONSUMER_ENTRY_KEYS).toHaveLength(35);
    expect(new Set(THANOS_CONSUMER_ENTRY_KEYS).size).toBe(35);
    expect(THANOS_CONSUMER_ENTRY_KEYS).not.toContain('bpc-157-arginate');
    expect(THANOS_CONSUMER_ENTRY_KEYS).not.toContain('edu-bpc157-arginate');
    expect(THANOS_CONSUMER_ENTRY_KEYS.some((key) => /semaglutide/i.test(key))).toBe(
      false,
    );
    expect(isThanosAllowlistedEntryKey('edu-bpc157')).toBe(true);
    expect(isThanosAllowlistedEntryKey('edu-peptideiq-topic-map')).toBe(true);
    expect(isThanosAllowlistedEntryKey('bpc-157-arginate')).toBe(false);
    expect(isThanosAllowlistedEntryKey('edu-semaglutide')).toBe(false);
  });

  it('labels only the two non-peptide keys', () => {
    expect(isAllowlistedNonPeptide('edu-5-amino-1mq-nonpeptide')).toBe(true);
    expect(isAllowlistedNonPeptide('edu-slu-pp-332-nonpeptide')).toBe(true);
    expect(isAllowlistedNonPeptide('edu-bpc157')).toBe(false);
    expect(isAllowlistedNonPeptide('edu-tesofensine-pause')).toBe(false);
    const catalog = read('src/components/peptide-protocol/KbPeptideCatalogSection.tsx');
    const detail = read('src/components/peptide-protocol/PeptideEducationEntryDetail.tsx');
    expect(catalog).toContain('Not a peptide');
    expect(catalog).toContain('!entry.isPeptide');
    expect(detail).toContain('Not a peptide');
    expect(detail).toContain('!entry.isPeptide');
  });

  it('does not invent retatrutide oral or Semaglutide catalog copy', () => {
    const catalog = read('src/components/peptide-protocol/KbPeptideCatalogSection.tsx');
    const detail = read('src/components/peptide-protocol/PeptideEducationEntryDetail.tsx');
    for (const src of [catalog, detail]) {
      expect(src.toLowerCase()).not.toContain('oral retatrutide');
      expect(src.toLowerCase()).not.toContain('semaglutide');
    }
  });
});

describe('Brief 18 education entry helpers', () => {
  it('accepts live entry_keys and rejects unsafe paths', () => {
    expect(isSafeEntryKey('edu-bpc157')).toBe(true);
    expect(isSafeEntryKey('edu-ss31')).toBe(true);
    expect(isSafeEntryKey('../secret')).toBe(false);
    expect(isSafeEntryKey('semaglutide?buy=1')).toBe(false);
    expect(isSafeEntryKey('')).toBe(false);
    expect(dropsEducationCompound('edu-semaglutide')).toBe(true);
    expect(dropsEducationCompound('bpc-157-arginate')).toBe(true);
    expect(
      mapEducationRow({
        entry_key: 'edu-semaglutide',
        title: 'Semaglutide educational overview',
      }),
    ).toBeNull();
    expect(
      mapEducationRow({
        entry_key: 'bpc-157-arginate',
        title: 'BPC-157 Arginate',
      }),
    ).toBeNull();
    expect(
      mapEducationRow({
        entry_key: 'edu-extra-invented',
        title: 'Invented extra key',
      }),
    ).toBeNull();
    expect(
      mapEducationRow({
        entry_key: 'edu-bpc157',
        title: 'BPC-157 educational overview',
        mechanism: 'Angiogenic research signals.',
        evidence_grade: 'moderate',
      })?.entryKey,
    ).toBe('edu-bpc157');
    expect(
      mapEducationRow({
        entry_key: 'edu-5-amino-1mq-nonpeptide',
        title: '5-Amino-1MQ educational overview',
      })?.isPeptide,
    ).toBe(false);
  });

  it('extracts PMIDs from live fields and omits search URLs', () => {
    expect(extractPmids([], null)).toEqual([]);
    expect(extractPmids('PMID: 12345678', null)).toEqual(['12345678']);
    expect(extractPmids([], 'https://pubmed.ncbi.nlm.nih.gov/12345678')).toEqual([
      '12345678',
    ]);
    expect(extractPmids([], 'https://pubmed.ncbi.nlm.nih.gov/?term=BPC-157')).toEqual(
      [],
    );
  });

  it('formats provenance from the live row or returns null', () => {
    expect(formatProvenance(null)).toBeNull();
    expect(
      formatProvenance([{ source: 'system-seed', note: 'Catalog seed' }]),
    ).toBe('system-seed · Catalog seed');
  });
});
