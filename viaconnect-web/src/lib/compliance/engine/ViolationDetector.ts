/**
 * Marshall ViolationDetector — multi-source orchestrator.
 * Schedules scans, persists findings, fires escalations.
 * Server-only; uses the service-role Supabase client.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { EngineInput, Finding } from "./types";
import { RuleEngine } from "./RuleEngine";
import { allRules } from "../rules";
import { AuditLogger } from "./AuditLogger";
import { EscalationRouter } from "./EscalationRouter";
import { getEnforcementMode } from "../config/severities";

function serviceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Marshall ViolationDetector: missing SUPABASE env");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export interface DetectorResult {
  findings: Finding[];
  persistedIds: string[];
  blocked: boolean;
  mode: "enforce" | "shadow" | "off";
  durationMs: number;
}

// Shared engine singleton: the rule registry is effectively immutable at
// runtime (toggles via setEnabled), so we pay the regex-compile cost exactly
// once per process instead of per request. This keeps the 50ms budget tight.
let sharedEngine: RuleEngine | null = null;
function getSharedEngine(): RuleEngine {
  if (!sharedEngine) sharedEngine = RuleEngine.fromRules(allRules);
  return sharedEngine;
}

export class ViolationDetector {
  private engine: RuleEngine;
  private db: SupabaseClient;
  private audit: AuditLogger;
  private escalator: EscalationRouter;

  constructor(db?: SupabaseClient) {
    this.engine = getSharedEngine();
    this.db = db ?? serviceClient();
    this.audit = new AuditLogger(this.db);
    this.escalator = new EscalationRouter(this.db);
  }

  async detect(input: EngineInput): Promise<DetectorResult> {
    const started = Date.now();
    const mode = getEnforcementMode();
    if (mode === "off") {
      return { findings: [], persistedIds: [], blocked: false, mode, durationMs: Date.now() - started };
    }

    const result = await this.engine.evaluate(input);
    const persistedIds: string[] = [];

    for (const finding of result.findings) {
      const id = await this.persistFinding(finding);
      if (id) persistedIds.push(id);
      await this.audit.write({
        event_type: `finding.${finding.ruleId}`,
        actor_type: "marshall",
        actor_id: finding.source,
        payload: {
          findingId: finding.findingId,
          ruleId: finding.ruleId,
          severity: finding.severity,
          surface: finding.surface,
        },
      });
      await this.escalator.route(finding);
    }

    const blocked =
      mode === "shadow"
        ? result.findings.some((f) => f.severity === "P0")
        : result.findings.some((f) => f.severity === "P0" || f.severity === "P1");

    return { findings: result.findings, persistedIds, blocked, mode, durationMs: Date.now() - started };
  }

  private async persistFinding(finding: Finding): Promise<string | null> {
    const { data, error } = await this.db
      .from("compliance_findings")
      .insert({
        finding_id: finding.findingId,
        rule_id: finding.ruleId,
        severity: finding.severity,
        surface: finding.surface,
        source: finding.source,
        location: finding.location,
        excerpt: finding.excerpt,
        message: finding.message,
        citation: finding.citation,
        remediation: finding.remediation,
        escalated_to: finding.escalation?.to ?? null,
      })
      .select("id")
      .single();
    if (error) {
      console.warn(`[marshall] finding persist failed for ${finding.findingId}: ${error.message}`);
      return null;
    }
    return (data as { id: string }).id;
  }
}
