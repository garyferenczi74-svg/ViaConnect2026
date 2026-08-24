import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  hubHeaderBadge,
  isGeneticsUploaded,
  resolveGeneticsUploadState,
  supplementsGeneticsEmptyCopy,
} from '../geneticsUploadState';

const BOS = path.resolve(__dirname, '../../scoring/sources/genetics-source.ts');
const HUB = path.resolve(__dirname, '../hubVariantsPayload.ts');
const SUPPLEMENTS = path.resolve(
  __dirname,
  '../../../app/(app)/(consumer)/supplements/page.tsx',
);

describe('resolveGeneticsUploadState', () => {
  it('treats 12 non-sample SNP rows as uploaded', () => {
    const rows = Array.from({ length: 12 }, () => ({ is_sample: false }));
    const state = resolveGeneticsUploadState({ variantRows: rows });
    expect(state).toBe('uploaded');
    expect(isGeneticsUploaded(state)).toBe(true);
  });

  it('treats legacy null is_sample as a real row', () => {
    const state = resolveGeneticsUploadState({
      variantRows: [{ is_sample: null }],
    });
    expect(state).toBe('uploaded');
  });

  it('treats sample-only rows as Demo, not uploaded', () => {
    const rows = Array.from({ length: 12 }, () => ({ is_sample: true }));
    const state = resolveGeneticsUploadState({ variantRows: rows });
    expect(state).toBe('sample_only');
    expect(isGeneticsUploaded(state)).toBe(false);
  });

  it('does not let sample rows coexist with uploaded when no real kit', () => {
    const state = resolveGeneticsUploadState({
      variantRows: [{ is_sample: true }, { is_sample: true }],
      realKitIngest: false,
    });
    expect(isGeneticsUploaded(state)).toBe(false);
  });

  it('uploads on a real kit ingest even with no variant rows', () => {
    const state = resolveGeneticsUploadState({
      variantRows: [],
      realKitIngest: true,
    });
    expect(state).toBe('uploaded');
  });

  it('is none when there are no rows and no kit', () => {
    expect(resolveGeneticsUploadState({ variantRows: [] })).toBe('none');
  });

  it('prefers uploaded when sample and real rows are mixed', () => {
    const state = resolveGeneticsUploadState({
      variantRows: [{ is_sample: true }, { is_sample: false }],
    });
    expect(state).toBe('uploaded');
  });
});

describe('hubHeaderBadge', () => {
  it('says Demo for sample-only counts, not results', () => {
    expect(
      hubHeaderBadge({
        isLoading: false,
        loadFailed: false,
        uploadState: 'sample_only',
        totalVariants: 12,
      }),
    ).toBe('12 Demo');
  });

  it('says results when uploaded', () => {
    expect(
      hubHeaderBadge({
        isLoading: false,
        loadFailed: false,
        uploadState: 'uploaded',
        totalVariants: 12,
      }),
    ).toBe('12 results');
  });

  it('says Unanalyzed on fail / null, never 0 or n/a', () => {
    const badge = hubHeaderBadge({
      isLoading: false,
      loadFailed: true,
      uploadState: 'none',
      totalVariants: null,
    });
    expect(badge).toBe('Unanalyzed');
    expect(badge).not.toBe('0');
    expect(badge).not.toBe('n/a');
  });
});

describe('supplementsGeneticsEmptyCopy', () => {
  it('does not say genetics is not uploaded when SSOT says uploaded', () => {
    const copy = supplementsGeneticsEmptyCopy(true);
    expect(copy.toLowerCase()).not.toContain('not uploaded');
    expect(copy.toLowerCase()).not.toContain('once genetic data is uploaded');
    expect(copy.toLowerCase()).toContain('clinically published');
  });

  it('asks for an upload only when SSOT is not uploaded', () => {
    const copy = supplementsGeneticsEmptyCopy(false);
    expect(copy.toLowerCase()).toContain('uploaded');
  });
});

describe('SSOT consumers agree', () => {
  it('BOS, hub, and supplements resolve uploaded from the same helper', () => {
    expect(readFileSync(BOS, 'utf-8')).toContain('resolveGeneticsUploadState');
    expect(readFileSync(HUB, 'utf-8')).toContain('resolveGeneticsUploadState');
    expect(readFileSync(SUPPLEMENTS, 'utf-8')).toContain('resolveGeneticsUploadState');
    expect(readFileSync(BOS, 'utf-8')).toContain('loadGeneticsUploadFacts');
    expect(readFileSync(SUPPLEMENTS, 'utf-8')).toContain('loadGeneticsUploadFacts');
  });
});
