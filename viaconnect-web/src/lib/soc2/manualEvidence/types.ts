// Prompt #122 P6: Shared types for the manual-evidence surface.

import type { Soc2TscCode } from '../types';

export type FreshnessState =
  | 'fresh'
  | 'expiring_soon'
  | 'expired'
  | 'stale'
  | 'needs_signoff'
  | 'archived';

export interface ManualEvidenceRow {
  id: string;
  title: string;
  storageKey: string;
  sha256: string;
  sizeBytes: number;
  contentType: string;
  controls: readonly string[];
  validFrom: string | null;
  validUntil: string | null;
  sourceDescription: string;
  uploadedBy: string;
  uploadedAt: string;
  signoffBy: string | null;
  signoffAt: string | null;
  supersededBy: string | null;
  archived: boolean;
  archivedAt: string | null;
}

export interface ManualEvidenceRowWithFreshness extends ManualEvidenceRow {
  freshness: FreshnessState;
  daysUntilExpiry: number | null;
}

export interface ManualEvidenceUploadInput {
  title: string;
  controls: readonly Soc2TscCode[] | readonly string[];
  validFrom?: string;
  validUntil?: string;
  sourceDescription: string;
  bytes: Uint8Array;
  contentType: string;
  /** Original filename hint; used to compose the storage key. Sanitized on write. */
  filenameHint?: string;
}

export interface ManualEvidenceUploadResult {
  rowId: string;
  storageKey: string;
  sha256: string;
  sizeBytes: number;
}
