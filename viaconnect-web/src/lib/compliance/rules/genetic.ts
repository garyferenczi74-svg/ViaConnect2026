/**
 * Pillar 3 — Genetic Data & HIPAA
 */

import type { EvaluationContext, Finding, Rule } from "../engine/types";
import { generateFindingId } from "../engine/types";

const LAST_REVIEWED = "2026-04-23";

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

export const GENEX360_CONSENT: Rule<{ userId: string; hasConsent: boolean; consentVersion?: string; requiredVersion: string }> = {
  id: "MARSHALL.GENETIC.GENEX360_CONSENT",
  pillar: "GENETIC",
  severity: "P0",
  surfaces: ["content_cms", "ai_output"],
  citation: "HIPAA 45 CFR 164.506; GINA",
  description: "Genetic reports require version-pinned consent.",
  evaluate: (input, ctx = defaultCtx()) => {
    if (input.hasConsent && input.consentVersion === input.requiredVersion) return [];
    return [
      f(
        "MARSHALL.GENETIC.GENEX360_CONSENT",
        "P0",
        `Finding: GeneX360 report attempt without valid v${input.requiredVersion} consent (have: ${input.consentVersion ?? "none"}).`,
        "HIPAA 45 CFR 164.506",
        `userId=${input.userId}`,
        { kind: "manual", summary: "Block report rendering; route user to consent flow.", action: "BLOCK_RENDER" },
        ctx,
      ),
    ];
  },
  lastReviewed: LAST_REVIEWED,
};

export const BAA_REQUIRED_VENDORS: Rule<{ vendorName: string; hasBaa: boolean; baaExpiresOn?: string | null }> = {
  id: "MARSHALL.GENETIC.BAA_REQUIRED_VENDORS",
  pillar: "GENETIC",
  severity: "P0",
  surfaces: ["source_code"],
  citation: "HIPAA 45 CFR 164.308(b)",
  description: "Every vendor receiving PHI must have a current BAA on file.",
  evaluate: (input, ctx = defaultCtx()) => {
    if (!input.hasBaa) {
      return [
        f(
          "MARSHALL.GENETIC.BAA_REQUIRED_VENDORS",
          "P0",
          `Finding: vendor "${input.vendorName}" receives PHI but has no BAA record.`,
          "HIPAA 45 CFR 164.308(b)",
          input.vendorName,
          { kind: "manual", summary: "Suspend data flow to vendor until BAA is executed and stored in vendor_baas.", action: "FREEZE_VENDOR" },
          ctx,
        ),
      ];
    }
    if (input.baaExpiresOn) {
      const expires = new Date(input.baaExpiresOn);
      const daysOut = Math.ceil((expires.getTime() - Date.now()) / 86_400_000);
      if (daysOut < 0) {
        return [
          f(
            "MARSHALL.GENETIC.BAA_REQUIRED_VENDORS",
            "P0",
            `Finding: vendor "${input.vendorName}" BAA expired ${Math.abs(daysOut)} days ago.`,
            "HIPAA 45 CFR 164.308(b)",
            input.vendorName,
            { kind: "manual", summary: "Renew BAA immediately and update vendor_baas.", action: "FREEZE_VENDOR" },
            ctx,
          ),
        ];
      }
      if (daysOut <= 60) {
        return [
          f(
            "MARSHALL.GENETIC.BAA_REQUIRED_VENDORS",
            "P2",
            `Advisory: vendor "${input.vendorName}" BAA expires in ${daysOut} days.`,
            "HIPAA 45 CFR 164.308(b)",
            input.vendorName,
            { kind: "suggested", summary: "Begin BAA renewal process." },
            ctx,
          ),
        ];
      }
    }
    return [];
  },
  lastReviewed: LAST_REVIEWED,
};

export const MINOR_GENETIC_LOCK: Rule<{ userAge: number; hasGuardianConsent?: boolean }> = {
  id: "MARSHALL.GENETIC.MINOR_GENETIC_LOCK",
  pillar: "GENETIC",
  severity: "P0",
  surfaces: ["checkout", "content_cms"],
  citation: "GINA; COPPA 16 CFR 312",
  description: "Genetic sampling blocked under 18; 13-17 requires guardian consent.",
  evaluate: (input, ctx = defaultCtx()) => {
    if (input.userAge >= 18) return [];
    if (input.userAge < 13) {
      return [
        f(
          "MARSHALL.GENETIC.MINOR_GENETIC_LOCK",
          "P0",
          `Finding: genetic sampling attempted for user age ${input.userAge}. Blocked.`,
          "COPPA 16 CFR 312",
          `age=${input.userAge}`,
          { kind: "manual", summary: "Block genetic flow entirely.", action: "BLOCK" },
          ctx,
        ),
      ];
    }
    if (!input.hasGuardianConsent) {
      return [
        f(
          "MARSHALL.GENETIC.MINOR_GENETIC_LOCK",
          "P0",
          `Finding: minor (${input.userAge}) attempting genetic sampling without guardian consent.`,
          "GINA",
          `age=${input.userAge}`,
          { kind: "manual", summary: "Require parental/guardian consent form.", action: "REQUIRE_GUARDIAN_CONSENT" },
          ctx,
        ),
      ];
    }
    return [];
  },
  lastReviewed: LAST_REVIEWED,
};

export const DEIDENTIFICATION_CHECK: Rule<{ exportName: string; quasiIds: string[]; kValue: number }> = {
  id: "MARSHALL.GENETIC.DEIDENTIFICATION_CHECK",
  pillar: "GENETIC",
  severity: "P1",
  surfaces: ["source_code"],
  citation: "HIPAA 45 CFR 164.514 Safe Harbor",
  description: "Analytics exports must satisfy k-anonymity (k >= 5 on quasi-identifiers).",
  evaluate: (input, ctx = defaultCtx()) => {
    if (input.kValue >= 5) return [];
    return [
      f(
        "MARSHALL.GENETIC.DEIDENTIFICATION_CHECK",
        "P1",
        `Finding: export "${input.exportName}" k=${input.kValue} on {${input.quasiIds.join(",")}}; fails k>=5.`,
        "HIPAA Safe Harbor",
        input.exportName,
        { kind: "manual", summary: "Aggregate or suppress quasi-identifiers until k>=5." },
        ctx,
      ),
    ];
  },
  lastReviewed: LAST_REVIEWED,
};

export const CROSS_BORDER_TRANSFER: Rule<{ destinationCountry: string; hasConsent: boolean }> = {
  id: "MARSHALL.GENETIC.CROSS_BORDER_TRANSFER",
  pillar: "GENETIC",
  severity: "P1",
  surfaces: ["source_code"],
  citation: "GDPR Chapter V; PIPEDA",
  description: "PHI transfer outside the US requires explicit cross-border consent.",
  evaluate: (input, ctx = defaultCtx()) => {
    if (input.destinationCountry === "US" || input.hasConsent) return [];
    return [
      f(
        "MARSHALL.GENETIC.CROSS_BORDER_TRANSFER",
        "P1",
        `Finding: PHI transfer to ${input.destinationCountry} without cross-border consent flag.`,
        "GDPR Chapter V",
        input.destinationCountry,
        { kind: "manual", summary: "Block transfer until user grants cross-border consent." },
        ctx,
      ),
    ];
  },
  lastReviewed: LAST_REVIEWED,
};

function defaultCtx(): EvaluationContext {
  return { surface: "source_code", source: "runtime", now: new Date() };
}

export const geneticRules: Rule[] = [
  GENEX360_CONSENT,
  BAA_REQUIRED_VENDORS,
  MINOR_GENETIC_LOCK,
  DEIDENTIFICATION_CHECK,
  CROSS_BORDER_TRANSFER,
];
