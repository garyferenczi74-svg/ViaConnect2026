/**
 * Marshall RuleEngine (Prompt #119)
 * Pure evaluator. Given a set of rules and an input, returns the finding list.
 * Stateless. Tree-shakable. Edge-compatible.
 */

import type {
  EngineInput,
  EngineResult,
  Finding,
  Rule,
  Severity,
  Surface,
} from "./types";
import { highestSeverity } from "./types";

export interface RuleRegistry {
  rules: Rule[];
  enabled: Record<string, boolean>;
}

function pickInputForRule(rule: Rule, input: EngineInput): unknown {
  if (rule.surfaces.includes(input.surface) === false) return undefined;
  switch (input.surface) {
    case "ai_output":
      return input.aiOutput ?? input.content ?? "";
    case "checkout":
      return input.cart ?? [];
    case "email":
    case "sms":
      return input.email ?? input.content ?? "";
    case "product_db":
      return input.sku;
    case "source_code":
    case "migration":
    case "content_cms":
    case "user_content":
    case "marketing_page":
      return input.content ?? "";
    default:
      return input.content ?? "";
  }
}

function buildEvaluationContext(input: EngineInput) {
  return {
    surface: input.surface,
    source: input.source,
    location: input.location,
    userRole: input.userRole,
    jurisdiction: input.jurisdiction,
    now: new Date(),
  };
}

export class RuleEngine {
  constructor(private readonly registry: RuleRegistry) {}

  static fromRules(rules: Rule[]): RuleEngine {
    const enabled: Record<string, boolean> = {};
    for (const r of rules) enabled[r.id] = true;
    return new RuleEngine({ rules, enabled });
  }

  setEnabled(ruleId: string, enabled: boolean): void {
    this.registry.enabled[ruleId] = enabled;
  }

  getRule(ruleId: string): Rule | undefined {
    return this.registry.rules.find((r) => r.id === ruleId);
  }

  getRules(): Rule[] {
    return this.registry.rules.slice();
  }

  rulesForSurface(surface: Surface): Rule[] {
    return this.registry.rules.filter(
      (r) => this.registry.enabled[r.id] !== false && r.surfaces.includes(surface),
    );
  }

  async evaluate(input: EngineInput): Promise<EngineResult> {
    const started = Date.now();
    const applicable = this.rulesForSurface(input.surface);
    const ctx = buildEvaluationContext(input);
    const findings: Finding[] = [];

    for (const rule of applicable) {
      const ruleInput = pickInputForRule(rule, input);
      if (ruleInput === undefined || ruleInput === null) continue;
      try {
        const result = await rule.evaluate(ruleInput, ctx);
        if (Array.isArray(result) && result.length > 0) {
          for (const f of result) {
            findings.push({
              ...f,
              source: input.source,
              surface: input.surface,
              location: { ...f.location, ...(input.location ?? {}) },
            });
          }
        }
      } catch (err) {
        // Fail-safe: a broken evaluator cannot leak the offending content.
        // Emit an ADVISORY so ops notices the rule needs attention.
        findings.push({
          findingId: `M-ENGINE-ERROR-${rule.id}`,
          ruleId: rule.id,
          severity: "ADVISORY",
          surface: input.surface,
          source: input.source,
          location: input.location ?? {},
          excerpt: "[rule evaluator threw]",
          message: `Marshall rule ${rule.id} threw during evaluation: ${(err as Error).message}`,
          citation: rule.citation,
          remediation: {
            kind: "manual",
            summary: "Investigate and repair the evaluator; Marshall is defaulting to pass for this rule.",
          },
          createdAt: new Date().toISOString(),
        });
      }
    }

    const severities: Severity[] = findings.map((f) => f.severity);
    return {
      findings,
      durationMs: Date.now() - started,
      rulesEvaluated: applicable.length,
      highestSeverity: highestSeverity(severities),
    };
  }
}
