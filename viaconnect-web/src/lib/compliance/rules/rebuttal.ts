/**
 * Rebuttal-draft self-check rules (Prompt #123 §15.1).
 *
 * Marshall runs its own rule engine against every drafted rebuttal so a
 * defense of (e.g.) a disease-claim finding cannot itself contain
 * disease-claim language. Three rule families:
 *
 *   1. SCOPE: pattern-detect the highest-stakes language families known
 *      to slip into formal correspondence (disease claim, forbidden brand
 *      string, emoji, em-dash).
 *   2. COACHING: tone-and-substance checks specific to rebuttal voice
 *      (no liability admission, no unauthorized restitution offer, no
 *      regulatory citation invented out of thin air).
 *   3. DELEGATION: the analyzer/drafter pipeline calls the existing
 *      claim/brand/peptide rule modules directly via selfCheck.ts so we
 *      do not have to thread 'rebuttal_draft' across every existing
 *      surfaces array. The rules below own the rebuttal-specific layer.
 */

import type { EvaluationContext, Finding, Rule } from "../engine/types";
import { generateFindingId, redactExcerpt } from "../engine/types";

const LAST_REVIEWED = "2026-04-25";

function defaultCtx(): EvaluationContext {
  return { surface: "rebuttal_draft", source: "runtime", now: new Date() };
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

// ─── SCOPE ────────────────────────────────────────────────────────────────────

const DISEASE_VERBS_PATTERN = /\b(?:cures?|cured|treats?|heals?|prevents?|reverses?)\s+(?:cancer|diabetes|alzheimer|hypertension|arthritis|asthma|COPD|disease|illness)/gi;
const FORBIDDEN_BRAND_PATTERN = /\b(?:vitality\s+score|wellness\s+score|semaglutide)\b/gi;
const EMOJI_PATTERN = /[☀-➿\u{1F300}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu;
const EM_DASH_PATTERN = /[—–]/g;

export const REBUTTAL_NO_DISEASE_CLAIM: Rule<string> = {
  id: "MARSHALL.REBUTTAL.NO_DISEASE_CLAIM",
  pillar: "CLAIMS",
  severity: "P0",
  surfaces: ["rebuttal_draft"],
  citation: "FDCA 21 USC 343(r)(6); FTC 16 CFR Part 255",
  description:
    "A drafted rebuttal MUST NOT contain disease-cure or treatment language even when describing the underlying finding.",
  evaluate: (text, ctx = defaultCtx()) => {
    if (typeof text !== "string") return [];
    const findings: Finding[] = [];
    let m: RegExpExecArray | null;
    DISEASE_VERBS_PATTERN.lastIndex = 0;
    while ((m = DISEASE_VERBS_PATTERN.exec(text)) !== null) {
      findings.push(
        baseFinding(
          "MARSHALL.REBUTTAL.NO_DISEASE_CLAIM",
          "P0",
          `Finding: rebuttal copy contains disease-claim phrase "${m[0]}". A defense letter cannot itself contain the language family it is defending against.`,
          "FDCA 21 USC 343(r)(6)",
          redactExcerpt(text, m.index, 120),
          {
            kind: "manual",
            summary:
              "Reframe to describe the prohibited claim as a quote from the cited content, not as the rebuttal's own assertion. Example: \"the post stated that X 'cures Y'\" rather than \"X cures Y\".",
          },
          ctx,
        ),
      );
    }
    return findings;
  },
  lastReviewed: LAST_REVIEWED,
};

export const REBUTTAL_NO_FORBIDDEN_BRAND: Rule<string> = {
  id: "MARSHALL.REBUTTAL.NO_FORBIDDEN_BRAND",
  pillar: "BRAND",
  severity: "P0",
  surfaces: ["rebuttal_draft"],
  citation: "Standing Platform Rules section 0",
  description:
    "Rebuttal copy MUST NOT contain forbidden brand strings: Vitality Score, Wellness Score, Semaglutide.",
  evaluate: (text, ctx = defaultCtx()) => {
    if (typeof text !== "string") return [];
    const findings: Finding[] = [];
    let m: RegExpExecArray | null;
    FORBIDDEN_BRAND_PATTERN.lastIndex = 0;
    while ((m = FORBIDDEN_BRAND_PATTERN.exec(text)) !== null) {
      findings.push(
        baseFinding(
          "MARSHALL.REBUTTAL.NO_FORBIDDEN_BRAND",
          "P0",
          `Finding: rebuttal contains forbidden brand string "${m[0]}". Standing rules forbid this language across all client-facing surfaces.`,
          "Standing Platform Rules section 0",
          redactExcerpt(text, m.index, 80),
          {
            kind: "manual",
            summary: "Replace with Bio Optimization (for score) or remove the prohibited compound name entirely.",
          },
          ctx,
        ),
      );
    }
    return findings;
  },
  lastReviewed: LAST_REVIEWED,
};

export const REBUTTAL_NO_EMOJIS: Rule<string> = {
  id: "MARSHALL.REBUTTAL.NO_EMOJIS",
  pillar: "BRAND",
  severity: "P1",
  surfaces: ["rebuttal_draft"],
  citation: "Standing Platform Rules section 0",
  description:
    "Rebuttal copy MUST NOT contain emojis. Standing rule: Lucide React icons only on client surfaces; formal correspondence excludes emoji.",
  evaluate: (text, ctx = defaultCtx()) => {
    if (typeof text !== "string") return [];
    const findings: Finding[] = [];
    let m: RegExpExecArray | null;
    EMOJI_PATTERN.lastIndex = 0;
    while ((m = EMOJI_PATTERN.exec(text)) !== null) {
      findings.push(
        baseFinding(
          "MARSHALL.REBUTTAL.NO_EMOJIS",
          "P1",
          `Finding: rebuttal contains emoji "${m[0]}". Formal correspondence renders without emoji per the standing rule.`,
          "Standing Platform Rules section 0",
          redactExcerpt(text, m.index, 40),
          { kind: "auto", summary: "Strip emoji characters before render." },
          ctx,
        ),
      );
      if (findings.length > 5) break;
    }
    return findings;
  },
  lastReviewed: LAST_REVIEWED,
};

export const REBUTTAL_NO_DASHES: Rule<string> = {
  id: "MARSHALL.REBUTTAL.NO_DASHES",
  pillar: "BRAND",
  severity: "P2",
  surfaces: ["rebuttal_draft"],
  citation: "Standing Rule: no em-dash / en-dash in user-facing copy",
  description:
    "Rebuttal copy MUST NOT contain em-dashes or en-dashes. Use commas, colons, semicolons, or periods.",
  evaluate: (text, ctx = defaultCtx()) => {
    if (typeof text !== "string") return [];
    const findings: Finding[] = [];
    let m: RegExpExecArray | null;
    EM_DASH_PATTERN.lastIndex = 0;
    while ((m = EM_DASH_PATTERN.exec(text)) !== null) {
      findings.push(
        baseFinding(
          "MARSHALL.REBUTTAL.NO_DASHES",
          "P2",
          `Finding: rebuttal contains "${m[0]}" character. The platform standing rule replaces em/en-dashes with commas, colons, or semicolons.`,
          "Standing Rule no-dashes",
          redactExcerpt(text, m.index, 40),
          { kind: "auto", summary: "Replace em-dash or en-dash with appropriate punctuation." },
          ctx,
        ),
      );
      if (findings.length > 5) break;
    }
    return findings;
  },
  lastReviewed: LAST_REVIEWED,
};

// ─── COACHING ─────────────────────────────────────────────────────────────────

const LIABILITY_ADMISSION_PATTERN =
  /\b(?:we\s+(?:were|are)\s+at\s+fault|we\s+admit\s+(?:fault|liability|wrongdoing)|this\s+was\s+our\s+(?:error|mistake|fault)|we\s+agree\s+we\s+violated)/gi;

const UNAUTHORIZED_RESTITUTION_PATTERN =
  /\b(?:we\s+will\s+(?:refund|compensate|reimburse|pay)|we\s+offer\s+(?:compensation|restitution|damages))/gi;

export const REBUTTAL_NO_LIABILITY_ADMISSION: Rule<string> = {
  id: "MARSHALL.REBUTTAL.NO_LIABILITY_ADMISSION",
  pillar: "COMMS",
  severity: "P1",
  surfaces: ["rebuttal_draft"],
  citation: "Prompt #123 section 15.1; legal-defense posture",
  description:
    "Rebuttal copy MUST NOT contain explicit liability admissions. Acknowledgment of a finding's accuracy is not an admission of legal liability and must be phrased to preserve the distinction.",
  evaluate: (text, ctx = defaultCtx()) => {
    if (typeof text !== "string") return [];
    const findings: Finding[] = [];
    let m: RegExpExecArray | null;
    LIABILITY_ADMISSION_PATTERN.lastIndex = 0;
    while ((m = LIABILITY_ADMISSION_PATTERN.exec(text)) !== null) {
      findings.push(
        baseFinding(
          "MARSHALL.REBUTTAL.NO_LIABILITY_ADMISSION",
          "P1",
          `Finding: rebuttal contains liability-admission language "${m[0]}". Defense letters preserve the distinction between acknowledging a finding and admitting legal liability.`,
          "Prompt #123 section 15.1",
          redactExcerpt(text, m.index, 120),
          {
            kind: "manual",
            summary:
              "Reframe to neutral acknowledgment: e.g., \"the cited content has been removed\" rather than \"we admit fault.\" Route to legal counsel review when in doubt.",
          },
          ctx,
        ),
      );
    }
    return findings;
  },
  lastReviewed: LAST_REVIEWED,
};

export const REBUTTAL_NO_UNAUTHORIZED_RESTITUTION: Rule<string> = {
  id: "MARSHALL.REBUTTAL.NO_UNAUTHORIZED_RESTITUTION",
  pillar: "COMMS",
  severity: "P0",
  surfaces: ["rebuttal_draft"],
  citation: "Prompt #123 section 15.1; financial commitment authorization",
  description:
    "Rebuttal copy MUST NOT offer refunds, compensation, or other financial remedies absent explicit Steve Rica + CFO authorization captured in the appeal_decisions row.",
  evaluate: (text, ctx = defaultCtx()) => {
    if (typeof text !== "string") return [];
    const findings: Finding[] = [];
    let m: RegExpExecArray | null;
    UNAUTHORIZED_RESTITUTION_PATTERN.lastIndex = 0;
    while ((m = UNAUTHORIZED_RESTITUTION_PATTERN.exec(text)) !== null) {
      findings.push(
        baseFinding(
          "MARSHALL.REBUTTAL.NO_UNAUTHORIZED_RESTITUTION",
          "P0",
          `Finding: rebuttal contains unauthorized restitution offer "${m[0]}". Financial commitments require dual approval and are not delivered through the rebuttal channel.`,
          "Prompt #123 section 15.1",
          redactExcerpt(text, m.index, 120),
          {
            kind: "manual",
            summary:
              "Remove the restitution language. If financial remedy is appropriate, escalate the appeal to the dual-approval flow.",
          },
          ctx,
        ),
      );
    }
    return findings;
  },
  lastReviewed: LAST_REVIEWED,
};

export const rebuttalRules: Rule[] = [
  REBUTTAL_NO_DISEASE_CLAIM,
  REBUTTAL_NO_FORBIDDEN_BRAND,
  REBUTTAL_NO_EMOJIS,
  REBUTTAL_NO_DASHES,
  REBUTTAL_NO_LIABILITY_ADMISSION,
  REBUTTAL_NO_UNAUTHORIZED_RESTITUTION,
];
