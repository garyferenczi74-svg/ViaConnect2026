/**
 * Prompt 225 surface guards: dose lexicon, commerce redirects, no package churn.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(path.join(root, rel), 'utf8');
}

const NUMERIC_DOSE_LEXICON =
  /\b\d+(\.\d+)?\s*(mcg|mg\/kg|IU|ml BAC|BAC water)\b/i;

describe('Prompt 225 education surface guards', () => {
  it('consumer browse uses live peptide_education_entries, not static registry', () => {
    const page = read('src/app/(app)/(consumer)/peptide-protocol/browse/page.tsx');
    expect(page).toContain('KbPeptideCatalogSection');
    expect(page).toContain('loadConsumerEducationEntries');
    expect(page).not.toContain('loadConsumerPeptideCatalog');
    expect(page).not.toContain("from '@/components/peptide-protocol/PeptideCatalogSection'");
    expect(page).not.toContain('@/config/peptide-database');
  });

  it('Kb catalog, education entry, and loaders omit dose field names and numeric dose instructions', () => {
    const catalog = read('src/components/peptide-protocol/KbPeptideCatalogSection.tsx');
    const detail = read('src/components/peptide-protocol/PeptideEducationEntryDetail.tsx');
    const educationLoader = read('src/lib/peptides/educationEntries.ts');
    const consumerLoader = read('src/lib/kb/peptides/loadConsumerPeptides.ts');
    const practitionerLoader = read('src/lib/kb/peptides/loadPractitionerPeptides.ts');
    for (const src of [catalog, detail, educationLoader, consumerLoader, practitionerLoader]) {
      expect(src).not.toMatch(/\bdosingForms\b/);
      expect(src).not.toMatch(/\bcycleProtocol\b/);
      expect(src).not.toMatch(/\bpriceRange\b/);
      expect(src).not.toMatch(NUMERIC_DOSE_LEXICON);
    }
  });

  it('CyclingProtocolCard no longer renders dosage or cycle schedules', () => {
    const src = read('src/components/peptide-protocol/CyclingProtocolCard.tsx');
    expect(src).not.toMatch(/\{item\.dosage\}/);
    expect(src).not.toMatch(/\{item\.frequency\}/);
    expect(src).not.toMatch(/getCycleLabel/);
    expect(src).toContain('Educational framing only');
  });

  it('shop peptide routes remain redirect-only (no commerce)', () => {
    const index = read('src/app/(app)/(consumer)/shop/peptides/page.tsx');
    const slug = read('src/app/(app)/(consumer)/shop/peptides/[slug]/page.tsx');
    expect(index).toContain("redirect('/peptide-protocol')");
    expect(slug).toContain("redirect('/peptide-protocol')");
    expect(index).not.toMatch(/price|cart|checkout|Add to/i);
    expect(slug).not.toMatch(/price|cart|checkout|Add to/i);
  });

  it('Wave 3 NEW seed SQL exists and forbids dose keys in practitioner_depth path via schema migration', () => {
    expect(
      existsSync('supabase/migrations/20260820130000_prompt_225_kb_peptides.sql'),
    ).toBe(true);
    expect(
      existsSync('supabase/migrations/20260820132000_prompt_225_new_seed.sql'),
    ).toBe(true);
    const schema = read('supabase/migrations/20260820130000_prompt_225_kb_peptides.sql');
    expect(schema).toContain('kb_peptides_practitioner_depth_no_dose');
    expect(schema).toContain("'dose'");
    expect(schema).toContain("'reconstitution'");
  });
});
