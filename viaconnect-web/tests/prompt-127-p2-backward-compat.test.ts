import { describe, it, expect } from 'vitest';
import { generateSoc2Packet } from '@/lib/soc2/assemble/orchestrator';
import { generateEs256Keypair } from '@/lib/soc2/assemble/sign';
import type { CollectorQuery, CollectorFetcher } from '@/lib/soc2/collectors/types';

// Fixture fetcher identical to the one used in #122 P5 tests so the
// backward-compat test compares packets built from the same fixtures
// pre- and post-registry.
const FIXED_KEY = Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex');
const PERIOD = { start: '2026-01-01T00:00:00Z', end: '2026-03-31T23:59:59Z' };
const FIXED_NOW = '2026-04-01T00:00:00Z';
const FIXED_UUID = '01J8ZP5V3K700000000000001B';

function buildFixtureFetcher(): CollectorFetcher {
  const fixtures: Record<string, Array<Record<string, unknown>>> = {
    soc2_collector_config: [],
    compliance_findings: [
      {
        id: 'f-1', finding_id: 'F-001', rule_id: 'rule.A', severity: 'P2',
        surface: 'content', source: 'runtime', location: {}, excerpt: '',
        message: 'redacted', citation: '', remediation: {}, status: 'open',
        assigned_to: null, escalated_to: null, resolution_note: null,
        resolved_at: null, created_at: '2026-02-10T00:00:00Z',
        evidence_bundle_id: null,
      },
    ],
  };
  return async <T = Record<string, unknown>>(q: CollectorQuery): Promise<T[]> => {
    const rows = fixtures[q.table] ?? [];
    const filtered = rows.filter((r) => {
      for (const f of q.filters) {
        const v = r[f.column];
        switch (f.op) {
          case 'eq':  if (v !== f.value) return false; break;
          case 'gte': if (!(String(v) >= String(f.value))) return false; break;
          case 'lte': if (!(String(v) <= String(f.value))) return false; break;
          default: break;
        }
      }
      return true;
    });
    return filtered as T[];
  };
}

describe('P2 backward compatibility — SOC 2 packet byte-identity', () => {
  it('generating with no frameworkId vs frameworkId=soc2 produces identical rootHash + file hashes', async () => {
    const keypair = generateEs256Keypair();
    const base = {
      period: PERIOD,
      ruleRegistryVersion: 'v4.3.7',
      generatedBy: 'test:backward-compat',
      systemBoundary: 'test-boundary',
      activeSigningKey: { id: 'bw-k', privateKeyPem: keypair.privateKeyPem },
      pseudonymKey: FIXED_KEY,
      fetch: buildFixtureFetcher(),
      packetUuid: FIXED_UUID,
      nowIso: FIXED_NOW,
    };

    const legacy = await generateSoc2Packet(base);
    const registered = await generateSoc2Packet({ ...base, frameworkId: 'soc2' });

    expect(legacy.rootHash).toBe(registered.rootHash);
    expect(legacy.categoryHashes).toEqual(registered.categoryHashes);
    expect(legacy.manifestFiles.length).toBe(registered.manifestFiles.length);
    const byPathLegacy = new Map(legacy.manifestFiles.map((f) => [f.path, f.sha256]));
    const byPathReg    = new Map(registered.manifestFiles.map((f) => [f.path, f.sha256]));
    for (const [path, hash] of byPathLegacy) {
      expect(byPathReg.get(path), `file ${path} hash differs`).toBe(hash);
    }
  });

  it('framework_id defaults to "soc2" when unspecified', async () => {
    const keypair = generateEs256Keypair();
    const packet = await generateSoc2Packet({
      period: PERIOD,
      ruleRegistryVersion: 'v4.3.7',
      generatedBy: 'test',
      systemBoundary: 'test',
      activeSigningKey: { id: 'k', privateKeyPem: keypair.privateKeyPem },
      pseudonymKey: FIXED_KEY,
      fetch: buildFixtureFetcher(),
      packetUuid: FIXED_UUID,
      nowIso: FIXED_NOW,
    });
    expect(packet.frameworkId).toBe('soc2');
  });

  it('frameworkRegistryVersion is pinned on every generated packet', async () => {
    const keypair = generateEs256Keypair();
    const packet = await generateSoc2Packet({
      period: PERIOD,
      ruleRegistryVersion: 'v4.3.7',
      generatedBy: 'test',
      systemBoundary: 'test',
      activeSigningKey: { id: 'k', privateKeyPem: keypair.privateKeyPem },
      pseudonymKey: FIXED_KEY,
      fetch: buildFixtureFetcher(),
      frameworkId: 'soc2',
      packetUuid: FIXED_UUID,
      nowIso: FIXED_NOW,
    });
    expect(packet.frameworkRegistryVersion).toMatch(/^v\d+\.\d+\.\d+/);
  });

  it('existing P5 determinism property still holds with registry wired in', async () => {
    const keypair = generateEs256Keypair();
    const common = {
      period: PERIOD,
      ruleRegistryVersion: 'v4.3.7',
      generatedBy: 'test',
      systemBoundary: 'test-boundary',
      activeSigningKey: { id: 'det-k', privateKeyPem: keypair.privateKeyPem },
      pseudonymKey: FIXED_KEY,
      fetch: buildFixtureFetcher(),
      frameworkId: 'soc2' as const,
      packetUuid: FIXED_UUID,
      nowIso: FIXED_NOW,
    };
    const a = await generateSoc2Packet(common);
    const b = await generateSoc2Packet(common);
    expect(a.rootHash).toBe(b.rootHash);
    expect(a.categoryHashes).toEqual(b.categoryHashes);
  });
});
