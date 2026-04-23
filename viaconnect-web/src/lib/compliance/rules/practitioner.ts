/**
 * Pillar 4 — Practitioner Verification & Scope of Practice
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

export const NPI_VERIFIED: Rule<{ practitionerId: string; npi: string | null; npiStatus?: "active" | "deactivated" | "not_found" | null }> = {
  id: "MARSHALL.PRACTITIONER.NPI_VERIFIED",
  pillar: "PRACTITIONER",
  severity: "P1",
  surfaces: ["source_code", "product_db"],
  citation: "CMS NPPES",
  description: "Every practitioner must resolve to a valid, active NPI.",
  evaluate: (input, ctx = defaultCtx()) => {
    if (!input.npi || input.npiStatus !== "active") {
      return [
        f(
          "MARSHALL.PRACTITIONER.NPI_VERIFIED",
          "P1",
          `Finding: practitioner ${input.practitionerId} NPI status "${input.npiStatus ?? "missing"}".`,
          "CMS NPPES",
          input.practitionerId,
          { kind: "manual", summary: "Suspend practitioner account pending NPI verification.", action: "SUSPEND_PRACTITIONER" },
          ctx,
        ),
      ];
    }
    return [];
  },
  lastReviewed: LAST_REVIEWED,
};

export const LICENSE_STATE_MATCH: Rule<{ practitionerId: string; licensedStates: string[]; patientState: string }> = {
  id: "MARSHALL.PRACTITIONER.LICENSE_STATE_MATCH",
  pillar: "PRACTITIONER",
  severity: "P0",
  surfaces: ["source_code", "product_db"],
  citation: "State licensure boards",
  description: "Practitioner may only treat patients in licensed states.",
  evaluate: (input, ctx = defaultCtx()) => {
    if (input.licensedStates.includes(input.patientState)) return [];
    return [
      f(
        "MARSHALL.PRACTITIONER.LICENSE_STATE_MATCH",
        "P0",
        `Finding: practitioner ${input.practitionerId} not licensed in patient state "${input.patientState}".`,
        "State licensure boards",
        `${input.practitionerId}->${input.patientState}`,
        { kind: "manual", summary: "Block care relationship. Escalate to Steve Rica.", action: "BLOCK_CARE" },
        ctx,
      ),
    ];
  },
  lastReviewed: LAST_REVIEWED,
};

export const SCOPE_OF_PRACTICE: Rule<{
  practitionerId: string;
  role: "MD" | "DO" | "NP" | "PA" | "ND" | "DC" | "coach";
  state: string;
  action: "prescribe" | "recommend_supplement" | "write_protocol";
  substance?: "peptide" | "supplement" | "rx";
}> = {
  id: "MARSHALL.PRACTITIONER.SCOPE_OF_PRACTICE",
  pillar: "PRACTITIONER",
  severity: "P0",
  surfaces: ["source_code", "ai_output"],
  citation: "State scope of practice statutes",
  description: "Practitioner actions gated by role + state + substance.",
  evaluate: (input, ctx = defaultCtx()) => {
    const findings: Finding[] = [];
    if (input.role === "coach" && input.action !== "recommend_supplement") {
      findings.push(
        f(
          "MARSHALL.PRACTITIONER.SCOPE_OF_PRACTICE",
          "P0",
          `Finding: wellness coach attempted "${input.action}"; coaches may only recommend non-Rx supplements.`,
          "State scope of practice",
          input.practitionerId,
          { kind: "manual", summary: "Block action. Surface coach-scope banner.", action: "BLOCK_ACTION" },
          ctx,
        ),
      );
    }
    if (input.role === "DC" && input.substance === "peptide" && input.action === "prescribe") {
      findings.push(
        f(
          "MARSHALL.PRACTITIONER.SCOPE_OF_PRACTICE",
          "P0",
          "Finding: chiropractor attempted to prescribe peptide; outside scope.",
          "State chiropractic scope",
          input.practitionerId,
          { kind: "manual", summary: "Block prescribe action.", action: "BLOCK_ACTION" },
          ctx,
        ),
      );
    }
    return findings;
  },
  lastReviewed: LAST_REVIEWED,
};

export const TELEHEALTH_INTERSTATE: Rule<{ practitionerState: string; patientState: string; compactMember: boolean }> = {
  id: "MARSHALL.PRACTITIONER.TELEHEALTH_INTERSTATE",
  pillar: "PRACTITIONER",
  severity: "P1",
  surfaces: ["source_code"],
  citation: "Interstate Medical Licensure Compact",
  description: "Interstate telehealth requires compact membership or direct licensure.",
  evaluate: (input, ctx = defaultCtx()) => {
    if (input.practitionerState === input.patientState || input.compactMember) return [];
    return [
      f(
        "MARSHALL.PRACTITIONER.TELEHEALTH_INTERSTATE",
        "P1",
        `Finding: telehealth session ${input.practitionerState}->${input.patientState} without compact membership.`,
        "IMLC",
        `${input.practitionerState}->${input.patientState}`,
        { kind: "manual", summary: "Block or reschedule with a locally licensed provider." },
        ctx,
      ),
    ];
  },
  lastReviewed: LAST_REVIEWED,
};

export const SANCTION_RECHECK: Rule<{ practitionerId: string; lastChecked: string; oigHit?: boolean }> = {
  id: "MARSHALL.PRACTITIONER.SANCTION_RECHECK",
  pillar: "PRACTITIONER",
  severity: "P0",
  surfaces: ["source_code"],
  citation: "OIG LEIE",
  description: "Sanction checks re-run weekly; any hit triggers suspension.",
  evaluate: (input, ctx = defaultCtx()) => {
    if (input.oigHit) {
      return [
        f(
          "MARSHALL.PRACTITIONER.SANCTION_RECHECK",
          "P0",
          `Finding: practitioner ${input.practitionerId} appears on OIG LEIE.`,
          "OIG LEIE",
          input.practitionerId,
          { kind: "manual", summary: "Immediate suspension; escalate to Steve Rica.", action: "SUSPEND_PRACTITIONER" },
          ctx,
        ),
      ];
    }
    const daysSince = Math.floor((Date.now() - Date.parse(input.lastChecked)) / 86_400_000);
    if (daysSince > 7) {
      return [
        f(
          "MARSHALL.PRACTITIONER.SANCTION_RECHECK",
          "P2",
          `Advisory: practitioner ${input.practitionerId} sanction check ${daysSince} days stale.`,
          "OIG LEIE",
          input.practitionerId,
          { kind: "auto", summary: "Schedule immediate re-check.", action: "RUN_SANCTION_CHECK" },
          ctx,
        ),
      ];
    }
    return [];
  },
  lastReviewed: LAST_REVIEWED,
};

function defaultCtx(): EvaluationContext {
  return { surface: "source_code", source: "runtime", now: new Date() };
}

export const practitionerRules: Rule[] = [
  NPI_VERIFIED,
  LICENSE_STATE_MATCH,
  SCOPE_OF_PRACTICE,
  TELEHEALTH_INTERSTATE,
  SANCTION_RECHECK,
];
