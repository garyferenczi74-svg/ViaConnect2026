/**
 * Pillar 11 — Marketing copy guardrails (Prompts #138a + #138c + #138d + #138e).
 *
 * Eleven rules under MARSHALL.MARKETING.* that gate the conversion-stack
 * surfaces (homepage hero variants, trust band content, Sarah Scenario
 * composite case-study walkthroughs, outcome timeline categorical phase):
 *
 *   #138a §7.3 — NAMED_PERSON_CONNECTION (P1)
 *                TIME_CLAIM_SUBSTANTIATION (P1)
 *                SCIENTIFIC_GROUNDING (P2)
 *                OUTCOME_GUARANTEE (P0)
 *                COMPLIANCE_NAMING (P2)
 *
 *   #138c §6/§7 — ENDORSER_CONSENT_REQUIRED (P0)
 *                 REGULATORY_FRAMEWORK_NAMING (P1)
 *
 *   #138d §6.3 — COMPOSITE_DISCLOSURE (P0)
 *                INTERVENTION_SPECIFICITY (P0)
 *
 *   #138e §6.3 — SCORE_AS_TRACKING_NOT_OUTCOME (P0)
 *                OUTCOME_TIMELINE_QUALIFIER_REQUIRED (P0)
 *
 * The four #138d/#138e P0 rules are the automated enforcement teeth of the
 * scope-reduction commitments documented in those specs; none have an
 * override path at the content-author level.
 */

import type { EvaluationContext, Finding, Rule } from "../engine/types";
import { generateFindingId, redactExcerpt } from "../engine/types";

const LAST_REVIEWED = "2026-04-25";

function defaultCtx(): EvaluationContext {
  return { surface: "marketing_copy", source: "runtime", now: new Date() };
}

function baseFinding(
  ruleId: string,
  severity: Finding["severity"],
  message: string,
  citation: string,
  excerpt: string,
  remediation: Finding["remediation"],
  ctx: EvaluationContext,
): Finding {
  return {
    findingId: generateFindingId(ctx.now),
    ruleId,
    severity,
    surface: ctx.surface,
    source: ctx.source,
    location: ctx.location ?? {},
    excerpt,
    message,
    citation,
    remediation,
    createdAt: (ctx.now ?? new Date()).toISOString(),
  };
}

// ─── Shared input shapes ─────────────────────────────────────────────────────

/**
 * Marketing-copy input. Some rules need to know what kind of content surface
 * they're evaluating so they can scope themselves (e.g., COMPOSITE_DISCLOSURE
 * only applies to case-study content).
 */
export interface MarketingCopyInput {
  text: string;
  /**
   * Content kind for surface-specific scoping. `case_study` triggers the
   * #138d case-study-only rules (composite disclosure required, intervention
   * specificity forbidden). Other kinds skip those rules.
   */
  contentKind?: "hero_variant" | "trust_band" | "case_study" | "testimonial" | "outcome_timeline" | "other";
  /**
   * Set true when a clinician's written-consent record is on file for the
   * specific copy block being evaluated. Required to clear NAMED_PERSON_CONNECTION
   * when the copy names a clinician.
   */
  clinicianConsentOnFile?: boolean;
  /**
   * Set true when a substantiation file is linked for any time-to-value claim
   * in the copy. Required to clear TIME_CLAIM_SUBSTANTIATION when the copy
   * makes a "X minutes" / "X-minute" claim.
   */
  timeSubstantiationOnFile?: boolean;
  /**
   * Set true when a substantiation file is linked for any scientific-grounding
   * claim in the copy.
   */
  scientificSubstantiationOnFile?: boolean;
  /**
   * For case-study copy: opening + closing composite disclosures must both
   * render as in-element body weight (not footnote). Omitted disclosures or
   * footnote-only disclosures are P0.
   */
  compositeDisclosureMeta?: {
    hasOpeningDisclosure: boolean;
    hasClosingDisclosure: boolean;
    rendersAsFootnote: boolean;
  };
  /**
   * For testimonial copy: written-consent storage key for the endorser must
   * resolve. Missing or unresolved consent is P0.
   */
  endorserConsentMeta?: {
    consentKeyResolved: boolean;
    materialConnectionDisclosed: boolean;
  };
  /**
   * For outcome-timeline copy: an honest qualifier block must render in-element
   * adjacent to the phase cards (not as a footnote). Omitted or footnote-only
   * qualifier is P0 per #138e §6.3 OUTCOME_TIMELINE_QUALIFIER_REQUIRED.
   */
  outcomeTimelineMeta?: {
    hasAdjacentQualifier: boolean;
    qualifierIsFootnote: boolean;
  };
}

// ─── #138a §7.3 — NAMED_PERSON_CONNECTION (P1) ───────────────────────────────

const CLINICIAN_NAME_PATTERN = /\bDr\.?\s+[A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+){0,2}\b/g;

export const NAMED_PERSON_CONNECTION: Rule<MarketingCopyInput | string> = {
  id: "MARSHALL.MARKETING.NAMED_PERSON_CONNECTION",
  pillar: "MARKETING",
  severity: "P1",
  surfaces: ["marketing_copy", "marketing_page", "content_cms", "ai_output"],
  citation: "Prompt #138a §7.3; FTC 16 CFR 255 material connection",
  description:
    "Marketing copy that names a clinician must be backed by a current relationship and reviewed by that person before publication.",
  evaluate: (input, ctx = defaultCtx()) => {
    const text = typeof input === "string" ? input : input.text;
    const consentOnFile = typeof input === "string" ? false : input.clinicianConsentOnFile === true;
    if (typeof text !== "string" || text.length === 0) return [];
    const findings: Finding[] = [];
    let m: RegExpExecArray | null;
    CLINICIAN_NAME_PATTERN.lastIndex = 0;
    while ((m = CLINICIAN_NAME_PATTERN.exec(text)) !== null) {
      if (consentOnFile) continue;
      findings.push(
        baseFinding(
          "MARSHALL.MARKETING.NAMED_PERSON_CONNECTION",
          "P1",
          `Finding: marketing copy names "${m[0]}" without a clinician_consent record on file. FTC 16 CFR 255 requires material-connection disclosure plus that person's written approval before publication.`,
          "Prompt #138a §7.3; FTC 16 CFR 255",
          redactExcerpt(text, m.index, 80),
          {
            kind: "manual",
            summary: `Capture written consent from ${m[0]} for this specific copy and link the consent storage key on the marketing_copy_variants row before activation.`,
          },
          ctx,
        ),
      );
    }
    return findings;
  },
  lastReviewed: LAST_REVIEWED,
};

// ─── #138a §7.3 — TIME_CLAIM_SUBSTANTIATION (P1) ─────────────────────────────

const TIME_CLAIM_PATTERN = /\b(?:in\s+(?:about\s+)?|about\s+|under\s+|in\s+just\s+)?(\d{1,3})\s*[-]?\s*minutes?\b/gi;

export const TIME_CLAIM_SUBSTANTIATION: Rule<MarketingCopyInput | string> = {
  id: "MARSHALL.MARKETING.TIME_CLAIM_SUBSTANTIATION",
  pillar: "MARKETING",
  severity: "P1",
  surfaces: ["marketing_copy", "marketing_page", "content_cms", "ai_output"],
  citation: "Prompt #138a §7.3; FTC time-to-value substantiation",
  description:
    "Time-to-value claims (e.g., 'in 12 minutes') must match the actual median completion time within +/-20%, verified against analytics.",
  evaluate: (input, ctx = defaultCtx()) => {
    const text = typeof input === "string" ? input : input.text;
    const subOnFile = typeof input === "string" ? false : input.timeSubstantiationOnFile === true;
    if (typeof text !== "string" || text.length === 0) return [];
    const findings: Finding[] = [];
    let m: RegExpExecArray | null;
    TIME_CLAIM_PATTERN.lastIndex = 0;
    while ((m = TIME_CLAIM_PATTERN.exec(text)) !== null) {
      if (subOnFile) continue;
      findings.push(
        baseFinding(
          "MARSHALL.MARKETING.TIME_CLAIM_SUBSTANTIATION",
          "P1",
          `Finding: time claim "${m[0]}" without a substantiation file. Time-to-value claims must match observed median within +/-20%.`,
          "Prompt #138a §7.3",
          redactExcerpt(text, m.index, 80),
          {
            kind: "manual",
            summary: "Link a substantiation file (analytics query or aggregate stat) to the variant row, or revise the copy to remove the numeric time claim.",
          },
          ctx,
        ),
      );
    }
    return findings;
  },
  lastReviewed: LAST_REVIEWED,
};

// ─── #138a §7.3 — SCIENTIFIC_GROUNDING (P2) ──────────────────────────────────

const SCIENTIFIC_GROUNDING_PATTERN = /\b(?:grounded\s+in|backed\s+by|based\s+on|supported\s+by|rooted\s+in)\s+(?:published\s+)?(?:research|studies|literature|evidence|trials)\b/gi;

export const SCIENTIFIC_GROUNDING: Rule<MarketingCopyInput | string> = {
  id: "MARSHALL.MARKETING.SCIENTIFIC_GROUNDING",
  pillar: "MARKETING",
  severity: "P2",
  surfaces: ["marketing_copy", "marketing_page", "content_cms", "ai_output"],
  citation: "Prompt #138a §7.3",
  description:
    "Phrases like 'grounded in published research' require the substantiation file to list the specific publications.",
  evaluate: (input, ctx = defaultCtx()) => {
    const text = typeof input === "string" ? input : input.text;
    const subOnFile = typeof input === "string" ? false : input.scientificSubstantiationOnFile === true;
    if (typeof text !== "string" || text.length === 0) return [];
    const findings: Finding[] = [];
    let m: RegExpExecArray | null;
    SCIENTIFIC_GROUNDING_PATTERN.lastIndex = 0;
    while ((m = SCIENTIFIC_GROUNDING_PATTERN.exec(text)) !== null) {
      if (subOnFile) continue;
      findings.push(
        baseFinding(
          "MARSHALL.MARKETING.SCIENTIFIC_GROUNDING",
          "P2",
          `Finding: scientific-grounding phrase "${m[0]}" without a substantiation file listing specific publications.`,
          "Prompt #138a §7.3",
          redactExcerpt(text, m.index, 80),
          {
            kind: "manual",
            summary: "Link a substantiation file enumerating the publications that ground the claim, or soften the language.",
          },
          ctx,
        ),
      );
    }
    return findings;
  },
  lastReviewed: LAST_REVIEWED,
};

// ─── #138a §7.3 — OUTCOME_GUARANTEE (P0) ─────────────────────────────────────

const OUTCOME_GUARANTEE_PATTERNS: Array<[RegExp, string]> = [
  [/\b(?:we\s+)?guarantee(?:d|s)?\b/gi, "guarantee"],
  [/\byou\s+will\s+(?:see|get|feel|experience|achieve|notice|sleep|wake|lose|gain|improve)\b/gi, "you will <verb>"],
  [/\bguaranteed\s+to\s+\w+/gi, "guaranteed to <verb>"],
  [/\bpromis(?:e|ed|es)\s+(?:to\s+)?(?:improve|cure|treat|heal|reverse|eliminate)\b/gi, "promise to <verb>"],
  [/\bcures?\b/gi, "cure"],
  [/\bmiracle\b/gi, "miracle"],
  [/\bbreakthrough\b/gi, "breakthrough"],
  [/\brevolutionary\b/gi, "revolutionary"],
];

export const OUTCOME_GUARANTEE: Rule<MarketingCopyInput | string> = {
  id: "MARSHALL.MARKETING.OUTCOME_GUARANTEE",
  pillar: "MARKETING",
  severity: "P0",
  surfaces: ["marketing_copy", "marketing_page", "content_cms", "ai_output", "email", "sms"],
  citation: "Prompt #138a §7.3; FTC outcome-guarantee prohibition",
  description:
    "Marketing copy MUST NOT promise specific outcomes. May frame possibilities ('designed to') with appropriate disclosures.",
  evaluate: (input, ctx = defaultCtx()) => {
    const text = typeof input === "string" ? input : input.text;
    if (typeof text !== "string" || text.length === 0) return [];
    const findings: Finding[] = [];
    for (const [re, label] of OUTCOME_GUARANTEE_PATTERNS) {
      let m: RegExpExecArray | null;
      re.lastIndex = 0;
      while ((m = re.exec(text)) !== null) {
        findings.push(
          baseFinding(
            "MARSHALL.MARKETING.OUTCOME_GUARANTEE",
            "P0",
            `Finding: outcome-guarantee pattern "${m[0]}" (matches "${label}"). Marketing copy must not promise specific outcomes.`,
            "Prompt #138a §7.3",
            redactExcerpt(text, m.index, 80),
            {
              kind: "suggested",
              summary: `Reframe possibility-language: e.g., "designed to support" instead of "${label}".`,
            },
            ctx,
          ),
        );
      }
    }
    return findings;
  },
  lastReviewed: LAST_REVIEWED,
};

// ─── #138a §7.3 — COMPLIANCE_NAMING (P2) ─────────────────────────────────────

const COMPLIANCE_SYSTEM_PATTERN = /\b(?:Marshall\s+compliance\s+system|Marshall\s+system|Marshall\s+pre[\s-]?check)\b/gi;
const COMPLIANCE_ARCH_ANCHOR = /\b(?:Prompt\s+#?\s*119|architectural\s+commitment|compliance\s+architecture|engine\s+architecture)\b/i;

export const COMPLIANCE_NAMING: Rule<MarketingCopyInput | string> = {
  id: "MARSHALL.MARKETING.COMPLIANCE_NAMING",
  pillar: "MARKETING",
  severity: "P2",
  surfaces: ["marketing_copy", "marketing_page", "content_cms"],
  citation: "Prompt #138a §7.3",
  description:
    "Naming compliance systems (e.g., 'Marshall compliance system') in marketing copy is permitted only with reference to the architectural commitment in #119.",
  evaluate: (input, ctx = defaultCtx()) => {
    const text = typeof input === "string" ? input : input.text;
    if (typeof text !== "string" || text.length === 0) return [];
    const findings: Finding[] = [];
    if (COMPLIANCE_SYSTEM_PATTERN.test(text) && !COMPLIANCE_ARCH_ANCHOR.test(text)) {
      findings.push(
        baseFinding(
          "MARSHALL.MARKETING.COMPLIANCE_NAMING",
          "P2",
          "Finding: marketing copy names a compliance system without referencing the architectural commitment that backs the claim.",
          "Prompt #138a §7.3",
          redactExcerpt(text, 0, 200),
          {
            kind: "suggested",
            summary: "Either remove the compliance-system name or anchor the claim to the architectural commitment (Prompt #119).",
          },
          ctx,
        ),
      );
    }
    return findings;
  },
  lastReviewed: LAST_REVIEWED,
};

// ─── #138c §6/§7 — ENDORSER_CONSENT_REQUIRED (P0) ────────────────────────────

export const ENDORSER_CONSENT_REQUIRED: Rule<MarketingCopyInput | string> = {
  id: "MARSHALL.MARKETING.ENDORSER_CONSENT_REQUIRED",
  pillar: "MARKETING",
  severity: "P0",
  surfaces: ["marketing_copy", "marketing_page", "content_cms"],
  citation: "Prompt #138c §6.3; FTC 16 CFR 255",
  description:
    "Testimonials require a resolvable written-consent storage key plus material-connection disclosure rendered in-element with the testimonial.",
  evaluate: (input, ctx = defaultCtx()) => {
    if (typeof input === "string") {
      // Without consent metadata, we can't evaluate. Skip rather than block.
      return [];
    }
    if (input.contentKind !== "testimonial") return [];
    const meta = input.endorserConsentMeta;
    const findings: Finding[] = [];
    if (!meta || !meta.consentKeyResolved) {
      findings.push(
        baseFinding(
          "MARSHALL.MARKETING.ENDORSER_CONSENT_REQUIRED",
          "P0",
          "Finding: testimonial copy lacks a resolvable written-consent storage key. FTC 16 CFR 255 requires written consent on file before any endorsement renders.",
          "Prompt #138c §6.3; FTC 16 CFR 255",
          redactExcerpt(input.text, 0, 200),
          {
            kind: "manual",
            summary: "Capture endorser written consent, store the signed document in Supabase Storage, link the storage key on the testimonial row, and re-evaluate.",
          },
          ctx,
        ),
      );
    }
    if (meta && meta.consentKeyResolved && !meta.materialConnectionDisclosed) {
      findings.push(
        baseFinding(
          "MARSHALL.MARKETING.ENDORSER_CONSENT_REQUIRED",
          "P0",
          "Finding: testimonial has consent on file but material-connection disclosure is missing. Disclosure must render in the same visual element as the testimonial body.",
          "Prompt #138c §6.3; FTC 16 CFR 255",
          redactExcerpt(input.text, 0, 200),
          {
            kind: "manual",
            summary: "Add material-connection disclosure rendered at body weight in the same visual element as the testimonial; do not place in footnote.",
          },
          ctx,
        ),
      );
    }
    return findings;
  },
  lastReviewed: LAST_REVIEWED,
};

// ─── #138c §4.1 — REGULATORY_FRAMEWORK_NAMING (P1) ───────────────────────────

const REGULATORY_OVERCLAIMS: Array<[RegExp, string, string]> = [
  [/\bFDA[\s-]+approved?\b/gi, "FDA approved", "Supplements and peptides cannot be FDA-approved; this is an overclaim with immediate regulatory risk."],
  [/\bclinically\s+proven\b/gi, "clinically proven", "Overclaims research substantiation; FTC red flag."],
  [/\bcertified\b(?!\s+by\s+[A-Z])/g, "certified (without certifying body)", "Without a named certifying body, 'certified' is empty; with a named body, commits to an audit relationship that must exist."],
  [/\bdoctor[\s-]+recommended\b/gi, "doctor-recommended", "Triggers a narrower FTC standard than 'medically directed' and is harder to substantiate at the platform level."],
];

export const REGULATORY_FRAMEWORK_NAMING: Rule<MarketingCopyInput | string> = {
  id: "MARSHALL.MARKETING.REGULATORY_FRAMEWORK_NAMING",
  pillar: "MARKETING",
  severity: "P1",
  surfaces: ["marketing_copy", "marketing_page", "content_cms", "ai_output", "email", "sms"],
  citation: "Prompt #138c §4.1",
  description:
    "Naming regulatory frameworks must avoid overclaims like 'FDA approved', 'clinically proven', 'certified' without body, or 'doctor-recommended'.",
  evaluate: (input, ctx = defaultCtx()) => {
    const text = typeof input === "string" ? input : input.text;
    if (typeof text !== "string" || text.length === 0) return [];
    const findings: Finding[] = [];
    for (const [re, label, why] of REGULATORY_OVERCLAIMS) {
      let m: RegExpExecArray | null;
      re.lastIndex = 0;
      while ((m = re.exec(text)) !== null) {
        findings.push(
          baseFinding(
            "MARSHALL.MARKETING.REGULATORY_FRAMEWORK_NAMING",
            "P1",
            `Finding: regulatory overclaim "${m[0]}" matches "${label}". ${why}`,
            "Prompt #138c §4.1",
            redactExcerpt(text, m.index, 80),
            {
              kind: "suggested",
              summary: `Replace with permitted framing per #138c §4.1: "medically directed", "built against FTC Endorsement Guide standards", "DSHEA supplement-label conventions", "HIPAA Security Rule safeguards".`,
            },
            ctx,
          ),
        );
      }
    }
    return findings;
  },
  lastReviewed: LAST_REVIEWED,
};

// ─── #138d §6.3 — COMPOSITE_DISCLOSURE (P0) ──────────────────────────────────

export const COMPOSITE_DISCLOSURE: Rule<MarketingCopyInput> = {
  id: "MARSHALL.MARKETING.COMPOSITE_DISCLOSURE",
  pillar: "MARKETING",
  severity: "P0",
  surfaces: ["marketing_copy"],
  citation: "Prompt #138d §6.3; FTC illustrative-content guidance",
  description:
    "Composite case-study content MUST carry an illustrative disclosure using clear language ('composite' or equivalent), rendered in-element (not footnote), at both opening and closing of the case study.",
  evaluate: (input, ctx = defaultCtx()) => {
    if (input.contentKind !== "case_study") return [];
    const meta = input.compositeDisclosureMeta;
    const findings: Finding[] = [];
    if (!meta) {
      findings.push(
        baseFinding(
          "MARSHALL.MARKETING.COMPOSITE_DISCLOSURE",
          "P0",
          "Finding: case_study content lacks composite-disclosure metadata. Cannot verify §6.3 compliance.",
          "Prompt #138d §6.3",
          redactExcerpt(input.text, 0, 200),
          {
            kind: "manual",
            summary: "Attach compositeDisclosureMeta with hasOpeningDisclosure, hasClosingDisclosure, rendersAsFootnote and re-evaluate.",
          },
          ctx,
        ),
      );
      return findings;
    }
    if (!meta.hasOpeningDisclosure) {
      findings.push(
        baseFinding(
          "MARSHALL.MARKETING.COMPOSITE_DISCLOSURE",
          "P0",
          "Finding: case-study composite disclosure missing at opening. Disclosure must lead the section, not trail it.",
          "Prompt #138d §6.3",
          redactExcerpt(input.text, 0, 200),
          {
            kind: "manual",
            summary: "Add an opening disclosure block using the word 'composite' (or equivalent clear language) before any persona narrative.",
          },
          ctx,
        ),
      );
    }
    if (!meta.hasClosingDisclosure) {
      findings.push(
        baseFinding(
          "MARSHALL.MARKETING.COMPOSITE_DISCLOSURE",
          "P0",
          "Finding: case-study composite disclosure missing at closing. Repeated disclosure is required adjacent to the hand-off CTA.",
          "Prompt #138d §6.3",
          redactExcerpt(input.text, Math.max(0, input.text.length - 200), 100),
          {
            kind: "manual",
            summary: "Add a closing disclosure block adjacent to the CTA reinforcing that the persona is composite.",
          },
          ctx,
        ),
      );
    }
    if (meta.rendersAsFootnote) {
      findings.push(
        baseFinding(
          "MARSHALL.MARKETING.COMPOSITE_DISCLOSURE",
          "P0",
          "Finding: composite disclosure renders as a footnote. Disclosure must render in the same visual element as the narrative at body weight.",
          "Prompt #138d §6.3",
          redactExcerpt(input.text, 0, 200),
          {
            kind: "manual",
            summary: "Promote the disclosure out of the footnote treatment into the section's body element with body-weight typography.",
          },
          ctx,
        ),
      );
    }
    return findings;
  },
  lastReviewed: LAST_REVIEWED,
};

// ─── #138d §6.3 — INTERVENTION_SPECIFICITY (P0) ──────────────────────────────

/**
 * Seed corpus of peptide names that must NOT appear in case-study marketing
 * copy. Marketing/Marshall maintain this list as the FarmCeutica catalog grows.
 * The 29-catalog roster lives in the brand dictionary; this list is the
 * commonly-recognized public-name superset that case-study copy must avoid.
 */
const FORBIDDEN_PEPTIDE_NAMES: readonly string[] = [
  "BPC-157",
  "BPC157",
  "TB-500",
  "TB500",
  "GHK-Cu",
  "GHK Cu",
  "Retatrutide",
  "Tirzepatide",
  "Semaglutide",
  "SLU-PP-332",
  "Ipamorelin",
  "Sermorelin",
  "CJC-1295",
  "CJC1295",
  "Epitalon",
  "Epithalon",
  "Selank",
  "Semax",
  "DSIP",
  "Thymosin",
  "PT-141",
  "Bremelanotide",
  "Melanotan",
  "MOTS-c",
  "MOTSc",
  "GLP-1",
  "Hexarelin",
  "AOD-9604",
  "AOD9604",
  "Bromantane",
  "Cerebrolysin",
];

/**
 * Forbidden SKU prefix patterns. Catalog SKUs follow these prefixes per
 * brand.ts FARMCEUTICA_ONLY_PRODUCTS. Marketing case-study copy must not
 * surface raw SKU codes.
 */
const FORBIDDEN_SKU_PATTERN = /\b(?:FARM|FC|VIA|PEP|LIP|RET|TIRZ|BPC|TB|CJC|IPA|HEL|FRM|SPR)-[A-Z0-9]+\b/gi;

/** Dose patterns: numeric quantity + unit, or frequency phrases, or route. */
const FORBIDDEN_DOSE_PATTERNS: Array<[RegExp, string]> = [
  [/\b\d+\s*(?:mg|mcg|µg|ug|iu|ml|g)\b/gi, "numeric dose (e.g., 800mcg)"],
  [/\b(?:once|twice|thrice|three\s+times|four\s+times)\s+(?:a\s+)?(?:daily|weekly|monthly|day|week|month)\b/gi, "frequency phrase"],
  [/\b(?:sublingual|intranasal|injectable|subcutaneous|intramuscular|nasal\s+spray|liposomal)\b/gi, "delivery route or form"],
];

export const INTERVENTION_SPECIFICITY: Rule<MarketingCopyInput> = {
  id: "MARSHALL.MARKETING.INTERVENTION_SPECIFICITY",
  pillar: "MARKETING",
  severity: "P0",
  surfaces: ["marketing_copy"],
  citation: "Prompt #138d §3.2 + §6.3",
  description:
    "Composite case-study content MUST NOT name specific peptides, supplement SKUs, dosages, or administration routes. Category-level language only.",
  evaluate: (input, ctx = defaultCtx()) => {
    if (input.contentKind !== "case_study") return [];
    const text = input.text;
    if (typeof text !== "string" || text.length === 0) return [];
    const findings: Finding[] = [];

    for (const name of FORBIDDEN_PEPTIDE_NAMES) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`\\b${escaped}\\b`, "gi");
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        findings.push(
          baseFinding(
            "MARSHALL.MARKETING.INTERVENTION_SPECIFICITY",
            "P0",
            `Finding: case-study copy names specific peptide "${m[0]}". Per #138d §3.2 only category-level language is permitted (e.g., "methylation-pathway support").`,
            "Prompt #138d §3.2",
            redactExcerpt(text, m.index, 80),
            {
              kind: "manual",
              summary: `Replace "${m[0]}" with a categorical descriptor; specific peptide naming is reserved for dose-specific case studies that require separate peptide-marketing legal scoping.`,
            },
            ctx,
          ),
        );
      }
    }

    let m: RegExpExecArray | null;
    FORBIDDEN_SKU_PATTERN.lastIndex = 0;
    while ((m = FORBIDDEN_SKU_PATTERN.exec(text)) !== null) {
      findings.push(
        baseFinding(
          "MARSHALL.MARKETING.INTERVENTION_SPECIFICITY",
          "P0",
          `Finding: case-study copy contains SKU code "${m[0]}". SKU naming is forbidden in case-study scope.`,
          "Prompt #138d §3.2",
          redactExcerpt(text, m.index, 80),
          {
            kind: "manual",
            summary: "Remove SKU codes; use category-level language only.",
          },
          ctx,
        ),
      );
    }

    for (const [re, label] of FORBIDDEN_DOSE_PATTERNS) {
      re.lastIndex = 0;
      let dm: RegExpExecArray | null;
      while ((dm = re.exec(text)) !== null) {
        findings.push(
          baseFinding(
            "MARSHALL.MARKETING.INTERVENTION_SPECIFICITY",
            "P0",
            `Finding: case-study copy contains ${label} ("${dm[0]}"). Dosages, frequencies, and routes are forbidden in case-study scope per #138d §3.2.`,
            "Prompt #138d §3.2",
            redactExcerpt(text, dm.index, 80),
            {
              kind: "manual",
              summary: "Remove dose, frequency, and route language; use categorical terms (e.g., 'methylation-pathway support', 'sleep architecture optimization').",
            },
            ctx,
          ),
        );
      }
    }

    return findings;
  },
  lastReviewed: LAST_REVIEWED,
};

// ─── #138e §6.3 — SCORE_AS_TRACKING_NOT_OUTCOME (P0) ─────────────────────────

// Detects forbidden Score-as-outcome framings:
//   - Specific Score values: "Score of 82", "reaches a Score of"
//   - Score change rates: "Score rise 12 points", "Score increased by"
//   - Cohort-segmented Score claims: "Tier 2 users see their Score rise faster"
//   - Comparison-to-baseline Score framing: "Score X% higher than"
// Permitted: Score as a tracking mechanism without numerical/comparative claim.
const SCORE_OUTCOME_VIOLATIONS: Array<[RegExp, string]> = [
  [/\bScore\s+(?:of|reaches?|hit)\s*\d/gi, "specific Score value"],
  [/\bScore\s+(?:rises?|rise[ds]?|increases?|increased|gains?|jumps?|grows?|climbs?)\s+(?:by|to)?\s*\d/gi, "Score change rate with number"],
  [/(?:users?|patients?|customers?|members?)\s+see\s+(?:their\s+)?Score\s+(?:rise|increase|grow|jump|climb)/gi, "user-cohort Score claim"],
  [/\bTier\s+\d.{0,40}Score/gi, "Tier-segmented Score claim"],
  [/Score\s+\d+\s*(?:%|percent|points?)/gi, "Score quantified outcome"],
  [/(?:by\s+day\s+\d+).{0,40}Score|Score.{0,40}by\s+day\s+\d+/gi, "Score-by-day claim"],
];

export const SCORE_AS_TRACKING_NOT_OUTCOME: Rule<MarketingCopyInput | string> = {
  id: "MARSHALL.MARKETING.SCORE_AS_TRACKING_NOT_OUTCOME",
  pillar: "MARKETING",
  severity: "P0",
  surfaces: ["marketing_copy", "marketing_page", "content_cms", "ai_output"],
  citation: "Prompt #138e §6.3",
  description:
    "Bio Optimization Score may be referenced as a tracking mechanism but MUST NOT be cited as a marketing-claimed outcome metric. Specific values, change rates, cohort claims, and comparison framing are P0; Score-as-outcome surfacing is reserved for #138e-b once the aggregate outcomes pipeline is verified live.",
  evaluate: (input, ctx = defaultCtx()) => {
    const text = typeof input === "string" ? input : input.text;
    if (typeof text !== "string" || text.length === 0) return [];
    const findings: Finding[] = [];
    for (const [re, label] of SCORE_OUTCOME_VIOLATIONS) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        findings.push(
          baseFinding(
            "MARSHALL.MARKETING.SCORE_AS_TRACKING_NOT_OUTCOME",
            "P0",
            `Finding: copy contains "${m[0]}" matching "${label}". Score-as-outcome surfacing is reserved for #138e-b; the present prompt allows the Score only as a tracking mechanism (e.g., "your Score reflects your trajectory").`,
            "Prompt #138e §6.3",
            redactExcerpt(text, m.index, 120),
            {
              kind: "manual",
              summary:
                "Reframe to tracking-mechanism language: the Score evolves as the visitor does, captures inputs, reflects trajectory. Drop specific values, change rates, cohort comparisons, and day-anchored Score claims.",
            },
            ctx,
          ),
        );
      }
    }
    return findings;
  },
  lastReviewed: LAST_REVIEWED,
};

// ─── #138e §6.3 — OUTCOME_TIMELINE_QUALIFIER_REQUIRED (P0) ───────────────────

export const OUTCOME_TIMELINE_QUALIFIER_REQUIRED: Rule<MarketingCopyInput> = {
  id: "MARSHALL.MARKETING.OUTCOME_TIMELINE_QUALIFIER_REQUIRED",
  pillar: "MARKETING",
  severity: "P0",
  surfaces: ["marketing_copy"],
  citation: "Prompt #138e §6.3",
  description:
    "30/60/90-style outcome-timeline content MUST be adjacent to a qualifier block acknowledging individual variance. The qualifier MUST render in-element with the timeline, not as a footnote.",
  evaluate: (input, ctx = defaultCtx()) => {
    if (input.contentKind !== "outcome_timeline") return [];
    const meta = input.outcomeTimelineMeta;
    const findings: Finding[] = [];
    if (!meta || !meta.hasAdjacentQualifier) {
      findings.push(
        baseFinding(
          "MARSHALL.MARKETING.OUTCOME_TIMELINE_QUALIFIER_REQUIRED",
          "P0",
          "Finding: outcome-timeline copy is rendered without an adjacent qualifier block. Categorical timeline content requires an in-element qualifier acknowledging individual variance per #138e §3.7.",
          "Prompt #138e §6.3",
          redactExcerpt(input.text, 0, 200),
          {
            kind: "manual",
            summary:
              "Render the qualifier block adjacent to the phase cards on every viewport size. Required language pattern: \"Not everyone experiences the same pattern, and some categories shift faster than others depending on individual biology.\"",
          },
          ctx,
        ),
      );
    } else if (meta.qualifierIsFootnote) {
      findings.push(
        baseFinding(
          "MARSHALL.MARKETING.OUTCOME_TIMELINE_QUALIFIER_REQUIRED",
          "P0",
          "Finding: outcome-timeline qualifier is rendered as a footnote. The qualifier must render in-element at body weight, not below the timeline as fine print.",
          "Prompt #138e §6.3",
          redactExcerpt(input.text, 0, 200),
          {
            kind: "manual",
            summary:
              "Move the qualifier into the same visual element family as the phase cards. No size reduction, no opacity reduction, no footnote treatment.",
          },
          ctx,
        ),
      );
    }
    return findings;
  },
  lastReviewed: LAST_REVIEWED,
};

// ─── Aggregate export ────────────────────────────────────────────────────────

export const marketingRules: Rule[] = [
  NAMED_PERSON_CONNECTION,
  TIME_CLAIM_SUBSTANTIATION,
  SCIENTIFIC_GROUNDING,
  OUTCOME_GUARANTEE,
  COMPLIANCE_NAMING,
  ENDORSER_CONSENT_REQUIRED,
  REGULATORY_FRAMEWORK_NAMING,
  COMPOSITE_DISCLOSURE,
  INTERVENTION_SPECIFICITY,
  SCORE_AS_TRACKING_NOT_OUTCOME,
  OUTCOME_TIMELINE_QUALIFIER_REQUIRED,
];
