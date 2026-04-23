/**
 * Pillar 2 — Peptide Regulatory Boundary
 * Highest regulatory risk surface on ViaConnect. P0 rules enforce immediately.
 */

import type { EvaluationContext, Finding, Rule } from "../engine/types";
import { generateFindingId, redactExcerpt } from "../engine/types";
import {
  AGE_RESTRICTED_PEPTIDES,
  INJECTABLE_ONLY_PEPTIDES,
  MONOTHERAPY_PEPTIDES,
  PROHIBITED_PEPTIDES,
  skuIsLiposomalOrAlt,
  SKU_FORM_PATTERN,
} from "../dictionaries/unapproved_peptides";
import { peptideRequiresPractitioner } from "../config/practitioner_required";

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
    escalation:
      severity === "P0"
        ? { to: ["steve_rica", "gary"], slaMinutes: 15 }
        : severity === "P1"
          ? { to: ["steve_rica"], slaMinutes: 240 }
          : undefined,
    createdAt: (ctx.now ?? new Date()).toISOString(),
  };
}

export const NO_SEMAGLUTIDE: Rule<string> = {
  id: "MARSHALL.PEPTIDE.NO_SEMAGLUTIDE",
  pillar: "PEPTIDE",
  severity: "P0",
  surfaces: ["source_code", "product_db", "content_cms", "user_content", "ai_output", "email", "sms", "marketing_page"],
  citation: "ViaConnect Standing Rule §0.3",
  description: "The compound Semaglutide is prohibited platform-wide.",
  evaluate: (text, ctx = defaultCtx()) => {
    if (typeof text !== "string" || text.length === 0) return [];
    const hits: Finding[] = [];
    for (const term of PROHIBITED_PEPTIDES) {
      const re = new RegExp(`\\b${term}\\b`, "gi");
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        hits.push(
          baseFinding(
            "MARSHALL.PEPTIDE.NO_SEMAGLUTIDE",
            "P0",
            `Finding: the compound "${term}" is prohibited platform-wide. Any occurrence in user-visible content, SKUs, or AI output is a P0 incident.`,
            "ViaConnect Standing Rule §0.3",
            redactExcerpt(text, m.index, 100),
            {
              kind: "manual",
              summary: "Remove the reference. If user intent is GLP-1 class, refer them to the peptide catalog without naming Semaglutide.",
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

export const RETATRUTIDE_INJECTABLE_ONLY: Rule<string | { id: string; name?: string }> = {
  id: "MARSHALL.PEPTIDE.RETATRUTIDE_INJECTABLE_ONLY",
  pillar: "PEPTIDE",
  severity: "P0",
  surfaces: ["source_code", "product_db", "content_cms", "checkout"],
  citation: "ViaConnect Standing Rule §0.3",
  description: "Retatrutide is injectable only; no liposomal, micellar, or nasal forms permitted.",
  evaluate: (input, ctx = defaultCtx()) => {
    const hits: Finding[] = [];
    const sku = typeof input === "string" ? input : input.id;
    const name = typeof input === "string" ? input : (input.name ?? "");
    const isRetatrutide = /\bret(?:atrutide)?\b/i.test(name) || sku.toUpperCase().startsWith("RET-");
    if (!isRetatrutide) return [];
    if (skuIsLiposomalOrAlt(sku)) {
      hits.push(
        baseFinding(
          "MARSHALL.PEPTIDE.RETATRUTIDE_INJECTABLE_ONLY",
          "P0",
          `Finding: SKU "${sku}" references Retatrutide in a non-injectable delivery form. Retatrutide is injectable-only per Standing Rule §0.3.`,
          "ViaConnect Standing Rule §0.3",
          sku,
          {
            kind: "manual",
            summary: "Remove the SKU from catalog. Retatrutide is available only as injectable (SKU prefix RET-INJ-).",
          },
          ctx,
        ),
      );
    }
    return hits;
  },
  lastReviewed: LAST_REVIEWED,
};

export const NO_RETATRUTIDE_STACKING: Rule<Array<{ sku: string; category: string }>> = {
  id: "MARSHALL.PEPTIDE.NO_RETATRUTIDE_STACKING",
  pillar: "PEPTIDE",
  severity: "P0",
  surfaces: ["checkout", "ai_output"],
  citation: "Clinical protocol memo 2026-02-11",
  description: "Retatrutide is monotherapy; cannot ship alongside other peptides.",
  evaluate: (cart, ctx = defaultCtx()) => {
    if (!Array.isArray(cart) || cart.length <= 1) return [];
    const isRetatrutide = (item: { sku: string; category: string }) =>
      /^RET-/i.test(item.sku) || /retatrutide/i.test(item.category);
    const hasRetatrutide = cart.some(isRetatrutide);
    const otherPeptides = cart.filter((i) => i.category === "peptide" && !isRetatrutide(i));
    if (!hasRetatrutide || otherPeptides.length === 0) return [];
    return [
      baseFinding(
        "MARSHALL.PEPTIDE.NO_RETATRUTIDE_STACKING",
        "P0",
        `Finding: cart contains Retatrutide alongside ${otherPeptides.length} other peptide${otherPeptides.length === 1 ? "" : "s"}. Retatrutide must ship as monotherapy.`,
        "Clinical protocol memo 2026-02-11; Standing Rule §0.3",
        MONOTHERAPY_PEPTIDES.join(", "),
        {
          kind: "manual",
          summary: "Block checkout and show consumer the monotherapy modal. They must remove other peptides or swap Retatrutide before completing purchase.",
          action: "BLOCK_CHECKOUT",
        },
        ctx,
      ),
    ];
  },
  lastReviewed: LAST_REVIEWED,
};

export const PEPTIDE_AGE_GATE: Rule<{
  cart: Array<{ sku: string; category: string; name?: string }>;
  userAge?: number | null;
}> = {
  id: "MARSHALL.PEPTIDE.PEPTIDE_AGE_GATE",
  pillar: "PEPTIDE",
  severity: "P0",
  surfaces: ["checkout"],
  citation: "Internal policy 2025-09-01",
  description: "Peptide purchases require age 18+ (21+ for cognitive stimulants).",
  evaluate: (input, ctx = defaultCtx()) => {
    const { cart, userAge } = input ?? { cart: [], userAge: null };
    if (!Array.isArray(cart) || cart.length === 0) return [];
    const peptideInCart = cart.filter((i) => i.category === "peptide");
    if (peptideInCart.length === 0) return [];

    const age = userAge ?? 0;
    const findings: Finding[] = [];
    if (age < 18) {
      findings.push(
        baseFinding(
          "MARSHALL.PEPTIDE.PEPTIDE_AGE_GATE",
          "P0",
          `Finding: peptide in cart with unverified or under-18 consumer (age=${userAge ?? "unknown"}). Blocking checkout.`,
          "Internal policy 2025-09-01",
          peptideInCart.map((p) => p.sku).join(","),
          {
            kind: "manual",
            summary: "Route consumer to age-verification flow before allowing checkout.",
            action: "REQUIRE_AGE_VERIFICATION",
          },
          ctx,
        ),
      );
    } else {
      for (const p of peptideInCart) {
        const restriction = AGE_RESTRICTED_PEPTIDES.find((r) =>
          (p.name ?? "").toLowerCase().includes(r.name) || p.sku.toLowerCase().includes(r.name),
        );
        if (restriction && age < restriction.minAge) {
          findings.push(
            baseFinding(
              "MARSHALL.PEPTIDE.PEPTIDE_AGE_GATE",
              "P0",
              `Finding: ${restriction.name} requires age ${restriction.minAge}+; consumer age ${age}.`,
              "Internal policy 2025-09-01",
              p.sku,
              {
                kind: "manual",
                summary: `Block checkout. This peptide requires age ${restriction.minAge}+.`,
                action: "BLOCK_CHECKOUT",
              },
              ctx,
            ),
          );
        }
      }
    }
    return findings;
  },
  lastReviewed: LAST_REVIEWED,
};

export const PEPTIDE_PRACTITIONER_GATE: Rule<{
  cart: Array<{ sku: string; category: string; name?: string }>;
  hasActivePractitionerLink: boolean;
}> = {
  id: "MARSHALL.PEPTIDE.PEPTIDE_PRACTITIONER_GATE",
  pillar: "PEPTIDE",
  severity: "P1",
  surfaces: ["checkout"],
  citation: "Internal clinical policy 2026-01-20",
  description: "Certain peptides require an active practitioner relationship.",
  evaluate: (input, ctx = defaultCtx()) => {
    const { cart, hasActivePractitionerLink } = input;
    if (!Array.isArray(cart) || hasActivePractitionerLink) return [];
    const gated = cart.filter(
      (p) => p.category === "peptide" && peptideRequiresPractitioner(p.name ?? p.sku),
    );
    if (gated.length === 0) return [];
    return [
      baseFinding(
        "MARSHALL.PEPTIDE.PEPTIDE_PRACTITIONER_GATE",
        "P1",
        `Finding: cart contains ${gated.length} practitioner-gated peptide${gated.length === 1 ? "" : "s"}; consumer has no active practitioner link.`,
        "Internal clinical policy 2026-01-20",
        gated.map((g) => g.sku).join(","),
        {
          kind: "manual",
          summary: "Block checkout. Show the consumer the practitioner-connection modal.",
          action: "REQUIRE_PRACTITIONER_LINK",
        },
        ctx,
      ),
    ];
  },
  lastReviewed: LAST_REVIEWED,
};

export const DELIVERY_FORM_SEPARATION: Rule<{ id: string; name?: string }> = {
  id: "MARSHALL.PEPTIDE.DELIVERY_FORM_SEPARATION",
  pillar: "PEPTIDE",
  severity: "P2",
  surfaces: ["product_db"],
  citation: "Internal SKU policy 2025-10-01",
  description: "Delivery forms tracked as distinct SKUs; no combo SKUs.",
  evaluate: (input, ctx = defaultCtx()) => {
    const sku = input.id;
    const comboSignal = /(liposomal|micellar)[-_\s]*(micellar|liposomal|nasal)/i;
    if (comboSignal.test(input.name ?? "") || comboSignal.test(sku)) {
      return [
        baseFinding(
          "MARSHALL.PEPTIDE.DELIVERY_FORM_SEPARATION",
          "P2",
          `Finding: SKU "${sku}" appears to combine delivery forms. Each form is a distinct SKU.`,
          "Internal SKU policy 2025-10-01",
          sku,
          { kind: "manual", summary: "Split this SKU into one row per delivery form." },
          ctx,
        ),
      ];
    }
    return [];
  },
  lastReviewed: LAST_REVIEWED,
};

function defaultCtx(): EvaluationContext {
  return { surface: "content_cms", source: "runtime", now: new Date() };
}

export const peptideRules: Rule[] = [
  NO_SEMAGLUTIDE,
  RETATRUTIDE_INJECTABLE_ONLY,
  NO_RETATRUTIDE_STACKING,
  PEPTIDE_AGE_GATE,
  PEPTIDE_PRACTITIONER_GATE,
  DELIVERY_FORM_SEPARATION,
];

export { SKU_FORM_PATTERN, INJECTABLE_ONLY_PEPTIDES };
