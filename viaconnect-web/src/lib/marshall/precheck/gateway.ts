/**
 * Gateway: orchestrates one pre-check session end-to-end.
 * 1. Normalize draft (SHA-256 hash, SKU match).
 * 2. Persist session row (hash only; never plaintext).
 * 3. Evaluate rules for precheck_draft surface.
 * 4. Record findings (rule-level only; no excerpts in DB).
 * 5. If clean, sign a clearance receipt and persist it.
 * 6. Return session result to caller; return the receipt JWT directly if issued.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { normalizeDraft } from "./normalize";
import { evaluateDraft, canClear, summarizeFindings } from "./evaluate";
import { issueReceipt } from "./clearance";
import { precheckLog } from "./logging";
import type {
  PrecheckDraftInput,
  PrecheckSessionResult,
  PrecheckSource,
} from "./types";
import { RULE_REGISTRY_VERSION, NORMALIZATION_VERSION } from "./types";

function serviceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("precheck gateway: missing SUPABASE env");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function publicSessionId(n: number, now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  return `PCS-${y}-${mm}${dd}-${String(n).padStart(5, "0")}`;
}

export interface RunPrecheckInput {
  practitionerId: string;
  source: PrecheckSource;
  draft: PrecheckDraftInput;
  round?: number;
  parentSessionId?: string;
}

export async function runPrecheck(input: RunPrecheckInput, db?: SupabaseClient): Promise<PrecheckSessionResult> {
  const client = db ?? serviceClient();
  const round = input.round ?? 1;

  // Normalize (never persist plaintext)
  const normalized = normalizeDraft(input.draft);

  // Create session row
  const sessionPublicId = publicSessionId(Math.floor(Math.random() * 99999));
  const { data: sessionRow, error: sErr } = await client
    .from("precheck_sessions")
    .insert({
      session_id: sessionPublicId,
      practitioner_id: input.practitionerId,
      source: input.source,
      draft_hash_sha256: normalized.hash,
      normalization_version: NORMALIZATION_VERSION,
      rule_registry_version: RULE_REGISTRY_VERSION,
      status: "evaluating",
      recursion_count: round - 1,
      target_platform: input.draft.targetPlatform ?? null,
    })
    .select("id, session_id")
    .single();
  if (sErr || !sessionRow) {
    precheckLog("error", { event: "session_insert_failed", practitionerId: input.practitionerId });
    throw new Error(`session insert failed: ${sErr?.message}`);
  }
  const sessionId = (sessionRow as { id: string; session_id: string }).id;
  const publicId = (sessionRow as { session_id: string }).session_id;

  // Evaluate
  const evalResult = await evaluateDraft(normalized, round);

  // Persist findings (rule-level only)
  if (evalResult.findings.length > 0) {
    await client.from("precheck_findings").insert(
      evalResult.findings.map((f) => ({
        session_id: sessionId,
        rule_id: f.ruleId,
        severity: f.severity,
        confidence: f.confidence,
        remediation_kind: "pending",
        round,
      })),
    );
  }

  const cleared = canClear(evalResult.findings);
  const summary = summarizeFindings(evalResult.findings);

  let receipt;
  if (cleared) {
    try {
      receipt = await issueReceipt({
        sessionId,
        practitionerId: input.practitionerId,
        draftHashSha256: normalized.hash,
        rulesRun: evalResult.rulesRun,
        findingsFinal: summary,
        publicSessionId: publicId,
      }, client);
    } catch (err) {
      precheckLog("warn", { event: "receipt_issue_failed", sessionId, practitionerId: input.practitionerId });
    }
  }

  // Update session status + final summary
  await client
    .from("precheck_sessions")
    .update({
      status: cleared ? "cleared" : "findings_presented",
      final_findings_summary: summary,
      cleared_at: cleared ? new Date().toISOString() : null,
    })
    .eq("id", sessionId);

  precheckLog("info", {
    event: "session_complete",
    sessionId,
    publicSessionId: publicId,
    practitionerId: input.practitionerId,
    severity: evalResult.worstSeverity ?? undefined,
    durationMs: evalResult.durationMs,
    round,
  });

  return {
    sessionId,
    publicSessionId: publicId,
    practitionerId: input.practitionerId,
    status: cleared ? "cleared" : "findings_presented",
    findings: evalResult.findings,
    worstSeverity: evalResult.worstSeverity,
    cleared,
    receipt,
    recursionCount: round - 1,
    summary,
  };
}
