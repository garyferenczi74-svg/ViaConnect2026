// Prompt #104 Phase 1: Bucket-classification helpers.
//
// The four-bucket taxonomy defines what enforcement is legally
// available. AI triage proposes a bucket; Steve Rica confirms;
// templates and downstream actions are gated by the confirmed bucket.

import {
  type LegalCaseBucket,
  type TemplateFamily,
  ENFORCEABLE_BUCKETS,
} from './types';

// Template-to-bucket compatibility matrix. A template can only be
// selected for a case whose confirmed bucket appears in its row.
// Mirrors spec §5.1 + §5.2.
export const TEMPLATE_FAMILY_BUCKETS: Record<TemplateFamily, ReadonlySet<LegalCaseBucket>> = {
  // Cease-and-desist family
  cd_counterfeit:                            new Set<LegalCaseBucket>(['counterfeit']),
  cd_material_differences:                   new Set<LegalCaseBucket>(['gray_market_material_differences']),
  cd_distribution_breach:                    new Set<LegalCaseBucket>(['gray_market_no_differences']),
  cd_map_policy_breach:                      new Set<LegalCaseBucket>(['map_only']),

  // DMCA takedowns require copyright misuse; applicable to any IP
  // bucket where copyrighted artwork is in unauthorized use.
  dmca_takedown_amazon:                      new Set<LegalCaseBucket>(['gray_market_material_differences', 'counterfeit']),
  dmca_takedown_etsy:                        new Set<LegalCaseBucket>(['gray_market_material_differences', 'counterfeit']),
  dmca_takedown_ebay:                        new Set<LegalCaseBucket>(['gray_market_material_differences', 'counterfeit']),

  // Marketplace IP complaints
  marketplace_complaint_amazon_brand_registry: new Set<LegalCaseBucket>(['gray_market_material_differences', 'counterfeit']),
  marketplace_complaint_etsy_ip:               new Set<LegalCaseBucket>(['gray_market_material_differences', 'counterfeit']),
  marketplace_complaint_ebay_vero:             new Set<LegalCaseBucket>(['gray_market_material_differences', 'counterfeit']),
  marketplace_complaint_tiktok_ip_protection:  new Set<LegalCaseBucket>(['gray_market_material_differences', 'counterfeit']),
  marketplace_complaint_shopify_dmca:          new Set<LegalCaseBucket>(['gray_market_material_differences', 'counterfeit']),
  marketplace_complaint_walmart_ip:            new Set<LegalCaseBucket>(['gray_market_material_differences', 'counterfeit']),
};

export interface CompatibilityCheck {
  ok: boolean;
  reason?: 'unclassified_bucket' | 'template_not_compatible';
}

export function isTemplateCompatibleWithBucket(args: {
  template_family: TemplateFamily;
  bucket: LegalCaseBucket;
}): CompatibilityCheck {
  if (args.bucket === 'unclassified') return { ok: false, reason: 'unclassified_bucket' };
  const allowed = TEMPLATE_FAMILY_BUCKETS[args.template_family];
  if (!allowed || !allowed.has(args.bucket)) return { ok: false, reason: 'template_not_compatible' };
  return { ok: true };
}

export interface BucketEvidenceCheck {
  ok: boolean;
  reason?:
    | 'counterfeit_requires_physical_evidence'
    | 'material_differences_requires_documented_diffs'
    | 'unenforceable_bucket';
}

// Bright-line guards from spec §3.6:
//   - Counterfeit allegation requires test-purchase receipt + product
//     photograph (or lab report) OR customer complaint OR customs notice.
//   - Material-differences allegation requires at least one documented
//     material difference from the case metadata.
//   - MAP-only and gray_market_no_differences cannot enter full IP
//     enforcement (§3.2 + §5.1); only marketplace TOS complaint +
//     refusal to sell are permitted.
export function bucketSupportsIPEnforcement(args: {
  bucket: LegalCaseBucket;
  evidence_artifact_types: ReadonlyArray<string>;
  documented_material_differences_count: number;
}): BucketEvidenceCheck {
  if (!ENFORCEABLE_BUCKETS.has(args.bucket)) {
    return { ok: false, reason: 'unenforceable_bucket' };
  }
  if (args.bucket === 'counterfeit') {
    const requiredEvidence = new Set([
      'test_purchase_receipt',
      'product_photograph',
      'lab_report',
      'customer_complaint',
    ]);
    const has = args.evidence_artifact_types.some((t) => requiredEvidence.has(t));
    if (!has) return { ok: false, reason: 'counterfeit_requires_physical_evidence' };
  }
  if (args.bucket === 'gray_market_material_differences' && args.documented_material_differences_count < 1) {
    return { ok: false, reason: 'material_differences_requires_documented_diffs' };
  }
  return { ok: true };
}

export function recommendedTemplateFamilyForBucket(bucket: LegalCaseBucket): TemplateFamily | null {
  switch (bucket) {
    case 'counterfeit':                       return 'cd_counterfeit';
    case 'gray_market_material_differences':  return 'cd_material_differences';
    case 'gray_market_no_differences':        return 'cd_distribution_breach';
    case 'map_only':                          return 'cd_map_policy_breach';
    default:                                  return null;
  }
}
