// Tests for src/lib/scoring/sources/caq-source.ts.
//
// CAQ source reads the latest completed row from caq_assessment_versions.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCAQSource } from '../../sources/caq-source';

function makeClient(row: unknown, error: unknown = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: row, error });
  const limit = vi.fn().mockReturnValue({ maybeSingle });
  const order = vi.fn().mockReturnValue({ limit });
  const eq2 = vi.fn().mockReturnValue({ order });
  const eq = vi.fn().mockReturnValue({ eq: eq2 });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  return { from, select, eq, eq2, order, limit, maybeSingle };
}

describe('caq-source', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns empty shape when no completed CAQ exists', async () => {
    const client = makeClient(null);
    const result = await getCAQSource('u-1', client as never);
    expect(result.completed).toBe(false);
    expect(result.completed_at).toBeNull();
    expect(result.baseline_score).toBeNull();
  });

  it('returns completed shape when latest row has status = completed', async () => {
    const client = makeClient({
      status: 'completed',
      completed_at: '2026-05-10T13:00:00Z',
      version_number: 2,
      demographics: { age: 41 },
      health_concerns: { primary: ['fatigue'] },
      physical_symptoms: {},
      neuro_symptoms: {},
      emotional_symptoms: {},
      medications: {},
      supplements: {},
      allergies: {},
      lifestyle: {},
    });
    const result = await getCAQSource('u-1', client as never);
    expect(result.completed).toBe(true);
    expect(result.completed_at).toBe('2026-05-10T13:00:00Z');
    expect(result.baseline_score).toBeNull();
    expect(result.version_number).toBe(2);
    expect(result.source_specific?.phases.demographics).toEqual({ age: 41 });
  });

  it('returns empty shape on Supabase error (defensive)', async () => {
    const client = makeClient(null, { message: 'boom' });
    const result = await getCAQSource('u-1', client as never);
    expect(result.completed).toBe(false);
    expect(result.completed_at).toBeNull();
  });

  it('queries caq_assessment_versions table', async () => {
    const client = makeClient(null);
    await getCAQSource('u-1', client as never);
    expect(client.from).toHaveBeenCalledWith('caq_assessment_versions');
  });
});
