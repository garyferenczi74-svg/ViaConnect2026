/**
 * Prompt 226e: Peptide Education landing bento wiring + copy guards.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  STATEMENT_A_G36,
  STATEMENT_B_BODY,
  STATEMENT_B_HEADING,
  PEPTIDE_EDUCATION_BENTO_TILES,
} from '@/components/peptide-protocol/peptideEducationBentoConfig';

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('Prompt 226e statements', () => {
  it('Statement B is verbatim', () => {
    expect(STATEMENT_B_HEADING).toBe('Discuss with your practitioner');
    expect(STATEMENT_B_BODY).toBe(
      'Educational peptide material only. Clinical context, monitoring considerations, and contraindication classes are available to authenticated practitioners. Ask your qualified practitioner to review frameworks with you. No dosing, reconstitution, or sourcing guidance is provided on ViaConnect.',
    );
  });

  it('Statement A is G36 replacement without banned phrases', () => {
    expect(STATEMENT_A_G36).toBe(
      'Your Hannah peptide summary, including detected CAQ patterns, your evidence-matched education results, and your logged history, is automatically pre-filled when you connect with a provider through ViaConnect™',
    );
    const lower = STATEMENT_A_G36.toLowerCase();
    expect(lower).not.toContain('protocol summary');
    expect(lower).not.toContain('recommended stack');
    expect(lower).not.toContain('cycling schedule');
  });
});

describe('Prompt 226e index wiring', () => {
  const page = read('src/app/(app)/(consumer)/peptide-protocol/page.tsx');
  const bento = read('src/components/peptide-protocol/PeptideEducationBento.tsx');
  const banner = read('src/components/peptide-protocol/PeptideDisclaimerBanner.tsx');
  const config = read('src/components/peptide-protocol/peptideEducationBentoConfig.ts');

  it('landing uses bento hub and keeps disclaimer banner', () => {
    expect(page).toContain('PeptideEducationBento');
    expect(page).toContain('PeptideDisclaimerBanner');
    expect(page).not.toContain('PersonalizedPeptideStack');
    expect(page).not.toContain('PeptideSuggestionsClient');
    expect(page).not.toContain('KbPeptideCatalogSection');
    expect(page).not.toContain('PeptidePractitionerAccess');
  });

  it('disclaimer still titled Important: Peptide Wellness Disclaimer', () => {
    expect(banner).toContain('Important: Peptide Wellness Disclaimer');
  });

  it('does not hardcode monograph counts 112 or 21', () => {
    expect(config).not.toMatch(/\b112\b/);
    expect(config).not.toMatch(/\b21\b/);
    expect(bento).not.toMatch(/\b112\b/);
    expect(bento).toContain('countsOk');
    expect(page).toContain('countsOk');
  });

  it('My Protocols title remains allowlisted as a person-authored regimen surface', () => {
    expect(config).toContain("title: 'My Protocols'");
    expect(config).toContain('Prescriber-issued and self-entered regimens');
    expect(config).toContain('G28');
  });

  it('renders Statement A G36 and Statement B testids', () => {
    expect(bento).toContain('STATEMENT_A_G36');
    expect(bento).toContain('STATEMENT_B_BODY');
    expect(bento).toContain('peptide-statement-a-g36');
    expect(bento).toContain('discuss-with-practitioner-pathway');
  });

  it('uses shared BentoTile', () => {
    expect(bento).toContain("from '@/components/ui/BentoTile'");
  });

  it('defines eight tiles with pending directories', () => {
    expect(PEPTIDE_EDUCATION_BENTO_TILES).toHaveLength(8);
    expect(PEPTIDE_EDUCATION_BENTO_TILES.filter((t) => t.pending).map((t) => t.id)).toEqual([
      'practitioner',
      'naturopath',
    ]);
  });
});

describe('Prompt 226e thin destinations exist; converter untouched', () => {
  it('suggestions and browse pages wrap existing components', () => {
    const suggestions = read(
      'src/app/(app)/(consumer)/peptide-protocol/suggestions/page.tsx',
    );
    const browse = read('src/app/(app)/(consumer)/peptide-protocol/browse/page.tsx');
    expect(suggestions).toContain('PeptideSuggestionsClient');
    expect(browse).toContain('KbPeptideCatalogSection');
  });

  it('converter / literacy / my-protocols pages were not rewritten by 226e', () => {
    const converter = read(
      'src/app/(app)/(consumer)/peptide-protocol/converter/page.tsx',
    );
    const literacy = read(
      'src/app/(app)/(consumer)/peptide-protocol/literacy/page.tsx',
    );
    const my = read('src/app/(app)/(consumer)/peptide-protocol/my-protocols/page.tsx');
    expect(converter).toContain('ConcentrationConverterClient');
    expect(literacy).toContain('ProtocolLiteracyClient');
    expect(my).toContain('MyPrescribedPeptidesClient');
  });
});
