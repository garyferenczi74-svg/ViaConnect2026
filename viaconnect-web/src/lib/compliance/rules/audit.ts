/**
 * Pillar 9 — Audit, Retention & Evidence
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

export const AUDIT_LOG_IMMUTABILITY: Rule<{ chainOk: boolean; firstBadRow?: number | null; checkedRows: number }> = {
  id: "MARSHALL.AUDIT.AUDIT_LOG_IMMUTABILITY",
  pillar: "AUDIT",
  severity: "P0",
  surfaces: ["source_code"],
  citation: "SOC 2 CC7.2; HIPAA 45 CFR 164.312(b)",
  description: "compliance_audit_log is append-only and hash-chained.",
  evaluate: (input, ctx = defaultCtx()) => {
    if (input.chainOk) return [];
    return [
      f(
        "MARSHALL.AUDIT.AUDIT_LOG_IMMUTABILITY",
        "P0",
        `Finding: audit chain tamper detected at row ${input.firstBadRow} after ${input.checkedRows} rows.`,
        "SOC 2 CC7.2",
        `row=${input.firstBadRow}`,
        { kind: "manual", summary: "Freeze writes. Escalate to Steve Rica and Gary immediately.", action: "FREEZE_AUDIT_WRITES" },
        ctx,
      ),
    ];
  },
  lastReviewed: LAST_REVIEWED,
};

export const RETENTION_SCHEDULE: Rule<{ dataClass: "health" | "marketing" | "security"; oldestRecordAgeDays: number }> = {
  id: "MARSHALL.AUDIT.RETENTION_SCHEDULE",
  pillar: "AUDIT",
  severity: "P2",
  surfaces: ["source_code"],
  citation: "HIPAA retention; state laws",
  description: "Retention: health 7y; marketing 3y; security 1y.",
  evaluate: (input, ctx = defaultCtx()) => {
    const maxDays =
      input.dataClass === "health" ? 365 * 7 : input.dataClass === "marketing" ? 365 * 3 : 365 * 1;
    if (input.oldestRecordAgeDays <= maxDays) return [];
    return [
      f(
        "MARSHALL.AUDIT.RETENTION_SCHEDULE",
        "P2",
        `Advisory: oldest ${input.dataClass} record is ${input.oldestRecordAgeDays} days, exceeds ${maxDays}-day retention.`,
        "HIPAA retention",
        input.dataClass,
        { kind: "auto", summary: "Run the nightly purge pass.", action: "RUN_PURGE" },
        ctx,
      ),
    ];
  },
  lastReviewed: LAST_REVIEWED,
};

export const ANNUAL_POLICY_REVIEW: Rule<{ ruleId: string; lastReviewed: string }> = {
  id: "MARSHALL.AUDIT.ANNUAL_POLICY_REVIEW",
  pillar: "AUDIT",
  severity: "P3",
  surfaces: ["source_code"],
  citation: "SOC 2 CC2.2",
  description: "Rules untouched for 12 months must be re-reviewed by Steve Rica.",
  evaluate: (input, ctx = defaultCtx()) => {
    const daysSince = Math.floor((Date.now() - Date.parse(input.lastReviewed)) / 86_400_000);
    if (daysSince < 365) return [];
    return [
      f(
        "MARSHALL.AUDIT.ANNUAL_POLICY_REVIEW",
        "P3",
        `Advisory: rule ${input.ruleId} not reviewed in ${daysSince} days.`,
        "SOC 2 CC2.2",
        input.ruleId,
        { kind: "suggested", summary: "Steve Rica should review and record new last_reviewed date." },
        ctx,
      ),
    ];
  },
  lastReviewed: LAST_REVIEWED,
};

export const INCIDENT_RESPONSE_PLAYBOOK: Rule<{ incidentId: string; severity: Finding["severity"]; minutesSinceOpen: number; notifiedSteve: boolean }> = {
  id: "MARSHALL.AUDIT.INCIDENT_RESPONSE_PLAYBOOK",
  pillar: "AUDIT",
  severity: "P0",
  surfaces: ["source_code"],
  citation: "Internal IR playbook",
  description: "P0 incident triggers Steve Rica notification within 15 minutes.",
  evaluate: (input, ctx = defaultCtx()) => {
    if (input.severity !== "P0") return [];
    if (input.notifiedSteve) return [];
    if (input.minutesSinceOpen < 15) return [];
    return [
      f(
        "MARSHALL.AUDIT.INCIDENT_RESPONSE_PLAYBOOK",
        "P0",
        `Finding: P0 incident ${input.incidentId} open ${input.minutesSinceOpen}m without Steve Rica notification.`,
        "Internal IR playbook",
        input.incidentId,
        { kind: "auto", summary: "Send notification now via EscalationRouter.", action: "NOTIFY_STEVE" },
        ctx,
      ),
    ];
  },
  lastReviewed: LAST_REVIEWED,
};

function defaultCtx(): EvaluationContext {
  return { surface: "source_code", source: "runtime", now: new Date() };
}

export const auditRules: Rule[] = [
  AUDIT_LOG_IMMUTABILITY,
  RETENTION_SCHEDULE,
  ANNUAL_POLICY_REVIEW,
  INCIDENT_RESPONSE_PLAYBOOK,
];
