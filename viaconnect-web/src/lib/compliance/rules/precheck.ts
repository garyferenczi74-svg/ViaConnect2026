/**
 * MARSHALL.PRECHECK.* — proactive-only coaching rules (Prompt #121).
 *
 * These rules fire when a practitioner asks Marshall to scan a draft BEFORE
 * publishing. They are in addition to the reused claims / peptide / brand /
 * comms / social rules, which also gain 'precheck_draft' in their surfaces
 * array via the migration.
 *
 * Pre-check tone is cooperative: confidence thresholds are tighter (see
 * gate logic in lib/marshall/precheck/evaluate.ts) and auto-fix is
 * aggressive. False-positive cost here is "practitioner reads one extra
 * suggestion" — acceptable.
 */

import type { EvaluationContext, Finding, Rule } from "../engine/types";
import { generateFindingId, redactExcerpt } from "../engine/types";
import { hasDisclosure, mentionsFarmceuticaBrand } from "../dictionaries/disclosure_markers";

const LAST_REVIEWED = "2026-04-23";

export interface PrecheckDraft {
  text: string;
  author?: { practitionerId?: string | null; audienceUnder18Pct?: number };
  productMatches?: Array<{ sku: string; confidence: number }>;
  targetPlatform?: string;
}

function f(
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

function defaultCtx(): EvaluationContext {
  return { surface: "precheck_draft", source: "runtime", now: new Date() };
}

// -----------------------------------------------------------------------------
// 1. SEMANTIC_DISEASE_IMPLIED (P2)
// Draft uses symptom-resolution language adjacent to a product reference.
// Example trip: "finally woke up pain-free every morning" next to product name.
// -----------------------------------------------------------------------------
const IMPLIED_DISEASE_PATTERNS: RegExp[] = [
  /\b(?:woke up|waking up)\s+(?:pain[-\s]?free|anxiety[-\s]?free|symptom[-\s]?free)\b/i,
  /\bfinally\s+(?:off|stopped|quit)\s+(?:the|my)\s+(?:medication|meds|pills|prescription)/i,
  /\b(?:don'?t|no longer)\s+need\s+(?:my|the)\s+(?:inhaler|insulin|medication)/i,
  /\b(?:reversed|reversing)\s+(?:my|the)\s+(?:diagnosis|condition|issue)/i,
  /\b(?:back to normal|cured overnight|life[-\s]?changing results)\b/i,
];

export const SEMANTIC_DISEASE_IMPLIED: Rule<PrecheckDraft | string> = {
  id: "MARSHALL.PRECHECK.SEMANTIC_DISEASE_IMPLIED",
  pillar: "CLAIMS",
  severity: "P2",
  surfaces: ["precheck_draft"],
  citation: "21 CFR 101.93 adjacent + FTC substantiation guidance",
  description: "Draft implies a disease-class claim without explicitly naming one.",
  evaluate: (input, ctx = defaultCtx()) => {
    const draft: PrecheckDraft = typeof input === "string" ? { text: input } : input;
    const text = draft.text ?? "";
    if (!text) return [];
    const hasProduct = (draft.productMatches?.length ?? 0) > 0 || mentionsFarmceuticaBrand(text);
    if (!hasProduct) return [];
    const hits: Finding[] = [];
    for (const re of IMPLIED_DISEASE_PATTERNS) {
      const m = re.exec(text);
      if (m) {
        hits.push(
          f(
            "MARSHALL.PRECHECK.SEMANTIC_DISEASE_IMPLIED",
            "P2",
            `Coaching: the phrase "${m[0]}" reads as an implied disease outcome adjacent to a product reference. Soften to structure and function language before publishing.`,
            "21 CFR 101.93 adjacent",
            redactExcerpt(text, m.index, 100),
            {
              kind: "suggested",
              summary: "Rephrase with structure/function language: supports, promotes, helps maintain. Avoid resolution or reversal framing.",
            },
            ctx,
          ),
        );
      }
    }
    return hits;
  },
  lastReviewed: LAST_REVIEWED,
};

// -----------------------------------------------------------------------------
// 2. SUPERLATIVE_OVERUSE (P3)
// -----------------------------------------------------------------------------
const SUPERLATIVE_WORDS = [
  "best", "greatest", "strongest", "most powerful", "most effective",
  "unmatched", "unrivaled", "world-class", "revolutionary", "game-changing",
  "guaranteed", "miracle", "breakthrough", "unparalleled", "ultimate",
];

export const SUPERLATIVE_OVERUSE: Rule<PrecheckDraft | string> = {
  id: "MARSHALL.PRECHECK.SUPERLATIVE_OVERUSE",
  pillar: "CLAIMS",
  severity: "P3",
  surfaces: ["precheck_draft"],
  citation: "FTC substantiation guidance",
  description: "Dense superlative usage without substantiation.",
  evaluate: (input, ctx = defaultCtx()) => {
    const draft: PrecheckDraft = typeof input === "string" ? { text: input } : input;
    const text = (draft.text ?? "").toLowerCase();
    if (!text) return [];
    let count = 0;
    for (const w of SUPERLATIVE_WORDS) {
      const re = new RegExp(`\\b${w.replace(/[-\s]/g, "[-\\s]?")}\\b`, "gi");
      const matches = text.match(re);
      if (matches) count += matches.length;
    }
    if (count < 2) return [];
    return [
      f(
        "MARSHALL.PRECHECK.SUPERLATIVE_OVERUSE",
        "P3",
        `Coaching: ${count} superlative phrases detected. Each one implies a comparative claim that requires substantiation.`,
        "FTC substantiation guidance",
        redactExcerpt(draft.text ?? "", 0, 160),
        { kind: "suggested", summary: "Replace with specific, defensible descriptors; limit to one superlative maximum per post." },
        ctx,
      ),
    ];
  },
  lastReviewed: LAST_REVIEWED,
};

// -----------------------------------------------------------------------------
// 3. AMBIGUOUS_ENDORSEMENT (P2)
// Has a hashtag disclosure but also uses implied-relationship wording.
// -----------------------------------------------------------------------------
export const AMBIGUOUS_ENDORSEMENT: Rule<PrecheckDraft | string> = {
  id: "MARSHALL.PRECHECK.AMBIGUOUS_ENDORSEMENT",
  pillar: "COMMS",
  severity: "P2",
  surfaces: ["precheck_draft"],
  citation: "16 CFR Part 255 (FTC Endorsement Guides)",
  description: "Endorsement where the material connection is implied but not clearly stated.",
  evaluate: (input, ctx = defaultCtx()) => {
    const draft: PrecheckDraft = typeof input === "string" ? { text: input } : input;
    const text = draft.text ?? "";
    if (!text) return [];
    const mentionsProduct = (draft.productMatches?.length ?? 0) > 0 || mentionsFarmceuticaBrand(text);
    if (!mentionsProduct) return [];
    // Trigger: hashtag present but plain-English role not.
    const onlyHashtag = /\#(ad|sponsored|partner|paidpartnership)\b/i.test(text);
    const plainEnglish =
      /\b(i am a (?:certified )?practitioner|i work with|paid partnership|compensated|i received)\b/i.test(text);
    if (!onlyHashtag || plainEnglish) return [];
    return [
      f(
        "MARSHALL.PRECHECK.AMBIGUOUS_ENDORSEMENT",
        "P2",
        "Coaching: your hashtag disclosure is present, but a plain-English role statement is recommended for audiences that may miss the tag. Consider adding 'I am a FarmCeutica certified practitioner' or equivalent.",
        "16 CFR Part 255",
        redactExcerpt(text, 0, 160),
        { kind: "suggested", summary: "Add a one-line plain-English role statement in addition to the hashtag." },
        ctx,
      ),
    ];
  },
  lastReviewed: LAST_REVIEWED,
};

// -----------------------------------------------------------------------------
// 4. AUDIENCE_MISMATCH_RISK (P2)
// Peptide content when the author's audience skews under 18.
// -----------------------------------------------------------------------------
export const AUDIENCE_MISMATCH_RISK: Rule<PrecheckDraft> = {
  id: "MARSHALL.PRECHECK.AUDIENCE_MISMATCH_RISK",
  pillar: "PEPTIDE",
  severity: "P2",
  surfaces: ["precheck_draft"],
  citation: "Internal policy 2025-09-01; COPPA adjacent",
  description: "Peptide content from an account whose registered audience skews under 18.",
  evaluate: (input, ctx = defaultCtx()) => {
    const draft = input ?? ({} as PrecheckDraft);
    const text = draft.text ?? "";
    const peptideMention = /\b(retatrutide|tirzepatide|bpc[-\s]?157|tb[-\s]?500|cjc[-\s]?1295|ipamorelin|sermorelin|tesamorelin|pt[-\s]?141)\b/i.test(text);
    if (!peptideMention) return [];
    const pct = draft.author?.audienceUnder18Pct ?? 0;
    if (pct < 0.15) return [];
    return [
      f(
        "MARSHALL.PRECHECK.AUDIENCE_MISMATCH_RISK",
        "P2",
        `Coaching: this draft mentions a peptide, and your registered audience analytics show ~${Math.round(pct * 100)}% under-18 reach. Consider restricting this post or tightening age-screening.`,
        "Internal policy 2025-09-01",
        redactExcerpt(text, 0, 160),
        { kind: "manual", summary: "Restrict post, add age gate, or post to a different channel with adult-skewed audience." },
        ctx,
      ),
    ];
  },
  lastReviewed: LAST_REVIEWED,
};

// -----------------------------------------------------------------------------
// 5. BIO_OPTIMIZATION_COACHING (P3)
// Pre-publication soft catch for Vitality Score / Wellness Score phrasing.
// -----------------------------------------------------------------------------
export const BIO_OPTIMIZATION_COACHING: Rule<PrecheckDraft | string> = {
  id: "MARSHALL.PRECHECK.BIO_OPTIMIZATION_COACHING",
  pillar: "BRAND",
  severity: "P3",
  surfaces: ["precheck_draft"],
  citation: "ViaConnect Standing Rule Section 0.1",
  description: "Coaching: older Vitality Score / Wellness Score phrasing before it publishes.",
  evaluate: (input, ctx = defaultCtx()) => {
    const text = typeof input === "string" ? input : (input?.text ?? "");
    const patterns = [/\bvitality\s+(?:score|index)\b/i, /\bwellness\s+score\b/i];
    const hits: Finding[] = [];
    for (const re of patterns) {
      const m = re.exec(text);
      if (m) {
        hits.push(
          f(
            "MARSHALL.PRECHECK.BIO_OPTIMIZATION_COACHING",
            "P3",
            `Coaching: "${m[0]}" is the older phrasing. Swap to "Bio Optimization" before publishing; the reactive rule flags this at P0 after publication.`,
            "ViaConnect Standing Rule Section 0.1",
            redactExcerpt(text, m.index, 80),
            { kind: "auto", summary: `Replace "${m[0]}" with "Bio Optimization".`, action: `REPLACE:${m[0]}:Bio Optimization` },
            ctx,
          ),
        );
      }
    }
    return hits;
  },
  autoRemediate: async (input) => {
    if (typeof input === "string") {
      return input
        .replace(/\bvitality\s+(?:score|index)\b/gi, "Bio Optimization")
        .replace(/\bwellness\s+score\b/gi, "Bio Optimization");
    }
    return {
      ...input,
      text: (input?.text ?? "")
        .replace(/\bvitality\s+(?:score|index)\b/gi, "Bio Optimization")
        .replace(/\bwellness\s+score\b/gi, "Bio Optimization"),
    };
  },
  lastReviewed: LAST_REVIEWED,
};

// -----------------------------------------------------------------------------
// 6. BIOAVAILABILITY_COACHING (P3)
// -----------------------------------------------------------------------------
export const BIOAVAILABILITY_COACHING: Rule<PrecheckDraft | string> = {
  id: "MARSHALL.PRECHECK.BIOAVAILABILITY_COACHING",
  pillar: "BRAND",
  severity: "P3",
  surfaces: ["precheck_draft"],
  citation: "ViaConnect Standing Rule Section 0.2",
  description: "Coaching: bioavailability range 10 to 28 times is canonical.",
  evaluate: (input, ctx = defaultCtx()) => {
    const text = typeof input === "string" ? input : (input?.text ?? "");
    const re = /(\d{1,3})\s*(?:to|[-–—])\s*(\d{1,3})\s*[×x]?\s*(?:more\s+)?(?:bioavailab(?:le|ility))/gi;
    const hits: Finding[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const low = Number(m[1]);
      const high = Number(m[2]);
      if (!(low === 10 && high === 28)) {
        hits.push(
          f(
            "MARSHALL.PRECHECK.BIOAVAILABILITY_COACHING",
            "P3",
            `Coaching: bioavailability range "${low} to ${high}" is not canonical. Use 10 to 28 times before publishing.`,
            "ViaConnect Standing Rule Section 0.2",
            redactExcerpt(text, m.index, 80),
            { kind: "auto", summary: "Normalize to 10 to 28 times bioavailability.", action: "REPLACE_RANGE:10-28" },
            ctx,
          ),
        );
      }
    }
    return hits;
  },
  lastReviewed: LAST_REVIEWED,
};

// -----------------------------------------------------------------------------
// 7. MISSING_DSHEA_FOOTER (P2)
// -----------------------------------------------------------------------------
export const MISSING_DSHEA_FOOTER: Rule<PrecheckDraft | string> = {
  id: "MARSHALL.PRECHECK.MISSING_DSHEA_FOOTER",
  pillar: "CLAIMS",
  severity: "P2",
  surfaces: ["precheck_draft"],
  citation: "DSHEA 1994, 21 USC 343(r)(6)",
  description: "Draft omits the DSHEA structure/function disclaimer.",
  evaluate: (input, ctx = defaultCtx()) => {
    const text = typeof input === "string" ? input : (input?.text ?? "");
    if (!text) return [];
    const hasDsheaFooter =
      /not\s+intended\s+to\s+diagnose/i.test(text) ||
      /statements?\s+have\s+not\s+been\s+evaluated/i.test(text);
    if (hasDsheaFooter) return [];
    // Only nag when there's a product reference — no false positives on
    // generic posts.
    const hasProductSignal = mentionsFarmceuticaBrand(text) ||
      /\bsupplement\b/i.test(text) || /\bprotocol\b/i.test(text);
    if (!hasProductSignal) return [];
    return [
      f(
        "MARSHALL.PRECHECK.MISSING_DSHEA_FOOTER",
        "P2",
        "Coaching: supplement-adjacent draft is missing the DSHEA disclaimer. Auto-fix will append the canonical structure/function footer.",
        "DSHEA 1994",
        redactExcerpt(text, 0, 160),
        {
          kind: "auto",
          summary: "Append the DSHEA footer.",
          action: "APPEND_DSHEA",
          autoPatch:
            "\n\nThese statements have not been evaluated by the FDA. This product is not intended to diagnose, treat, cure, or prevent any disease.",
        },
        ctx,
      ),
    ];
  },
  autoRemediate: async (input) => {
    const footer =
      "\n\nThese statements have not been evaluated by the FDA. This product is not intended to diagnose, treat, cure, or prevent any disease.";
    if (typeof input === "string") {
      return /not\s+intended\s+to\s+diagnose/i.test(input) ? input : input + footer;
    }
    const text = input?.text ?? "";
    return { ...input, text: /not\s+intended\s+to\s+diagnose/i.test(text) ? text : text + footer };
  },
  lastReviewed: LAST_REVIEWED,
};

// -----------------------------------------------------------------------------
// 8. SHARING_PROTOCOL_REMINDER (ADVISORY)
// -----------------------------------------------------------------------------
export const SHARING_PROTOCOL_REMINDER: Rule<PrecheckDraft | string> = {
  id: "MARSHALL.PRECHECK.SHARING_PROTOCOL_REMINDER",
  pillar: "PEPTIDE",
  severity: "ADVISORY",
  surfaces: ["precheck_draft"],
  citation: "Internal peptide sharing protocol",
  description: "Reminder: peptide references should include canonical sharing protocol language.",
  evaluate: (input, ctx = defaultCtx()) => {
    const text = typeof input === "string" ? input : (input?.text ?? "");
    if (!text) return [];
    const hasPeptide = /\b(retatrutide|tirzepatide|bpc[-\s]?157|tb[-\s]?500|cjc[-\s]?1295|ipamorelin|sermorelin|tesamorelin|pt[-\s]?141)\b/i.test(text);
    if (!hasPeptide) return [];
    if (/sharing protocol|practitioner guidance|speak with your provider/i.test(text)) return [];
    return [
      f(
        "MARSHALL.PRECHECK.SHARING_PROTOCOL_REMINDER",
        "ADVISORY",
        "Reminder: peptide posts generally benefit from the canonical sharing protocol language so your audience knows to consult their practitioner before use.",
        "Internal peptide sharing protocol",
        redactExcerpt(text, 0, 160),
        { kind: "suggested", summary: "Add a line such as: 'As always, work with your practitioner before starting any peptide protocol.'" },
        ctx,
      ),
    ];
  },
  lastReviewed: LAST_REVIEWED,
};

// -----------------------------------------------------------------------------
// 9. Audit-side aggregator: CLEARANCE_DRIFT_PATTERN
// Not a draft-scan rule, but a pattern rule the aggregator.ts module
// invokes when counting bad-faith events. Lives here for registry proximity.
// -----------------------------------------------------------------------------
export const CLEARANCE_DRIFT_PATTERN: Rule<{ practitionerId: string; badFaithCount60d: number }> = {
  id: "MARSHALL.PRECHECK.CLEARANCE_DRIFT_PATTERN",
  pillar: "AUDIT",
  severity: "P1",
  surfaces: ["source_code"],
  citation: "Internal compliance trend rule",
  description: "Aggregator: 3+ bad-faith clearance events within 60 days per practitioner.",
  evaluate: (input, ctx = defaultCtx()) => {
    if ((input?.badFaithCount60d ?? 0) < 3) return [];
    return [
      f(
        "MARSHALL.PRECHECK.CLEARANCE_DRIFT_PATTERN",
        "P1",
        `Finding: practitioner ${input.practitionerId} accumulated ${input.badFaithCount60d} bad-faith clearance events within 60 days. Route to Steve Rica for pattern review.`,
        "Internal compliance trend rule",
        input.practitionerId,
        { kind: "manual", summary: "Steve Rica evaluates whether practitioner receipts should be suspended pending education or agreement review.", action: "ESCALATE_TO_STEVE" },
        ctx,
      ),
    ];
  },
  lastReviewed: LAST_REVIEWED,
};

export const precheckRules: Rule[] = [
  SEMANTIC_DISEASE_IMPLIED,
  SUPERLATIVE_OVERUSE,
  AMBIGUOUS_ENDORSEMENT,
  AUDIENCE_MISMATCH_RISK,
  BIO_OPTIMIZATION_COACHING,
  BIOAVAILABILITY_COACHING,
  MISSING_DSHEA_FOOTER,
  SHARING_PROTOCOL_REMINDER,
  CLEARANCE_DRIFT_PATTERN,
];
