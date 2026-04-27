/**
 * MARSHALL.SOCIAL.* — external-web rule module (Prompt #120).
 *
 * All rules operate on a pre-normalized SocialSignal. They are pure functions.
 * Confidence is computed upstream in lib/hounddog/evaluate.ts; individual rules
 * may additionally veto themselves on insufficient attribution/product match.
 */

import type { EvaluationContext, Finding, Rule } from "../engine/types";
import { generateFindingId, redactExcerpt } from "../engine/types";
import { hasDisclosure, mentionsFarmceuticaBrand } from "../dictionaries/disclosure_markers";
import { EMOJI_REGEX } from "../dictionaries/forbidden_phrases";

const LAST_REVIEWED = "2026-04-23";

// Minimal shape we need from the signal. Avoids cross-import of hounddog types
// so compliance/ stays dependency-free of hounddog/.
export interface SocialSignalLike {
  id?: string;
  url: string;
  collectorId?: string;
  capturedAt?: string;
  publishedAt?: string;
  content: {
    textDerived?: string;
    textRaw?: string;
    language?: string;
    fingerprint?: string;
    mediaHashes?: { sha256?: string[]; perceptual?: string[] };
  };
  author: {
    handle: string;
    externalId?: string;
    displayName?: string;
    verifiedByPlatform?: boolean;
    matchedPractitionerId?: string | null;
    practitionerMatchConfidence?: number | null;
  };
  productMatches: Array<{ sku: string; confidence: number; method: "lexical" | "semantic" | "image" }>;
  pricing?: { extracted: number; currency: string; mapFloor?: number; underMapBy?: number };
  jurisdiction?: { country?: string; region?: string };
  // Platform-level audience signals (best-effort; null means unknown).
  audienceSignals?: {
    creatorSelfDeclaredMinor?: boolean;
    audienceUnder18Pct?: number; // 0..1
  };
  // Coordinated-behavior aggregator uses an external fingerprint cache.
  fingerprintNetwork?: {
    sameAuthorPlatforms: string[];   // other platforms same author posted identical content
    matchedPractitionersLast72h: number; // distinct practitioners posting same fingerprint
  };
}

function f(
  ruleId: string,
  severity: Finding["severity"],
  message: string,
  citation: string,
  excerpt: string,
  remediation: Finding["remediation"],
  ctx: EvaluationContext,
  extraLocation: Partial<Finding["location"]> = {},
): Finding {
  return {
    findingId: generateFindingId(ctx.now),
    ruleId,
    severity,
    surface: ctx.surface,
    source: ctx.source,
    location: { ...(ctx.location ?? {}), ...extraLocation },
    excerpt,
    message,
    citation,
    remediation,
    createdAt: (ctx.now ?? new Date()).toISOString(),
  };
}

function defaultCtx(): EvaluationContext {
  return { surface: "user_content", source: "runtime", now: new Date() };
}

// Helper: a signal is "attributable" to a practitioner if we have a verified
// match with confidence >= 0.85. Lower than that, practitioner-tagged rules
// must self-veto so we never open a finding on a low-confidence attribution.
function isAttributable(signal: SocialSignalLike): boolean {
  return (
    !!signal.author.matchedPractitionerId &&
    (signal.author.practitionerMatchConfidence ?? 0) >= 0.85
  );
}

function topProductConfidence(signal: SocialSignalLike): number {
  if (signal.productMatches.length === 0) return 0;
  return Math.max(...signal.productMatches.map((p) => p.confidence));
}

// -----------------------------------------------------------------------------
// 1. MAP_VIOLATION_EXTERNAL (P1)
// -----------------------------------------------------------------------------
export const MAP_VIOLATION_EXTERNAL: Rule<SocialSignalLike> = {
  id: "MARSHALL.SOCIAL.MAP_VIOLATION_EXTERNAL",
  pillar: "MAP",
  severity: "P1",
  surfaces: ["user_content", "marketing_page"],
  citation: "FarmCeutica MAP policy v3; Prompts #100-#102",
  description: "External listing priced below MAP floor for a matched FarmCeutica SKU.",
  evaluate: (signal, ctx = defaultCtx()) => {
    if (!signal.pricing) return [];
    const { extracted, mapFloor, underMapBy, currency } = signal.pricing;
    if (mapFloor == null || extracted == null) return [];
    if (extracted >= mapFloor) return [];
    if (topProductConfidence(signal) < 0.85) return [];
    return [
      f(
        "MARSHALL.SOCIAL.MAP_VIOLATION_EXTERNAL",
        "P1",
        `Finding: external listing priced ${currency}${extracted.toFixed(2)} (${(underMapBy ?? 0).toFixed(1)}% below MAP floor ${currency}${mapFloor.toFixed(2)}).`,
        "MAP policy v3",
        `${signal.author.handle}: ${signal.url}`,
        {
          kind: "manual",
          summary: "Cross-check with practitioner waiver table before opening; if no active waiver, record strike.",
        },
        ctx,
        { url: signal.url, agent: "hounddog" },
      ),
    ];
  },
  lastReviewed: LAST_REVIEWED,
};

// -----------------------------------------------------------------------------
// 2. DISCLOSURE_MISSING_FTC (P2)
// -----------------------------------------------------------------------------
export const DISCLOSURE_MISSING_FTC: Rule<SocialSignalLike> = {
  id: "MARSHALL.SOCIAL.DISCLOSURE_MISSING_FTC",
  pillar: "COMMS",
  severity: "P2",
  surfaces: ["user_content", "marketing_page"],
  citation: "16 CFR Part 255 (FTC Endorsement Guides 2023 revision)",
  description: "Practitioner content promoting a FarmCeutica product without material-connection disclosure.",
  evaluate: (signal, ctx = defaultCtx()) => {
    if (!isAttributable(signal)) return [];
    if (signal.productMatches.length === 0) return [];
    const text = signal.content.textDerived ?? signal.content.textRaw ?? "";
    if (hasDisclosure(text)) return [];
    return [
      f(
        "MARSHALL.SOCIAL.DISCLOSURE_MISSING_FTC",
        "P2",
        `Finding: practitioner ${signal.author.handle} promotes FarmCeutica SKU ${signal.productMatches[0].sku} without FTC disclosure.`,
        "16 CFR Part 255",
        redactExcerpt(text, 0, 160),
        {
          kind: "suggested",
          summary: "Practitioner to add #ad, #PaidPartnership, or equivalent plain-English disclosure within 7 days.",
        },
        ctx,
        { url: signal.url, userId: signal.author.matchedPractitionerId ?? undefined, agent: "hounddog" },
      ),
    ];
  },
  lastReviewed: LAST_REVIEWED,
};

// -----------------------------------------------------------------------------
// 3. DISEASE_CLAIM_EXTERNAL (P0)
// -----------------------------------------------------------------------------
const DISEASE_CLAIM_PATTERN = /\b(cure|cures|cured|treat|treats|treated|prevent|prevents|prevented|heal|heals|healed|reverse|reverses|reversed)\b[\s\S]{0,60}?\b(diabetes|cancer|depression|alzheimer|parkinson|hypertension|arthritis|lupus|crohn|ibs|pcos|anxiety disorder|autoimmune)\b/i;

export const DISEASE_CLAIM_EXTERNAL: Rule<SocialSignalLike> = {
  id: "MARSHALL.SOCIAL.DISEASE_CLAIM_EXTERNAL",
  pillar: "CLAIMS",
  severity: "P0",
  surfaces: ["user_content", "marketing_page"],
  citation: "21 CFR 101.93; FTC Act Section 5",
  description: "Disease claim attributable to a matched practitioner about a FarmCeutica product.",
  evaluate: (signal, ctx = defaultCtx()) => {
    if (!isAttributable(signal)) return [];
    if (signal.productMatches.length === 0 && !mentionsFarmceuticaBrand(signal.content.textDerived ?? "")) return [];
    const text = signal.content.textDerived ?? signal.content.textRaw ?? "";
    const match = DISEASE_CLAIM_PATTERN.exec(text);
    if (!match) return [];
    return [
      f(
        "MARSHALL.SOCIAL.DISEASE_CLAIM_EXTERNAL",
        "P0",
        `Finding: disease claim "${match[0]}" by practitioner ${signal.author.handle}.`,
        "21 CFR 101.93",
        redactExcerpt(text, match.index, 100),
        {
          kind: "manual",
          summary: "Requires Steve Rica manual confirmation before practitioner notification. Route for clinical review by Dr. Fadi Dagher if confirmed.",
        },
        ctx,
        { url: signal.url, userId: signal.author.matchedPractitionerId ?? undefined, agent: "hounddog" },
      ),
    ];
  },
  lastReviewed: LAST_REVIEWED,
};

// -----------------------------------------------------------------------------
// 4. BRAND_MISUSE_EXTERNAL (P2)
// -----------------------------------------------------------------------------
const BRAND_FORBIDDEN_PATTERNS: Array<[RegExp, string]> = [
  [/\bvitality\s+(?:score|index)\b/i, "Vitality Score/Index forbidden; use Bio Optimization"],
  [/\bwellness\s+score\b/i, "Wellness Score forbidden; use Bio Optimization"],
  [/\b5\s*[-–—]\s*27\s*[×x]\s*(?:more\s+)?bioavailab/i, "Bioavailability must read exactly 10-28x"],
  [/\bsemaglutide\b/i, "Semaglutide is prohibited platform-wide"],
];

export const BRAND_MISUSE_EXTERNAL: Rule<SocialSignalLike> = {
  id: "MARSHALL.SOCIAL.BRAND_MISUSE_EXTERNAL",
  pillar: "BRAND",
  severity: "P2",
  surfaces: ["user_content", "marketing_page"],
  citation: "ViaConnect Standing Rules Section 0.1-0.3",
  description: "External content uses forbidden brand strings or incorrect ranges.",
  evaluate: (signal, ctx = defaultCtx()) => {
    const text = signal.content.textDerived ?? signal.content.textRaw ?? "";
    if (!text) return [];
    const hits: Finding[] = [];
    for (const [pattern, reason] of BRAND_FORBIDDEN_PATTERNS) {
      const m = pattern.exec(text);
      if (m) {
        hits.push(
          f(
            "MARSHALL.SOCIAL.BRAND_MISUSE_EXTERNAL",
            "P2",
            `Finding: ${reason}. Source: ${signal.author.handle}.`,
            "ViaConnect Standing Rules",
            redactExcerpt(text, m.index, 80),
            { kind: "suggested", summary: "Request correction from the author; escalate if non-practitioner." },
            ctx,
            { url: signal.url, agent: "hounddog" },
          ),
        );
      }
    }
    return hits;
  },
  lastReviewed: LAST_REVIEWED,
};

// -----------------------------------------------------------------------------
// 5. UNAUTHORIZED_RESELLER (P1)
// -----------------------------------------------------------------------------
const MARKETPLACE_COLLECTORS = new Set(["amazon", "ebay", "walmart", "etsy"]);

export const UNAUTHORIZED_RESELLER: Rule<SocialSignalLike> = {
  id: "MARSHALL.SOCIAL.UNAUTHORIZED_RESELLER",
  pillar: "MAP",
  severity: "P1",
  surfaces: ["user_content", "marketing_page"],
  citation: "FarmCeutica Authorized Reseller Policy v2",
  description: "Non-practitioner marketplace listing of a FarmCeutica SKU without authorized-reseller flag.",
  evaluate: (signal, ctx = defaultCtx()) => {
    if (!signal.collectorId || !MARKETPLACE_COLLECTORS.has(signal.collectorId)) return [];
    if (signal.author.matchedPractitionerId) return []; // practitioners are a separate lane (MAP)
    if (signal.productMatches.length === 0) return [];
    if (topProductConfidence(signal) < 0.85) return [];
    return [
      f(
        "MARSHALL.SOCIAL.UNAUTHORIZED_RESELLER",
        "P1",
        `Finding: marketplace listing "${signal.author.handle}" on ${signal.collectorId} selling SKU ${signal.productMatches[0].sku}; not an authorized reseller.`,
        "Authorized Reseller Policy v2",
        signal.url,
        {
          kind: "manual",
          summary: "Draft takedown notice via Brand Registry / VeRO / IP policy. Steve approves send.",
          action: "OPEN_TAKEDOWN",
        },
        ctx,
        { url: signal.url, agent: "hounddog" },
      ),
    ];
  },
  lastReviewed: LAST_REVIEWED,
};

// -----------------------------------------------------------------------------
// 6. COUNTERFEIT_SUSPECTED (P0)
// -----------------------------------------------------------------------------
export const COUNTERFEIT_SUSPECTED: Rule<SocialSignalLike> = {
  id: "MARSHALL.SOCIAL.COUNTERFEIT_SUSPECTED",
  pillar: "MAP",
  severity: "P0",
  surfaces: ["user_content", "marketing_page"],
  citation: "Lanham Act 15 USC 1114; FarmCeutica anti-counterfeit policy",
  description: "Branded packaging on non-FarmCeutica listing with suspicious pricing pattern.",
  evaluate: (signal, ctx = defaultCtx()) => {
    if (!signal.collectorId || !MARKETPLACE_COLLECTORS.has(signal.collectorId)) return [];
    if (signal.productMatches.length === 0) return [];
    // Very-low price (>= 50% below MAP) on marketplace + not an authorized
    // reseller = high counterfeit suspicion. Conservative by design.
    const pricing = signal.pricing;
    if (!pricing?.mapFloor || !pricing.extracted) return [];
    const pct = (pricing.mapFloor - pricing.extracted) / pricing.mapFloor;
    if (pct < 0.5) return [];
    return [
      f(
        "MARSHALL.SOCIAL.COUNTERFEIT_SUSPECTED",
        "P0",
        `Finding: suspected counterfeit on ${signal.collectorId}. Listing ${(pct * 100).toFixed(0)}% below MAP.`,
        "Lanham Act 15 USC 1114",
        signal.url,
        {
          kind: "manual",
          summary: "Escalate to legal counsel + Brand Registry takedown. Never auto-publish any notice.",
          action: "NOTIFY_LEGAL",
        },
        ctx,
        { url: signal.url, agent: "hounddog" },
      ),
    ];
  },
  lastReviewed: LAST_REVIEWED,
};

// -----------------------------------------------------------------------------
// 7. TESTIMONIAL_UNSUBSTANTIATED_EXT (P2)
// -----------------------------------------------------------------------------
export const TESTIMONIAL_UNSUBSTANTIATED_EXT: Rule<SocialSignalLike> = {
  id: "MARSHALL.SOCIAL.TESTIMONIAL_UNSUBSTANTIATED_EXT",
  pillar: "CLAIMS",
  severity: "P2",
  surfaces: ["user_content", "marketing_page"],
  citation: "FTC Endorsement Guides 2023 (typical-results qualifier)",
  description: "Outcome testimonial missing typical-results qualifier.",
  evaluate: (signal, ctx = defaultCtx()) => {
    if (!signal.productMatches.length) return [];
    const text = signal.content.textDerived ?? "";
    const outcomeRe = /\b(lost|gained|dropped|reduced|increased|improved|boosted)\s+[\w\s]{3,40}?\s+(?:by|in)\s+\d+\s*(?:lb|lbs|pounds|%|percent|points|units)\b/i;
    if (!outcomeRe.test(text)) return [];
    const qualifier = /(typical results will vary|results may vary|individual results may vary|not typical)/i;
    if (qualifier.test(text)) return [];
    return [
      f(
        "MARSHALL.SOCIAL.TESTIMONIAL_UNSUBSTANTIATED_EXT",
        "P2",
        "Finding: testimonial with numeric outcome missing typical-results qualifier.",
        "FTC Endorsement Guides 2023",
        redactExcerpt(text, 0, 160),
        { kind: "suggested", summary: "Add 'individual results may vary' language or remove the specific outcome number." },
        ctx,
        { url: signal.url, agent: "hounddog" },
      ),
    ];
  },
  lastReviewed: LAST_REVIEWED,
};

// -----------------------------------------------------------------------------
// 8. PEPTIDE_AGE_TARGET_EXT (P0)
// -----------------------------------------------------------------------------
export const PEPTIDE_AGE_TARGET_EXT: Rule<SocialSignalLike> = {
  id: "MARSHALL.SOCIAL.PEPTIDE_AGE_TARGET_EXT",
  pillar: "PEPTIDE",
  severity: "P0",
  surfaces: ["user_content"],
  citation: "Internal policy 2025-09-01; COPPA 16 CFR 312",
  description: "Peptide content on an account targeting under-18 audience.",
  evaluate: (signal, ctx = defaultCtx()) => {
    const isPeptide = signal.productMatches.some((p) =>
      /^(RET|BPC|TB|CJC|IPA|SEM|SEL|PT|TIRZ)-/i.test(p.sku),
    );
    if (!isPeptide) return [];
    const audience = signal.audienceSignals;
    const isMinorAccount =
      audience?.creatorSelfDeclaredMinor === true ||
      (audience?.audienceUnder18Pct ?? 0) > 0.25;
    if (!isMinorAccount) return [];
    return [
      f(
        "MARSHALL.SOCIAL.PEPTIDE_AGE_TARGET_EXT",
        "P0",
        `Finding: peptide content on under-18-leaning account (${signal.author.handle}).`,
        "Internal policy 2025-09-01",
        signal.url,
        {
          kind: "manual",
          summary: "Steve Rica manual confirm. Takedown request if non-practitioner; scope review if practitioner.",
        },
        ctx,
        { url: signal.url, agent: "hounddog" },
      ),
    ];
  },
  lastReviewed: LAST_REVIEWED,
};

// -----------------------------------------------------------------------------
// 9. RETATRUTIDE_STACKING_EXT (P0)
// -----------------------------------------------------------------------------
const PEPTIDE_NAME_PATTERN = /\b(BPC[- ]?157|TB[- ]?500|CJC[- ]?1295|ipamorelin|sermorelin|tesamorelin|tirzepatide|PT[- ]?141|bremelanotide|semax|selank|epitalon|thymosin)\b/gi;

export const RETATRUTIDE_STACKING_EXT: Rule<SocialSignalLike> = {
  id: "MARSHALL.SOCIAL.RETATRUTIDE_STACKING_EXT",
  pillar: "PEPTIDE",
  severity: "P0",
  surfaces: ["user_content", "marketing_page"],
  citation: "Clinical protocol memo 2026-02-11; Standing Rule Section 0.3",
  description: "External content promotes Retatrutide stacked with other peptides.",
  evaluate: (signal, ctx = defaultCtx()) => {
    const text = (signal.content.textDerived ?? "").toLowerCase();
    if (!/\bretatrutide\b/.test(text)) return [];
    PEPTIDE_NAME_PATTERN.lastIndex = 0;
    if (!PEPTIDE_NAME_PATTERN.test(text)) return [];
    return [
      f(
        "MARSHALL.SOCIAL.RETATRUTIDE_STACKING_EXT",
        "P0",
        `Finding: Retatrutide promoted with other peptide(s) by ${signal.author.handle}.`,
        "Standing Rule Section 0.3",
        redactExcerpt(text, 0, 160),
        {
          kind: "manual",
          summary: "Steve Rica manual confirm; Retatrutide is monotherapy-only. Escalate to Dr. Fadi Dagher.",
        },
        ctx,
        { url: signal.url, agent: "hounddog" },
      ),
    ];
  },
  lastReviewed: LAST_REVIEWED,
};

// -----------------------------------------------------------------------------
// 10. PRACTITIONER_SCOPE_OVERREACH (P1)
// -----------------------------------------------------------------------------
// Heuristic: practitioner protocol-level guidance keywords AND declared role
// context that would be out-of-scope. Without full role context here, the rule
// flags candidates for human review; Steve finalizes.
const PROTOCOL_GUIDANCE_PATTERN = /\b(prescribe|my prescription|I prescribe|dosage protocol|titrate up|start with \d+\s*(?:mg|mcg|iu))\b/i;

export const PRACTITIONER_SCOPE_OVERREACH: Rule<SocialSignalLike> = {
  id: "MARSHALL.SOCIAL.PRACTITIONER_SCOPE_OVERREACH",
  pillar: "PRACTITIONER",
  severity: "P1",
  surfaces: ["user_content"],
  citation: "State scope of practice statutes",
  description: "Matched practitioner posts protocol-level guidance outside their likely state scope.",
  evaluate: (signal, ctx = defaultCtx()) => {
    if (!isAttributable(signal)) return [];
    const text = signal.content.textDerived ?? "";
    if (!PROTOCOL_GUIDANCE_PATTERN.test(text)) return [];
    return [
      f(
        "MARSHALL.SOCIAL.PRACTITIONER_SCOPE_OVERREACH",
        "P1",
        `Finding: practitioner ${signal.author.handle} posts protocol-level guidance; verify scope.`,
        "State scope of practice statutes",
        redactExcerpt(text, 0, 160),
        {
          kind: "manual",
          summary: "Verify practitioner role + state; Steve resolves with Dr. Fadi Dagher if clinical.",
        },
        ctx,
        { url: signal.url, userId: signal.author.matchedPractitionerId ?? undefined, agent: "hounddog" },
      ),
    ];
  },
  lastReviewed: LAST_REVIEWED,
};

// -----------------------------------------------------------------------------
// 11. COORDINATED_BEHAVIOR (P1)
// -----------------------------------------------------------------------------
export const COORDINATED_BEHAVIOR: Rule<SocialSignalLike> = {
  id: "MARSHALL.SOCIAL.COORDINATED_BEHAVIOR",
  pillar: "COMMS",
  severity: "P1",
  surfaces: ["user_content"],
  citation: "Platform trust and safety guidance; FTC coordinated campaign enforcement",
  description: "Identical content from same author on three or more platforms, or three or more matched practitioners posting identical content within 72 hours.",
  evaluate: (signal, ctx = defaultCtx()) => {
    const net = signal.fingerprintNetwork;
    if (!net) return [];
    const sameAuthorPlatforms = net.sameAuthorPlatforms?.length ?? 0;
    const practitionerSpread = net.matchedPractitionersLast72h ?? 0;
    if (sameAuthorPlatforms < 3 && practitionerSpread < 3) return [];
    return [
      f(
        "MARSHALL.SOCIAL.COORDINATED_BEHAVIOR",
        "P1",
        `Finding: coordinated behavior signal. Same content: ${sameAuthorPlatforms} platforms (same author), ${practitionerSpread} practitioners within 72h.`,
        "Platform trust & safety guidance",
        signal.url,
        {
          kind: "manual",
          summary: "Route to review queue as coordinated_behavior_review. Group related signals before action.",
        },
        ctx,
        { url: signal.url, agent: "hounddog" },
      ),
    ];
  },
  lastReviewed: LAST_REVIEWED,
};

// -----------------------------------------------------------------------------
// 12. DMCA_TRADEMARK_MISUSE (P2)
// -----------------------------------------------------------------------------
export const DMCA_TRADEMARK_MISUSE: Rule<SocialSignalLike> = {
  id: "MARSHALL.SOCIAL.DMCA_TRADEMARK_MISUSE",
  pillar: "BRAND",
  severity: "P2",
  surfaces: ["user_content", "marketing_page"],
  citation: "Lanham Act 15 USC 1114; DMCA 17 USC 512",
  description: "Third-party commercial use of FarmCeutica marks without authorization.",
  evaluate: (signal, ctx = defaultCtx()) => {
    // Only applies when author is NOT a matched practitioner (practitioners
    // have separate attribution/scope rules). Commercial context heuristic:
    // pricing present OR marketplace collector OR "buy", "shop", "order".
    if (signal.author.matchedPractitionerId) return [];
    const text = signal.content.textDerived ?? "";
    if (!mentionsFarmceuticaBrand(text)) return [];
    const commercial =
      !!signal.pricing ||
      (signal.collectorId && MARKETPLACE_COLLECTORS.has(signal.collectorId)) ||
      /\b(buy|shop|order|purchase|sale|% off)\b/i.test(text);
    if (!commercial) return [];
    return [
      f(
        "MARSHALL.SOCIAL.DMCA_TRADEMARK_MISUSE",
        "P2",
        `Finding: unauthorized commercial use of FarmCeutica marks by ${signal.author.handle}.`,
        "Lanham Act 15 USC 1114",
        signal.url,
        {
          kind: "manual",
          summary: "Draft DMCA / Brand Registry takedown for Steve approval. Never auto-send.",
          action: "OPEN_TAKEDOWN",
        },
        ctx,
        { url: signal.url, agent: "hounddog" },
      ),
    ];
  },
  lastReviewed: LAST_REVIEWED,
};

// -----------------------------------------------------------------------------
// Export aggregate. Silence the dead-import warning; EMOJI_REGEX is kept
// exported from the dictionary for adapter reuse.
// -----------------------------------------------------------------------------
void EMOJI_REGEX;

export const socialRules: Rule[] = [
  MAP_VIOLATION_EXTERNAL,
  DISCLOSURE_MISSING_FTC,
  DISEASE_CLAIM_EXTERNAL,
  BRAND_MISUSE_EXTERNAL,
  UNAUTHORIZED_RESELLER,
  COUNTERFEIT_SUSPECTED,
  TESTIMONIAL_UNSUBSTANTIATED_EXT,
  PEPTIDE_AGE_TARGET_EXT,
  RETATRUTIDE_STACKING_EXT,
  PRACTITIONER_SCOPE_OVERREACH,
  COORDINATED_BEHAVIOR,
  DMCA_TRADEMARK_MISUSE,
];
