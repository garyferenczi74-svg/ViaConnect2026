/**
 * Prompt 226h Wave A: preparation class separation + provenance grade caps.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  applyProvenanceGradeCap,
  BIOREGULATOR_PROVENANCE_DISCLOSURE_226H,
  formatProvenanceCounts,
  isConsumerRetrievablePublication,
  isEvidenceSingleSource,
} from '@/lib/peptides/gradeCap226h';
import {
  mayLinkEvidence,
  preparationClassesConflict,
} from '@/lib/peptides/preparationClass226h';

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('G55 preparation class separation', () => {
  it('conflicts extract vs synthetic both ways', () => {
    expect(
      preparationClassesConflict('tissue_extract', 'synthetic_defined'),
    ).toBe(true);
    expect(
      preparationClassesConflict('synthetic_defined', 'tissue_extract'),
    ).toBe(true);
    expect(
      preparationClassesConflict('tissue_extract', 'tissue_extract'),
    ).toBe(false);
    expect(
      preparationClassesConflict('tissue_extract', 'not_applicable'),
    ).toBe(false);
  });

  it('Thymalin study cannot support Thymogen; Epithalamin cannot support Epitalon', () => {
    expect(
      mayLinkEvidence({
        studiedClass: 'tissue_extract',
        targetClass: 'synthetic_defined',
      }),
    ).toBe(false);
    expect(
      mayLinkEvidence({
        studiedClass: 'synthetic_defined',
        targetClass: 'tissue_extract',
      }),
    ).toBe(false);
    expect(
      mayLinkEvidence({
        studiedClass: 'tissue_extract',
        targetClass: 'tissue_extract',
      }),
    ).toBe(true);
  });
});

describe('G50 provenance grade caps', () => {
  it('single-source high volume cannot exceed C', () => {
    const result = applyProvenanceGradeCap('A', {
      institutionalConcentration: 0.95,
      distinctAuthorNetworks: 1,
      independentReplicationCount: 0,
    });
    expect(result.grade).toBe('C');
    expect(result.reasons).toContain('single_author_network_cap_C');
    expect(isEvidenceSingleSource(0.95)).toBe(true);
  });

  it('independent replication can keep B when not single-source', () => {
    const result = applyProvenanceGradeCap('B', {
      institutionalConcentration: 0.4,
      distinctAuthorNetworks: 3,
      independentReplicationCount: 2,
      bestSourceTier: 2,
    });
    expect(result.grade).toBe('B');
  });

  it('unreviewed machine translation caps at D and blocks consumer retrieval', () => {
    const result = applyProvenanceGradeCap('B', {
      institutionalConcentration: 0.2,
      distinctAuthorNetworks: 2,
      independentReplicationCount: 1,
      translationMethod: 'machine_translation',
      translationReviewed: false,
    });
    expect(result.grade).toBe('D');
    expect(
      isConsumerRetrievablePublication({
        translationMethod: 'machine_translation',
        translationReviewedBy: null,
        sourceTier: 2,
      }),
    ).toBe(false);
  });

  it('formats provenance counts honestly', () => {
    expect(
      formatProvenanceCounts({
        publicationCount: 41,
        distinctAuthorNetworks: 2,
        largestNetworkCount: 38,
        independentReplicationCount: 0,
      }),
    ).toBe(
      '41 publications, from 2 distinct research groups. 38 of 41 from one institution. Independent replication of the primary effect: none identified.',
    );
  });
});

describe('226h migration and disclosure', () => {
  const sql = read(
    'supabase/migrations/20260821220000_prompt_226h_provenance_preparation_class.sql',
  );

  it('migration defines preparation_class, trigger, and registry columns', () => {
    expect(sql).toContain('preparation_class');
    expect(sql).toContain('derived_from_peptide_id');
    expect(sql).toContain('enforce_preparation_class_evidence_link');
    expect(sql).toContain('SET search_path = public');
    expect(sql).toContain('source_tier');
    expect(sql).toContain('translation_method');
    expect(sql).toContain('kb_evidence_link_rejections');
    // Trigger raises only; durable audit is written by ingest writers.
    expect(sql).toContain('Raise only');
  });

  it('keeps ICTRP pending and blocks trialsearch', () => {
    expect(sql).toContain("status = 'pending_access'");
    expect(sql).toContain('trialsearch.who.int');
    expect(sql).toContain("registry_status = 'blocked'");
  });

  it('ships Lex-ready bioregulator disclosure without banned tokens', () => {
    expect(BIOREGULATOR_PROVENANCE_DISCLOSURE_226H).toContain(
      'single research institution',
    );
    expect(sql).toContain(BIOREGULATOR_PROVENANCE_DISCLOSURE_226H);
    expect(sql.toLowerCase()).not.toMatch(/semaglutide/);
    expect(sql).not.toMatch(/[\u2013\u2014]/);
    expect(BIOREGULATOR_PROVENANCE_DISCLOSURE_226H).not.toMatch(/[\u2013\u2014]/);
  });

  it('backfills extract/synthetic pairs', () => {
    expect(sql).toContain("'epithalamin', 'thymalin'");
    expect(sql).toContain("'epitalon', 'edu-epitalon'");
    expect(sql).toContain("'thymogen'");
  });
});
