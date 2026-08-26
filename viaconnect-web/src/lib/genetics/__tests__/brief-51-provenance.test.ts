/**
 * Brief 51: provenance on every gene-touched line.
 * Three cases: 0-row honest empty, real GeneXM/GENEX360 row, Demo Explorer.
 * Fail vs empty stay separate. CYP2C9 rs1799853 stays pending.
 * User-facing copy is GeneXM, never GeneX-M.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { protocolChangeLine } from '../protocolChangeLine';
import { mayShowMthfrFolate } from '../mthfrFolate';
import { hubHeaderBadge, resolveGeneticsUploadState } from '../geneticsUploadState';
import {
  dashboardGeneticsSentence,
  geneRowProofFromFacts,
  sentenceImpliesUpload,
  sentenceSaysNotUploaded,
  CYP2C9_RS1799853,
} from '../geneLineProvenance';
import { variantRowChip } from '../variantRowChip';
import { chipForProtocolSource, buildProtocolHomework } from '@/lib/supplements/protocolHomework';
import { PREVIEW_VARIANTS } from '@/components/landing/scroll-sections/shared/variantsExplorerPreview';
import { auditGenex360Coverage, cyp2c9Rs1799853Coverage } from '@/lib/elysium/coverage';
import { emptyOkHubPayload, errorHubPayload, unauthorizedHubPayload } from '../hubVariantsPayload';

const SURFACES = [
  path.resolve(__dirname, '../geneLineProvenance.ts'),
  path.resolve(__dirname, '../variantRowChip.ts'),
  path.resolve(__dirname, '../geneticsUploadState.ts'),
  path.resolve(__dirname, '../../../components/genetics/VariantRowChip.tsx'),
  path.resolve(__dirname, '../../../components/genetics/hub/YourVariantsCard.tsx'),
  path.resolve(__dirname, '../../../lib/supplements/protocolHomework.ts'),
  path.resolve(
    __dirname,
    '../../../components/landing/scroll-sections/shared/variantsExplorerPreview.ts',
  ),
];

describe('Brief 51 0-row account', () => {
  it('has no rsID calls, no MTHFR folate chip, and Unanalyzed / Not analyzed gene lines', () => {
    const empty = resolveGeneticsUploadState({ variantRows: [] });
    expect(empty).toBe('none');
    expect(mayShowMthfrFolate('nutrigen_dx')).toBe(false);
    expect(
      variantRowChip({
        is_sample: false,
        genotype: null,
        status: null,
        stored_panel_key: 'genex_m',
      }),
    ).toBe('unanalyzed');
    expect(
      hubHeaderBadge({
        isLoading: false,
        loadFailed: false,
        uploadState: 'none',
        totalVariants: 0,
      }),
    ).toBe('0 results');
    expect(emptyOkHubPayload().totalVariants).toBe(0);
    expect(emptyOkHubPayload().loadStatus).toBe('ok');
    expect(protocolChangeLine(null)).toBeNull();
    expect(chipForProtocolSource('GeneXM')).toBeNull();
    expect(chipForProtocolSource('GENEX360')).toBeNull();
    const hw = buildProtocolHomework({
      name: 'MTHFR+',
      source: 'genex_m',
      hasGenexmRow: false,
    });
    expect(hw.inputChip).toBeNull();
  });
});

describe('Brief 51 real-row vs empty Home sentence', () => {
  it('does not say genetics not uploaded when a real GeneXM / GENEX360 row exists', () => {
    const facts = {
      variantRows: [{ is_sample: false, panel_key: 'GENEX-M' }],
    };
    const state = resolveGeneticsUploadState(facts);
    expect(state).toBe('uploaded');
    const copy = dashboardGeneticsSentence({ uploadState: state });
    expect(sentenceSaysNotUploaded(copy)).toBe(false);
    expect(copy).toContain('GeneXM');
    expect(copy).not.toContain('GeneX-M');
    expect(copy.toLowerCase()).toContain('not a diagnosis');
    const proof = geneRowProofFromFacts(facts);
    expect(proof.hasGenexmRow).toBe(true);
    expect(proof.hasGenex360Row).toBe(true);
    expect(chipForProtocolSource('GeneXM', proof)).toBe('from GeneXM');
    expect(chipForProtocolSource('GENEX360', proof)).toBe('from GENEX360');
  });

  it('does not imply an upload when the account is empty', () => {
    const copy = dashboardGeneticsSentence({ uploadState: 'none' });
    expect(sentenceImpliesUpload(copy)).toBe(false);
    expect(copy).toContain('not analyzed');
    expect(copy.toLowerCase()).toContain('not a diagnosis');
    expect(geneRowProofFromFacts({ variantRows: [] })).toEqual({
      hasGenex360Row: false,
      hasGenexmRow: false,
    });
  });

  it('Hannah sample rows alone do not unlock from GeneXM', () => {
    const proof = geneRowProofFromFacts({
      variantRows: [{ is_sample: true, panel_key: 'genex_m' }],
    });
    expect(proof.hasGenexmRow).toBe(false);
    expect(chipForProtocolSource('genex_m', proof)).toBeNull();
    expect(dashboardGeneticsSentence({ uploadState: 'sample_only' })).toContain('Demo');
    expect(sentenceSaysNotUploaded(dashboardGeneticsSentence({ uploadState: 'sample_only' }))).toBe(
      false,
    );
  });
});

describe('Brief 51 fail vs empty', () => {
  it('401 or read fail is UNKNOWN / Unanalyzed, never 0', () => {
    expect(unauthorizedHubPayload().totalVariants).toBeNull();
    expect(errorHubPayload().totalVariants).toBeNull();
    expect(errorHubPayload().loadStatus).toBe('error');
    expect(emptyOkHubPayload().totalVariants).toBe(0);
    const failCopy = dashboardGeneticsSentence({
      uploadState: 'none',
      loadFailed: true,
    });
    expect(failCopy).toContain('Unanalyzed');
    expect(failCopy).not.toMatch(/\b0\b/);
    expect(geneRowProofFromFacts({ variantRows: [], variantsReadFailed: true })).toEqual({
      hasGenex360Row: false,
      hasGenexmRow: false,
    });
  });
});

describe('Brief 51 Demo Explorer and CYP2C9', () => {
  it('keeps Demo Explorer free of genotype / COMT / CLOCK / MTHFR copy', () => {
    const blob = JSON.stringify(PREVIEW_VARIANTS);
    expect(blob).not.toMatch(/\bMTHFR\b/);
    expect(blob).not.toMatch(/\bCOMT\b/);
    expect(blob).not.toMatch(/\bCLOCK\b/);
    expect(blob).not.toMatch(/\brs\d+\b/i);
    expect(PREVIEW_VARIANTS.map((row) => row.state)).toEqual(['demo', 'unanalyzed', 'reference']);
  });

  it('keeps CYP2C9 rs1799853 pending / unknown, not 0 or unanalyzed as missing', () => {
    const locked = cyp2c9Rs1799853Coverage();
    expect(locked.rsid).toBe(CYP2C9_RS1799853);
    expect(locked.status).toBe('pending');
    expect(locked.evidence_grade).toBe('unknown');
    expect(locked.effect_summary.toLowerCase()).toContain('pending');
    expect(locked.effect_summary.toLowerCase()).toContain(
      'not treated as unanalyzed as missing',
    );
    const audit = auditGenex360Coverage();
    const row = audit.rows.find((entry) => entry.rsid === CYP2C9_RS1799853);
    expect(row).toBeDefined();
    expect(row?.status).toBe('pending');
    expect(row?.evidence_grade).toBe('unknown');
    expect(audit.missing).not.toContain(CYP2C9_RS1799853);
  });
});

describe('Brief 51 user-facing GeneXM lock', () => {
  it('does not write GeneX-M on gene-touched UI surfaces', () => {
    for (const file of SURFACES) {
      const source = readFileSync(file, 'utf-8');
      expect(source).not.toContain('GeneX-M');
    }
  });
});
