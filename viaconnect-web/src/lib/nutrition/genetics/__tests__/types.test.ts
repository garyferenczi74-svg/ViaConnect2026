// Prompt 187 Task 2: row mapper + Hannah schema tests. The mappers must
// tolerate malformed rows: unknown enum strings fall back conservatively and
// nothing throws. The schema assertions pin the field names and bounds the
// edge function copy must stay in lockstep with.

import { describe, it, expect } from 'vitest';
import { findingFromRow, uploadFromRow } from '../types';
import { HannahAnalysisSchema } from '../analysis-schema';

describe('findingFromRow', () => {
  it('maps a well formed row to camelCase', () => {
    const out = findingFromRow({
      id: 'f1',
      user_id: 'u1',
      source: 'uploaded_test',
      source_ref_id: 'upload-9',
      category: 'mineral',
      item_name: 'Magnesium',
      item_slug: 'magnesium',
      direction: 'avoid',
      strength: 'strong',
      confidence: 'medium',
      estimated: true,
      rationale: 'transporter variant',
      created_at: '2026-06-01T00:00:00.000Z',
      superseded_at: '2026-06-05T00:00:00.000Z',
    });
    expect(out).toEqual({
      id: 'f1',
      userId: 'u1',
      source: 'uploaded_test',
      sourceRefId: 'upload-9',
      category: 'mineral',
      itemName: 'Magnesium',
      itemSlug: 'magnesium',
      direction: 'avoid',
      strength: 'strong',
      confidence: 'medium',
      estimated: true,
      rationale: 'transporter variant',
      createdAt: '2026-06-01T00:00:00.000Z',
      supersededAt: '2026-06-05T00:00:00.000Z',
    });
  });

  it('falls back conservatively on unknown enum strings and never throws', () => {
    const out = findingFromRow({
      source: 'genome_corp',
      category: 'macro',
      direction: 'maybe',
      strength: 'overwhelming',
      confidence: 'certain',
    });
    expect(out.source).toBe('uploaded_test');
    expect(out.category).toBe('other');
    expect(out.direction).toBe('unknown');
    expect(out.strength).toBe('weak');
    expect(out.confidence).toBe('low');
  });

  it('tolerates an empty row, null rationale, and extra fields', () => {
    expect(() => findingFromRow({})).not.toThrow();
    const out = findingFromRow({ rationale: null, unexpected_column: { nested: true } });
    expect(out.rationale).toBeNull();
    expect(out.supersededAt).toBeNull();
    // A missing estimated flag claims the finding IS an estimate.
    expect(out.estimated).toBe(true);
  });
});

describe('uploadFromRow', () => {
  it('maps a well formed row to camelCase', () => {
    const out = uploadFromRow({
      id: 'up1',
      user_id: 'u1',
      storage_path: 'genetics/u1/report.pdf',
      original_filename: 'report.pdf',
      mime_type: 'application/pdf',
      file_size_bytes: 245000,
      source_company: 'NutraGene Labs',
      status: 'analyzed',
      failure_reason: null,
      created_at: '2026-06-01T00:00:00.000Z',
      analyzed_at: '2026-06-01T00:05:00.000Z',
    });
    expect(out.userId).toBe('u1');
    expect(out.storagePath).toBe('genetics/u1/report.pdf');
    expect(out.fileSizeBytes).toBe(245000);
    expect(out.sourceCompany).toBe('NutraGene Labs');
    expect(out.status).toBe('analyzed');
    expect(out.failureReason).toBeNull();
    expect(out.analyzedAt).toBe('2026-06-01T00:05:00.000Z');
  });

  it('falls back to uploaded on unknown status and never throws', () => {
    expect(() => uploadFromRow({})).not.toThrow();
    // bigint columns can arrive as strings from PostgREST; coerce them.
    const out = uploadFromRow({ status: 'processing', file_size_bytes: '1024' });
    expect(out.status).toBe('uploaded');
    expect(out.fileSizeBytes).toBe(1024);
  });
});

describe('HannahAnalysisSchema', () => {
  const validFinding = {
    category: 'vitamin',
    item_name: 'Vitamin D',
    item_slug: 'vitamin-d',
    direction: 'need',
    strength: 'strong',
    confidence: 'high',
    estimated: false,
    rationale: 'VDR variant reduces receptor activity',
  };

  it('accepts a well formed payload', () => {
    const parsed = HannahAnalysisSchema.safeParse({
      summary: 'One vitamin need detected.',
      findings: [validFinding],
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects a non kebab-case item_slug', () => {
    const parsed = HannahAnalysisSchema.safeParse({
      summary: 's',
      findings: [{ ...validFinding, item_slug: 'Vitamin D' }],
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects more than 60 findings', () => {
    const findings = Array.from({ length: 61 }, (_, i) => ({
      ...validFinding,
      item_slug: `item-${i}`,
    }));
    expect(HannahAnalysisSchema.safeParse({ summary: 's', findings }).success).toBe(false);
  });

  it('rejects out of bounds item_name and rationale lengths', () => {
    expect(
      HannahAnalysisSchema.safeParse({
        summary: 's',
        findings: [{ ...validFinding, rationale: '' }],
      }).success,
    ).toBe(false);
    expect(
      HannahAnalysisSchema.safeParse({
        summary: 's',
        findings: [{ ...validFinding, rationale: 'r'.repeat(301) }],
      }).success,
    ).toBe(false);
    expect(
      HannahAnalysisSchema.safeParse({
        summary: 's',
        findings: [{ ...validFinding, item_name: 'n'.repeat(121) }],
      }).success,
    ).toBe(false);
  });
});
