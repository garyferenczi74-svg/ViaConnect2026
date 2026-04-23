/**
 * Pillar 5 — MAP Pricing (adapter into existing map_waivers + monitoring from #100-#102)
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

export const MAP_VIOLATION_DETECTED: Rule<{
  practitionerId: string;
  sku: string;
  observedPrice: number;
  mapFloor: number;
  strikeCount30d: number;
  hasActiveWaiver: boolean;
}> = {
  id: "MARSHALL.MAP.VIOLATION_DETECTED",
  pillar: "MAP",
  severity: "P1",
  surfaces: ["product_db", "user_content"],
  citation: "FarmCeutica MAP policy v3",
  description: "MAP violation detected; escalate per policy.",
  evaluate: (input, ctx = defaultCtx()) => {
    if (input.hasActiveWaiver) return [];
    if (input.observedPrice >= input.mapFloor) return [];
    const severity: Finding["severity"] = input.strikeCount30d >= 2 ? "P0" : "P1";
    return [
      f(
        "MARSHALL.MAP.VIOLATION_DETECTED",
        severity,
        `Finding: practitioner ${input.practitionerId} sold SKU ${input.sku} at $${input.observedPrice} (floor $${input.mapFloor}). Strikes: ${input.strikeCount30d}.`,
        "MAP policy v3",
        `${input.sku}@$${input.observedPrice}`,
        {
          kind: "manual",
          summary:
            input.strikeCount30d >= 2
              ? "Three-strike threshold; freeze practitioner account pending review."
              : "Record strike; notify practitioner.",
          action: input.strikeCount30d >= 2 ? "FREEZE_PRACTITIONER" : "RECORD_STRIKE",
        },
        ctx,
      ),
    ];
  },
  lastReviewed: LAST_REVIEWED,
};

export const WAIVER_ACTIVE: Rule<{ practitionerId: string; waiverId: string | null; waiverStatus?: string; waiverExpiresAt?: string }> = {
  id: "MARSHALL.MAP.WAIVER_ACTIVE",
  pillar: "MAP",
  severity: "P2",
  surfaces: ["product_db"],
  citation: "MAP policy v3",
  description: "Practitioner MAP waiver must be on file, in-date, and not revoked.",
  evaluate: (input, ctx = defaultCtx()) => {
    if (!input.waiverId) return [];
    if (input.waiverStatus !== "active") {
      return [
        f(
          "MARSHALL.MAP.WAIVER_ACTIVE",
          "P2",
          `Advisory: practitioner ${input.practitionerId} waiver ${input.waiverId} status "${input.waiverStatus}".`,
          "MAP policy v3",
          input.waiverId,
          { kind: "manual", summary: "Refresh or revoke the waiver." },
          ctx,
        ),
      ];
    }
    if (input.waiverExpiresAt && Date.parse(input.waiverExpiresAt) < Date.now()) {
      return [
        f(
          "MARSHALL.MAP.WAIVER_ACTIVE",
          "P2",
          `Advisory: waiver ${input.waiverId} expired ${input.waiverExpiresAt}.`,
          "MAP policy v3",
          input.waiverId,
          { kind: "manual", summary: "Expire the waiver row and re-evaluate strikes." },
          ctx,
        ),
      ];
    }
    return [];
  },
  lastReviewed: LAST_REVIEWED,
};

export const VIP_EXEMPTION_VERIFIED: Rule<{ waiverId: string; approverId: string; approverRole: string; reason: string }> = {
  id: "MARSHALL.MAP.VIP_EXEMPTION_VERIFIED",
  pillar: "MAP",
  severity: "P1",
  surfaces: ["source_code"],
  citation: "MAP policy v3 + CFO signoff requirement",
  description: "VIP MAP exemptions require CFO approval signature.",
  evaluate: (input, ctx = defaultCtx()) => {
    if (!/vip/i.test(input.reason)) return [];
    if (input.approverRole !== "cfo") {
      return [
        f(
          "MARSHALL.MAP.VIP_EXEMPTION_VERIFIED",
          "P1",
          `Finding: VIP MAP waiver ${input.waiverId} approved by role "${input.approverRole}"; CFO approval required.`,
          "MAP policy v3",
          input.waiverId,
          { kind: "manual", summary: "Revoke waiver; re-route to CFO (Domenic Romeo)." },
          ctx,
        ),
      ];
    }
    return [];
  },
  lastReviewed: LAST_REVIEWED,
};

function defaultCtx(): EvaluationContext {
  return { surface: "product_db", source: "runtime", now: new Date() };
}

export const mapRules: Rule[] = [MAP_VIOLATION_DETECTED, WAIVER_ACTIVE, VIP_EXEMPTION_VERIFIED];
