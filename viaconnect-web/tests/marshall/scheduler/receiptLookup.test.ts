import { describe, it, expect } from 'vitest';
import {
  extractRegistryVersionFromJwt,
  lookupReusableReceipt,
  type PrecheckReceiptRow,
} from '@/lib/marshall/scheduler/receiptLookup';
import type { RegistrySnapshot } from '@/lib/marshall/scheduler/registryDiff';

function jwtWith(payload: Record<string, unknown>): string {
  const b = (s: string) => Buffer.from(s, 'utf8').toString('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${b(JSON.stringify({ alg: 'ES256' }))}.${b(JSON.stringify(payload))}.${b('sig')}`;
}

function row(over: Partial<PrecheckReceiptRow> = {}): PrecheckReceiptRow {
  return {
    id: 'uuid-1',
    receipt_id: 'RCPT-A',
    session_id: 'sess-1',
    practitioner_id: 'p1',
    draft_hash_sha256: 'abc',
    jwt_compact: jwtWith({ ruleRegistryVersion: 'v4.3.7' }),
    issued_at: '2026-04-20T00:00:00Z',
    expires_at: '2026-05-20T00:00:00Z',
    revoked: false,
    ...over,
  };
}

type Call = { table: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockSupabase(returning: PrecheckReceiptRow | null): { supabase: any; calls: Call[] } {
  const calls: Call[] = [];
  const supabase = {
    from(table: string) {
      calls.push({ table });
      const chain = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        limit: () => chain,
        maybeSingle: async () => ({ data: returning, error: null }),
      };
      return chain;
    },
  };
  return { supabase, calls };
}

function snapshot(version: string, mutate: (s: RegistrySnapshot) => void = () => {}): RegistrySnapshot {
  const s: RegistrySnapshot = {
    registryVersion: version,
    rules: [
      { ruleId: 'R.A', severity: 'P2', confidenceThreshold: 0.8, surfaces: ['instagram_post'] },
    ],
  };
  mutate(s);
  return s;
}

describe('extractRegistryVersionFromJwt', () => {
  it('reads ruleRegistryVersion claim', () => {
    expect(extractRegistryVersionFromJwt(jwtWith({ ruleRegistryVersion: 'v4.3.7' }))).toBe('v4.3.7');
  });

  it('accepts snake_case rule_registry_version', () => {
    expect(extractRegistryVersionFromJwt(jwtWith({ rule_registry_version: 'v4.3.6' }))).toBe('v4.3.6');
  });

  it('returns null on malformed jwt', () => {
    expect(extractRegistryVersionFromJwt('not.a.jwt')).toBeNull();
    expect(extractRegistryVersionFromJwt('onlyonepart')).toBeNull();
    expect(extractRegistryVersionFromJwt('')).toBeNull();
  });

  it('returns null when claim missing', () => {
    expect(extractRegistryVersionFromJwt(jwtWith({ other: 'thing' }))).toBeNull();
  });
});

describe('lookupReusableReceipt', () => {
  const current = snapshot('v4.3.7');
  const loaderFor = (snapshots: Record<string, RegistrySnapshot>) =>
    async (v: string) => snapshots[v] ?? null;

  it('returns no_match when DB has nothing', async () => {
    const { supabase } = mockSupabase(null);
    const r = await lookupReusableReceipt(
      { supabase, practitionerId: 'p1', contentHashSha256: 'abc' },
      current,
      loaderFor({}),
    );
    expect(r.outcome).toBe('no_match');
  });

  it('returns revoked when receipt is marked revoked', async () => {
    const { supabase } = mockSupabase(row({ revoked: true }));
    const r = await lookupReusableReceipt(
      { supabase, practitionerId: 'p1', contentHashSha256: 'abc' },
      current,
      loaderFor({}),
    );
    expect(r.outcome).toBe('revoked');
  });

  it('returns expired when expires_at is in the past', async () => {
    const { supabase } = mockSupabase(row({ expires_at: '2025-01-01T00:00:00Z' }));
    const r = await lookupReusableReceipt(
      { supabase, practitionerId: 'p1', contentHashSha256: 'abc', now: new Date('2026-04-24T00:00:00Z') },
      current,
      loaderFor({}),
    );
    expect(r.outcome).toBe('expired');
  });

  it('returns jwt_unreadable when JWT parse fails', async () => {
    const { supabase } = mockSupabase(row({ jwt_compact: 'bad.jwt' }));
    const r = await lookupReusableReceipt(
      { supabase, practitionerId: 'p1', contentHashSha256: 'abc' },
      current,
      loaderFor({}),
    );
    expect(r.outcome).toBe('jwt_unreadable');
  });

  it('returns valid when version matches exactly', async () => {
    const { supabase } = mockSupabase(row({ jwt_compact: jwtWith({ ruleRegistryVersion: 'v4.3.7' }) }));
    const r = await lookupReusableReceipt(
      { supabase, practitionerId: 'p1', contentHashSha256: 'abc' },
      current,
      loaderFor({}),
    );
    expect(r.outcome).toBe('valid');
  });

  it('returns stale_registry when source version cannot be resolved', async () => {
    const { supabase } = mockSupabase(row({ jwt_compact: jwtWith({ ruleRegistryVersion: 'v4.3.5' }) }));
    const r = await lookupReusableReceipt(
      { supabase, practitionerId: 'p1', contentHashSha256: 'abc' },
      current,
      loaderFor({}),
    );
    expect(r.outcome).toBe('stale_registry');
    if (r.outcome === 'stale_registry') expect(r.materialChangesCount).toBe(-1);
  });

  it('returns valid when prior registry + current have NO material changes', async () => {
    const { supabase } = mockSupabase(row({ jwt_compact: jwtWith({ ruleRegistryVersion: 'v4.3.6' }) }));
    const old = snapshot('v4.3.6');
    // change only cosmetic wording on the one rule
    old.rules[0].remediationWording = 'old wording';
    const r = await lookupReusableReceipt(
      { supabase, practitionerId: 'p1', contentHashSha256: 'abc' },
      current,
      loaderFor({ 'v4.3.6': old }),
    );
    expect(r.outcome).toBe('valid');
  });

  it('returns stale_registry when material change exists', async () => {
    const { supabase } = mockSupabase(row({ jwt_compact: jwtWith({ ruleRegistryVersion: 'v4.3.6' }) }));
    const old = snapshot('v4.3.6');
    old.rules[0].severity = 'P3'; // current is P2, so severity was raised
    const r = await lookupReusableReceipt(
      { supabase, practitionerId: 'p1', contentHashSha256: 'abc' },
      current,
      loaderFor({ 'v4.3.6': old }),
    );
    expect(r.outcome).toBe('stale_registry');
    if (r.outcome === 'stale_registry') {
      expect(r.materialChangesCount).toBeGreaterThan(0);
    }
  });
});
