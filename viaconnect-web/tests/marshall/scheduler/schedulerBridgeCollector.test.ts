import { describe, it, expect } from 'vitest';
import { schedulerBridgeCollector } from '@/lib/soc2/collectors/scheduler-bridge';
import type { CollectorQuery, CollectorRunCtx } from '@/lib/soc2/collectors/types';
import { frozenTimer } from '@/lib/soc2/collectors/helpers';

const FIXED_KEY = Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex');

function buildCtx(fixtures: Record<string, Array<Record<string, unknown>>>): CollectorRunCtx & { timer: ReturnType<typeof frozenTimer> } {
  return {
    packetUuid: '01J8ZP5V3K7000000000000011H',
    pseudonymKey: FIXED_KEY,
    ruleRegistryVersion: 'v4.3.7',
    timer: frozenTimer('2026-04-24T00:00:00Z', 42),
    async fetch<T = Record<string, unknown>>(q: CollectorQuery): Promise<T[]> {
      return (fixtures[q.table] ?? []) as T[];
    },
  };
}

const PERIOD = { start: '2026-04-01T00:00:00Z', end: '2026-04-30T23:59:59Z' };

describe('scheduler-bridge-collector', () => {
  it('id + version + controls declared correctly', () => {
    expect(schedulerBridgeCollector.id).toBe('scheduler-bridge-collector');
    expect(schedulerBridgeCollector.version).toBe('1.0.0');
    expect(schedulerBridgeCollector.controls).toContain('CC4.1');
    expect(schedulerBridgeCollector.controls).toContain('P5.1');
    expect(schedulerBridgeCollector.controls).toContain('P6.1');
  });

  it('empty DB produces a file with header + summary rows only', async () => {
    const ctx = buildCtx({});
    const result = await schedulerBridgeCollector.collect(PERIOD, ctx);
    expect(result.files).toHaveLength(1);
    const csv = Buffer.from(result.files[0].bytes).toString('utf8');
    expect(csv).toContain('section,platform,metric,value,distinct_practitioners');
    expect(csv).toContain('summary,all,fail_closed_total,0,');
    expect(csv).toContain('summary,all,scan_total,0,');
    expect(result.attestation.rowCount).toBe(0);
  });

  it('aggregates scans by (platform, decision)', async () => {
    const fixtures = {
      scheduler_scans: [
        { connection_id: 'c1', practitioner_id: 'p1', decision: 'clean', platform: 'buffer' },
        { connection_id: 'c1', practitioner_id: 'p1', decision: 'clean', platform: 'buffer' },
        { connection_id: 'c1', practitioner_id: 'p2', decision: 'clean', platform: 'buffer' },
        { connection_id: 'c2', practitioner_id: 'p1', decision: 'blocked', platform: 'hootsuite' },
        { connection_id: 'c3', practitioner_id: 'p3', decision: 'fail_closed', platform: 'later' },
      ],
    };
    const result = await schedulerBridgeCollector.collect(PERIOD, buildCtx(fixtures));
    const csv = Buffer.from(result.files[0].bytes).toString('utf8');
    // Buffer clean: 3 rows, 2 distinct practitioners
    expect(csv).toContain('scans,buffer,decision.clean,3,2');
    expect(csv).toContain('scans,hootsuite,decision.blocked,1,1');
    expect(csv).toContain('scans,later,decision.fail_closed,1,1');
    expect(csv).toContain('summary,all,fail_closed_total,1,');
    expect(csv).toContain('summary,all,scan_total,5,');
  });

  it('aggregates interceptions with success rate inputs', async () => {
    const fixtures = {
      scheduler_interceptions: [
        { platform: 'buffer', succeeded: true },
        { platform: 'buffer', succeeded: true },
        { platform: 'buffer', succeeded: false },
        { platform: 'hootsuite', succeeded: null },
      ],
    };
    const result = await schedulerBridgeCollector.collect(PERIOD, buildCtx(fixtures));
    const csv = Buffer.from(result.files[0].bytes).toString('utf8');
    expect(csv).toContain('interceptions,buffer,attempted,3,');
    expect(csv).toContain('interceptions,buffer,succeeded,2,');
    expect(csv).toContain('interceptions,hootsuite,attempted,1,');
    expect(csv).toContain('interceptions,hootsuite,succeeded,0,');
  });

  it('aggregates overrides with pattern-flag counts', async () => {
    const fixtures = {
      scheduler_overrides: [
        { platform: 'buffer', pattern_flag_triggered: false },
        { platform: 'buffer', pattern_flag_triggered: true },
        { platform: 'hootsuite', pattern_flag_triggered: false },
      ],
    };
    const result = await schedulerBridgeCollector.collect(PERIOD, buildCtx(fixtures));
    const csv = Buffer.from(result.files[0].bytes).toString('utf8');
    expect(csv).toContain('overrides,buffer,total,2,');
    expect(csv).toContain('overrides,buffer,pattern_flagged,1,');
    expect(csv).toContain('overrides,hootsuite,total,1,');
    expect(csv).toContain('overrides,hootsuite,pattern_flagged,0,');
  });

  it('counts active vs inactive connections snapshot', async () => {
    const fixtures = {
      scheduler_connections: [
        { platform: 'buffer', active: true },
        { platform: 'buffer', active: true },
        { platform: 'buffer', active: false },
        { platform: 'later', active: true },
      ],
    };
    const result = await schedulerBridgeCollector.collect(PERIOD, buildCtx(fixtures));
    const csv = Buffer.from(result.files[0].bytes).toString('utf8');
    expect(csv).toContain('connections,buffer,active,2,');
    expect(csv).toContain('connections,buffer,inactive,1,');
    expect(csv).toContain('connections,later,active,1,');
  });

  it('produces deterministic output across runs', async () => {
    const fixtures = {
      scheduler_scans: [
        { connection_id: 'c1', practitioner_id: 'p1', decision: 'clean', platform: 'buffer' },
        { connection_id: 'c1', practitioner_id: 'p2', decision: 'blocked', platform: 'hootsuite' },
      ],
      scheduler_interceptions: [{ platform: 'hootsuite', succeeded: false }],
    };
    const a = await schedulerBridgeCollector.collect(PERIOD, buildCtx(fixtures));
    const b = await schedulerBridgeCollector.collect(PERIOD, buildCtx(fixtures));
    expect(Buffer.from(a.files[0].bytes).equals(Buffer.from(b.files[0].bytes))).toBe(true);
    expect(JSON.stringify(a.attestation)).toBe(JSON.stringify(b.attestation));
  });

  it('no plaintext caption text appears in the CSV (privacy invariant)', async () => {
    // This should be impossible because the collector never reads caption
    // columns, but we sanity-check by injecting a fixture column with
    // plausible draft text and asserting it is not echoed.
    const fixtures = {
      scheduler_scans: [
        { connection_id: 'c1', practitioner_id: 'p1', decision: 'clean', platform: 'buffer', caption_text: 'SECRET DRAFT DO NOT LEAK' },
      ],
    };
    const result = await schedulerBridgeCollector.collect(PERIOD, buildCtx(fixtures));
    const csv = Buffer.from(result.files[0].bytes).toString('utf8');
    expect(csv).not.toContain('SECRET DRAFT');
  });
});
