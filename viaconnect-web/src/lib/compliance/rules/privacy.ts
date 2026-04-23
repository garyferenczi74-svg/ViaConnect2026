/**
 * Pillar 7 — Data Privacy Rights (CCPA / CPRA / state laws / GDPR)
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

export const DSAR_SLA: Rule<{ requestId: string; jurisdiction: "gdpr" | "ccpa" | "cpra" | "quebec" | string; openedAt: string; completedAt?: string | null }> = {
  id: "MARSHALL.PRIVACY.DSAR_SLA",
  pillar: "PRIVACY",
  severity: "P1",
  surfaces: ["source_code"],
  citation: "CCPA 1798.130; GDPR Art. 12",
  description: "DSAR response within 45 days (CCPA) or 30 days (GDPR).",
  evaluate: (input, ctx = defaultCtx()) => {
    if (input.completedAt) return [];
    const slaDays = input.jurisdiction === "gdpr" ? 30 : 45;
    const daysOpen = Math.floor((Date.now() - Date.parse(input.openedAt)) / 86_400_000);
    if (daysOpen <= slaDays - 2) return [];
    const severity: Finding["severity"] = daysOpen > slaDays ? "P0" : "P1";
    return [
      f(
        "MARSHALL.PRIVACY.DSAR_SLA",
        severity,
        `${severity === "P0" ? "Finding" : "Advisory"}: DSAR ${input.requestId} (${input.jurisdiction}) open ${daysOpen}/${slaDays} days.`,
        "CCPA / GDPR",
        input.requestId,
        { kind: "manual", summary: "Escalate to Steve Rica; complete response within SLA." },
        ctx,
      ),
    ];
  },
  lastReviewed: LAST_REVIEWED,
};

export const RIGHT_TO_DELETE: Rule<{ requestId: string; cascadeSources: string[]; cascadedCount: number }> = {
  id: "MARSHALL.PRIVACY.RIGHT_TO_DELETE",
  pillar: "PRIVACY",
  severity: "P1",
  surfaces: ["source_code"],
  citation: "CCPA 1798.105; GDPR Art. 17",
  description: "Deletion cascades across all data sources.",
  evaluate: (input, ctx = defaultCtx()) => {
    if (input.cascadedCount >= input.cascadeSources.length) return [];
    return [
      f(
        "MARSHALL.PRIVACY.RIGHT_TO_DELETE",
        "P1",
        `Finding: deletion request ${input.requestId} cascaded ${input.cascadedCount}/${input.cascadeSources.length} sources.`,
        "CCPA / GDPR",
        input.requestId,
        { kind: "manual", summary: "Complete pending cascade before closing the DSAR." },
        ctx,
      ),
    ];
  },
  lastReviewed: LAST_REVIEWED,
};

export const DATA_PORTABILITY: Rule<{ requestId: string; exportFormats: string[] }> = {
  id: "MARSHALL.PRIVACY.DATA_PORTABILITY",
  pillar: "PRIVACY",
  severity: "P2",
  surfaces: ["source_code"],
  citation: "GDPR Art. 20",
  description: "Portable export in JSON and CSV within 45 days.",
  evaluate: (input, ctx = defaultCtx()) => {
    const missing = ["json", "csv"].filter((x) => !input.exportFormats.includes(x));
    if (missing.length === 0) return [];
    return [
      f(
        "MARSHALL.PRIVACY.DATA_PORTABILITY",
        "P2",
        `Advisory: portability export for ${input.requestId} missing formats: ${missing.join(", ")}.`,
        "GDPR",
        input.requestId,
        { kind: "auto", summary: "Add missing format(s) to the export payload.", action: "ADD_EXPORT_FORMATS" },
        ctx,
      ),
    ];
  },
  lastReviewed: LAST_REVIEWED,
};

export const COOKIE_CONSENT_JURISDICTIONAL: Rule<{ userCountry: string; bannerVariant: string }> = {
  id: "MARSHALL.PRIVACY.COOKIE_CONSENT_JURISDICTIONAL",
  pillar: "PRIVACY",
  severity: "P2",
  surfaces: ["marketing_page"],
  citation: "GDPR; CCPA; Quebec Law 25",
  description: "Cookie banner variant must match user jurisdiction.",
  evaluate: (input, ctx = defaultCtx()) => {
    const expected = expectedCookieBanner(input.userCountry);
    if (expected === input.bannerVariant) return [];
    return [
      f(
        "MARSHALL.PRIVACY.COOKIE_CONSENT_JURISDICTIONAL",
        "P2",
        `Advisory: cookie banner "${input.bannerVariant}" served for country "${input.userCountry}"; expected "${expected}".`,
        "Jurisdictional privacy laws",
        input.userCountry,
        { kind: "auto", summary: `Serve the "${expected}" variant.`, action: `SET_BANNER:${expected}` },
        ctx,
      ),
    ];
  },
  lastReviewed: LAST_REVIEWED,
};

function expectedCookieBanner(country: string): string {
  const c = country.toUpperCase();
  const gdpr = ["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "GB", "UK"];
  if (gdpr.includes(c)) return "gdpr_strict";
  if (c === "CA") return "quebec_aware";
  if (c === "US") return "ccpa_opt_out";
  return "generic";
}

export const SENSITIVE_DATA_OPT_IN: Rule<{ userId: string; dataType: "genetic" | "health" | "other"; hasExplicitOptIn: boolean }> = {
  id: "MARSHALL.PRIVACY.SENSITIVE_DATA_OPT_IN",
  pillar: "PRIVACY",
  severity: "P0",
  surfaces: ["source_code"],
  citation: "CPRA; HIPAA",
  description: "Genetic and health data require explicit opt-in.",
  evaluate: (input, ctx = defaultCtx()) => {
    if (input.dataType === "other" || input.hasExplicitOptIn) return [];
    return [
      f(
        "MARSHALL.PRIVACY.SENSITIVE_DATA_OPT_IN",
        "P0",
        `Finding: ${input.dataType} data processed for ${input.userId} without explicit opt-in.`,
        "CPRA / HIPAA",
        input.userId,
        { kind: "manual", summary: "Block processing; require opt-in flow.", action: "BLOCK_PROCESSING" },
        ctx,
      ),
    ];
  },
  lastReviewed: LAST_REVIEWED,
};

function defaultCtx(): EvaluationContext {
  return { surface: "source_code", source: "runtime", now: new Date() };
}

export const privacyRules: Rule[] = [
  DSAR_SLA,
  RIGHT_TO_DELETE,
  DATA_PORTABILITY,
  COOKIE_CONSENT_JURISDICTIONAL,
  SENSITIVE_DATA_OPT_IN,
];
