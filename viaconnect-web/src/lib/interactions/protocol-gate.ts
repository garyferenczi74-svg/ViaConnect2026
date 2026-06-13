/**
 * Protocol Safety Gate (2026-06-12, Gary directive).
 *
 * Server-side pre-save pipeline for AI-generated supplement protocols. Three
 * lanes run over every protocol before it is persisted or shown:
 *
 *   1. Interactions: the deterministic product x medication cross-check from
 *      src/lib/ai/interaction-engine.ts (INTERACTION_DB + CYP escalation).
 *      Runs as the floor under any AI-powered analysis; critical hits block.
 *   2. Marshall lane: compliance pillars (peptide, brand, genetic, marketing,
 *      comms, practitioner, counterfeit, audit, social, precheck, rebuttal)
 *      evaluated by the Marshall RuleEngine over each item's copy.
 *   3. Lex lane: legal exposure pillars (claims, privacy, MAP) evaluated by
 *      the same engine; FDA/FTC claims language is Lex's verdict to carry.
 *
 * P0 findings and critical interactions block the offending product. The
 * full gate report is returned for persistence into protocol_data.gate so
 * every shipped protocol carries its audit trail.
 */

import { RuleEngine } from "@/lib/compliance/engine/RuleEngine";
import { allRules } from "@/lib/compliance/rules";
import { safeLog } from "@/lib/utils/safe-log";
import type { Finding, Pillar } from "@/lib/compliance/engine/types";
import {
  checkProductInteractions,
  type InteractionCheck,
} from "@/lib/ai/interaction-engine";
import { filterBlockedFromProtocol } from "@/lib/interactions/safety-gate";

export { filterBlockedFromProtocol };

// Pillar attribution: which fleet reviewer owns a finding in the gate report.
const LEX_PILLARS: ReadonlyArray<Pillar> = ["CLAIMS", "PRIVACY", "MAP"];

export interface ProtocolGateItem {
  productName: string;
  reason?: string;
}

export interface ProtocolGateInput {
  items: ProtocolGateItem[];
  medications: string[];
  cypStatusMap?: Record<string, string>;
}

export type GateLane = "interactions" | "marshall" | "lex";
export type GateLaneStatus = "ok" | "failed";

export interface ProtocolGateReport {
  gateVersion: 1;
  reviewedBy: GateLane[];
  // Per-lane outcome. The interactions lane is the medical-safety floor:
  // its failure is loud (safeLog.error) and flips degraded so a persisted
  // report can never claim an interaction review that crashed.
  laneStatus: Record<GateLane, GateLaneStatus>;
  degraded: boolean;
  blockedProducts: string[];
  interactions: InteractionCheck[];
  marshallFindings: Finding[];
  lexFindings: Finding[];
}

/**
 * Persistence shape for protocol_data.gate: counts, verdicts, and per-finding
 * {ruleId, severity, lane} ONLY. Full Finding objects stay out of consumer
 * readable rows: the engine's redactExcerpt centers on the hit rather than
 * removing it, so a P0 peptide finding would otherwise persist the prohibited
 * compound (and escalation personnel slugs) on the very row the block was
 * protecting.
 */
export interface PersistedGateSummary {
  gateVersion: 1;
  reviewedBy: GateLane[];
  laneStatus: Record<GateLane, GateLaneStatus>;
  degraded: boolean;
  blockedProducts: string[];
  marshallFindingCount: number;
  lexFindingCount: number;
  findings: Array<{ ruleId: string; severity: string; lane: "marshall" | "lex" }>;
  interactions: InteractionCheck[];
}

// PEPTIDE rule IDs name the prohibited compound in their final segment
// (the dictionary convention), so even the bare ruleId would re-introduce
// the term the block exists to keep off the row. Persist those as the
// pillar prefix only; the full ruleId remains in the admin-side Marshall
// findings pipeline.
function persistedRuleId(ruleId: string): string {
  return ruleId.startsWith("MARSHALL.PEPTIDE.")
    ? "MARSHALL.PEPTIDE.REDACTED"
    : ruleId;
}

export function toPersistedGateSummary(report: ProtocolGateReport): PersistedGateSummary {
  return {
    gateVersion: report.gateVersion,
    reviewedBy: report.reviewedBy,
    laneStatus: report.laneStatus,
    degraded: report.degraded,
    blockedProducts: report.blockedProducts,
    marshallFindingCount: report.marshallFindings.length,
    lexFindingCount: report.lexFindings.length,
    findings: [
      ...report.marshallFindings.map((f) => ({ ruleId: persistedRuleId(f.ruleId), severity: f.severity as string, lane: "marshall" as const })),
      ...report.lexFindings.map((f) => ({ ruleId: persistedRuleId(f.ruleId), severity: f.severity as string, lane: "lex" as const })),
    ],
    interactions: report.interactions,
  };
}

const engine = RuleEngine.fromRules(allRules);

function isLexFinding(finding: Finding): boolean {
  const rule = engine.getRule(finding.ruleId);
  return rule ? LEX_PILLARS.includes(rule.pillar) : false;
}

/**
 * Runs all three gate lanes. Never throws and never fails generation, but
 * the posture differs by lane: the copy lanes (Marshall, Lex) fail open
 * quietly because the RuleEngine already degrades broken evaluators, while
 * the interactions lane is the medical-safety floor, so its failure logs at
 * error level and flips the degraded flag on the report. Blocking is
 * per-product, never whole-protocol.
 */
export async function runProtocolGate(
  input: ProtocolGateInput,
): Promise<ProtocolGateReport> {
  const blocked = new Set<string>();
  const laneStatus: Record<GateLane, GateLaneStatus> = {
    interactions: "ok",
    marshall: "ok",
    lex: "ok",
  };

  // Lane 1: deterministic interaction floor.
  let interactions: InteractionCheck[] = [];
  try {
    interactions = checkProductInteractions(
      input.items.map((i) => i.productName),
      input.medications,
      input.cypStatusMap ?? {},
    );
    for (const hit of interactions) {
      if (hit.severity === "critical") blocked.add(hit.supplement.toLowerCase());
    }
  } catch (err) {
    laneStatus.interactions = "failed";
    safeLog.error("protocol-gate", "interaction floor crashed; protocol proceeds WITHOUT interaction review", { error: err });
  }

  // Lanes 2 + 3: one engine pass per item, findings attributed by pillar.
  const marshallFindings: Finding[] = [];
  const lexFindings: Finding[] = [];
  for (const item of input.items) {
    const copy = [item.productName, item.reason ?? ""].join(". ");
    try {
      const result = await engine.evaluate({
        surface: "ai_output",
        source: "runtime",
        content: copy,
        aiOutput: { agent: "protocol-gate", text: copy },
        location: { agent: "protocol-gate" },
      });
      for (const finding of result.findings) {
        if (isLexFinding(finding)) lexFindings.push(finding);
        else marshallFindings.push(finding);
        if (finding.severity === "P0") blocked.add(item.productName.toLowerCase());
      }
    } catch {
      // Copy lanes fail open; the interaction floor above still applies.
      laneStatus.marshall = "failed";
      laneStatus.lex = "failed";
    }
  }

  const reviewedBy = (Object.keys(laneStatus) as GateLane[]).filter(
    (lane) => laneStatus[lane] === "ok",
  );

  return {
    gateVersion: 1,
    reviewedBy,
    laneStatus,
    degraded: laneStatus.interactions === "failed",
    blockedProducts: input.items
      .map((i) => i.productName)
      .filter((name) => blocked.has(name.toLowerCase())),
    interactions,
    marshallFindings,
    lexFindings,
  };
}
