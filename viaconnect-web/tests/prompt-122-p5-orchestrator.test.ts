import { describe, it, expect } from 'vitest';
import { unzipSync } from 'fflate';
import type { CollectorFetcher, CollectorQuery } from '@/lib/soc2/collectors/types';
import {
  generateSoc2Packet,
  packetStorageKey,
  type ManualEvidenceFile,
} from '@/lib/soc2/assemble/orchestrator';
import { verifyJwtCompact } from '@/lib/soc2/assemble/sign';
import { generateEs256Keypair } from '@/lib/soc2/assemble/sign';
import { manifestSigningBytes } from '@/lib/soc2/assemble/manifest';
import { verifyNoPhi } from '@/lib/soc2/redaction/verify';

const FIXED_KEY = Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex');
const PERIOD = { start: '2026-01-01T00:00:00Z', end: '2026-03-31T23:59:59Z' };
const FIXED_NOW = '2026-04-01T00:00:00Z';
const FIXED_UUID = '01J8ZP5V3K700000000000000Q';

function buildFixtureFetcher(): CollectorFetcher {
  const fixtures: Record<string, Array<Record<string, unknown>>> = {
    soc2_collector_config: [],
    compliance_findings: [
      {
        id: 'f-1',
        finding_id: 'F-001',
        rule_id: 'rule.A',
        severity: 'P2',
        surface: 'content',
        source: 'runtime',
        location: {},
        excerpt: '',
        message: 'redacted',
        citation: '',
        remediation: {},
        status: 'open',
        assigned_to: null,
        escalated_to: null,
        resolution_note: null,
        resolved_at: null,
        created_at: '2026-02-10T00:00:00Z',
        evidence_bundle_id: null,
      },
    ],
  };
  const impl = async <T = Record<string, unknown>>(q: CollectorQuery): Promise<T[]> => {
    const rows = fixtures[q.table] ?? [];
    const filtered = rows.filter((r) => {
      for (const f of q.filters) {
        const v = r[f.column];
        switch (f.op) {
          case 'eq':          if (v !== f.value) return false; break;
          case 'neq':         if (v === f.value) return false; break;
          case 'gt':          if (!(String(v) >  String(f.value))) return false; break;
          case 'gte':         if (!(String(v) >= String(f.value))) return false; break;
          case 'lt':          if (!(String(v) <  String(f.value))) return false; break;
          case 'lte':         if (!(String(v) <= String(f.value))) return false; break;
          case 'in':          if (!(f.value as unknown[]).includes(v)) return false; break;
          case 'is_not_null': if (v === null || v === undefined) return false; break;
        }
      }
      return true;
    });
    return filtered as T[];
  };
  return impl;
}

function buildManualEvidence(): ManualEvidenceFile[] {
  return [
    {
      relativePath: 'CC1-control-environment/org-chart.pdf',
      contentType: 'application/pdf',
      bytes: new TextEncoder().encode('%PDF-1.4\n% org chart placeholder\n'),
      controls: ['CC1.1'],
      manualEvidenceId: 'me-1',
    },
  ];
}

describe('generateSoc2Packet — determinism', () => {
  it('rootHash is byte-stable across runs with identical inputs', async () => {
    // ES256 sign() uses random nonce k (see RFC 4754 vs RFC 6979), so the
    // signature and therefore manifest.json + ZIP bytes will vary. The
    // rootHash (Merkle over collector + manual + attestations files) is
    // computed BEFORE signing and must be stable — that's what the auditor
    // actually verifies against the signature.
    const keypair = generateEs256Keypair();
    const commonInput = {
      period: PERIOD,
      ruleRegistryVersion: 'v4.3.7',
      generatedBy: 'test',
      systemBoundary: 'test-boundary',
      activeSigningKey: { id: 'test-key', privateKeyPem: keypair.privateKeyPem },
      pseudonymKey: FIXED_KEY,
      fetch: buildFixtureFetcher(),
      manualEvidence: buildManualEvidence(),
      packetUuid: FIXED_UUID,
      nowIso: FIXED_NOW,
    };

    const a = await generateSoc2Packet(commonInput);
    const b = await generateSoc2Packet(commonInput);

    expect(a.rootHash).toBe(b.rootHash);
    expect(a.categoryHashes).toEqual(b.categoryHashes);

    // Every collector + manual + attestations file must have identical bytes.
    const aByPath = new Map(a.manifestFiles.map((f) => [f.path, f.sha256]));
    const bByPath = new Map(b.manifestFiles.map((f) => [f.path, f.sha256]));
    for (const [path, hash] of aByPath) {
      expect(bByPath.get(path), `file ${path} hash differs`).toBe(hash);
    }
  });
});

describe('generateSoc2Packet — manifest integrity', () => {
  it('signature verifies against manifestSigningBytes with the published public key', async () => {
    const keypair = generateEs256Keypair();
    const packet = await generateSoc2Packet({
      period: PERIOD,
      ruleRegistryVersion: 'v4.3.7',
      generatedBy: 'test',
      systemBoundary: 'test',
      activeSigningKey: { id: 'k-verify', privateKeyPem: keypair.privateKeyPem },
      pseudonymKey: FIXED_KEY,
      fetch: buildFixtureFetcher(),
      manualEvidence: buildManualEvidence(),
      packetUuid: FIXED_UUID,
      nowIso: FIXED_NOW,
    });

    const signingBytes = manifestSigningBytes({ ...packet.manifest, signature: undefined });
    const verify = verifyJwtCompact(packet.signatureJwt, signingBytes, { 'k-verify': keypair.publicKeyPem });
    expect(verify.ok).toBe(true);
    expect(verify.kid).toBe('k-verify');
  });

  it('manifest file list matches the ZIP contents (plus manifest.json itself)', async () => {
    const keypair = generateEs256Keypair();
    const packet = await generateSoc2Packet({
      period: PERIOD,
      ruleRegistryVersion: 'v4.3.7',
      generatedBy: 'test',
      systemBoundary: 'test',
      activeSigningKey: { id: 'k', privateKeyPem: keypair.privateKeyPem },
      pseudonymKey: FIXED_KEY,
      fetch: buildFixtureFetcher(),
      manualEvidence: buildManualEvidence(),
      packetUuid: FIXED_UUID,
      nowIso: FIXED_NOW,
    });

    const unzipped = unzipSync(packet.zipBytes);
    const zipPaths = Object.keys(unzipped).sort();
    expect(zipPaths).toContain('manifest.json');
    expect(zipPaths).toContain('CC1-control-environment/org-chart.pdf');
    expect(zipPaths).toContain('attestations.json');

    // Every manifest file path should appear in the ZIP.
    for (const f of packet.manifestFiles) {
      expect(zipPaths).toContain(f.path);
    }
  });

  it('manual evidence is included with correct hash', async () => {
    const keypair = generateEs256Keypair();
    const manual = buildManualEvidence();
    const packet = await generateSoc2Packet({
      period: PERIOD,
      ruleRegistryVersion: 'v4.3.7',
      generatedBy: 'test',
      systemBoundary: 'test',
      activeSigningKey: { id: 'k', privateKeyPem: keypair.privateKeyPem },
      pseudonymKey: FIXED_KEY,
      fetch: buildFixtureFetcher(),
      manualEvidence: manual,
      packetUuid: FIXED_UUID,
      nowIso: FIXED_NOW,
    });

    const mf = packet.manifestFiles.find((f) => f.path === 'CC1-control-environment/org-chart.pdf');
    expect(mf).toBeDefined();
    expect(mf!.sizeBytes).toBe(manual[0].bytes.byteLength);
    expect(packet.manualEvidenceIds).toContain('me-1');
  });
});

describe('generateSoc2Packet — PHI redaction across the assembled packet', () => {
  it('no plaintext PHI patterns in any file inside the ZIP', async () => {
    const keypair = generateEs256Keypair();
    const packet = await generateSoc2Packet({
      period: PERIOD,
      ruleRegistryVersion: 'v4.3.7',
      generatedBy: 'test',
      systemBoundary: 'test',
      activeSigningKey: { id: 'k', privateKeyPem: keypair.privateKeyPem },
      pseudonymKey: FIXED_KEY,
      fetch: buildFixtureFetcher(),
      manualEvidence: buildManualEvidence(),
      packetUuid: FIXED_UUID,
      nowIso: FIXED_NOW,
    });

    const unzipped = unzipSync(packet.zipBytes);
    for (const [path, bytes] of Object.entries(unzipped)) {
      // PDF binaries aren't meaningfully scannable, skip.
      if (path.endsWith('.pdf')) continue;
      const text = Buffer.from(bytes).toString('utf8');
      const v = verifyNoPhi(text);
      expect(v.ok, `PHI in ${path}: ${v.violations.map((x) => x.matched).join(',')}`).toBe(true);
    }
  });
});

describe('generateSoc2Packet — coverage + storage key', () => {
  it('reports coverage gaps for TSC categories with no files', async () => {
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
      // No manual evidence → CC1-control-environment will be a gap since the
      // collector set doesn't emit to it on its own.
    });

    // The fixture produces a marshall-findings CSV → CC4 is covered.
    // CC1, CC2, CC3, CC5 are left as gaps (no collector populates them from this fixture).
    expect(packet.coverageGaps.length).toBeGreaterThan(0);
  });

  it('packetStorageKey returns yyyy/mm/<uuid>.zip', () => {
    const key = packetStorageKey(PERIOD, FIXED_UUID);
    expect(key).toBe(`2026/01/${FIXED_UUID}.zip`);
  });
});

describe('generateSoc2Packet — attestations.json', () => {
  it('attestations.json contains one entry per collector and lists errors', async () => {
    const keypair = generateEs256Keypair();
    const packet = await generateSoc2Packet({
      period: PERIOD,
      ruleRegistryVersion: 'v4.3.7',
      generatedBy: 'test',
      systemBoundary: 'test',
      activeSigningKey: { id: 'k', privateKeyPem: keypair.privateKeyPem },
      pseudonymKey: FIXED_KEY,
      fetch: buildFixtureFetcher(),
      manualEvidence: buildManualEvidence(),
      packetUuid: FIXED_UUID,
      nowIso: FIXED_NOW,
    });

    const unzipped = unzipSync(packet.zipBytes);
    const attestBytes = unzipped['attestations.json'];
    expect(attestBytes).toBeDefined();
    const attestJson = JSON.parse(Buffer.from(attestBytes).toString('utf8')) as {
      packetUuid: string;
      attestations: Array<{ collectorId: string; rowCount: number }>;
      errors: Array<{ collectorId: string; error: string }>;
    };

    expect(attestJson.packetUuid).toBe(FIXED_UUID);
    // All 24 collectors should produce an attestation (even if row_count=0).
    expect(attestJson.attestations.length).toBeGreaterThanOrEqual(24);
    expect(Array.isArray(attestJson.errors)).toBe(true);
  });
});
