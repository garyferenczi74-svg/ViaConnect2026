import { describe, it, expect } from 'vitest';
import { assembleDeterministicZip, unzipPacket } from '@/lib/soc2/assemble/zipper';
import {
  sha256,
  combinePair,
  merkleRoot,
  categoryRoot,
  packetRoot,
} from '@/lib/soc2/assemble/merkle';
import {
  buildManifest,
  stableStringify,
  manifestSigningBytes,
  manifestFileFromBytes,
  validateManifestCoverage,
} from '@/lib/soc2/assemble/manifest';
import {
  generateEs256Keypair,
  signPayload,
  verifyJwtCompact,
} from '@/lib/soc2/assemble/sign';
import { buildJwks, jwksToKidPemMap, pemToJwk } from '@/lib/soc2/assemble/jwks';
import { verifyPacket } from '@/lib/soc2/verify/soc2-verify';

function bytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

describe('merkle — primitives', () => {
  it('sha256 of empty string is the well-known constant', () => {
    expect(sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('combinePair is order-sensitive', () => {
    const a = 'aa'.repeat(32);
    const b = 'bb'.repeat(32);
    expect(combinePair(a, b)).not.toBe(combinePair(b, a));
  });

  it('merkleRoot over a single element equals the element', () => {
    const h = sha256('x');
    expect(merkleRoot([h])).toBe(h);
  });

  it('merkleRoot is deterministic', () => {
    const hs = ['a', 'b', 'c', 'd', 'e'].map((s) => sha256(s));
    expect(merkleRoot(hs)).toBe(merkleRoot(hs));
  });

  it('merkleRoot with odd element count duplicates last', () => {
    const a = sha256('a');
    const b = sha256('b');
    const c = sha256('c');
    // Odd: layer 1 is [H(a,b), H(c,c)], layer 2 is H(H(a,b), H(c,c))
    const expected = combinePair(combinePair(a, b), combinePair(c, c));
    expect(merkleRoot([a, b, c])).toBe(expected);
  });

  it('categoryRoot sorts files by path regardless of input order', () => {
    const aFirst = categoryRoot([
      { path: 'X/a.csv', sha256: sha256('a') },
      { path: 'X/b.csv', sha256: sha256('b') },
    ]);
    const bFirst = categoryRoot([
      { path: 'X/b.csv', sha256: sha256('b') },
      { path: 'X/a.csv', sha256: sha256('a') },
    ]);
    expect(aFirst).toBe(bFirst);
  });

  it('packetRoot sorts categories alphabetically', () => {
    const ab = packetRoot({ A: sha256('a'), B: sha256('b') });
    const ba = packetRoot({ B: sha256('b'), A: sha256('a') });
    expect(ab).toBe(ba);
  });
});

describe('zipper — byte-determinism', () => {
  it('same inputs → byte-identical ZIP (within same Node process)', () => {
    const files = [
      { relativePath: 'manifest.json', bytes: bytes('{}') },
      { relativePath: 'CC1-control-environment/README.md', bytes: bytes('# CC1') },
      { relativePath: 'CC4-monitoring-activities/a.csv', bytes: bytes('row1,row2\n') },
    ];
    const z1 = assembleDeterministicZip(files);
    const z2 = assembleDeterministicZip(files);
    expect(Buffer.from(z1).equals(Buffer.from(z2))).toBe(true);
  });

  it('input order is irrelevant; only the path+bytes set matters', () => {
    const a = { relativePath: 'a.csv', bytes: bytes('a') };
    const b = { relativePath: 'b.csv', bytes: bytes('b') };
    const c = { relativePath: 'c.csv', bytes: bytes('c') };
    const z1 = assembleDeterministicZip([a, b, c]);
    const z2 = assembleDeterministicZip([c, a, b]);
    expect(Buffer.from(z1).equals(Buffer.from(z2))).toBe(true);
  });

  it('changing a single byte in a file yields a different ZIP', () => {
    const files1 = [{ relativePath: 'f.csv', bytes: bytes('abc') }];
    const files2 = [{ relativePath: 'f.csv', bytes: bytes('abd') }];
    const z1 = assembleDeterministicZip(files1);
    const z2 = assembleDeterministicZip(files2);
    expect(Buffer.from(z1).equals(Buffer.from(z2))).toBe(false);
  });

  it('unzipPacket round-trips', () => {
    const input = [
      { relativePath: 'x/y.csv', bytes: bytes('hello,world\n') },
      { relativePath: 'x/z.json', bytes: bytes('{"a":1}') },
    ];
    const zipped = assembleDeterministicZip(input);
    const unzipped = unzipPacket(zipped);
    expect(Object.keys(unzipped).sort()).toEqual(['x/y.csv', 'x/z.json']);
    expect(Buffer.from(unzipped['x/y.csv']).toString('utf8')).toBe('hello,world\n');
  });
});

describe('manifest — stable JSON and build', () => {
  it('stableStringify sorts object keys', () => {
    expect(stableStringify({ b: 1, a: 2, c: { z: 3, y: 4 } })).toBe('{"a":2,"b":1,"c":{"y":4,"z":3}}');
  });

  it('stableStringify preserves array order', () => {
    expect(stableStringify([3, 1, 2])).toBe('[3,1,2]');
  });

  it('buildManifest computes deterministic categoryHashes + rootHash', () => {
    const files = [
      manifestFileFromBytes('CC4-monitoring-activities/a.csv', 'text/csv', bytes('x'), ['CC4.1']),
      manifestFileFromBytes('CC4-monitoring-activities/b.csv', 'text/csv', bytes('y'), ['CC4.2']),
      manifestFileFromBytes('CC6-logical-access/users.csv', 'text/csv', bytes('z'), ['CC6.1']),
    ];
    const m1 = buildManifest({
      packetUuid: 'pkt-01',
      period: { start: '2026-01-01T00:00:00Z', end: '2026-03-31T23:59:59Z', attestationType: 'Type II' },
      tscInScope: ['CC4', 'CC6'],
      generatedAt: '2026-04-05T00:00:00Z',
      generatedBy: 'soc2-exporter:test',
      ruleRegistryVersion: 'v4.3.7',
      systemBoundary: 'v2026-Q1',
      files,
    });
    const m2 = buildManifest({
      packetUuid: 'pkt-01',
      period: { start: '2026-01-01T00:00:00Z', end: '2026-03-31T23:59:59Z', attestationType: 'Type II' },
      tscInScope: ['CC4', 'CC6'],
      generatedAt: '2026-04-05T00:00:00Z',
      generatedBy: 'soc2-exporter:test',
      ruleRegistryVersion: 'v4.3.7',
      systemBoundary: 'v2026-Q1',
      files: files.slice().reverse(),
    });
    expect(m1.rootHash).toBe(m2.rootHash);
    expect(m1.categoryHashes).toEqual(m2.categoryHashes);
  });

  it('validateManifestCoverage flags TSC codes with no files', () => {
    const files = [
      manifestFileFromBytes('CC4-monitoring-activities/a.csv', 'text/csv', bytes('x'), ['CC4.1']),
    ];
    const m = buildManifest({
      packetUuid: 'pkt-02',
      period: { start: '2026-01-01T00:00:00Z', end: '2026-03-31T23:59:59Z', attestationType: 'Type II' },
      tscInScope: ['CC4', 'CC6', 'A1'],
      generatedAt: '2026-04-05T00:00:00Z',
      generatedBy: 'soc2-exporter:test',
      ruleRegistryVersion: 'v4.3.7',
      systemBoundary: 'v2026-Q1',
      files,
    });
    expect(validateManifestCoverage(m).sort()).toEqual(['A1', 'CC6']);
  });

  it('manifestSigningBytes strips signature', () => {
    const m = buildManifest({
      packetUuid: 'pkt-03',
      period: { start: '2026-01-01T00:00:00Z', end: '2026-03-31T23:59:59Z', attestationType: 'Type II' },
      tscInScope: ['CC4'],
      generatedAt: '2026-04-05T00:00:00Z',
      generatedBy: 't',
      ruleRegistryVersion: 'v1',
      systemBoundary: 'b',
      files: [manifestFileFromBytes('CC4-monitoring-activities/a.csv', 'text/csv', bytes('x'), ['CC4.1'])],
    });
    m.signature = { alg: 'ES256', kid: 'k1', jwt: 'eyJ...' };
    const signingBytes = manifestSigningBytes(m);
    const parsed = JSON.parse(signingBytes.toString('utf8'));
    expect(parsed.signature).toBeUndefined();
  });
});

describe('sign + JWKS', () => {
  it('ES256 roundtrip: sign → verify against published JWKS', () => {
    const kp = generateEs256Keypair();
    const payload = Buffer.from('canonical-bytes-to-sign');
    const jwt = signPayload(payload, { signingKeyId: 'k1', privateKeyPem: kp.privateKeyPem });
    const jwks = buildJwks([
      { id: 'k1', public_key_pem: kp.publicKeyPem, active: true, retired_at: null },
    ]);
    const kidPemMap = jwksToKidPemMap(jwks);
    const result = verifyJwtCompact(jwt, payload, kidPemMap);
    expect(result.ok).toBe(true);
    expect(result.kid).toBe('k1');
  });

  it('verify rejects a signature with tampered payload', () => {
    const kp = generateEs256Keypair();
    const jwt = signPayload(Buffer.from('original'), { signingKeyId: 'k1', privateKeyPem: kp.privateKeyPem });
    const jwks = buildJwks([{ id: 'k1', public_key_pem: kp.publicKeyPem, active: true, retired_at: null }]);
    const result = verifyJwtCompact(jwt, Buffer.from('tampered'), jwksToKidPemMap(jwks));
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('payload_mismatch');
  });

  it('verify rejects with unknown_kid when key not in JWKS', () => {
    const kp = generateEs256Keypair();
    const jwt = signPayload(Buffer.from('x'), { signingKeyId: 'k-ghost', privateKeyPem: kp.privateKeyPem });
    const jwks = buildJwks([
      { id: 'k1', public_key_pem: kp.publicKeyPem, active: true, retired_at: null },
    ]);
    const result = verifyJwtCompact(jwt, Buffer.from('x'), jwksToKidPemMap(jwks));
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('unknown_kid');
  });

  it('pemToJwk produces EC P-256 JWK with x + y + kid', () => {
    const kp = generateEs256Keypair();
    const jwk = pemToJwk(kp.publicKeyPem, 'k42');
    expect(jwk.kty).toBe('EC');
    expect(jwk.crv).toBe('P-256');
    expect(jwk.alg).toBe('ES256');
    expect(jwk.kid).toBe('k42');
    expect(typeof jwk.x).toBe('string');
    expect(typeof jwk.y).toBe('string');
  });

  it('JWKS excludes keys retired > 3 years ago', () => {
    const kp = generateEs256Keypair();
    const fourYearsAgo = new Date(Date.now() - 4 * 365 * 24 * 3600 * 1000).toISOString();
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString();
    const jwks = buildJwks([
      { id: 'k_ancient', public_key_pem: kp.publicKeyPem, active: false, retired_at: fourYearsAgo },
      { id: 'k_recent',  public_key_pem: kp.publicKeyPem, active: false, retired_at: oneYearAgo },
      { id: 'k_active',  public_key_pem: kp.publicKeyPem, active: true,  retired_at: null },
    ]);
    const kids = jwks.keys.map((k) => k.kid).sort();
    expect(kids).toEqual(['k_active', 'k_recent']);
  });
});

describe('verifyPacket — end-to-end', () => {
  function buildFullPacket(overrides?: { tamperManifestFile?: boolean; skipSignature?: boolean }) {
    const kp = generateEs256Keypair();
    const kid = 'k-test-001';
    const files = [
      manifestFileFromBytes('CC4-monitoring-activities/a.csv', 'text/csv', bytes('rule_id,severity\nR1,P0\n'), ['CC4.1']),
      manifestFileFromBytes('CC4-monitoring-activities/b.csv', 'text/csv', bytes('x,y\n1,2\n'), ['CC4.2']),
      manifestFileFromBytes('CC6-logical-access/users.csv', 'text/csv', bytes('user,role\nu1,admin\n'), ['CC6.1']),
    ];
    const manifest = buildManifest({
      packetUuid: 'pkt-e2e',
      period: { start: '2026-01-01T00:00:00Z', end: '2026-03-31T23:59:59Z', attestationType: 'Type II' },
      tscInScope: ['CC4', 'CC6'],
      generatedAt: '2026-04-05T00:00:00Z',
      generatedBy: 'soc2-exporter:e2e',
      ruleRegistryVersion: 'v4.3.7',
      systemBoundary: 'v2026-Q1',
      files,
    });
    if (!overrides?.skipSignature) {
      const jwt = signPayload(manifestSigningBytes(manifest), { signingKeyId: kid, privateKeyPem: kp.privateKeyPem });
      manifest.signature = { alg: 'ES256', kid, jwt };
    }

    // Build in-memory packet bytes.
    const packetInputs = [
      { relativePath: 'manifest.json', bytes: Buffer.from(JSON.stringify(manifest), 'utf8') },
      ...files.map((f, i) => {
        const content = ['rule_id,severity\nR1,P0\n', 'x,y\n1,2\n', 'user,role\nu1,admin\n'][i];
        const finalContent = overrides?.tamperManifestFile && i === 0 ? 'TAMPERED' : content;
        return { relativePath: f.path, bytes: bytes(finalContent) };
      }),
    ];
    const zipBytes = assembleDeterministicZip(packetInputs);

    const jwks = buildJwks([
      { id: kid, public_key_pem: kp.publicKeyPem, active: true, retired_at: null },
    ]);

    return { zipBytes, jwks };
  }

  it('verifies a fresh packet end-to-end', async () => {
    const { zipBytes, jwks } = buildFullPacket();
    const result = await verifyPacket(zipBytes, jwks);
    expect(result.ok).toBe(true);
    expect(result.signatureValid).toBe(true);
    expect(result.rootHashValid).toBe(true);
    expect(result.categoryHashesValid).toBe(true);
    expect(result.allFileHashesValid).toBe(true);
  });

  it('detects a single-byte tamper and names the failed file', async () => {
    const { zipBytes, jwks } = buildFullPacket({ tamperManifestFile: true });
    const result = await verifyPacket(zipBytes, jwks);
    expect(result.ok).toBe(false);
    expect(result.allFileHashesValid).toBe(false);
    expect(result.failedFile).toBe('CC4-monitoring-activities/a.csv');
  });

  it('reports signatureValid=false when signature is absent', async () => {
    const { zipBytes, jwks } = buildFullPacket({ skipSignature: true });
    const result = await verifyPacket(zipBytes, jwks);
    expect(result.signatureValid).toBe(false);
    expect(result.ok).toBe(false);
  });
});
