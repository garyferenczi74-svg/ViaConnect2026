// Prompt #138a Phase 6: SOC 2 marketing-copy-activity collector tests.
//
// Mirrors the fixture-fetcher pattern from tests/prompt-122-collectors.test.ts
// so the new collector is verified in isolation: CSV column order, period
// filtering, JSONB summarization, actor pseudonymization, day-only timestamps.

import { describe, it, expect } from 'vitest';
import type { Period } from '@/lib/soc2/types';
import type { CollectorQuery, CollectorRunCtx } from '@/lib/soc2/collectors/types';
import { frozenTimer } from '@/lib/soc2/collectors/helpers';
import { marketingCopyActivityCollector } from '@/lib/soc2/collectors/marketing-copy-activity';

const FIXED_KEY = Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex');
const PACKET_UUID = '01J8ZP5V3K700000000000000A';
const PERIOD: Period = { start: '2026-04-01T00:00:00Z', end: '2026-04-30T23:59:59Z' };

function buildCtx(rows: Array<Record<string, unknown>>): CollectorRunCtx & { timer: ReturnType<typeof frozenTimer> } {
  return {
    packetUuid: PACKET_UUID,
    pseudonymKey: FIXED_KEY,
    ruleRegistryVersion: 'v4.3.7',
    timer: frozenTimer('2026-05-01T00:00:00Z', 50),
    async fetch<T = Record<string, unknown>>(q: CollectorQuery): Promise<T[]> {
      const filtered = rows.filter((r) => {
        for (const f of q.filters) {
          const v = r[f.column];
          if (f.op === 'gte' && !(String(v) >= String(f.value))) return false;
          if (f.op === 'lte' && !(String(v) <= String(f.value))) return false;
        }
        return true;
      });
      const sorted = filtered.slice().sort((a, b) => {
        for (const o of q.orderBy) {
          const av = String(a[o.column] ?? '');
          const bv = String(b[o.column] ?? '');
          if (av < bv) return o.ascending ? -1 : 1;
          if (av > bv) return o.ascending ? 1 : -1;
        }
        return 0;
      });
      return sorted as T[];
    },
  };
}

const CONTROL_VARIANT_JOIN = {
  slot_id: 'hero.variant.control',
  surface: 'hero',
  framing: 'other',
};
const VARIANT_A_JOIN = {
  slot_id: 'hero.variant.A',
  surface: 'hero',
  framing: 'process_narrative',
};

describe('marketingCopyActivityCollector — registry shape', () => {
  it('declares CC4.1 + CC7.1 controls', () => {
    expect(marketingCopyActivityCollector.controls).toEqual(['CC4.1', 'CC7.1']);
  });
  it('reports its data source as the joined event + variant tables', () => {
    expect(marketingCopyActivityCollector.dataSource).toBe(
      'marketing_copy_variant_events + marketing_copy_variants',
    );
  });
  it('has stable id and version', () => {
    expect(marketingCopyActivityCollector.id).toBe('marketing-copy-activity-collector');
    expect(marketingCopyActivityCollector.version).toBe('1.0.0');
  });
});

describe('marketingCopyActivityCollector — empty input', () => {
  it('emits a header-only CSV when no events match the period', async () => {
    const ctx = buildCtx([]);
    const r = await marketingCopyActivityCollector.collect(PERIOD, ctx);
    const text = new TextDecoder().decode(r.files[0].bytes);
    const lines = text.trim().split('\n');
    expect(lines.length).toBe(1);
    expect(lines[0]).toBe(
      'event_id,variant_id,slot_id,surface,framing,event_kind,precheck_passed,precheck_blocker_count,precheck_warn_count,has_actor,actor_pseudonym,occurred_at_day',
    );
    expect(r.attestation.rowCount).toBe(0);
  });

  it('writes the file under CC4-monitoring-activities/', async () => {
    const ctx = buildCtx([]);
    const r = await marketingCopyActivityCollector.collect(PERIOD, ctx);
    expect(r.files[0].relativePath).toBe(
      'CC4-monitoring-activities/marketing-copy-activity.csv',
    );
  });
});

describe('marketingCopyActivityCollector — row emission', () => {
  it('emits one row per event with joined slot_id and framing', async () => {
    const ctx = buildCtx([
      {
        id: '11111111-2222-3333-4444-555555555555',
        variant_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        event_kind: 'created',
        event_detail: null,
        actor_user_id: '99999999-8888-7777-6666-555555555555',
        occurred_at: '2026-04-15T10:00:00Z',
        marketing_copy_variants: VARIANT_A_JOIN,
      },
    ]);
    const r = await marketingCopyActivityCollector.collect(PERIOD, ctx);
    const text = new TextDecoder().decode(r.files[0].bytes);
    const lines = text.trim().split('\n');
    expect(lines.length).toBe(2);
    const cells = lines[1].split(',');
    expect(cells[0]).toBe('11111111-2222-3333-4444-555555555555');
    expect(cells[2]).toBe('hero.variant.A');
    expect(cells[3]).toBe('hero');
    expect(cells[4]).toBe('process_narrative');
    expect(cells[5]).toBe('created');
    expect(cells[9]).toBe('true');
    expect(cells[11]).toBe('2026-04-15');
    expect(r.attestation.rowCount).toBe(1);
  });

  it('summarizes precheck event_detail to scalars and drops free text', async () => {
    const ctx = buildCtx([
      {
        id: '22222222-3333-4444-5555-666666666666',
        variant_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        event_kind: 'precheck_completed',
        event_detail: {
          passed: false,
          blocker_count: 2,
          warn_count: 1,
          finding_rule_ids: ['MARSHALL.CLAIMS.DISEASE_CLAIM'],
        },
        actor_user_id: '99999999-8888-7777-6666-555555555555',
        occurred_at: '2026-04-16T10:00:00Z',
        marketing_copy_variants: VARIANT_A_JOIN,
      },
    ]);
    const r = await marketingCopyActivityCollector.collect(PERIOD, ctx);
    const text = new TextDecoder().decode(r.files[0].bytes);
    const cells = text.trim().split('\n')[1].split(',');
    expect(cells[6]).toBe('false');
    expect(cells[7]).toBe('2');
    expect(cells[8]).toBe('1');
    // No finding_rule_ids field in COLS — free text not exposed.
    expect(cells.length).toBe(12);
  });

  it('emits empty cells for events without precheck detail', async () => {
    const ctx = buildCtx([
      {
        id: '33333333-4444-5555-6666-777777777777',
        variant_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        event_kind: 'archived',
        event_detail: null,
        actor_user_id: null,
        occurred_at: '2026-04-17T10:00:00Z',
        marketing_copy_variants: CONTROL_VARIANT_JOIN,
      },
    ]);
    const r = await marketingCopyActivityCollector.collect(PERIOD, ctx);
    const cells = new TextDecoder().decode(r.files[0].bytes).trim().split('\n')[1].split(',');
    expect(cells[6]).toBe('');
    expect(cells[7]).toBe('');
    expect(cells[8]).toBe('');
    expect(cells[9]).toBe('false');
    expect(cells[10]).toBe('');
  });
});

describe('marketingCopyActivityCollector — pseudonymization', () => {
  it('produces the same actor_pseudonym for the same user within a packet', async () => {
    const userId = '99999999-8888-7777-6666-555555555555';
    const ctx = buildCtx([
      {
        id: '11111111-1111-1111-1111-111111111111',
        variant_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        event_kind: 'created',
        event_detail: null,
        actor_user_id: userId,
        occurred_at: '2026-04-15T10:00:00Z',
        marketing_copy_variants: VARIANT_A_JOIN,
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        variant_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        event_kind: 'steve_approved',
        event_detail: { note: 'approved for testing' },
        actor_user_id: userId,
        occurred_at: '2026-04-16T10:00:00Z',
        marketing_copy_variants: VARIANT_A_JOIN,
      },
    ]);
    const r = await marketingCopyActivityCollector.collect(PERIOD, ctx);
    const lines = new TextDecoder().decode(r.files[0].bytes).trim().split('\n').slice(1);
    const p1 = lines[0].split(',')[10];
    const p2 = lines[1].split(',')[10];
    expect(p1).toBeTruthy();
    expect(p1).toBe(p2);
  });

  it('never includes the raw actor_user_id', async () => {
    const userId = '99999999-8888-7777-6666-555555555555';
    const ctx = buildCtx([
      {
        id: '11111111-1111-1111-1111-111111111111',
        variant_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        event_kind: 'created',
        event_detail: null,
        actor_user_id: userId,
        occurred_at: '2026-04-15T10:00:00Z',
        marketing_copy_variants: VARIANT_A_JOIN,
      },
    ]);
    const r = await marketingCopyActivityCollector.collect(PERIOD, ctx);
    const text = new TextDecoder().decode(r.files[0].bytes);
    expect(text.includes(userId)).toBe(false);
  });

  it('never leaks free-text approval notes or revocation reasons', async () => {
    const ctx = buildCtx([
      {
        id: '11111111-1111-1111-1111-111111111111',
        variant_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        event_kind: 'steve_approved',
        event_detail: { note: 'PII RISK STRING SHOULD NEVER APPEAR' },
        actor_user_id: '99999999-8888-7777-6666-555555555555',
        occurred_at: '2026-04-16T10:00:00Z',
        marketing_copy_variants: VARIANT_A_JOIN,
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        variant_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        event_kind: 'steve_revoked',
        event_detail: { reason: 'ANOTHER PII RISK STRING' },
        actor_user_id: '99999999-8888-7777-6666-555555555555',
        occurred_at: '2026-04-17T10:00:00Z',
        marketing_copy_variants: VARIANT_A_JOIN,
      },
    ]);
    const r = await marketingCopyActivityCollector.collect(PERIOD, ctx);
    const text = new TextDecoder().decode(r.files[0].bytes);
    expect(text.includes('PII RISK STRING')).toBe(false);
    expect(text.includes('ANOTHER PII')).toBe(false);
  });
});

describe('marketingCopyActivityCollector — period filtering', () => {
  it('drops events outside the period boundary', async () => {
    const ctx = buildCtx([
      {
        id: '11111111-1111-1111-1111-111111111111',
        variant_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        event_kind: 'created',
        event_detail: null,
        actor_user_id: null,
        occurred_at: '2026-03-31T23:59:59Z',
        marketing_copy_variants: VARIANT_A_JOIN,
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        variant_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        event_kind: 'created',
        event_detail: null,
        actor_user_id: null,
        occurred_at: '2026-04-15T10:00:00Z',
        marketing_copy_variants: VARIANT_A_JOIN,
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        variant_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        event_kind: 'created',
        event_detail: null,
        actor_user_id: null,
        occurred_at: '2026-05-01T00:00:01Z',
        marketing_copy_variants: VARIANT_A_JOIN,
      },
    ]);
    const r = await marketingCopyActivityCollector.collect(PERIOD, ctx);
    expect(r.attestation.rowCount).toBe(1);
  });
});

describe('marketingCopyActivityCollector — determinism', () => {
  it('two runs over the same fixture produce byte-identical CSV', async () => {
    const fixture = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        variant_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        event_kind: 'created',
        event_detail: null,
        actor_user_id: '99999999-8888-7777-6666-555555555555',
        occurred_at: '2026-04-15T10:00:00Z',
        marketing_copy_variants: VARIANT_A_JOIN,
      },
    ];
    const a = await marketingCopyActivityCollector.collect(PERIOD, buildCtx(fixture));
    const b = await marketingCopyActivityCollector.collect(PERIOD, buildCtx(fixture));
    expect(Buffer.from(a.files[0].bytes).equals(Buffer.from(b.files[0].bytes))).toBe(true);
  });
});
