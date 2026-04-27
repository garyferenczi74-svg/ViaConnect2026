/**
 * Pillar 8 — Platform Policy & Brand Guardrails (ViaConnect-specific)
 * Enforces the nine standing rules in §0 of every prompt.
 */

import type { EvaluationContext, Finding, Rule } from "../engine/types";
import { generateFindingId, redactExcerpt } from "../engine/types";
import { EMOJI_REGEX, TEXT_EMOTICON_REGEX } from "../dictionaries/forbidden_phrases";

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

export const BIO_OPTIMIZATION_NAMING: Rule<string> = {
  id: "MARSHALL.BRAND.BIO_OPTIMIZATION_NAMING",
  pillar: "BRAND",
  severity: "P0",
  surfaces: ["source_code", "content_cms", "ai_output", "marketing_page", "marketing_copy"],
  citation: "ViaConnect Standing Rule §0.1",
  description: "Score name is exactly Bio Optimization; Vitality Score / Vitality Index / Wellness Score forbidden.",
  evaluate: (text, ctx = defaultCtx()) => {
    if (typeof text !== "string" || text.length === 0) return [];
    const findings: Finding[] = [];
    const patterns: Array<[RegExp, string]> = [
      [/\bvitality\s+score\b/gi, "Vitality Score"],
      [/\bvitality\s+index\b/gi, "Vitality Index"],
      [/\bwellness\s+score\b/gi, "Wellness Score"],
    ];
    for (const [re, label] of patterns) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        findings.push(
          baseFinding(
            "MARSHALL.BRAND.BIO_OPTIMIZATION_NAMING",
            "P0",
            `Finding: forbidden score name "${label}". Use "Bio Optimization".`,
            "ViaConnect Standing Rule §0.1",
            redactExcerpt(text, m.index, 80),
            {
              kind: "auto",
              summary: `Replace "${label}" with "Bio Optimization".`,
              action: `REPLACE:${label}:Bio Optimization`,
            },
            ctx,
          ),
        );
      }
    }
    return findings;
  },
  autoRemediate: async (text) => {
    if (typeof text !== "string") return text;
    return text
      .replace(/\bvitality\s+score\b/gi, "Bio Optimization")
      .replace(/\bvitality\s+index\b/gi, "Bio Optimization")
      .replace(/\bwellness\s+score\b/gi, "Bio Optimization");
  },
  lastReviewed: LAST_REVIEWED,
};

export const BIOAVAILABILITY_RANGE: Rule<string> = {
  id: "MARSHALL.BRAND.BIOAVAILABILITY_RANGE",
  pillar: "BRAND",
  severity: "P0",
  surfaces: ["source_code", "content_cms", "ai_output", "marketing_page", "marketing_copy", "email", "sms"],
  citation: "ViaConnect Standing Rule §0.2",
  description: "Bioavailability range is exactly 10-27 times.",
  evaluate: (text, ctx = defaultCtx()) => {
    if (typeof text !== "string" || text.length === 0) return [];
    const findings: Finding[] = [];
    // Flag any numeric range adjacent to "bioavailable" / "bioavailability"
    // that is NOT the canonical 10-27.
    const re = /(\d{1,3})\s*(?:to|[-–—])\s*(\d{1,3})\s*[×x]?\s*(?:more\s+)?(?:bioavailab(?:le|ility))/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const low = Number(m[1]);
      const high = Number(m[2]);
      if (!(low === 10 && high === 27)) {
        findings.push(
          baseFinding(
            "MARSHALL.BRAND.BIOAVAILABILITY_RANGE",
            "P0",
            `Finding: bioavailability range "${low}-${high}" is not the canonical 10-27 times.`,
            "ViaConnect Standing Rule §0.2",
            redactExcerpt(text, m.index, 80),
            {
              kind: "auto",
              summary: "Normalize to the canonical 10-27x bioavailability.",
              action: "REPLACE_RANGE:10-27×",
            },
            ctx,
          ),
        );
      }
    }
    return findings;
  },
  autoRemediate: async (text) => {
    if (typeof text !== "string") return text;
    return text.replace(
      /(\d{1,3})\s*(?:to|[-–—])\s*(\d{1,3})\s*([×x]?)\s*((?:more\s+)?(?:bioavailab(?:le|ility)))/gi,
      (_full, _a, _b, _x, tail) => `10-27× ${tail}`,
    );
  },
  lastReviewed: LAST_REVIEWED,
};

export const HELIX_CONSUMER_ONLY: Rule<{ text: string; userRole?: string }> = {
  id: "MARSHALL.BRAND.HELIX_CONSUMER_ONLY",
  pillar: "BRAND",
  severity: "P1",
  surfaces: ["source_code", "ai_output"],
  citation: "ViaConnect Standing Rule §0.6",
  description: "Helix point balances and tier names are consumer-only.",
  evaluate: (input, ctx = defaultCtx()) => {
    const text = typeof input === "string" ? input : input.text;
    const role = typeof input === "string" ? ctx.userRole : input.userRole;
    if (!text || !role || role === "consumer" || role === "admin") return [];
    const patterns = [
      /\bhelix\s+rewards?\b/i,
      /\bpoint\s+balance\b/i,
      /\btier\s+(?:name|rank)\b/i,
      /\b(?:bronze|silver|gold|platinum|diamond)\s+tier\b/i,
    ];
    if (patterns.some((re) => re.test(text))) {
      return [
        baseFinding(
          "MARSHALL.BRAND.HELIX_CONSUMER_ONLY",
          "P1",
          `Finding: Helix Rewards detail surfaced to role "${role}". Practitioners see aggregate engagement only.`,
          "ViaConnect Standing Rule §0.6",
          redactExcerpt(text, 0, 120),
          { kind: "auto", summary: "Redact Helix references from non-consumer output.", action: "REDACT_HELIX" },
          ctx,
        ),
      ];
    }
    return [];
  },
  autoRemediate: async (input) => {
    if (typeof input === "string") return input;
    return {
      ...input,
      text: input.text
        .replace(/\bhelix\s+rewards?\b/gi, "[helix redacted]")
        .replace(/\b(?:bronze|silver|gold|platinum|diamond)\s+tier\b/gi, "[tier redacted]")
        .replace(/\bpoint\s+balance\b/gi, "[balance redacted]"),
    };
  },
  lastReviewed: LAST_REVIEWED,
};

export const LUCIDE_ONLY_ICONS: Rule<string> = {
  id: "MARSHALL.BRAND.LUCIDE_ONLY_ICONS",
  pillar: "BRAND",
  severity: "P2",
  surfaces: ["source_code"],
  citation: "ViaConnect Standing Rule §0.4",
  description: "Only Lucide React icons; no emojis in client-facing UI.",
  evaluate: (text, ctx = defaultCtx()) => {
    if (typeof text !== "string") return [];
    const findings: Finding[] = [];
    const forbiddenImports = [
      /from\s+["']react-icons[^"']*["']/g,
      /from\s+["']@heroicons[^"']*["']/g,
      /from\s+["']@tabler\/icons[^"']*["']/g,
    ];
    for (const re of forbiddenImports) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        findings.push(
          baseFinding(
            "MARSHALL.BRAND.LUCIDE_ONLY_ICONS",
            "P2",
            `Finding: non-Lucide icon import "${m[0]}". Replace with lucide-react.`,
            "ViaConnect Standing Rule §0.4",
            redactExcerpt(text, m.index, 80),
            { kind: "manual", summary: "Swap import to lucide-react equivalent." },
            ctx,
          ),
        );
      }
    }
    // Emoji detection in source code strings.
    let e: RegExpExecArray | null;
    while ((e = EMOJI_REGEX.exec(text)) !== null) {
      findings.push(
        baseFinding(
          "MARSHALL.BRAND.LUCIDE_ONLY_ICONS",
          "P2",
          `Finding: emoji character "${e[0]}" in source. Client-facing UI uses Lucide icons only.`,
          "ViaConnect Standing Rule §0.4",
          redactExcerpt(text, e.index, 60),
          { kind: "manual", summary: "Replace the emoji with a Lucide icon component." },
          ctx,
        ),
      );
    }
    EMOJI_REGEX.lastIndex = 0;
    return findings;
  },
  lastReviewed: LAST_REVIEWED,
};

export const ICON_STROKE_WIDTH: Rule<string> = {
  id: "MARSHALL.BRAND.ICON_STROKE_WIDTH",
  pillar: "BRAND",
  severity: "P3",
  surfaces: ["source_code"],
  citation: "ViaConnect Standing Rule §0.4",
  description: 'Lucide icons must use strokeWidth={1.5}.',
  evaluate: (text, ctx = defaultCtx()) => {
    if (typeof text !== "string") return [];
    // Look for <LucideName ... /> tags missing strokeWidth={1.5}.
    // Lucide names are PascalCase single-word; heuristic filter keeps the scan cheap.
    const re = /<([A-Z][A-Za-z0-9]+)\b([^>]*)\/>/g;
    const findings: Finding[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const tag = m[0];
      const attrs = m[2];
      // heuristic: tag name common Lucide pattern (e.g. Check, ArrowRight, Gavel)
      if (!/icon/i.test(tag) && !/(Arrow|Check|Chevron|Gavel|Scale|Shield|File|Database|Brain|Search|Radio|Cpu|Compass|Clock|Pause|X|Loader2|MessageSquare|AlertTriangle|AlertOctagon|Users|BookOpen|BrainCircuit|Settings2|TrendingUp|MessageCircle)\b/.test(tag)) continue;
      if (!/strokeWidth\s*=\s*\{?\s*1\.5\s*\}?/.test(attrs)) {
        findings.push(
          baseFinding(
            "MARSHALL.BRAND.ICON_STROKE_WIDTH",
            "P3",
            `Finding: Lucide icon "${m[1]}" missing strokeWidth={1.5}.`,
            "ViaConnect Standing Rule §0.4",
            redactExcerpt(text, m.index, 60),
            { kind: "auto", summary: "Add strokeWidth={1.5} to the icon.", action: `ADD_ATTR:${m[1]}:strokeWidth={1.5}` },
            ctx,
          ),
        );
      }
    }
    return findings;
  },
  lastReviewed: LAST_REVIEWED,
};

export const GETDISPLAYNAME_REQUIRED: Rule<string> = {
  id: "MARSHALL.BRAND.GETDISPLAYNAME_REQUIRED",
  pillar: "BRAND",
  severity: "P2",
  surfaces: ["source_code"],
  citation: "ViaConnect Standing Rule §0.5",
  description: "Client-facing names must pass through getDisplayName().",
  evaluate: (text, ctx = defaultCtx()) => {
    if (typeof text !== "string") return [];
    const findings: Finding[] = [];
    // Detect raw agent display strings in JSX. Heuristic: the agent slug hardcoded adjacent to role-rendering JSX.
    const agentSlugs = ["jeffery", "hannah", "gordan", "arnold", "hounddog", "sherlock", "michelangelo", "marshall"];
    for (const slug of agentSlugs) {
      const re = new RegExp(`>\\s*${slug}\\s*<`, "gi");
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        findings.push(
          baseFinding(
            "MARSHALL.BRAND.GETDISPLAYNAME_REQUIRED",
            "P2",
            `Finding: raw agent slug "${slug}" rendered inline; route through getDisplayName("${slug}").`,
            "ViaConnect Standing Rule §0.5",
            redactExcerpt(text, m.index, 60),
            {
              kind: "suggested",
              summary: `Replace ">${slug}<" with "{getDisplayName(\"${slug}\")}".`,
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

export const NO_EMOJIS_IN_OUTPUT: Rule<string> = {
  id: "MARSHALL.BRAND.NO_EMOJIS_IN_OUTPUT",
  pillar: "BRAND",
  severity: "P2",
  surfaces: ["ai_output", "content_cms", "email", "sms", "marketing_page", "marketing_copy"],
  citation: "ViaConnect Standing Rule §0.4",
  description: "No emojis in client-facing content.",
  evaluate: (text, ctx = defaultCtx()) => {
    if (typeof text !== "string") return [];
    const findings: Finding[] = [];
    let m: RegExpExecArray | null;
    while ((m = EMOJI_REGEX.exec(text)) !== null) {
      findings.push(
        baseFinding(
          "MARSHALL.BRAND.NO_EMOJIS_IN_OUTPUT",
          "P2",
          `Finding: emoji "${m[0]}" in client-facing output.`,
          "ViaConnect Standing Rule §0.4",
          redactExcerpt(text, m.index, 40),
          { kind: "auto", summary: "Strip emoji.", action: "STRIP_EMOJI" },
          ctx,
        ),
      );
    }
    EMOJI_REGEX.lastIndex = 0;
    return findings;
  },
  autoRemediate: async (text) => {
    if (typeof text !== "string") return text;
    return text.replace(EMOJI_REGEX, "").replace(TEXT_EMOTICON_REGEX, "");
  },
  lastReviewed: LAST_REVIEWED,
};

export const FARMCEUTICA_ONLY_PRODUCTS: Rule<{ agent: string; text: string; recommendedSkus?: string[] }> = {
  id: "MARSHALL.BRAND.FARMCEUTICA_ONLY_PRODUCTS",
  pillar: "BRAND",
  severity: "P1",
  surfaces: ["ai_output"],
  citation: "ViaConnect platform policy",
  description: "AI advisors must only recommend FarmCeutica-owned SKUs.",
  evaluate: (input, ctx = defaultCtx()) => {
    const skus = input.recommendedSkus ?? [];
    const offenders = skus.filter(
      (s) => !/^(?:FARM|FC|VIA|PEP|LIP|RET|TIRZ|BPC|TB|CJC|IPA|HEL|FRM|SPR)-/i.test(s),
    );
    if (offenders.length === 0) return [];
    return [
      baseFinding(
        "MARSHALL.BRAND.FARMCEUTICA_ONLY_PRODUCTS",
        "P1",
        `Finding: agent "${input.agent}" recommended non-FarmCeutica SKUs: ${offenders.join(", ")}.`,
        "ViaConnect platform policy",
        offenders.join(","),
        { kind: "manual", summary: "Filter to FarmCeutica SKU prefixes before returning to user." },
        ctx,
      ),
    ];
  },
  lastReviewed: LAST_REVIEWED,
};

export const MEDICAL_DISCLAIMER_MANDATORY: Rule<string> = {
  id: "MARSHALL.BRAND.MEDICAL_DISCLAIMER_MANDATORY",
  pillar: "BRAND",
  severity: "P2",
  surfaces: ["ai_output"],
  citation: "ViaConnect platform policy + DSHEA",
  description: "AI recommendation cards carry the mandatory disclaimer footer.",
  evaluate: (text, ctx = defaultCtx()) => {
    if (typeof text !== "string" || text.length < 40) return [];
    if (/not\s+intended\s+to\s+diagnose/i.test(text) || /consult.*(?:healthcare|physician)/i.test(text)) return [];
    return [
      baseFinding(
        "MARSHALL.BRAND.MEDICAL_DISCLAIMER_MANDATORY",
        "P2",
        "Finding: AI recommendation missing medical disclaimer footer.",
        "ViaConnect platform policy",
        redactExcerpt(text, 0, 160),
        {
          kind: "auto",
          summary: "Append the canonical DSHEA disclaimer footer.",
          action: "APPEND_DISCLAIMER",
          autoPatch:
            " These statements have not been evaluated by the FDA. This product is not intended to diagnose, treat, cure, or prevent any disease. Consult your healthcare provider before starting any new supplement.",
        },
        ctx,
      ),
    ];
  },
  autoRemediate: async (text) => {
    if (typeof text !== "string") return text;
    if (/not\s+intended\s+to\s+diagnose/i.test(text)) return text;
    return (
      text +
      "\n\nThese statements have not been evaluated by the FDA. This product is not intended to diagnose, treat, cure, or prevent any disease. Consult your healthcare provider before starting any new supplement."
    );
  },
  lastReviewed: LAST_REVIEWED,
};

function defaultCtx(): EvaluationContext {
  return { surface: "content_cms", source: "runtime", now: new Date() };
}

export const brandRules: Rule[] = [
  BIO_OPTIMIZATION_NAMING,
  BIOAVAILABILITY_RANGE,
  HELIX_CONSUMER_ONLY,
  LUCIDE_ONLY_ICONS,
  ICON_STROKE_WIDTH,
  GETDISPLAYNAME_REQUIRED,
  NO_EMOJIS_IN_OUTPUT,
  FARMCEUTICA_ONLY_PRODUCTS,
  MEDICAL_DISCLAIMER_MANDATORY,
];
