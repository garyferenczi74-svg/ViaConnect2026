import { describe, it, expect } from 'vitest';
import sharp from 'sharp';

import { normalizeImage, looksLikeImage, NormalizeError } from '@/lib/marshall/vision/normalize';
import { computePhash, hammingDistance, PHASH_NEAR_DUPLICATE_THRESHOLD } from '@/lib/marshall/vision/phash';
import { redactPhi, scanForPhi, isStronglyPhiLike, PHI_PATTERNS } from '@/lib/marshall/vision/phiRedact';
import { matchAgainstCorpus, filterCorpusBySku } from '@/lib/marshall/vision/corpusMatch';
import type { ReferenceCorpusEntry } from '@/lib/marshall/vision/types';

/** Create a synthetic test image: solid-color N×N JPEG. */
async function makeImage(
  width: number,
  height: number,
  rgb: [number, number, number],
  format: 'jpeg' | 'png' | 'webp' = 'jpeg',
): Promise<Uint8Array> {
  const base = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: rgb[0], g: rgb[1], b: rgb[2] },
    },
  });
  const buf =
    format === 'jpeg' ? await base.jpeg({ quality: 90 }).toBuffer() :
    format === 'png'  ? await base.png().toBuffer() :
                         await base.webp().toBuffer();
  return new Uint8Array(buf);
}

/** Create a synthetic image with a text watermark for OCR-lite-adjacent tests. */
async function makeImageWithPattern(
  width: number,
  height: number,
  stripeStart: number,
): Promise<Uint8Array> {
  // We build it via two blended regions so the pHash is meaningfully different from a solid color.
  const buf = await sharp({
    create: { width, height, channels: 3, background: { r: 220, g: 220, b: 220 } },
  })
    .composite([{
      input: {
        create: {
          width: Math.max(1, Math.floor(width / 3)),
          height: Math.max(1, Math.floor(height / 3)),
          channels: 3,
          background: { r: 30, g: 30, b: 30 },
        },
      },
      left: stripeStart,
      top: stripeStart,
    }])
    .jpeg({ quality: 90 })
    .toBuffer();
  return new Uint8Array(buf);
}

describe('normalize', () => {
  it('produces a JPEG with the longest edge <= 2048', async () => {
    const input = await makeImage(3000, 2000, [100, 150, 200]);
    const out = await normalizeImage({ bytes: input, declaredContentType: 'image/jpeg' });
    expect(out.contentType).toBe('image/jpeg');
    expect(Math.max(out.widthPx, out.heightPx)).toBeLessThanOrEqual(2048);
    expect(out.widthPx / out.heightPx).toBeCloseTo(1.5, 1);
    expect(out.exifStripped).toBe(true);
    expect(out.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(out.perceptualHash).toMatch(/^[0-9a-f]{16}$/);
  });

  it('marks small images as resolution_inadequate', async () => {
    const small = await makeImage(200, 150, [100, 100, 100]);
    const out = await normalizeImage({ bytes: small });
    expect(out.resolutionAdequate).toBe(false);
  });

  it('rejects oversize inputs', async () => {
    const bytes = new Uint8Array(21 * 1024 * 1024); // 21 MB
    await expect(normalizeImage({ bytes })).rejects.toBeInstanceOf(NormalizeError);
  });

  it('rejects unsupported declared content type', async () => {
    const input = await makeImage(400, 400, [50, 50, 50]);
    await expect(normalizeImage({ bytes: input, declaredContentType: 'image/gif' })).rejects.toBeInstanceOf(NormalizeError);
  });

  it('re-encodes PNG to JPEG', async () => {
    const input = await makeImage(500, 500, [200, 100, 100], 'png');
    const out = await normalizeImage({ bytes: input });
    expect(out.contentType).toBe('image/jpeg');
  });

  it('looksLikeImage sniffs common magic bytes', async () => {
    const jpg = await makeImage(100, 100, [0, 0, 0], 'jpeg');
    const png = await makeImage(100, 100, [0, 0, 0], 'png');
    expect(looksLikeImage(jpg)).toBe(true);
    expect(looksLikeImage(png)).toBe(true);
    expect(looksLikeImage(new Uint8Array([0, 1, 2, 3]))).toBe(false);
  });
});

describe('phash', () => {
  it('is deterministic for the same input bytes', async () => {
    const img = await makeImageWithPattern(512, 512, 100);
    const a = await computePhash(img);
    const b = await computePhash(img);
    expect(a.hex).toBe(b.hex);
    expect(a.bits).toBe(b.bits);
  });

  it('produces a 16-hex-char string (64-bit hash)', async () => {
    const img = await makeImageWithPattern(256, 256, 50);
    const p = await computePhash(img);
    expect(p.hex).toMatch(/^[0-9a-f]{16}$/);
    expect(p.bits.length).toBe(64);
  });

  it('hamming distance is 0 between identical hashes', () => {
    expect(hammingDistance('abcdef0123456789', 'abcdef0123456789')).toBe(0);
  });

  it('hamming distance matches popcount of xor', () => {
    // 0xff XOR 0x00 = 0xff = 8 bits set (only on the one differing byte)
    // full strings: 'ff' vs '00' differ in 8 bits
    expect(hammingDistance('ff00000000000000', '0000000000000000')).toBe(8);
  });

  it('different-content images produce different hashes', async () => {
    const imgA = await makeImageWithPattern(512, 512, 50);
    const imgB = await makeImageWithPattern(512, 512, 300);
    const a = await computePhash(imgA);
    const b = await computePhash(imgB);
    expect(a.hex).not.toBe(b.hex);
    expect(hammingDistance(a.hex, b.hex)).toBeGreaterThan(PHASH_NEAR_DUPLICATE_THRESHOLD);
  });

  it('minor JPEG recompression stays under the near-duplicate threshold', async () => {
    const original = await makeImageWithPattern(512, 512, 150);
    const recompressed = await sharp(original).jpeg({ quality: 70 }).toBuffer();
    const a = await computePhash(original);
    const b = await computePhash(new Uint8Array(recompressed));
    expect(hammingDistance(a.hex, b.hex)).toBeLessThanOrEqual(PHASH_NEAR_DUPLICATE_THRESHOLD);
  });
});

describe('phi redaction — pattern scanner', () => {
  it('detects common prescription-label patterns', () => {
    expect(scanForPhi('Rx #: 12345678')).toContain('rx_number');
    expect(scanForPhi('DEA: AB1234567')).toContain('dea_number');
    expect(scanForPhi('DOB: 01/15/1955')).toContain('dob_label');
    expect(scanForPhi('Patient: Jane Doe')).toContain('patient_label');
    expect(scanForPhi('Dr. John Smith')).toContain('prescriber');
    expect(scanForPhi('MRN: 987654')).toContain('mrn');
    expect(scanForPhi('Refills: 3')).toContain('refills_label');
    expect(scanForPhi('Filled Date: 04/10/2026')).toContain('pharmacy_fill');
  });

  it('returns no matches on benign product text', () => {
    expect(scanForPhi('BPC-157 Liposomal 30mL FarmCeutica')).toEqual([]);
    expect(scanForPhi('Lot 2026A47 Made in USA')).toEqual([]);
  });

  it('isStronglyPhiLike requires 2+ distinct pattern hits', () => {
    expect(isStronglyPhiLike('Rx #: 1234 DOB: 01/01/1970')).toBe(true);
    expect(isStronglyPhiLike('Rx #: 1234')).toBe(false);
    expect(isStronglyPhiLike('BPC-157 Liposomal')).toBe(false);
  });

  it('PHI_PATTERNS is a non-empty readonly list', () => {
    expect(PHI_PATTERNS.length).toBeGreaterThanOrEqual(5);
  });
});

describe('phi redaction — image pass', () => {
  it('returns input bytes unchanged when no PHI detected', async () => {
    const img = await makeImage(400, 400, [230, 230, 230]);
    const r = await redactPhi({ bytes: img, extractedText: ['BPC-157 Liposomal 30mL'] });
    expect(r.redacted).toBe(false);
    expect(Buffer.from(r.bytes).equals(Buffer.from(img))).toBe(true);
    expect(r.detectedPatterns).toEqual([]);
  });

  it('blurs the image when extractedText hits a PHI pattern', async () => {
    const img = await makeImageWithPattern(512, 512, 100);
    const r = await redactPhi({ bytes: img, extractedText: ['Patient: Jane Doe', 'Rx #: 12345678'] });
    expect(r.redacted).toBe(true);
    expect(r.detectedPatterns).toContain('patient_label');
    expect(r.detectedPatterns).toContain('rx_number');
    // Redacted bytes differ from input (blur was applied).
    expect(Buffer.from(r.bytes).equals(Buffer.from(img))).toBe(false);
    // Still a valid JPEG.
    const meta = await sharp(r.bytes).metadata();
    expect(meta.format).toBe('jpeg');
  });
});

describe('corpus matcher', () => {
  function mkEntry(partial: Partial<ReferenceCorpusEntry> & { perceptualHash: string; sku: string; id: string }): ReferenceCorpusEntry {
    return {
      id: partial.id,
      sku: partial.sku,
      artifactKind: partial.artifactKind ?? 'studio_front',
      version: partial.version ?? 'v1',
      storageKey: partial.storageKey ?? `corpus/${partial.sku}/front-v1.jpg`,
      sha256: partial.sha256 ?? 'a'.repeat(64),
      perceptualHash: partial.perceptualHash,
      approved: partial.approved ?? true,
      retired: partial.retired ?? false,
    };
  }

  it('empty corpus → corpusWasEmpty=true, zero candidates', () => {
    const r = matchAgainstCorpus('ffffffffffffffff', []);
    expect(r.corpusWasEmpty).toBe(true);
    expect(r.candidateSkus).toEqual([]);
    expect(r.exactMatch).toBe(false);
  });

  it('corpus with zero approved entries → same as empty', () => {
    const r = matchAgainstCorpus('ffffffffffffffff', [
      mkEntry({ id: 'e1', sku: 'X', perceptualHash: 'ffffffffffffffff', approved: false }),
    ]);
    expect(r.corpusWasEmpty).toBe(true);
  });

  it('exact-pHash match flags exactMatch=true and cites the SKU', () => {
    const corpus = [
      mkEntry({ id: 'e1', sku: 'BPC157-LIP-30ML', perceptualHash: 'abcdef0123456789' }),
      mkEntry({ id: 'e2', sku: 'OTHER',           perceptualHash: '0000000000000000' }),
    ];
    const r = matchAgainstCorpus('abcdef0123456789', corpus);
    expect(r.exactMatch).toBe(true);
    expect(r.candidateSkus[0]).toBe('BPC157-LIP-30ML');
    expect(r.citedReferenceIds).toContain('e1');
    expect(r.closestByDistance[0].distance).toBe(0);
  });

  it('ranks by Hamming distance ascending', () => {
    const corpus = [
      mkEntry({ id: 'far',    sku: 'FAR',    perceptualHash: 'ffffffffffffffff' }),
      mkEntry({ id: 'closer', sku: 'CLOSER', perceptualHash: '00ffffffffffffff' }),
      mkEntry({ id: 'closest', sku: 'CLOSEST', perceptualHash: '0000ffffffffffff' }),
    ];
    const r = matchAgainstCorpus('0000000000000000', corpus);
    expect(r.closestByDistance[0].sku).toBe('CLOSEST');
  });

  it('filterCorpusBySku includes only approved non-retired matches', () => {
    const corpus = [
      mkEntry({ id: '1', sku: 'A', perceptualHash: '0'.repeat(16) }),
      mkEntry({ id: '2', sku: 'A', perceptualHash: '1'.repeat(16), approved: false }),
      mkEntry({ id: '3', sku: 'A', perceptualHash: '2'.repeat(16), retired: true }),
      mkEntry({ id: '4', sku: 'B', perceptualHash: '3'.repeat(16) }),
    ];
    const byA = filterCorpusBySku(corpus, 'A');
    expect(byA.map((e) => e.id)).toEqual(['1']);
  });
});
