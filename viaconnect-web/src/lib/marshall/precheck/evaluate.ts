/**
 * Pre-check rule evaluator. Shares the Marshall RuleEngine from #119, running
 * the precheck_draft surface. Confidence gates are tighter than Hounddog
 * because the cost of a false positive in pre-check is low.
 */

import { RuleEngine } from "@/lib/compliance/engine/RuleEngine";
import { allRules } from "@/lib/compliance/rules";
import type { Finding, Severity } from "@/lib/compliance/engine/types";
import { highestSeverity } from "@/lib/compliance/engine/types";
import type { NormalizedDraft, PrecheckFindingDto } from "./types";

// Singleton engine: the rule set is immutable at runtime.
let sharedEngine: RuleEngine | null = null;
function getEngine(): RuleEngine {
  if (!sharedEngine) sharedEngine = RuleEngine.fromRules(allRules);
  return sharedEngine;
}

// Pre-check confidence gates per the prompt spec:
// >= 0.50 surface
// >= 0.75 include in clearance-blocking calc
// >= 0.90 block clearance if unremediated
export const PRECHECK_GATES = {
  SURFACE: 0.5,
  BLOCKING_THRESHOLD: 0.75,
  HARD_BLOCK: 0.9,
} as const;

export interface EvaluateDraftResult {
  findings: PrecheckFindingDto[];
  worstSeverity: Severity | null;
  rulesRun: string[];
  durationMs: number;
}

function confidenceFor(finding: Finding, draft: NormalizedDraft): number {
  // Default confidence heuristic: if product match is present and strong,
  // confidence rides the top product match. Otherwise, default to 0.85 for
  // source_code surface rules that don't carry product matching.
  const topProduct = draft.productMatches.reduce((acc, p) => (p.confidence > acc ? p.confidence : acc), 0);
  const isContentRule = finding.ruleId.startsWith("MARSHALL.CLAIMS.") || finding.ruleId.startsWith("MARSHALL.BRAND.") || finding.ruleId.startsWith("MARSHALL.PRECHECK.");
  if (isContentRule) {
    return Math.max(0.6, topProduct || 0.75);
  }
  return topProduct || 0.85;
}

export async function evaluateDraft(draft: NormalizedDraft, round: number = 1): Promise<EvaluateDraftResult> {
  const started = Date.now();
  const engine = getEngine();
  const rulesForSurface = engine.rulesForSurface("precheck_draft");
  const rulesRun = rulesForSurface.map((r) => r.id);

  const findings: PrecheckFindingDto[] = [];
  for (const rule of rulesForSurface) {
    try {
      // Rule evaluators accept either the draft shape (for precheck rules) or
      // a string text (for reused claims/brand rules). We pass a permissive
      // wrapper and let each rule pick the shape it wants.
      const wrapper = {
        text: draft.text,
        author: {},
        productMatches: draft.productMatches,
      };
      const res = await rule.evaluate(wrapper, {
        surface: "precheck_draft",
        source: "runtime",
        location: { agent: "marshall_precheck" },
        now: new Date(),
      });
      if (!Array.isArray(res)) continue;
      for (const f of res) {
        const confidence = confidenceFor(f, draft);
        if (confidence < PRECHECK_GATES.SURFACE) continue;
        findings.push({
          ...f,
          confidence,
          round,
          remediationKind: "pending",
        });
      }
    } catch (err) {
      // Fail-safe: rule throws should never crash pre-check.
      // eslint-disable-next-line no-console
      console.warn(`[precheck/evaluate] rule ${rule.id} threw: ${(err as Error).message}`);
    }
  }

  // Also run string-shape rules (existing claims / brand etc.) by passing just text
  for (const rule of rulesForSurface) {
    if (!rule.id.startsWith("MARSHALL.PRECHECK.")) {
      try {
        const res = await rule.evaluate(draft.text, {
          surface: "precheck_draft",
          source: "runtime",
          location: { agent: "marshall_precheck" },
          now: new Date(),
        });
        if (!Array.isArray(res)) continue;
        for (const f of res) {
          // Deduplicate by (ruleId, excerpt prefix): if the wrapper call above
          // already produced this finding, skip.
          const already = findings.find((x) => x.ruleId === f.ruleId && x.excerpt.slice(0, 40) === f.excerpt.slice(0, 40));
          if (already) continue;
          const confidence = confidenceFor(f, draft);
          if (confidence < PRECHECK_GATES.SURFACE) continue;
          findings.push({ ...f, confidence, round, remediationKind: "pending" });
        }
      } catch {
        // already logged above
      }
    }
  }

  const worstSeverity = highestSeverity(findings.map((f) => f.severity));
  return { findings, worstSeverity, rulesRun, durationMs: Date.now() - started };
}

export function canClear(findings: PrecheckFindingDto[]): boolean {
  // Clearance requires zero P0, zero P1, and zero unremediated P2 at
  // confidence >= HARD_BLOCK.
  for (const f of findings) {
    if (f.severity === "P0" || f.severity === "P1") return false;
    if (f.severity === "P2" && f.confidence >= PRECHECK_GATES.HARD_BLOCK && f.remediationKind !== "user_accepted" && f.remediationKind !== "auto_applied") {
      return false;
    }
  }
  return true;
}

export function summarizeFindings(findings: PrecheckFindingDto[]) {
  return findings.reduce(
    (acc, f) => {
      const key = f.severity.toLowerCase() as "p0" | "p1" | "p2" | "p3" | "advisory";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    },
    { p0: 0, p1: 0, p2: 0, p3: 0, advisory: 0 },
  );
}
