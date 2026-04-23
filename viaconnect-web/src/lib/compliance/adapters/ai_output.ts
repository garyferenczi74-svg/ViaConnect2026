/**
 * AI output adapter — scans AI advisor output (Jeffery, Gordan, Arnold, Hannah,
 * portal advisors) BEFORE it hits the user's screen. Synchronous preferred;
 * 50ms budget per the spec.
 */

import { ViolationDetector } from "../engine/ViolationDetector";
import { AutoRemediator } from "../engine/AutoRemediator";
import { RuleEngine } from "../engine/RuleEngine";
import { allRules } from "../rules";
import type { Finding } from "../engine/types";

// Module-scoped singletons. Constructing a RuleEngine per request was burning
// the 50ms render budget; the registry is effectively immutable at runtime
// (Supabase mirror toggles flow through setEnabled).
let cachedEngine: RuleEngine | null = null;
let cachedRemediator: AutoRemediator<string> | null = null;
function getEngine(): RuleEngine {
  if (!cachedEngine) cachedEngine = RuleEngine.fromRules(allRules);
  return cachedEngine;
}
function getRemediator(): AutoRemediator<string> {
  if (!cachedRemediator) {
    const engine = getEngine();
    cachedRemediator = new AutoRemediator<string>((id) => engine.getRule(id));
  }
  return cachedRemediator;
}

export interface AiOutputInput {
  agent: string;
  userId?: string;
  userRole?: string;
  text: string;
  recommendedSkus?: string[];
  patientId?: string | null;
}

export interface AiOutputScanResult {
  cleanedText: string;
  findings: Finding[];
  blocked: boolean;
  autoApplied: string[];
}

export async function scanAiOutput(input: AiOutputInput): Promise<AiOutputScanResult> {
  const detector = new ViolationDetector();
  const res = await detector.detect({
    surface: "ai_output",
    source: "runtime",
    aiOutput: { agent: input.agent, text: input.text },
    content: input.text,
    userRole: input.userRole,
    location: { agent: input.agent, userId: input.userId },
  });

  const remediated = await getRemediator().apply(input.text, res.findings);

  return {
    cleanedText: remediated.remediated,
    findings: res.findings,
    blocked: res.blocked,
    autoApplied: remediated.appliedActions,
  };
}
