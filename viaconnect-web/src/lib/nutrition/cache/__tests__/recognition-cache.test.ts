// Prompt #170 Phase 1d: tests for the NutriVision recognition cache layer.
// Covers sha256 + pHash determinism, Hamming distance correctness, and the
// Supabase-mocked lookup/write paths. sharp is mocked to return a deterministic
// raw greyscale buffer so the pHash is reproducible without disk fixtures.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  computeSha256,
  computePHash64,
  hammingDistance64,
  lookupCache,
  writeCache,
} from '../recognition-cache';
import type { ReconciledRecognition } from '../../vision/types';

// BigInt literal helpers (tsconfig targets ES2017 so we use the constructor).
const BN_0 = BigInt(0);
const BN_1 = BigInt(1);
const BN_3 = BigInt(3);
const BN_64 = BigInt(64);

// ----------------------------------------------------------------------------
// sharp mock
// ----------------------------------------------------------------------------
//
// computePHash64 calls sharp(bytes).resize().greyscale().removeAlpha().raw().toBuffer().
// We mock the chain to return a deterministic 1024-byte buffer keyed by the
// first byte of the input. Same input bytes -> same output -> stable pHash.
vi.mock('sharp', () => {
  const factory = (input: Buffer): unknown => {
    const seed = input.length > 0 ? input[0] : 0;
    const raw = Buffer.alloc(32 * 32);
    for (let i = 0; i < raw.length; i++) {
      // Deterministic pseudo-random pattern that varies with seed so different
      // inputs yield different pHashes but identical inputs yield identical pHashes.
      raw[i] = (seed * 31 + i * 17) & 0xff;
    }
    const chain = {
      resize: () => chain,
      greyscale: () => chain,
      removeAlpha: () => chain,
      raw: () => chain,
      toBuffer: async () => raw,
    };
    return chain;
  };
  return { default: factory };
});

// ----------------------------------------------------------------------------
// Supabase mock helpers
// ----------------------------------------------------------------------------

interface QueryStub {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  gt: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
}

interface PassRow {
  image_hash_sha256: string;
  phash_64: string | null;
  provider: string;
  recognition_json: unknown;
  expires_at: string;
}

function makeSupabaseStub(
  exactRows: PassRow[],
  phashRows: PassRow[],
  upsertResult: { error: { message: string } | null } = { error: null },
) {
  // Track the supabase call sequence: first select() resolves the sha256
  // exact lookup, subsequent select() resolves the pHash scan.
  let selectCallIndex = 0;
  const upsertMock = vi.fn().mockResolvedValue(upsertResult);

  const fromMock = vi.fn().mockImplementation((_table: string) => {
    void _table;
    const stub: QueryStub = {
      select: vi.fn().mockImplementation(() => {
        selectCallIndex++;
        const currentIndex = selectCallIndex;
        const builder = {
          eq: vi.fn().mockImplementation(() => builder),
          gt: vi.fn().mockImplementation(() => {
            if (currentIndex === 1) {
              return {
                limit: vi.fn().mockResolvedValue({ data: exactRows, error: null }),
              };
            }
            // Direct resolution for the phash scan (no .limit() chain).
            return Promise.resolve({ data: phashRows, error: null });
          }),
          limit: vi.fn().mockImplementation(() => builder),
        };
        return builder;
      }),
      eq: vi.fn().mockImplementation(() => stub),
      gt: vi.fn().mockImplementation(() => stub),
      limit: vi.fn().mockImplementation(() => stub),
      upsert: upsertMock,
    };
    return stub;
  });

  return { fromMock, upsertMock, from: fromMock };
}

function fakeReconciled(): ReconciledRecognition {
  return {
    items: [
      {
        id: 'p1',
        foodName: 'Pizza',
        boundingBox: { x: 0, y: 0, w: 100, h: 100 },
        confidence: 0.9,
      },
    ],
    providerPrimary: 'logmeal',
    mealConfidence: 0.9,
    warnings: [],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ----------------------------------------------------------------------------
// computeSha256
// ----------------------------------------------------------------------------

describe('computeSha256', () => {
  it('returns a 64-character lowercase hex digest', () => {
    const out = computeSha256(Buffer.from('hello'));
    expect(out).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is stable for identical inputs', () => {
    const a = computeSha256(Buffer.from('abc'));
    const b = computeSha256(Buffer.from('abc'));
    expect(a).toBe(b);
  });

  it('differs for different inputs', () => {
    expect(computeSha256(Buffer.from('a'))).not.toBe(computeSha256(Buffer.from('b')));
  });
});

// ----------------------------------------------------------------------------
// computePHash64
// ----------------------------------------------------------------------------

describe('computePHash64', () => {
  it('returns a bigint within the unsigned 64-bit range', async () => {
    const h = await computePHash64(Buffer.from([1, 2, 3, 4]));
    expect(typeof h).toBe('bigint');
    expect(h >= BN_0).toBe(true);
    expect(h < (BN_1 << BN_64)).toBe(true);
  });

  it('is stable across repeated calls with the same input bytes', async () => {
    const input = Buffer.from([42, 7, 9]);
    const a = await computePHash64(input);
    const b = await computePHash64(input);
    expect(a).toBe(b);
  });

  it('returns different hashes for inputs with different first byte', async () => {
    const a = await computePHash64(Buffer.from([1, 0, 0]));
    const b = await computePHash64(Buffer.from([200, 0, 0]));
    expect(a).not.toBe(b);
  });
});

// ----------------------------------------------------------------------------
// hammingDistance64
// ----------------------------------------------------------------------------

describe('hammingDistance64', () => {
  it('returns 0 for identical bigints', () => {
    expect(hammingDistance64(BN_0, BN_0)).toBe(0);
    expect(hammingDistance64(BigInt('0xCAFEBABE'), BigInt('0xCAFEBABE'))).toBe(0);
  });

  it('returns 1 for a single bit flip', () => {
    expect(hammingDistance64(BN_1, BN_0)).toBe(1);
    expect(hammingDistance64(BN_1 << BigInt(63), BN_0)).toBe(1);
  });

  it('returns 64 when all bits differ', () => {
    const allOnes = BigInt('0xFFFFFFFFFFFFFFFF');
    expect(hammingDistance64(allOnes, BN_0)).toBe(64);
  });

  it('counts an arbitrary bit pattern correctly', () => {
    // 0b1010 has two bits set; XOR with 0 is 2 bits.
    expect(hammingDistance64(BigInt('0b1010'), BN_0)).toBe(2);
    // 0xFF (8 bits) XOR 0x0F (4 bits, all in low nibble) = 0xF0 (4 bits).
    expect(hammingDistance64(BigInt('0xFF'), BigInt('0x0F'))).toBe(4);
  });

  it('is symmetric', () => {
    expect(hammingDistance64(BigInt('0x12345678'), BigInt('0x87654321'))).toBe(
      hammingDistance64(BigInt('0x87654321'), BigInt('0x12345678')),
    );
  });
});

// ----------------------------------------------------------------------------
// lookupCache
// ----------------------------------------------------------------------------

describe('lookupCache', () => {
  it('returns sha256_exact when a fresh row matches the hash', async () => {
    const sha = 'a'.repeat(64);
    const recognition = fakeReconciled();
    const stub = makeSupabaseStub(
      [
        {
          image_hash_sha256: sha,
          phash_64: '0',
          provider: 'logmeal',
          recognition_json: recognition,
          expires_at: new Date(Date.now() + 86_400_000).toISOString(),
        },
      ],
      [],
    );
    const hit = await lookupCache({
      supabaseAdmin: stub as unknown as Parameters<typeof lookupCache>[0]['supabaseAdmin'],
      imageHashSha256: sha,
      pHash64: BN_0,
    });
    expect(hit).not.toBeNull();
    expect(hit?.kind).toBe('sha256_exact');
    expect(hit?.recognition.providerPrimary).toBe('logmeal');
  });

  it('returns phash_near when no exact match but a pHash sits within threshold', async () => {
    const sha = 'b'.repeat(64);
    const recognition = fakeReconciled();
    // Two candidate rows. Row A is far (large Hamming), row B is close (Hamming 2).
    const rowA: PassRow = {
      image_hash_sha256: 'far-row',
      phash_64: '2242545357361093407', // large value -> high Hamming distance from 0
      provider: 'logmeal',
      recognition_json: recognition,
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    };
    const rowB: PassRow = {
      image_hash_sha256: 'near-row',
      phash_64: '3', // 0b11 -> distance 2 from 0
      provider: 'logmeal',
      recognition_json: recognition,
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    };
    const stub = makeSupabaseStub([], [rowA, rowB]);
    const hit = await lookupCache({
      supabaseAdmin: stub as unknown as Parameters<typeof lookupCache>[0]['supabaseAdmin'],
      imageHashSha256: sha,
      pHash64: BN_0,
      maxHammingDistance: 6,
    });
    expect(hit).not.toBeNull();
    expect(hit?.kind).toBe('phash_near');
    expect(hit?.hammingDistance).toBe(2);
    void BN_3; // referenced to keep imports tidy.
  });

  it('returns null when no rows exist', async () => {
    const stub = makeSupabaseStub([], []);
    const hit = await lookupCache({
      supabaseAdmin: stub as unknown as Parameters<typeof lookupCache>[0]['supabaseAdmin'],
      imageHashSha256: 'c'.repeat(64),
      pHash64: BN_0,
    });
    expect(hit).toBeNull();
  });

  it('returns null when the closest pHash exceeds the Hamming threshold', async () => {
    const recognition = fakeReconciled();
    // All-ones is distance 64 from 0; max threshold 6 -> miss.
    const row: PassRow = {
      image_hash_sha256: 'far',
      phash_64: '18446744073709551615', // 2^64 - 1, distance 64 from 0
      provider: 'logmeal',
      recognition_json: recognition,
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    };
    const stub = makeSupabaseStub([], [row]);
    const hit = await lookupCache({
      supabaseAdmin: stub as unknown as Parameters<typeof lookupCache>[0]['supabaseAdmin'],
      imageHashSha256: 'no-exact',
      pHash64: BN_0,
      maxHammingDistance: 6,
    });
    expect(hit).toBeNull();
  });
});

// ----------------------------------------------------------------------------
// writeCache
// ----------------------------------------------------------------------------

describe('writeCache', () => {
  it('calls supabase upsert with the right shape and onConflict key', async () => {
    const stub = makeSupabaseStub([], []);
    await writeCache({
      supabaseAdmin: stub as unknown as Parameters<typeof writeCache>[0]['supabaseAdmin'],
      imageHashSha256: 'd'.repeat(64),
      pHash64: BigInt(12345),
      provider: 'logmeal',
      recognition: fakeReconciled(),
    });
    expect(stub.upsertMock).toHaveBeenCalledTimes(1);
    const callArgs = stub.upsertMock.mock.calls[0];
    const payload = callArgs[0] as Record<string, unknown>;
    expect(payload.image_hash_sha256).toBe('d'.repeat(64));
    expect(payload.phash_64).toBe('12345');
    expect(payload.provider).toBe('logmeal');
    expect(typeof payload.expires_at).toBe('string');
    const conflict = callArgs[1] as { onConflict?: string };
    expect(conflict.onConflict).toBe('image_hash_sha256, provider');
  });

  it('throws when supabase upsert returns an error', async () => {
    const stub = makeSupabaseStub([], [], { error: { message: 'duplicate or whatever' } });
    await expect(
      writeCache({
        supabaseAdmin: stub as unknown as Parameters<typeof writeCache>[0]['supabaseAdmin'],
        imageHashSha256: 'e'.repeat(64),
        pHash64: BN_0,
        provider: 'logmeal',
        recognition: fakeReconciled(),
      }),
    ).rejects.toThrow(/writeCache upsert failed/);
  });
});
