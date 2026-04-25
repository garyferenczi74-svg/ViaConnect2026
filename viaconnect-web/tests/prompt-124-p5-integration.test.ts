import { describe, it, expect } from 'vitest';
import sharp from 'sharp';

import { scanForPhi, PHI_PATTERNS } from '@/lib/marshall/vision/phiRedact';
import { mapToRecommendation } from '@/lib/marshall/appeals/visionIntegration';
import { runHounddogVisionHook } from '@/lib/hounddog/visionHook';
import { counterfeitDeterminationsCollector } from '@/lib/soc2/collectors/counterfeit-determinations';
import { DB_COLLECTORS } from '@/lib/soc2/collectors/runAll';
import { verifyNoPhi } from '@/lib/soc2/redaction/verify';
import { frozenTimer } from '@/lib/soc2/collectors/helpers';
import type {
  Determination,
  VisionConfigSnapshot,
} from '@/lib/marshall/vision/types';
import type { CollectorQuery, CollectorRunCtx } from '@/lib/soc2/collectors/types';

// ─── Shared fixtures ────────────────────────────────────────────────────────

function mkConfig(overrides: Partial<VisionConfigSnapshot> = {}): VisionConfigSnapshot {
  return {
    mode: 'shadow',
    sourceEnabled: {
      hounddog_marketplace: false, hounddog_social: false, practitioner_appeal: false,
      consumer_report: false, admin_upload: true, test_buy: true,
    },
    takedownEnabled: {
      amazon_brand_registry: false, ebay_vero: false, walmart_seller_protection: false,
      etsy_ip_policy: false, dmca_takedown: false, platform_trust_safety: false, manual_legal: true,
    },
    rateLimitDailyCapPerSource: 1000,
    rateLimitPerPractitionerDaily: 25,
    rateLimitPerConsumerDaily: 5,
    ...overrides,
  };
}

// ─── PHI pattern extensions ─────────────────────────────────────────────────

describe('PHI patterns — P5 extensions', () => {
  it('detects NPI', () => {
    expect(scanForPhi('NPI: 1234567890')).toContain('npi');
    expect(scanForPhi('National Provider Identifier 9876543210')).toContain('npi');
  });
  it('detects address labels', () => {
    expect(scanForPhi('123 Main Street')).toContain('address_label');
    expect(scanForPhi('4567 Oak Ave')).toContain('address_label');
    expect(scanForPhi('890 Sunset Boulevard')).toContain('address_label');
  });
  it('detects phone labels', () => {
    expect(scanForPhi('Ph: 555-123-4567')).toContain('phone_label');
    expect(scanForPhi('Phone: (555) 123-4567')).toContain('phone_label');
    expect(scanForPhi('Tel 555.123.4567')).toContain('phone_label');
  });
  it('detects email labels', () => {
    expect(scanForPhi('Email: someone@example.com')).toContain('email_label');
    expect(scanForPhi('E-mail john.doe@example.org')).toContain('email_label');
  });
  it('does not false-positive on benign product label text', () => {
    const hits = scanForPhi('BPC-157 Liposomal 30mL FarmCeutica Wellness LLC');
    expect(hits).toEqual([]);
  });
  it('PHI_PATTERNS now includes at least 13 entries', () => {
    expect(PHI_PATTERNS.length).toBeGreaterThanOrEqual(13);
  });
});

// ─── Appeal integration mapping ─────────────────────────────────────────────

describe('appeal integration — mapToRecommendation', () => {
  function mkDet(verdict: Determination['verdict'], confidence: number): Determination {
    return {
      evaluationId: 'mve-test-1',
      verdict,
      confidence,
      matchedSku: 'SKU-X',
      mismatchFlags: [],
      reasoningTrace: [],
      citedReferenceIds: [],
      humanReviewRequired: true,
    };
  }

  it('authentic at >= 0.85 → reverse', () => {
    const r = mapToRecommendation({
      status: 'completed',
      evaluationId: 'mve-test-1',
      phiRedacted: false,
      corpusWasEmpty: false,
      durationMs: 100,
      determination: mkDet('authentic', 0.90),
    });
    expect(r.recommendation).toBe('reverse');
  });

  it('authentic below 0.85 → defer', () => {
    const r = mapToRecommendation({
      status: 'completed',
      evaluationId: 'mve-test-1',
      phiRedacted: false,
      corpusWasEmpty: false,
      durationMs: 100,
      determination: mkDet('authentic', 0.70),
    });
    expect(r.recommendation).toBe('defer_to_steve');
  });

  it('counterfeit_suspected → uphold', () => {
    const r = mapToRecommendation({
      status: 'completed',
      evaluationId: 'mve-test-1',
      phiRedacted: false,
      corpusWasEmpty: false,
      durationMs: 100,
      determination: mkDet('counterfeit_suspected', 0.80),
    });
    expect(r.recommendation).toBe('uphold');
  });

  it('inconclusive → defer', () => {
    const r = mapToRecommendation({
      status: 'completed',
      evaluationId: 'mve-test-1',
      phiRedacted: false,
      corpusWasEmpty: false,
      durationMs: 100,
      determination: mkDet('inconclusive', 0.50),
    });
    expect(r.recommendation).toBe('defer_to_steve');
  });

  it('skipped (no determination) → defer', () => {
    const r = mapToRecommendation({
      status: 'skipped_source_disabled',
      evaluationId: 'skipped',
      phiRedacted: false,
      corpusWasEmpty: false,
      durationMs: 0,
    });
    expect(r.recommendation).toBe('defer_to_steve');
    expect(r.humanReviewRequired).toBe(true);
  });
});

// ─── Hounddog hook kill-switch ──────────────────────────────────────────────

describe('Hounddog vision hook — kill switch', () => {
  async function mkImage(): Promise<Uint8Array> {
    const buf = await sharp({
      create: { width: 400, height: 400, channels: 3, background: { r: 180, g: 180, b: 180 } },
    }).jpeg({ quality: 88 }).toBuffer();
    return new Uint8Array(buf);
  }

  it('returns skipped when source disabled', async () => {
    const img = await mkImage();
    // Use any-cast since we never actually hit Supabase in the skipped path.
    const fakeSupabase = {} as Parameters<typeof runHounddogVisionHook>[0]['supabase'];
    const r = await runHounddogVisionHook({
      supabase: fakeSupabase,
      signalId: 'sig-1',
      source: 'hounddog_marketplace',
      listingUrl: 'https://amazon.com/x',
      images: [{ url: 'https://img.example/x.jpg', bytes: img }],
      config: mkConfig(), // hounddog_marketplace = false by default in mkConfig
    });
    expect(r.skipped).toBe(true);
    expect(r.skipReason).toBe('source_disabled');
    expect(r.evaluations).toEqual([]);
  });

  it('returns skipped with no_images when called with empty list', async () => {
    const cfg = mkConfig();
    cfg.sourceEnabled.hounddog_marketplace = true;
    cfg.mode = 'shadow';
    const fakeSupabase = {} as Parameters<typeof runHounddogVisionHook>[0]['supabase'];
    const r = await runHounddogVisionHook({
      supabase: fakeSupabase,
      signalId: 'sig-1',
      source: 'hounddog_marketplace',
      listingUrl: 'https://amazon.com/x',
      images: [],
      config: cfg,
    });
    expect(r.skipped).toBe(true);
    expect(r.skipReason).toBe('no_images');
  });

  it('returns skipped when mode is off even if source enabled', async () => {
    const img = await mkImage();
    const cfg = mkConfig({ mode: 'off' });
    cfg.sourceEnabled.hounddog_marketplace = true;
    const fakeSupabase = {} as Parameters<typeof runHounddogVisionHook>[0]['supabase'];
    const r = await runHounddogVisionHook({
      supabase: fakeSupabase,
      signalId: 'sig-1',
      source: 'hounddog_marketplace',
      listingUrl: 'https://amazon.com/x',
      images: [{ url: 'https://img.example/x.jpg', bytes: img }],
      config: cfg,
    });
    expect(r.skipped).toBe(true);
    expect(r.skipReason).toBe('mode_off');
  });
});

// ─── SOC 2 counterfeit-determinations collector ─────────────────────────────

const FIXED_KEY = Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex');
const PACKET_UUID = '01J8ZP5V3K700000000000000Z';
const PERIOD = { start: '2026-03-01T00:00:00Z', end: '2026-03-31T23:59:59Z' };

function buildFixtures(): Record<string, Array<Record<string, unknown>>> {
  return {
    counterfeit_determinations: [
      {
        verdict: 'counterfeit_suspected',
        confidence: 0.85,
        matched_sku: 'BPC157-LIP-30ML',
        mismatch_flags: ['cap_geometry_mismatch', 'hologram_absent'],
        human_review_required: true,
        created_at: '2026-03-15T12:00:00Z',
        counterfeit_evaluations: {
          evaluation_id: 'mve-2026-0315-aaaaa',
          source: 'hounddog_marketplace',
          source_reference: { listing_url: 'https://amazon.com/listing/COUNTERFEIT-1' },
          phi_redacted: false,
          content_safety_skip: false,
          model_version: 'claude-sonnet-4-6',
          reference_corpus_version: 'v2026.04.01',
          evaluated_at: '2026-03-15T12:00:01Z',
        },
      },
      {
        verdict: 'authentic',
        confidence: 0.92,
        matched_sku: 'KPV-INJ-5ML',
        mismatch_flags: [],
        human_review_required: false,
        created_at: '2026-03-20T08:00:00Z',
        counterfeit_evaluations: {
          evaluation_id: 'mve-2026-0320-bbbbb',
          source: 'practitioner_appeal',
          source_reference: { appeal_id: 'A-99', listing_url: null },
          phi_redacted: true,
          content_safety_skip: false,
          model_version: 'claude-sonnet-4-6',
          reference_corpus_version: 'v2026.04.01',
          evaluated_at: '2026-03-20T08:00:02Z',
        },
      },
    ],
  };
}

function buildCtx(fixtures: Record<string, Array<Record<string, unknown>>>): CollectorRunCtx & { timer: ReturnType<typeof frozenTimer> } {
  return {
    packetUuid: PACKET_UUID,
    pseudonymKey: FIXED_KEY,
    ruleRegistryVersion: 'v4.3.7',
    timer: frozenTimer('2026-04-24T00:00:00Z', 42),
    async fetch<T = Record<string, unknown>>(q: CollectorQuery): Promise<T[]> {
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
    },
  };
}

describe('SOC 2 counterfeit-determinations collector', () => {
  it('is registered in DB_COLLECTORS (post-#125 total = 26)', () => {
    expect(DB_COLLECTORS.length).toBe(26);
    expect(DB_COLLECTORS.some((c) => c.id === 'counterfeit-determinations-collector')).toBe(true);
  });

  it('produces a CSV with the expected headers + row count', async () => {
    const ctx = buildCtx(buildFixtures());
    const result = await counterfeitDeterminationsCollector.collect(PERIOD, ctx);
    expect(result.files.length).toBe(1);
    expect(result.files[0].relativePath).toBe('CC4-monitoring-activities/counterfeit-determinations.csv');
    expect(result.attestation.rowCount).toBe(2);

    const text = Buffer.from(result.files[0].bytes).toString('utf8');
    const lines = text.split('\n').filter(Boolean);
    expect(lines[0]).toContain('evaluation_id,source,verdict,confidence');
    expect(lines[1]).toContain('counterfeit_suspected');
    expect(lines[2]).toContain('authentic');
  });

  it('pseudonymizes listing URLs (cross-packet HMAC)', async () => {
    const ctx = buildCtx(buildFixtures());
    const result = await counterfeitDeterminationsCollector.collect(PERIOD, ctx);
    const text = Buffer.from(result.files[0].bytes).toString('utf8');
    // Raw URL must NOT appear.
    expect(text).not.toContain('amazon.com/listing/COUNTERFEIT-1');
    // Pseudonym should be a base32 string, 26 chars.
    const lines = text.split('\n');
    expect(lines[1]).toMatch(/[A-Z2-7]{26}/);
  });

  it('is deterministic across runs', async () => {
    const a = await counterfeitDeterminationsCollector.collect(PERIOD, buildCtx(buildFixtures()));
    const b = await counterfeitDeterminationsCollector.collect(PERIOD, buildCtx(buildFixtures()));
    expect(Buffer.from(a.files[0].bytes).equals(Buffer.from(b.files[0].bytes))).toBe(true);
    expect(JSON.stringify(a.attestation)).toBe(JSON.stringify(b.attestation));
  });

  it('emits no PHI-pattern text in output', async () => {
    const result = await counterfeitDeterminationsCollector.collect(PERIOD, buildCtx(buildFixtures()));
    const text = Buffer.from(result.files[0].bytes).toString('utf8');
    const v = verifyNoPhi(text);
    expect(v.ok, `PHI leaked: ${v.violations.map((x) => x.matched).join(', ')}`).toBe(true);
  });

  it('aggregates mismatch flags as a count, not the raw list', async () => {
    const ctx = buildCtx(buildFixtures());
    const result = await counterfeitDeterminationsCollector.collect(PERIOD, ctx);
    const text = Buffer.from(result.files[0].bytes).toString('utf8');
    expect(text).not.toContain('cap_geometry_mismatch');
    expect(text).not.toContain('hologram_absent');
    // But the count should appear (2 flags on row 1, 0 on row 2).
    const lines = text.split('\n');
    // mismatch_flag_count is the 6th column (0-indexed 5).
    expect(lines[1].split(',')[5]).toBe('2');
    expect(lines[2].split(',')[5]).toBe('0');
  });
});
