import { describe, it, expect } from 'vitest';
import {
  UNIVERSAL_REQUIRED,
  SIDE_KINDS,
  requiredKindsForSku,
  optionalKindsForSku,
  computeCoverage,
  aggregateCoverage,
  type CorpusEntrySummary,
} from '@/lib/marshall/vision/corpusManifest';
import { fillTemplate, buildSlots } from '@/lib/marshall/vision/takedownDraft';
import type { Determination, VisionConfigSnapshot } from '@/lib/marshall/vision/types';

// ─── Corpus manifest helper ─────────────────────────────────────────────────

describe('corpusManifest — required kinds', () => {
  it('universal baseline is present for every SKU', () => {
    const req = requiredKindsForSku();
    for (const k of UNIVERSAL_REQUIRED) {
      expect(req).toContain(k);
    }
  });

  it('hologram added only when hasHologram=true', () => {
    expect(requiredKindsForSku({ hasHologram: false })).not.toContain('hologram');
    expect(requiredKindsForSku({ hasHologram: true })).toContain('hologram');
  });

  it('blister pack added only when hasBlisterPack=true', () => {
    expect(requiredKindsForSku({ hasBlisterPack: true })).toContain('blister_pack');
    expect(requiredKindsForSku({ hasBlisterPack: false })).not.toContain('blister_pack');
  });

  it('box face added only when hasBox=true', () => {
    expect(requiredKindsForSku({ hasBox: true })).toContain('box_face');
  });

  it('insert added only when hasInsert=true', () => {
    expect(requiredKindsForSku({ hasInsert: true })).toContain('insert');
  });

  it('qr_code_sample added only when hasQrCode=true', () => {
    expect(requiredKindsForSku({ hasQrCode: true })).toContain('qr_code_sample');
  });
});

describe('corpusManifest — optional kinds', () => {
  it('includes side profiles as optional by default', () => {
    const opt = optionalKindsForSku();
    expect(opt).toContain('studio_left');
    expect(opt).toContain('studio_right');
    expect(opt).toContain('reseller_mark');
  });
  it('SIDE_KINDS export matches', () => {
    expect(SIDE_KINDS).toEqual(['studio_left', 'studio_right']);
  });
});

describe('corpusManifest — coverage report', () => {
  function entry(sku: string, kind: CorpusEntrySummary['artifactKind'], approved: boolean, retired = false): CorpusEntrySummary {
    return { sku, artifactKind: kind, approved, retired };
  }

  it('empty corpus → all required missing, 0% complete', () => {
    const r = computeCoverage('BPC157-LIP-30ML', []);
    expect(r.percentRequiredComplete).toBe(0);
    expect(r.missingRequired.length).toBe(UNIVERSAL_REQUIRED.length);
    expect(r.unapprovedRequired).toEqual([]);
  });

  it('all-approved corpus → 100% complete', () => {
    const entries: CorpusEntrySummary[] = UNIVERSAL_REQUIRED.map((k) => entry('SKU-X', k, true));
    const r = computeCoverage('SKU-X', entries);
    expect(r.percentRequiredComplete).toBe(100);
    expect(r.missingRequired).toEqual([]);
    expect(r.unapprovedRequired).toEqual([]);
  });

  it('entries exist but not approved → unapprovedRequired flagged', () => {
    const entries: CorpusEntrySummary[] = UNIVERSAL_REQUIRED.map((k) => entry('SKU-Y', k, false));
    const r = computeCoverage('SKU-Y', entries);
    expect(r.percentRequiredComplete).toBe(0);
    expect(r.missingRequired).toEqual([]); // entries exist
    expect(r.unapprovedRequired.length).toBe(UNIVERSAL_REQUIRED.length);
  });

  it('retired entries do not count as present', () => {
    const entries: CorpusEntrySummary[] = UNIVERSAL_REQUIRED.map((k) => entry('SKU-Z', k, true, true));
    const r = computeCoverage('SKU-Z', entries);
    expect(r.percentRequiredComplete).toBe(0);
    expect(r.unapprovedRequired.length).toBe(UNIVERSAL_REQUIRED.length);
  });

  it('partial coverage computes correct percentage', () => {
    const half = UNIVERSAL_REQUIRED.slice(0, Math.floor(UNIVERSAL_REQUIRED.length / 2));
    const entries: CorpusEntrySummary[] = half.map((k) => entry('SKU-A', k, true));
    const r = computeCoverage('SKU-A', entries);
    expect(r.percentRequiredComplete).toBeGreaterThan(0);
    expect(r.percentRequiredComplete).toBeLessThan(100);
    expect(r.missingRequired.length).toBe(UNIVERSAL_REQUIRED.length - half.length);
  });
});

describe('corpusManifest — aggregate coverage', () => {
  it('aggregates across multiple SKUs', () => {
    const entries: CorpusEntrySummary[] = UNIVERSAL_REQUIRED.map((k) => ({ sku: 'SKU-FULL', artifactKind: k, approved: true, retired: false }));
    const agg = aggregateCoverage(
      [{ sku: 'SKU-FULL' }, { sku: 'SKU-EMPTY' }],
      entries,
    );
    expect(agg.totalSkus).toBe(2);
    expect(agg.fullyCoveredSkus).toBe(1);
    expect(agg.averageRequiredComplete).toBeGreaterThanOrEqual(49);
    expect(agg.averageRequiredComplete).toBeLessThanOrEqual(51);
  });

  it('empty SKU list → defaults', () => {
    const agg = aggregateCoverage([], []);
    expect(agg.totalSkus).toBe(0);
    expect(agg.fullyCoveredSkus).toBe(0);
    expect(agg.averageRequiredComplete).toBe(0);
  });
});

// ─── Takedown template slot-fill sanity (against P6 seeds) ─────────────────

describe('takedown templates — slot fill smoke test', () => {
  function mkDet(): Determination {
    return {
      evaluationId: 'mve-2026-0424-test',
      verdict: 'counterfeit_suspected',
      confidence: 0.88,
      matchedSku: 'BPC157-LIP-30ML',
      mismatchFlags: ['cap_geometry_mismatch', 'hologram_absent'],
      reasoningTrace: [
        { feature: 'cap_geometry', reference_image: 'ref-top.jpg', observation: 'present', match: 'mismatch', note: 'wrong cap' },
      ],
      citedReferenceIds: ['r1', 'r2'],
      humanReviewRequired: true,
    };
  }

  function mkConfig(): VisionConfigSnapshot {
    return {
      mode: 'active',
      sourceEnabled: {
        hounddog_marketplace: true, hounddog_social: true, practitioner_appeal: true,
        consumer_report: true, admin_upload: true, test_buy: true,
      },
      takedownEnabled: {
        amazon_brand_registry: true, ebay_vero: true, walmart_seller_protection: true,
        etsy_ip_policy: true, dmca_takedown: true, platform_trust_safety: true, manual_legal: true,
      },
      rateLimitDailyCapPerSource: 1000,
      rateLimitPerPractitionerDaily: 25,
      rateLimitPerConsumerDaily: 5,
    };
  }

  it('buildSlots produces every slot referenced by seed templates', () => {
    const slots = buildSlots({
      supabase: null as unknown as Parameters<typeof buildSlots>[0]['supabase'],
      determinationId: 'det-1',
      determination: mkDet(),
      mechanism: 'amazon_brand_registry',
      listingUrl: 'https://amazon.com/listing/x',
      actorId: 'steve-uid',
      findingId: 'M-2026-0424-abcd',
      testBuyId: 'tb-1',
      config: mkConfig(),
    });
    // Every slot the Amazon seed references must be present.
    const amazonRequiredSlots = [
      'brand_legal_name','listing_url','actor_id','verdict','confidence','evaluation_id',
      'finding_id','matched_sku','mismatch_flags','feature_trace','cited_reference_list',
      'test_buy_id','jurisdiction','language',
    ];
    for (const s of amazonRequiredSlots) {
      expect(slots[s], `missing slot ${s}`).toBeDefined();
      expect(String(slots[s]).length, `empty slot ${s}`).toBeGreaterThan(0);
    }
  });

  it('fillTemplate leaves no unresolved {{slot}} tokens for a valid slot set', () => {
    const body = 'Hello {{brand_legal_name}}, report {{matched_sku}} confidence {{confidence}}.';
    const out = fillTemplate(body, {
      brand_legal_name: 'FarmCeutica Wellness LLC',
      matched_sku: 'BPC157-LIP-30ML',
      confidence: '0.88',
    });
    expect(out).not.toContain('{{');
    expect(out).toContain('FarmCeutica Wellness LLC');
    expect(out).toContain('BPC157-LIP-30ML');
  });
});
