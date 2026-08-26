// Brief 51: provenance on every gene-touched line.
// User-facing chips and copy: Demo | Unanalyzed | Reference | your upload |
// GENEX360 | GeneXM. Plus "not a diagnosis."
// Stored aliases stay genex_m / GENEX-M / methylation / reference.
// Map those aliases to the GeneXM chip at display time only.
// Fail vs empty are not one bucket. No invented SNPs. Display name is GeneXM.

import { normalizeObservedPanelKey } from './panelKeyAliases';
import {
  isRealVariantRow,
  type GeneticsUploadFacts,
  type GeneticsUploadState,
} from './geneticsUploadState';

export const GENEXM_DISPLAY_LABEL = 'GeneXM';
export const GENEX360_DISPLAY_LABEL = 'GENEX360';
export const YOUR_UPLOAD_CHIP = 'your upload';
export const FROM_GENEXM_CHIP = 'from GeneXM';
export const FROM_GENEX360_CHIP = 'from GENEX360';
export const NOT_A_DIAGNOSIS = 'Not a diagnosis.';
export const CYP2C9_RS1799853 = 'rs1799853';

export const DASHBOARD_GENETICS_UNKNOWN = `Genetics Unanalyzed. ${NOT_A_DIAGNOSIS}`;
export const DASHBOARD_GENETICS_EMPTY = `Genetics not analyzed. ${NOT_A_DIAGNOSIS}`;
export const DASHBOARD_GENETICS_UPLOADED =
  `GeneXM or GENEX360 results are on file. ${NOT_A_DIAGNOSIS}`;
export const DASHBOARD_GENETICS_DEMO = `Demo genetics only. ${NOT_A_DIAGNOSIS}`;

export function isGenexmStoredAlias(raw: string | null | undefined): boolean {
  return normalizeObservedPanelKey(raw) === 'methylation';
}

export interface GeneRowProof {
  hasGenex360Row: boolean;
  hasGenexmRow: boolean;
}

/**
 * Brief 49 gene chips need a real matching row, not a source-string guess.
 * A failed variants read never invents a row.
 */
export function geneRowProofFromFacts(facts: GeneticsUploadFacts): GeneRowProof {
  if (facts.variantsReadFailed === true && facts.realKitIngest !== true) {
    return { hasGenex360Row: false, hasGenexmRow: false };
  }
  const realRows = facts.variantRows.filter(isRealVariantRow);
  const hasGenexmRow = realRows.some((row) => isGenexmStoredAlias(row.panel_key ?? null));
  const hasGenex360Row = facts.realKitIngest === true || realRows.length > 0;
  return { hasGenex360Row, hasGenexmRow };
}

/**
 * Home / dashboard genetics sentence.
 * Real GeneXM or GENEX360 rows never read as "not uploaded".
 * Honest empty never implies an upload is on file.
 * 401 / read fail is Unanalyzed, never 0.
 */
export function dashboardGeneticsSentence(args: {
  uploadState: GeneticsUploadState;
  loadFailed?: boolean;
}): string {
  if (args.loadFailed) return DASHBOARD_GENETICS_UNKNOWN;
  if (args.uploadState === 'uploaded') return DASHBOARD_GENETICS_UPLOADED;
  if (args.uploadState === 'sample_only') return DASHBOARD_GENETICS_DEMO;
  return DASHBOARD_GENETICS_EMPTY;
}

export function sentenceImpliesUpload(copy: string): boolean {
  return /on file|already uploaded|results are on file/i.test(copy);
}

export function sentenceSaysNotUploaded(copy: string): boolean {
  return /not uploaded|once genetic data is uploaded/i.test(copy);
}
