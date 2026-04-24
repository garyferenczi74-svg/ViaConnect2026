/**
 * Pillar 10 — Counterfeit (Prompt #124 P2)
 *
 * Rule inputs are already-computed Determinations from
 * src/lib/marshall/vision/determine.ts. Each rule examines the verdict,
 * mismatch flags, and confidence and emits a Marshall Finding when the
 * determination matches its pattern. This is the bridge between the
 * vision layer's observations and Marshall's finding ledger.
 *
 * All findings carry surface = "product_image". Escalation routing is
 * handled by Marshall's existing router (§10.3) based on severity.
 */

import type { EvaluationContext, Finding, Rule } from "../engine/types";
import { generateFindingId } from "../engine/types";

const LAST_REVIEWED = "2026-04-24";
const CITATION = "Prompt #124 §10 Marshall Vision rule surface";

export interface CounterfeitRuleInput {
  evaluationId: string;
  verdict:
    | "authentic"
    | "counterfeit_suspected"
    | "unauthorized_channel_suspected"
    | "inconclusive"
    | "unrelated_product"
    | "insufficient_image_quality"
    | "content_safety_skip";
  confidence: number;
  matchedSku: string | null;
  mismatchFlags: readonly string[];
  source:
    | "hounddog_marketplace"
    | "hounddog_social"
    | "practitioner_appeal"
    | "consumer_report"
    | "admin_upload"
    | "test_buy";
  /** Optional listing URL for location metadata on the finding. */
  listingUrl?: string;
}

function defaultCtx(): EvaluationContext {
  return { surface: "product_image", source: "runtime" };
}

function baseFinding(
  ruleId: string,
  severity: Finding["severity"],
  message: string,
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
    citation: CITATION,
    remediation,
    createdAt: (ctx.now ?? new Date()).toISOString(),
  };
}

// ─── Rule 1: overall counterfeit-suspected verdict at confidence >= 0.60 ───

export const IMAGE_COUNTERFEIT_SUSPECTED: Rule<CounterfeitRuleInput> = {
  id: "MARSHALL.COUNTERFEIT.IMAGE_COUNTERFEIT_SUSPECTED",
  pillar: "COUNTERFEIT",
  severity: "P0",
  surfaces: ["product_image"],
  citation: CITATION,
  description:
    "Vision layer produced counterfeit_suspected verdict at confidence >= 0.60. Routes to Steve for takedown drafting.",
  evaluate: (input, ctx = defaultCtx()) => {
    if (input.verdict !== "counterfeit_suspected") return [];
    if (input.confidence < 0.60) return [];
    return [
      baseFinding(
        "MARSHALL.COUNTERFEIT.IMAGE_COUNTERFEIT_SUSPECTED",
        "P0",
        `Counterfeit suspected: SKU ${input.matchedSku ?? "unknown"} at confidence ${input.confidence.toFixed(2)}. Flags: ${input.mismatchFlags.join(", ") || "(none)"}. Source: ${input.source}.`,
        `evaluation ${input.evaluationId}`,
        {
          kind: "manual",
          summary:
            "Review in Marshall Vision admin queue. Confirm or dismiss before drafting takedown.",
        },
        ctx,
      ),
    ];
  },
  lastReviewed: LAST_REVIEWED,
};

// ─── Rule 2: unauthorized-channel verdict ──────────────────────────────────

export const IMAGE_UNAUTHORIZED_CHANNEL: Rule<CounterfeitRuleInput> = {
  id: "MARSHALL.COUNTERFEIT.IMAGE_UNAUTHORIZED_CHANNEL",
  pillar: "COUNTERFEIT",
  severity: "P1",
  surfaces: ["product_image"],
  citation: CITATION,
  description:
    "Vision layer produced unauthorized_channel_suspected verdict. Packaging appears authentic but distribution channel is not authorized.",
  evaluate: (input, ctx = defaultCtx()) => {
    if (input.verdict !== "unauthorized_channel_suspected") return [];
    return [
      baseFinding(
        "MARSHALL.COUNTERFEIT.IMAGE_UNAUTHORIZED_CHANNEL",
        "P1",
        `Unauthorized channel suspected for SKU ${input.matchedSku ?? "unknown"} at confidence ${input.confidence.toFixed(2)}. Packaging matches authentic reference; channel is not on authorized reseller list.`,
        `evaluation ${input.evaluationId}`,
        {
          kind: "manual",
          summary:
            "Open a gray-market investigation card; confirm reseller authorization status before any takedown.",
        },
        ctx,
      ),
    ];
  },
  lastReviewed: LAST_REVIEWED,
};

// ─── Rule 3: insufficient image quality ────────────────────────────────────

export const IMAGE_QUALITY_INSUFFICIENT: Rule<CounterfeitRuleInput> = {
  id: "MARSHALL.COUNTERFEIT.IMAGE_QUALITY_INSUFFICIENT",
  pillar: "COUNTERFEIT",
  severity: "ADVISORY",
  surfaces: ["product_image"],
  citation: CITATION,
  description:
    "Image could not be evaluated because resolution or lighting was insufficient; request a higher-quality photo.",
  evaluate: (input, ctx = defaultCtx()) => {
    if (input.verdict !== "insufficient_image_quality") return [];
    return [
      baseFinding(
        "MARSHALL.COUNTERFEIT.IMAGE_QUALITY_INSUFFICIENT",
        "ADVISORY",
        `Vision evaluation skipped: image quality insufficient. Evaluation ${input.evaluationId}. Source: ${input.source}. Request a higher-resolution photo from the submitter.`,
        `evaluation ${input.evaluationId}`,
        {
          kind: "manual",
          summary:
            "Reply to submitter requesting a sharper photo; minimum short-edge 256 px, good lighting, plain background.",
        },
        ctx,
      ),
    ];
  },
  lastReviewed: LAST_REVIEWED,
};

// ─── Rule 4: hologram absent on hologram-required SKU ──────────────────────

export const HOLOGRAM_ABSENT: Rule<CounterfeitRuleInput> = {
  id: "MARSHALL.COUNTERFEIT.HOLOGRAM_ABSENT",
  pillar: "COUNTERFEIT",
  severity: "P1",
  surfaces: ["product_image"],
  citation: CITATION,
  description:
    "Hologram-bearing SKU is missing the expected hologram. Feature-level finding supplements the overall verdict.",
  evaluate: (input, ctx = defaultCtx()) => {
    if (!input.mismatchFlags.includes("hologram_absent")) return [];
    return [
      baseFinding(
        "MARSHALL.COUNTERFEIT.HOLOGRAM_ABSENT",
        "P1",
        `Hologram absent on SKU ${input.matchedSku ?? "unknown"}. Authentic packaging includes a hologram on the label; this image shows none.`,
        `evaluation ${input.evaluationId}`,
        {
          kind: "manual",
          summary:
            "Cite hologram-absent in takedown filing; reference corpus hologram image as the expected comparison.",
        },
        ctx,
      ),
    ];
  },
  lastReviewed: LAST_REVIEWED,
};

// ─── Rule 5: batch/lot format invalid ──────────────────────────────────────

export const BATCH_FORMAT_INVALID: Rule<CounterfeitRuleInput> = {
  id: "MARSHALL.COUNTERFEIT.BATCH_FORMAT_INVALID",
  pillar: "COUNTERFEIT",
  severity: "P1",
  surfaces: ["product_image"],
  citation: CITATION,
  description:
    "Batch or lot number format does not match the FarmCeutica template for the matched SKU.",
  evaluate: (input, ctx = defaultCtx()) => {
    if (!input.mismatchFlags.includes("batch_format_mismatch")) return [];
    return [
      baseFinding(
        "MARSHALL.COUNTERFEIT.BATCH_FORMAT_INVALID",
        "P1",
        `Batch or lot number format mismatch on SKU ${input.matchedSku ?? "unknown"}. Visible format does not conform to the FarmCeutica batch template.`,
        `evaluation ${input.evaluationId}`,
        {
          kind: "manual",
          summary:
            "Cite batch-format mismatch in takedown filing; include reference template image.",
        },
        ctx,
      ),
    ];
  },
  lastReviewed: LAST_REVIEWED,
};

// ─── Rule 6: label origin mismatch ─────────────────────────────────────────

export const LABEL_ORIGIN_MISMATCH: Rule<CounterfeitRuleInput> = {
  id: "MARSHALL.COUNTERFEIT.LABEL_ORIGIN_MISMATCH",
  pillar: "COUNTERFEIT",
  severity: "P0",
  surfaces: ["product_image"],
  citation: CITATION,
  description:
    "Label states origin inconsistent with FarmCeutica authorized manufacturing (for example, Made in China on a US-manufactured peptide).",
  evaluate: (input, ctx = defaultCtx()) => {
    const hit =
      input.mismatchFlags.includes("unexpected_origin_text_present")
      || input.mismatchFlags.includes("expected_origin_text_missing");
    if (!hit) return [];
    return [
      baseFinding(
        "MARSHALL.COUNTERFEIT.LABEL_ORIGIN_MISMATCH",
        "P0",
        `Label origin inconsistent with authorized manufacturing for SKU ${input.matchedSku ?? "unknown"}. Expected US manufacturing markings absent and/or unauthorized origin text present.`,
        `evaluation ${input.evaluationId}`,
        {
          kind: "manual",
          summary:
            "Cite origin-label mismatch in takedown filing; this is typically sufficient for Amazon Brand Registry counterfeit classification.",
        },
        ctx,
      ),
    ];
  },
  lastReviewed: LAST_REVIEWED,
};

// ─── Rule 7: content-safety skip ───────────────────────────────────────────

export const CONTENT_SAFETY_SKIP: Rule<CounterfeitRuleInput> = {
  id: "MARSHALL.COUNTERFEIT.CONTENT_SAFETY_SKIP",
  pillar: "COUNTERFEIT",
  severity: "ADVISORY",
  surfaces: ["product_image"],
  citation: CITATION,
  description:
    "Image skipped for content-safety reasons (face-centered, medical imagery, unrelated content, or injection attempt). Manual review required in secure channel.",
  evaluate: (input, ctx = defaultCtx()) => {
    if (input.verdict !== "content_safety_skip") return [];
    return [
      baseFinding(
        "MARSHALL.COUNTERFEIT.CONTENT_SAFETY_SKIP",
        "ADVISORY",
        `Vision evaluation skipped for content safety. Evaluation ${input.evaluationId}. Review the raw source image in a secure channel before any public action.`,
        `evaluation ${input.evaluationId}`,
        {
          kind: "manual",
          summary:
            "Pull raw image from secure storage; review manually. Do not forward to Claude Vision again.",
        },
        ctx,
      ),
    ];
  },
  lastReviewed: LAST_REVIEWED,
};

// ─── Aggregate ─────────────────────────────────────────────────────────────

export const counterfeitRules: Rule[] = [
  IMAGE_COUNTERFEIT_SUSPECTED,
  IMAGE_UNAUTHORIZED_CHANNEL,
  IMAGE_QUALITY_INSUFFICIENT,
  HOLOGRAM_ABSENT,
  BATCH_FORMAT_INVALID,
  LABEL_ORIGIN_MISMATCH,
  CONTENT_SAFETY_SKIP,
];
