/**
 * Pipeline step: run a normalized SocialSignal through the Marshall
 * RuleEngine with the social rule bundle, then gate the findings.
 */

import { RuleEngine } from "@/lib/compliance/engine/RuleEngine";
import { socialRules } from "@/lib/compliance/rules/social";
import type { Finding } from "@/lib/compliance/engine/types";
import type { SocialSignal } from "./bridge-types";
import { gateFindings, gateReason, type GateDecision } from "./gate";

// Singleton: the rule set is effectively immutable at runtime.
let sharedEngine: RuleEngine | null = null;
function getEngine(): RuleEngine {
  if (!sharedEngine) sharedEngine = RuleEngine.fromRules(socialRules);
  return sharedEngine;
}

export interface EvaluateResult {
  findings: Finding[];
  confidence: number;
  decision: GateDecision;
  decisionReason: string;
  durationMs: number;
}

export async function evaluateSignal(signal: SocialSignal): Promise<EvaluateResult> {
  const started = Date.now();
  const engine = getEngine();

  // Each rule evaluator takes the SocialSignalLike shape. Feed the signal
  // through the engine's evaluate() which wraps in its shared error handling.
  // We reuse `user_content` as the surface; the rules already filter by
  // their own surface list, which includes user_content + marketing_page.
  const findings: Finding[] = [];
  for (const rule of engine.rulesForSurface("user_content")) {
    try {
      const res = await rule.evaluate(signal, {
        surface: "user_content",
        source: "runtime",
        location: { url: signal.url, userId: signal.author.matchedPractitionerId ?? undefined, agent: "hounddog" },
        now: new Date(),
      });
      if (Array.isArray(res)) findings.push(...res);
    } catch (err) {
      // Fail-safe: never let a broken evaluator block the pipeline.
      // eslint-disable-next-line no-console
      console.warn(`[hounddog/evaluate] rule ${rule.id} threw: ${(err as Error).message}`);
    }
  }

  const decision = gateFindings(
    findings.map((f) => ({ ruleId: f.ruleId, severity: f.severity })),
    signal.overallConfidence,
  );

  return {
    findings,
    confidence: signal.overallConfidence,
    decision,
    decisionReason: gateReason(decision),
    durationMs: Date.now() - started,
  };
}
