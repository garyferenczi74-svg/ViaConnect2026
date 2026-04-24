import { describe, it, expect } from 'vitest';
import { signOverride } from '@/lib/marshall/scheduler/overrideSigner';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockSupabase(opts: {
  priorOverrides?: Array<{ finding_ids: string[] }>;
  insertError?: { code: string; message: string };
}): { supabase: any; inserts: unknown[]; updates: unknown[] } {
  const inserts: unknown[] = [];
  const updates: unknown[] = [];
  const supabase = {
    from(table: string) {
      if (table === 'scheduler_overrides') {
        return {
          select: () => ({
            eq: () => ({
              gte: async () => ({ data: opts.priorOverrides ?? [], error: null }),
            }),
          }),
          insert(row: unknown) {
            inserts.push(row);
            return {
              select: () => ({
                async single() {
                  if (opts.insertError) return { data: null, error: opts.insertError };
                  return { data: { id: 'override-1' }, error: null };
                },
              }),
            };
          },
        };
      }
      if (table === 'scheduler_scans') {
        return {
          update(row: unknown) {
            updates.push(row);
            return {
              async eq() { return { error: null }; },
            };
          },
        };
      }
      return { select: () => ({ eq: () => ({ async maybeSingle() { return { data: null }; } }) }) };
    },
  };
  return { supabase, inserts, updates };
}

const JUSTIFICATION = 'I reviewed the flagged claim and confirmed this is a published FDA study excerpt.';

describe('signOverride validation', () => {
  it('rejects short justification', async () => {
    const { supabase } = mockSupabase({});
    const r = await signOverride({
      supabase,
      scanId: 's1',
      practitionerId: 'p1',
      findingIds: ['R.A'],
      justification: 'too short',
      ipAddress: '1.2.3.4',
      userAgent: 'ua',
    });
    expect(r.outcome).toBe('rejected');
    if (r.outcome === 'rejected') expect(r.error).toContain('justification_too_short');
  });

  it('rejects over-long justification', async () => {
    const { supabase } = mockSupabase({});
    const r = await signOverride({
      supabase,
      scanId: 's1',
      practitionerId: 'p1',
      findingIds: ['R.A'],
      justification: 'x'.repeat(2001),
      ipAddress: '1.2.3.4',
      userAgent: 'ua',
    });
    expect(r.outcome).toBe('rejected');
    if (r.outcome === 'rejected') expect(r.error).toContain('justification_too_long');
  });

  it('rejects empty findingIds', async () => {
    const { supabase } = mockSupabase({});
    const r = await signOverride({
      supabase,
      scanId: 's1',
      practitionerId: 'p1',
      findingIds: [],
      justification: JUSTIFICATION,
      ipAddress: null,
      userAgent: null,
    });
    expect(r.outcome).toBe('rejected');
    if (r.outcome === 'rejected') expect(r.error).toBe('finding_ids_required');
  });
});

describe('signOverride happy path + pattern detection', () => {
  it('writes override row, flips scan to override_accepted, no pattern flag on first override', async () => {
    const { supabase, inserts, updates } = mockSupabase({ priorOverrides: [] });
    const r = await signOverride({
      supabase,
      scanId: 's1',
      practitionerId: 'p1',
      findingIds: ['R.CLAIM'],
      justification: JUSTIFICATION,
      ipAddress: '1.2.3.4',
      userAgent: 'Test/1.0',
    });
    expect(r.outcome).toBe('signed');
    if (r.outcome === 'signed') {
      expect(r.patternFlagTriggered).toBe(false);
      expect(r.overrideId).toBe('override-1');
    }
    expect(inserts).toHaveLength(1);
    expect(updates).toHaveLength(1);
    expect((updates[0] as { decision: string }).decision).toBe('override_accepted');
  });

  it('triggers pattern flag when the same rule hits override threshold (>=4 in window)', async () => {
    const { supabase } = mockSupabase({
      priorOverrides: [
        { finding_ids: ['R.CLAIM'] },
        { finding_ids: ['R.CLAIM', 'R.OTHER'] },
        { finding_ids: ['R.CLAIM'] },
      ],
    });
    const r = await signOverride({
      supabase,
      scanId: 's2',
      practitionerId: 'p1',
      findingIds: ['R.CLAIM'],
      justification: JUSTIFICATION,
      ipAddress: '1.2.3.4',
      userAgent: 'Test/1.0',
    });
    expect(r.outcome).toBe('signed');
    if (r.outcome === 'signed') expect(r.patternFlagTriggered).toBe(true);
  });

  it('does not trigger when threshold not met across distinct rules', async () => {
    const { supabase } = mockSupabase({
      priorOverrides: [
        { finding_ids: ['R.A'] },
        { finding_ids: ['R.B'] },
        { finding_ids: ['R.C'] },
      ],
    });
    const r = await signOverride({
      supabase,
      scanId: 's3',
      practitionerId: 'p1',
      findingIds: ['R.D'],
      justification: JUSTIFICATION,
      ipAddress: null,
      userAgent: null,
    });
    expect(r.outcome).toBe('signed');
    if (r.outcome === 'signed') expect(r.patternFlagTriggered).toBe(false);
  });

  it('returns rejected on DB insert error', async () => {
    const { supabase } = mockSupabase({
      priorOverrides: [],
      insertError: { code: '23503', message: 'fk_violation' },
    });
    const r = await signOverride({
      supabase,
      scanId: 'bogus',
      practitionerId: 'p1',
      findingIds: ['R.A'],
      justification: JUSTIFICATION,
      ipAddress: null,
      userAgent: null,
    });
    expect(r.outcome).toBe('rejected');
    if (r.outcome === 'rejected') expect(r.error).toContain('insert_failed');
  });
});
