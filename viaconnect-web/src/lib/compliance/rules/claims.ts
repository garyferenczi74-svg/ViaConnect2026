/**
 * Pillar 1 — Health Claims & Marketing (FDA / FTC)
 */

import type { EvaluationContext, Finding, Rule } from "../engine/types";
import { generateFindingId, redactExcerpt } from "../engine/types";
import { buildDiseaseClaimRegex } from "../dictionaries/disease_terms";
import { FORBIDDEN_PHRASES } from "../dictionaries/forbidden_phrases";

const LAST_REVIEWED = "2026-04-23";

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

let DISEASE_CLAIM_RE: RegExp | null = null;
function diseaseClaimRe(): RegExp {
  if (!DISEASE_CLAIM_RE) DISEASE_CLAIM_RE = buildDiseaseClaimRegex();
  DISEASE_CLAIM_RE.lastIndex = 0;
  return DISEASE_CLAIM_RE;
}

export const DISEASE_CLAIM: Rule<string> = {
  id: "MARSHALL.CLAIMS.DISEASE_CLAIM",
  pillar: "CLAIMS",
  severity: "P1",
  surfaces: ["content_cms", "user_content", "ai_output", "marketing_page", "email"],
  citation: "21 CFR 101.93; FTC 16 CFR Part 255",
  description: "Structure/function only; no disease claims.",
  evaluate: (text, ctx = defaultCtx()) => {
    if (typeof text !== "string" || text.length === 0) return [];
    const re = diseaseClaimRe();
    const findings: Finding[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      findings.push(
        baseFinding(
          "MARSHALL.CLAIMS.DISEASE_CLAIM",
          "P1",
          `Finding: potential disease claim "${m[0].trim()}". Rewrite with structure/function language.`,
          "21 CFR 101.93",
          redactExcerpt(text, m.index, 100),
          {
            kind: "manual",
            summary: "Rewrite without disease verbs paired with disease terms. Example: 'supports healthy glucose metabolism' instead of 'treats diabetes'.",
          },
          ctx,
        ),
      );
    }
    return findings;
  },
  lastReviewed: LAST_REVIEWED,
};

export const DSHEA_DISCLAIMER_MISSING: Rule<string> = {
  id: "MARSHALL.CLAIMS.DSHEA_DISCLAIMER_MISSING",
  pillar: "CLAIMS",
  severity: "P2",
  surfaces: ["content_cms", "marketing_page"],
  citation: "DSHEA 1994, 21 USC 343(r)(6)",
  description: "Every supplement page must include the DSHEA structure/function disclaimer.",
  evaluate: (text, ctx = defaultCtx()) => {
    if (typeof text !== "string") return [];
    const hasDisclaimer =
      /not\s+intended\s+to\s+diagnose/i.test(text) || /statements\s+have\s+not\s+been\s+evaluated/i.test(text);
    if (hasDisclaimer) return [];
    return [
      baseFinding(
        "MARSHALL.CLAIMS.DSHEA_DISCLAIMER_MISSING",
        "P2",
        "Finding: supplement content is missing the DSHEA disclaimer.",
        "DSHEA 1994",
        redactExcerpt(text, 0, 160),
        { kind: "auto", summary: "Inject the DSHEA disclaimer component at render.", action: "INJECT_DSHEA" },
        ctx,
      ),
    ];
  },
  autoRemediate: async (text) => {
    if (typeof text !== "string") return text;
    if (/not\s+intended\s+to\s+diagnose/i.test(text)) return text;
    return (
      text +
      "\n\nThese statements have not been evaluated by the FDA. This product is not intended to diagnose, treat, cure, or prevent any disease."
    );
  },
  lastReviewed: LAST_REVIEWED,
};

export const UNSUBSTANTIATED_EFFICACY: Rule<{ text: string; citations?: string[] }> = {
  id: "MARSHALL.CLAIMS.UNSUBSTANTIATED_EFFICACY",
  pillar: "CLAIMS",
  severity: "P1",
  surfaces: ["content_cms", "ai_output", "marketing_page"],
  citation: "FTC Act §5; Guides Concerning Endorsements",
  description: "Numeric efficacy claims must be backed by a research citation.",
  evaluate: (input, ctx = defaultCtx()) => {
    const text = typeof input === "string" ? input : input.text;
    const cites = typeof input === "string" ? [] : (input.citations ?? []);
    if (typeof text !== "string") return [];
    const re = /\b(?:reduces|increases|boosts|improves|lowers|raises|enhances)\s+[\w\s]{3,40}?\s+by\s+(\d{1,3})\s*%/gi;
    const findings: Finding[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (cites.length === 0) {
        findings.push(
          baseFinding(
            "MARSHALL.CLAIMS.UNSUBSTANTIATED_EFFICACY",
            "P1",
            `Finding: numeric efficacy claim "${m[0].trim()}" with no linked citation.`,
            "FTC Act §5",
            redactExcerpt(text, m.index, 100),
            { kind: "manual", summary: "Attach a research_citations record or remove the specific number." },
            ctx,
          ),
        );
      }
    }
    return findings;
  },
  lastReviewed: LAST_REVIEWED,
};

export const TESTIMONIAL_DISCLOSURE: Rule<{ text: string; hasMaterialConnection?: boolean; hasDisclosure?: boolean }> = {
  id: "MARSHALL.CLAIMS.TESTIMONIAL_DISCLOSURE",
  pillar: "CLAIMS",
  severity: "P2",
  surfaces: ["content_cms", "marketing_page"],
  citation: "FTC Endorsement Guides 2023 rev.",
  description: "Testimonials with material connection require disclosure.",
  evaluate: (input, ctx = defaultCtx()) => {
    if (typeof input === "string") return [];
    if (!input.hasMaterialConnection || input.hasDisclosure) return [];
    return [
      baseFinding(
        "MARSHALL.CLAIMS.TESTIMONIAL_DISCLOSURE",
        "P2",
        "Finding: testimonial author received product, payment, or Helix points; no material-connection disclosure.",
        "FTC Endorsement Guides",
        redactExcerpt(input.text, 0, 100),
        { kind: "manual", summary: 'Add a "received product at no cost" or equivalent disclosure.' },
        ctx,
      ),
    ];
  },
  lastReviewed: LAST_REVIEWED,
};

export const FORBIDDEN_PHRASE_SCAN: Rule<string> = {
  id: "MARSHALL.CLAIMS.FORBIDDEN_PHRASE",
  pillar: "CLAIMS",
  severity: "P1",
  surfaces: ["content_cms", "ai_output", "marketing_page", "email", "sms"],
  citation: "ViaConnect compliance memo 2026-03-01",
  description: "Catch-all scan for high-risk forbidden marketing phrases.",
  evaluate: (text, ctx = defaultCtx()) => {
    if (typeof text !== "string") return [];
    const findings: Finding[] = [];
    for (const entry of FORBIDDEN_PHRASES) {
      const re = new RegExp(entry.pattern.source, entry.pattern.flags);
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        findings.push(
          baseFinding(
            "MARSHALL.CLAIMS.FORBIDDEN_PHRASE",
            entry.severity,
            `Finding: forbidden phrase "${m[0]}" — ${entry.reason}`,
            "Compliance memo 2026-03-01",
            redactExcerpt(text, m.index, 80),
            { kind: "manual", summary: entry.reason },
            ctx,
          ),
        );
      }
    }
    return findings;
  },
  lastReviewed: LAST_REVIEWED,
};

function defaultCtx(): EvaluationContext {
  return { surface: "content_cms", source: "runtime", now: new Date() };
}

export const claimsRules: Rule[] = [
  DISEASE_CLAIM,
  DSHEA_DISCLAIMER_MISSING,
  UNSUBSTANTIATED_EFFICACY,
  TESTIMONIAL_DISCLOSURE,
  FORBIDDEN_PHRASE_SCAN,
];
