/**
 * Hounddog cross-check: invoked by lib/hounddog/write.ts BEFORE persisting
 * a finding. Looks up active clearance receipts for the author; adjusts
 * severity per the good-faith / bad-faith rules from Prompt #121 Section 7.
 *
 * Write path:
 *   - exact hash match + in-date -> soften severity one step
 *   - high Jaccard similarity    -> analyze delta:
 *       removed disclosure / added claim -> raise severity one step
 *       else                              -> soften severity one step
 *   - no receipt                 -> no adjustment
 */

import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Finding, Severity } from "@/lib/compliance/engine/types";
import { jaccardSimilarity } from "./clearance";

const JACCARD_THRESHOLD = 0.85;

const SEVERITY_CHAIN: Severity[] = ["ADVISORY", "P3", "P2", "P1", "P0"];
function shiftSeverity(sev: Severity, delta: number): Severity {
  const i = SEVERITY_CHAIN.indexOf(sev);
  const next = Math.min(SEVERITY_CHAIN.length - 1, Math.max(0, i + delta));
  return SEVERITY_CHAIN[next];
}

export interface CrossCheckInput {
  finding: Finding;
  signal: {
    matchedPractitionerId?: string | null;
    content: { textDerived?: string };
  };
}

export interface CrossCheckResult {
  adjusted: boolean;
  severityBefore: Severity;
  severityAfter: Severity;
  receiptId?: string;
  matchKind: "exact_hash" | "high_similarity" | "no_receipt";
  outcome: "good_faith_credit" | "bad_faith_penalty" | "no_adjustment";
  jaccardSimilarity?: number;
}

function sha256Hex(text: string): string {
  return createHash("sha256")
    .update(text.normalize("NFKD").replace(/\s+/g, " ").trim(), "utf8")
    .digest("hex");
}

function removedDisclosureOrAddedClaim(originalHashText: string | null, currentText: string): boolean {
  if (!originalHashText) return false;
  const hadDisclosure = /\b#(ad|sponsored|partner|paidpartnership)\b|paid partnership|i am a practitioner/i.test(originalHashText);
  const hasDisclosure = /\b#(ad|sponsored|partner|paidpartnership)\b|paid partnership|i am a practitioner/i.test(currentText);
  if (hadDisclosure && !hasDisclosure) return true;

  const priorClaim = /\b(cure|cures|cured|treat|treats|treated|prevent|prevents|heal|heals|reverse|reverses)\b/i.test(originalHashText);
  const newClaim = /\b(cure|cures|cured|treat|treats|treated|prevent|prevents|heal|heals|reverse|reverses)\b/i.test(currentText);
  if (!priorClaim && newClaim) return true;

  return false;
}

export async function applyClearanceAdjustment(
  input: CrossCheckInput,
  db: SupabaseClient,
): Promise<CrossCheckResult> {
  const { finding, signal } = input;
  const severityBefore = finding.severity;

  if (!signal.matchedPractitionerId) {
    return { adjusted: false, severityBefore, severityAfter: severityBefore, matchKind: "no_receipt", outcome: "no_adjustment" };
  }

  const text = signal.content.textDerived ?? "";
  const publishHash = sha256Hex(text);

  // Exact-hash match: the published content hashes to a cleared draft.
  const { data: exactReceipt } = await db
    .from("precheck_clearance_receipts")
    .select("id, receipt_id, draft_hash_sha256, expires_at, revoked")
    .eq("practitioner_id", signal.matchedPractitionerId)
    .eq("draft_hash_sha256", publishHash)
    .eq("revoked", false)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (exactReceipt) {
    const severityAfter = shiftSeverity(severityBefore, -1);
    await db.from("precheck_good_faith_events").insert({
      finding_id: finding.findingId,
      receipt_id: (exactReceipt as { id: string }).id,
      practitioner_id: signal.matchedPractitionerId,
      match_kind: "exact_hash",
      outcome: "good_faith_credit",
      severity_before: severityBefore,
      severity_after: severityAfter,
    });
    return {
      adjusted: true,
      severityBefore,
      severityAfter,
      receiptId: (exactReceipt as { receipt_id: string }).receipt_id,
      matchKind: "exact_hash",
      outcome: "good_faith_credit",
    };
  }

  // High-similarity fallback is a no-op today because the clearance ledger
  // stores only SHA-256 hashes, not plaintext — so a per-write Jaccard
  // comparison has nothing to compare against. The spec's high-similarity
  // lane lands in a follow-up prompt that adds a text-preservation opt-in
  // (practitioner chooses to store draft text for 30 days to power better
  // drift detection). Until then: exact hash OR no adjustment.
  void jaccardSimilarity;
  void removedDisclosureOrAddedClaim;
  return { adjusted: false, severityBefore, severityAfter: severityBefore, matchKind: "no_receipt", outcome: "no_adjustment" };
}

export { JACCARD_THRESHOLD, shiftSeverity };
