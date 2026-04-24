import { describe, it, expect, vi } from 'vitest';
import sharp from 'sharp';

import { sanitizeFields, logEvent } from '@/lib/marshall/vision/logging';
import {
  persistEvaluation,
  persistDetermination,
  writeFindings,
} from '@/lib/marshall/vision/writeFinding';
import {
  draftTakedown,
  buildSlots,
  fillTemplate,
  MECHANISM_DISPLAY_NAMES,
  TakedownDraftError,
} from '@/lib/marshall/vision/takedownDraft';
import {
  submitConsumerReport,
  validateSubmission,
  generateReportId,
  ConsumerIntakeError,
} from '@/lib/marshall/vision/consumerIntake';
import {
  initiateTestBuy,
  recordOrdered,
  recordArrived,
  attachPostReceiptEvaluation,
  recordOutcome,
  isValidOutcome,
} from '@/lib/marshall/vision/testBuy';
import type {
  Determination,
  EvaluationRecord,
  VisionConfigSnapshot,
} from '@/lib/marshall/vision/types';

// ─── Mock Supabase client ───────────────────────────────────────────────────

interface FakeQuery {
  op: 'select' | 'insert' | 'update' | 'delete';
  table: string;
  payload?: unknown;
  filters: Array<{ col: string; op: string; value: unknown }>;
  returned: unknown;
}

class FakeSupabase {
  public queries: FakeQuery[] = [];
  private tableReturns: Record<string, unknown> = {};
  private storageUploads: Array<{ bucket: string; key: string; bytes: number }> = [];

  stubTable(table: string, returns: unknown): void {
    this.tableReturns[table] = returns;
  }

  /** Expose storage calls for assertions. */
  get storage() {
    return {
      from: (bucket: string) => ({
        upload: async (key: string, bytes: Uint8Array) => {
          this.storageUploads.push({ bucket, key, bytes: bytes.byteLength });
          return { error: null as { message: string } | null };
        },
      }),
    };
  }

  get storageCalls() {
    return this.storageUploads;
  }

  from(table: string) {
    const self = this;
    const state: {
      selectCols?: string;
      payload?: unknown;
      filters: Array<{ col: string; op: string; value: unknown }>;
      op?: FakeQuery['op'];
      orderByCol?: string;
      orderAsc?: boolean;
      limit?: number;
      head?: boolean;
    } = { filters: [] };

    const chain: {
      select: (cols: string, opts?: { count?: string; head?: boolean }) => typeof chain;
      insert: (payload: unknown) => typeof chain;
      update: (payload: unknown) => typeof chain;
      eq: (col: string, value: unknown) => typeof chain;
      order: (col: string, opts?: { ascending?: boolean }) => typeof chain;
      limit: (n: number) => typeof chain;
      maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>;
      single: () => Promise<{ data: unknown; error: { message: string } | null }>;
      then: (cb: (r: { data: unknown; error: { message: string } | null; count?: number }) => unknown) => Promise<unknown>;
    } = {
      select(_cols: string, opts?: { count?: string; head?: boolean }) {
        // Only become a SELECT if no mutating op already set (postgrest allows
        // .insert(...).select(...) which means "insert + return columns", not
        // "overwrite the op").
        if (!state.op) state.op = 'select';
        state.head = opts?.head === true;
        return chain;
      },
      insert(payload: unknown) {
        state.op = 'insert';
        state.payload = payload;
        return chain;
      },
      update(payload: unknown) {
        state.op = 'update';
        state.payload = payload;
        return chain;
      },
      eq(col, value) {
        state.filters.push({ col, op: 'eq', value });
        return chain;
      },
      order(col, opts) {
        state.orderByCol = col;
        state.orderAsc = opts?.ascending ?? true;
        return chain;
      },
      limit(n) {
        state.limit = n;
        return chain;
      },
      async maybeSingle() {
        return self.resolve(state, table);
      },
      async single() {
        return self.resolve(state, table);
      },
      then(cb) {
        return self.resolve(state, table).then(cb);
      },
    };
    return chain;
  }

  private async resolve(
    state: { op?: FakeQuery['op']; payload?: unknown; filters: Array<{ col: string; op: string; value: unknown }>; head?: boolean },
    table: string,
  ): Promise<{ data: unknown; error: { message: string } | null; count?: number }> {
    const op = state.op ?? 'select';
    const returned = this.tableReturns[table];
    this.queries.push({ op, table, payload: state.payload, filters: state.filters, returned });
    if (state.head === true) {
      // For count-only heads, return count derived from `returned` if it's an array.
      return { data: null, error: null, count: Array.isArray(returned) ? returned.length : 0 };
    }
    return { data: returned ?? null, error: null };
  }
}

// ─── Shared fixtures ────────────────────────────────────────────────────────

const EVAL_ID = 'mve-2026-0424-abcde';

function mkDetermination(overrides: Partial<Determination> = {}): Determination {
  return {
    evaluationId: EVAL_ID,
    verdict: 'counterfeit_suspected',
    confidence: 0.85,
    matchedSku: 'BPC157-LIP-30ML',
    mismatchFlags: ['cap_geometry_mismatch', 'hologram_absent', 'batch_format_mismatch'],
    reasoningTrace: [
      { feature: 'cap_geometry', reference_image: 'ref-top.jpg', observation: 'present', match: 'mismatch', note: 'screw top vs dropper' },
      { feature: 'hologram', reference_image: 'ref-holo.jpg', observation: 'absent', match: 'mismatch', note: 'no hologram visible' },
    ],
    citedReferenceIds: ['ref-1', 'ref-2'],
    humanReviewRequired: true,
    ...overrides,
  };
}

function mkEvaluation(): EvaluationRecord {
  return {
    evaluationId: EVAL_ID,
    source: 'hounddog_marketplace',
    sourceReference: { signal_id: 'sig-123' },
    imageStorageKey: 'evals/suspect.jpg',
    imageSha256: 'a'.repeat(64),
    imagePerceptualHash: 'abcdef0123456789',
    phiRedacted: false,
    contentSafetySkip: false,
    contentSafetyReason: null,
    candidateSkus: ['BPC157-LIP-30ML'],
    modelVersion: 'claude-sonnet-4-6',
    referenceCorpusVersion: 'v2026.04.01',
    rawVisionOutput: null,
    ocrOutput: null,
    durationMs: 2400,
  };
}

function mkConfig(overrides: Partial<VisionConfigSnapshot> = {}): VisionConfigSnapshot {
  return {
    mode: 'active',
    sourceEnabled: {
      hounddog_marketplace: true, hounddog_social: false, practitioner_appeal: false,
      consumer_report: false, admin_upload: true, test_buy: true,
    },
    takedownEnabled: {
      amazon_brand_registry: true, ebay_vero: false, walmart_seller_protection: false,
      etsy_ip_policy: false, dmca_takedown: false, platform_trust_safety: false, manual_legal: true,
    },
    rateLimitDailyCapPerSource: 1000,
    rateLimitPerPractitionerDaily: 25,
    rateLimitPerConsumerDaily: 5,
    ...overrides,
  };
}

// ─── logging ────────────────────────────────────────────────────────────────

describe('logging', () => {
  it('sanitizeFields strips PII-suspect keys', () => {
    const sanitized = sanitizeFields({
      evaluationId: EVAL_ID,
      email: 'jane@example.com',
      phone: '+1-555-111-2222',
      api_key: 'sk-live-1234',
      verdict: 'authentic',
    });
    expect(sanitized.evaluationId).toBe(EVAL_ID);
    expect(sanitized.verdict).toBe('authentic');
    expect(sanitized.email).toBeUndefined();
    expect(sanitized.phone).toBeUndefined();
    expect(sanitized.api_key).toBeUndefined();
  });

  it('sanitizeFields elides raw binary values', () => {
    const bytes = new Uint8Array(1024);
    const sanitized = sanitizeFields({ imageBytes: bytes });
    // imageBytes is in the blocklist, so it's dropped entirely; but the
    // binary-elision path covers cases where a non-blocklisted key carries
    // bytes.
    expect(sanitized.imageBytes).toBeUndefined();
    const otherKey = sanitizeFields({ fooData: Buffer.from('zzzz') });
    expect(String(otherKey.fooData)).toContain('bytes elided');
  });

  it('logEvent writes JSON to console', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logEvent({ level: 'info', step: 'test_step', evaluationId: EVAL_ID });
    expect(spy).toHaveBeenCalled();
    const arg = spy.mock.calls[0][0] as string;
    const parsed = JSON.parse(arg) as Record<string, unknown>;
    expect(parsed.step).toBe('test_step');
    expect(parsed.evaluationId).toBe(EVAL_ID);
    expect(parsed.agent).toBe('marshall_vision');
    spy.mockRestore();
  });
});

// ─── writeFinding ───────────────────────────────────────────────────────────

describe('writeFinding — persistence', () => {
  it('persistEvaluation inserts into counterfeit_evaluations', async () => {
    const sb = new FakeSupabase();
    sb.stubTable('counterfeit_evaluations', { id: 'eval-row-id' });
    const result = await persistEvaluation({
      supabase: sb as unknown as Parameters<typeof persistEvaluation>[0]['supabase'],
      evaluation: mkEvaluation(),
    });
    expect(result.evaluationRowId).toBe('eval-row-id');
    const call = sb.queries.find((q) => q.op === 'insert' && q.table === 'counterfeit_evaluations');
    expect(call).toBeDefined();
    expect((call?.payload as { evaluation_id: string }).evaluation_id).toBe(EVAL_ID);
  });

  it('persistDetermination inserts into counterfeit_determinations', async () => {
    const sb = new FakeSupabase();
    sb.stubTable('counterfeit_determinations', { id: 'det-row-id' });
    const result = await persistDetermination({
      supabase: sb as unknown as Parameters<typeof persistDetermination>[0]['supabase'],
      evaluationRowId: 'eval-row-id',
      determination: mkDetermination(),
    });
    expect(result.determinationRowId).toBe('det-row-id');
    const call = sb.queries.find((q) => q.op === 'insert' && q.table === 'counterfeit_determinations');
    expect(call).toBeDefined();
    const payload = call?.payload as { verdict: string; confidence: number; matched_sku: string };
    expect(payload.verdict).toBe('counterfeit_suspected');
    expect(payload.confidence).toBe(0.85);
    expect(payload.matched_sku).toBe('BPC157-LIP-30ML');
  });
});

describe('writeFinding — rule routing', () => {
  it('active mode + enabled source → findings inserted into compliance_findings', async () => {
    const sb = new FakeSupabase();
    sb.stubTable('compliance_findings', []);
    const r = await writeFindings({
      supabase: sb as unknown as Parameters<typeof writeFindings>[0]['supabase'],
      determination: mkDetermination(),
      source: 'hounddog_marketplace',
      listingUrl: 'https://amazon.com/listing/123',
      config: mkConfig(),
    });
    expect(r.inserted).toBe(true);
    expect(r.findings.length).toBeGreaterThan(0);
    const insertCall = sb.queries.find((q) => q.op === 'insert' && q.table === 'compliance_findings');
    expect(insertCall).toBeDefined();
    // Every finding carries the listing URL in location.
    for (const f of r.findings) {
      expect(f.location.url).toBe('https://amazon.com/listing/123');
    }
  });

  it('shadow mode → findings computed but NOT inserted', async () => {
    const sb = new FakeSupabase();
    const r = await writeFindings({
      supabase: sb as unknown as Parameters<typeof writeFindings>[0]['supabase'],
      determination: mkDetermination(),
      source: 'hounddog_marketplace',
      listingUrl: 'https://amazon.com/listing/123',
      config: mkConfig({ mode: 'shadow' }),
    });
    expect(r.inserted).toBe(false);
    expect(r.reason).toBe('shadow_mode');
    expect(r.findings.length).toBeGreaterThan(0);
    expect(sb.queries.some((q) => q.op === 'insert' && q.table === 'compliance_findings')).toBe(false);
  });

  it('disabled source → findings computed but NOT inserted', async () => {
    const sb = new FakeSupabase();
    const cfg = mkConfig();
    cfg.sourceEnabled.hounddog_marketplace = false;
    const r = await writeFindings({
      supabase: sb as unknown as Parameters<typeof writeFindings>[0]['supabase'],
      determination: mkDetermination(),
      source: 'hounddog_marketplace',
      listingUrl: 'https://amazon.com/listing/123',
      config: cfg,
    });
    expect(r.inserted).toBe(false);
    expect(r.reason).toBe('source_disabled');
  });

  it('authentic verdict fires zero counterfeit rules → no_rules_fired', async () => {
    const sb = new FakeSupabase();
    const r = await writeFindings({
      supabase: sb as unknown as Parameters<typeof writeFindings>[0]['supabase'],
      determination: mkDetermination({ verdict: 'authentic', confidence: 0.95, mismatchFlags: [] }),
      source: 'admin_upload',
      config: mkConfig(),
    });
    expect(r.inserted).toBe(false);
    expect(r.reason).toBe('no_rules_fired');
    expect(r.findings.length).toBe(0);
  });
});

// ─── takedownDraft ──────────────────────────────────────────────────────────

describe('takedownDraft — slot filling', () => {
  it('fillTemplate replaces known slots and preserves unknown ones', () => {
    const body = 'Brand: {{brand_legal_name}} | Listing: {{listing_url}} | Unknown: {{xyz}}';
    const out = fillTemplate(body, { brand_legal_name: 'FarmCeutica Wellness LLC', listing_url: 'https://a.com' });
    expect(out).toContain('FarmCeutica Wellness LLC');
    expect(out).toContain('https://a.com');
    expect(out).toContain('{{xyz}}'); // unknown slot preserved
  });

  it('buildSlots populates standard fields from determination', () => {
    const slots = buildSlots({
      supabase: null as unknown as Parameters<typeof buildSlots>[0]['supabase'],
      determinationId: 'det-1',
      determination: mkDetermination(),
      mechanism: 'amazon_brand_registry',
      listingUrl: 'https://amazon.com/x',
      actorId: 'user-1',
      config: mkConfig(),
    });
    expect(slots.brand_legal_name).toBe('FarmCeutica Wellness LLC');
    expect(slots.matched_sku).toBe('BPC157-LIP-30ML');
    expect(slots.verdict).toBe('counterfeit_suspected');
    expect(slots.confidence).toBe('0.85');
    expect(slots.mismatch_flags).toContain('cap geometry mismatch');
    expect(slots.platform_name).toBe(MECHANISM_DISPLAY_NAMES.amazon_brand_registry);
  });
});

describe('takedownDraft — gate + lookup', () => {
  const templateBody = 'To {{platform_name}}: listing {{listing_url}} for {{matched_sku}} verdict {{verdict}}';

  it('throws platform_disabled when config says no', async () => {
    const sb = new FakeSupabase();
    const cfg = mkConfig();
    cfg.takedownEnabled.amazon_brand_registry = false;
    await expect(
      draftTakedown({
        supabase: sb as unknown as Parameters<typeof draftTakedown>[0]['supabase'],
        determinationId: 'det-1',
        determination: mkDetermination(),
        mechanism: 'amazon_brand_registry',
        listingUrl: 'https://amazon.com/x',
        actorId: 'user-1',
        config: cfg,
      }),
    ).rejects.toBeInstanceOf(TakedownDraftError);
  });

  it('throws no_active_template when lookup returns null', async () => {
    const sb = new FakeSupabase();
    sb.stubTable('takedown_templates', null);
    await expect(
      draftTakedown({
        supabase: sb as unknown as Parameters<typeof draftTakedown>[0]['supabase'],
        determinationId: 'det-1',
        determination: mkDetermination(),
        mechanism: 'amazon_brand_registry',
        listingUrl: 'https://amazon.com/x',
        actorId: 'user-1',
        config: mkConfig(),
      }),
    ).rejects.toThrow(/no active template/);
  });

  it('inserts a draft takedown_requests row with filled body + marks first-time-for-platform', async () => {
    const sb = new FakeSupabase();
    sb.stubTable('takedown_templates', {
      id: 'tpl-1',
      template_code: 'amazon-v1',
      version: 1,
      jurisdiction: 'generic',
      language: 'en-US',
      body: templateBody,
      required_slots: ['platform_name', 'listing_url', 'matched_sku', 'verdict'],
    });
    sb.stubTable('takedown_requests', { id: 'tr-abc' });
    const r = await draftTakedown({
      supabase: sb as unknown as Parameters<typeof draftTakedown>[0]['supabase'],
      determinationId: 'det-1',
      determination: mkDetermination(),
      mechanism: 'amazon_brand_registry',
      listingUrl: 'https://amazon.com/x',
      actorId: 'user-1',
      config: mkConfig(),
    });
    expect(r.takedownRequestId).toBe('tr-abc');
    expect(r.templateId).toBe('tpl-1');
    expect(r.templateVersion).toBe(1);
    expect(r.draftBody).toContain('Amazon Brand Registry');
    expect(r.draftBody).toContain('BPC157-LIP-30ML');
    expect(r.firstTimeForPlatform).toBe(true);
    // Verify insert payload
    const insertCall = sb.queries.find((q) => q.op === 'insert' && q.table === 'takedown_requests');
    expect(insertCall).toBeDefined();
    const payload = insertCall?.payload as { status: string; platform: string; vision_determination_id: string };
    expect(payload.status).toBe('drafted');
    expect(payload.platform).toBe('amazon_brand_registry');
    expect(payload.vision_determination_id).toBe('det-1');
  });
});

// ─── consumerIntake ─────────────────────────────────────────────────────────

describe('consumerIntake', () => {
  async function mkImg(width = 400, height = 400): Promise<Uint8Array> {
    const buf = await sharp({
      create: { width, height, channels: 3, background: { r: 200, g: 200, b: 200 } },
    }).jpeg({ quality: 88 }).toBuffer();
    return new Uint8Array(buf);
  }

  it('validateSubmission rejects short descriptions', () => {
    expect(() => validateSubmission({
      concernDescription: 'too short',
      images: [],
    } as unknown as Parameters<typeof validateSubmission>[0])).toThrow(ConsumerIntakeError);
  });

  it('validateSubmission rejects zero images', () => {
    expect(() => validateSubmission({
      concernDescription: 'this is a sufficiently long description of my concern',
      images: [],
    } as unknown as Parameters<typeof validateSubmission>[0])).toThrow(ConsumerIntakeError);
  });

  it('validateSubmission rejects > 4 images', async () => {
    const img = await mkImg();
    const five = Array.from({ length: 5 }, () => ({ bytes: img }));
    expect(() => validateSubmission({
      concernDescription: 'this is a sufficiently long description of my concern',
      images: five,
    } as unknown as Parameters<typeof validateSubmission>[0])).toThrow(ConsumerIntakeError);
  });

  it('generateReportId matches CCR-YYYY-MMDD-XXXXXX format', () => {
    const id = generateReportId(new Date(Date.UTC(2026, 3, 24)));
    expect(id).toMatch(/^CCR-2026-0424-[0-9a-f]{6}$/);
  });

  it('submitConsumerReport normalizes, PHI-redacts (when patterns hit), uploads, and inserts row', async () => {
    const img = await mkImg(400, 400);
    const sb = new FakeSupabase();
    sb.stubTable('consumer_counterfeit_reports', { id: 'report-row-id' });

    const r = await submitConsumerReport({
      supabase: sb as unknown as Parameters<typeof submitConsumerReport>[0]['supabase'],
      submission: {
        concernDescription: 'I ordered BPC157 from Amazon last month and the cap looks completely different',
        images: [
          { bytes: img, declaredContentType: 'image/jpeg' },
          { bytes: img, declaredContentType: 'image/jpeg', extractedText: ['Rx #: 12345678', 'DOB: 01/01/1970'] },
        ],
      },
    });

    expect(r.reportId).toMatch(/^CCR-/);
    expect(r.reportRowId).toBe('report-row-id');
    expect(r.imageStorageKeys.length).toBe(2);
    expect(r.phiRedactionApplied).toBe(true); // second image had Rx + DOB → redacted
    expect(sb.storageCalls.length).toBe(2);
    const insertCall = sb.queries.find((q) => q.op === 'insert' && q.table === 'consumer_counterfeit_reports');
    expect(insertCall).toBeDefined();
    const payload = insertCall?.payload as { phi_redaction_applied: boolean; status: string; image_storage_keys: string[] };
    expect(payload.phi_redaction_applied).toBe(true);
    expect(payload.status).toBe('submitted');
    expect(payload.image_storage_keys.length).toBe(2);
  });

  it('submitConsumerReport leaves phi_redaction_applied false when no patterns hit', async () => {
    const img = await mkImg();
    const sb = new FakeSupabase();
    sb.stubTable('consumer_counterfeit_reports', { id: 'row-2' });
    const r = await submitConsumerReport({
      supabase: sb as unknown as Parameters<typeof submitConsumerReport>[0]['supabase'],
      submission: {
        concernDescription: 'This product I received does not match the one pictured on the website',
        images: [{ bytes: img, declaredContentType: 'image/jpeg' }],
      },
    });
    expect(r.phiRedactionApplied).toBe(false);
  });
});

// ─── testBuy ────────────────────────────────────────────────────────────────

describe('testBuy lifecycle', () => {
  it('initiateTestBuy inserts row with budget + initiator', async () => {
    const sb = new FakeSupabase();
    sb.stubTable('counterfeit_test_buys', { id: 'tb-1', initiated_at: '2026-04-24T00:00:00Z' });
    const r = await initiateTestBuy({
      supabase: sb as unknown as Parameters<typeof initiateTestBuy>[0]['supabase'],
      targetListingUrl: 'https://amazon.com/listing/counterfeit',
      budgetUsd: 89.99,
      initiatedBy: 'steve-uid',
    });
    expect(r.testBuyId).toBe('tb-1');
    const ins = sb.queries.find((q) => q.op === 'insert' && q.table === 'counterfeit_test_buys');
    const payload = ins?.payload as { budget_usd: number; initiated_by: string };
    expect(payload.budget_usd).toBe(89.99);
    expect(payload.initiated_by).toBe('steve-uid');
  });

  it('initiateTestBuy rejects zero or negative budget', async () => {
    const sb = new FakeSupabase();
    await expect(
      initiateTestBuy({
        supabase: sb as unknown as Parameters<typeof initiateTestBuy>[0]['supabase'],
        targetListingUrl: 'https://x.com',
        budgetUsd: 0,
        initiatedBy: 'uid',
      }),
    ).rejects.toThrow(/budget must be > 0/);
  });

  it('recordOrdered updates ordered_at', async () => {
    const sb = new FakeSupabase();
    await recordOrdered({
      supabase: sb as unknown as Parameters<typeof recordOrdered>[0]['supabase'],
      testBuyId: 'tb-1',
      orderedAt: '2026-04-25T12:00:00Z',
    });
    const call = sb.queries.find((q) => q.op === 'update' && q.table === 'counterfeit_test_buys');
    const payload = call?.payload as { ordered_at: string };
    expect(payload.ordered_at).toBe('2026-04-25T12:00:00Z');
  });

  it('recordArrived refuses empty photo list', async () => {
    const sb = new FakeSupabase();
    await expect(
      recordArrived({
        supabase: sb as unknown as Parameters<typeof recordArrived>[0]['supabase'],
        testBuyId: 'tb-1',
        receivedPhotoStorageKeys: [],
      }),
    ).rejects.toThrow(/at least one/);
  });

  it('recordArrived stores photo storage keys', async () => {
    const sb = new FakeSupabase();
    await recordArrived({
      supabase: sb as unknown as Parameters<typeof recordArrived>[0]['supabase'],
      testBuyId: 'tb-1',
      receivedPhotoStorageKeys: ['tb-1/recv-01.jpg', 'tb-1/recv-02.jpg'],
    });
    const call = sb.queries.find((q) => q.op === 'update');
    const payload = call?.payload as { received_photo_storage_keys: string[] };
    expect(payload.received_photo_storage_keys.length).toBe(2);
  });

  it('attachPostReceiptEvaluation sets the evaluation id', async () => {
    const sb = new FakeSupabase();
    await attachPostReceiptEvaluation({
      supabase: sb as unknown as Parameters<typeof attachPostReceiptEvaluation>[0]['supabase'],
      testBuyId: 'tb-1',
      postReceiptEvaluationId: 'eval-row-xyz',
    });
    const call = sb.queries.find((q) => q.op === 'update');
    const payload = call?.payload as { post_receipt_evaluation_id: string };
    expect(payload.post_receipt_evaluation_id).toBe('eval-row-xyz');
  });

  it('recordOutcome stores outcome + optional linked takedown', async () => {
    const sb = new FakeSupabase();
    await recordOutcome({
      supabase: sb as unknown as Parameters<typeof recordOutcome>[0]['supabase'],
      testBuyId: 'tb-1',
      outcome: 'counterfeit_confirmed',
      linkedTakedownId: 'tr-abc',
    });
    const call = sb.queries.find((q) => q.op === 'update');
    const payload = call?.payload as { outcome: string; linked_takedown_id: string };
    expect(payload.outcome).toBe('counterfeit_confirmed');
    expect(payload.linked_takedown_id).toBe('tr-abc');
  });

  it('isValidOutcome gates string inputs from API requests', () => {
    expect(isValidOutcome('counterfeit_confirmed')).toBe(true);
    expect(isValidOutcome('authentic_confirmed')).toBe(true);
    expect(isValidOutcome('inconclusive')).toBe(true);
    expect(isValidOutcome('product_not_delivered')).toBe(true);
    expect(isValidOutcome('bogus')).toBe(false);
  });
});
