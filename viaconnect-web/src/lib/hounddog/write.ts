/**
 * Finding writer. Converts evaluated social findings into persisted
 * compliance_findings rows (linked to an evidence bundle) and optionally
 * creates a practitioner_notices row + a social_review_queue row per the
 * gate decision.
 *
 * This module is the bridge that sits between the pure evaluate/gate layer
 * and the Marshall runtime persistence from #119.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Finding } from "@/lib/compliance/engine/types";
import type { EvidenceBundle, SocialSignal } from "./bridge-types";
import type { GateDecision } from "./gate";

function serviceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Hounddog write: missing SUPABASE env");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export interface WriteInput {
  signal: SocialSignal;
  findings: Finding[];
  decision: GateDecision;
  confidence: number;
  evidenceBundle?: EvidenceBundle;
}

export interface WriteResult {
  persistedFindingIds: string[];
  noticeIds: string[];
  reviewQueueIds: string[];
  signalStatus: "finding_opened" | "below_threshold" | "evaluated";
  action: GateDecision;
}

function noticeIdFor(practitionerId: string, n: number, now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  return `PN-${y}-${mm}${dd}-${String(n).padStart(5, "0")}${practitionerId.slice(0, 4)}`;
}

const REMEDIATION_WINDOW_HOURS: Record<Finding["severity"], number> = {
  P0: 24,
  P1: 72,
  P2: 7 * 24,
  P3: 14 * 24,
  ADVISORY: 14 * 24,
};

export async function persistSignalAndFindings(input: WriteInput, db?: SupabaseClient): Promise<WriteResult> {
  const client = db ?? serviceClient();
  const { signal, findings, decision, confidence, evidenceBundle } = input;

  const signalStatus: WriteResult["signalStatus"] =
    decision === "below_threshold" ? "below_threshold" : decision === "auto_open" ? "finding_opened" : "evaluated";

  const signalRow = {
    id: signal.id || undefined,
    raw_signal_id: signal.rawSignalRef ?? null,
    collector_id: signal.collectorId,
    url: signal.url,
    published_at: signal.publishedAt ?? null,
    captured_at: signal.capturedAt,
    author_handle: signal.author.handle,
    author_external_id: signal.author.externalId ?? null,
    author_display_name: signal.author.displayName ?? null,
    matched_practitioner_id: signal.author.matchedPractitionerId ?? null,
    practitioner_match_confidence: signal.author.practitionerMatchConfidence ?? null,
    practitioner_match_method: signal.author.practitionerMatchMethod ?? null,
    language: signal.content.language ?? null,
    text_derived: signal.content.textDerived ?? null,
    fingerprint_simhash: signal.content.fingerprint ?? null,
    jurisdiction_country: signal.jurisdiction?.country ?? null,
    jurisdiction_region: signal.jurisdiction?.region ?? null,
    product_matches: signal.productMatches,
    pricing: signal.pricing ?? null,
    content_quality_score: signal.contentQualityScore,
    overall_confidence: confidence,
    status: signalStatus,
  };
  const { data: persistedSignal, error: sigErr } = await client
    .from("social_signals")
    .insert(signalRow)
    .select("id")
    .single();
  if (sigErr) throw new Error(`persist signal failed: ${sigErr.message}`);
  const signalId = (persistedSignal as { id: string }).id;

  // Below threshold: log + return, no findings.
  if (decision === "below_threshold") {
    await client.from("social_signals_below_threshold").insert({
      signal_id: signalId,
      reason: "confidence_below_floor",
      confidence,
    });
    return {
      persistedFindingIds: [],
      noticeIds: [],
      reviewQueueIds: [],
      signalStatus: "below_threshold",
      action: decision,
    };
  }

  // Queue decisions: write to review queue, no finding rows yet.
  if (decision === "queue_review" || decision === "queue_steve") {
    const { data: queueRow } = await client
      .from("social_review_queue")
      .insert({
        signal_id: signalId,
        suggested_rule_ids: findings.map((f) => f.ruleId),
        confidence,
        reason: decision === "queue_steve" ? "severity_high_requires_human" : "confidence_mid_band",
      })
      .select("id")
      .single();
    return {
      persistedFindingIds: [],
      noticeIds: [],
      reviewQueueIds: queueRow ? [(queueRow as { id: string }).id] : [],
      signalStatus: "evaluated",
      action: decision,
    };
  }

  // auto_open: persist each finding + create practitioner notice if attributable.
  const persistedFindingIds: string[] = [];
  const noticeIds: string[] = [];
  const now = new Date();

  for (const finding of findings) {
    const { data: findingRow, error: findingErr } = await client
      .from("compliance_findings")
      .insert({
        finding_id: finding.findingId,
        rule_id: finding.ruleId,
        severity: finding.severity,
        surface: finding.surface,
        source: "runtime",
        location: { ...finding.location, agent: "hounddog", signalId },
        excerpt: finding.excerpt,
        message: finding.message,
        citation: finding.citation,
        remediation: finding.remediation,
        escalated_to: finding.escalation?.to ?? null,
        evidence_bundle_id: evidenceBundle?.id ?? null,
      })
      .select("id")
      .single();
    if (findingErr) {
      // Soft-fail per finding; log and continue. The bridge is designed to
      // never wedge the pipeline on a single bad row.
      // eslint-disable-next-line no-console
      console.warn(`[hounddog/write] finding insert failed for ${finding.findingId}: ${findingErr.message}`);
      continue;
    }
    persistedFindingIds.push((findingRow as { id: string }).id);

    // Practitioner notice (only if attributable)
    const practitionerId = signal.author.matchedPractitionerId;
    if (practitionerId && (signal.author.practitionerMatchConfidence ?? 0) >= 0.85) {
      const hours = REMEDIATION_WINDOW_HOURS[finding.severity];
      const due = new Date(now.getTime() + hours * 3600 * 1000);
      const nid = noticeIdFor(practitionerId, persistedFindingIds.length, now);
      const { data: notice } = await client
        .from("practitioner_notices")
        .insert({
          notice_id: nid,
          practitioner_id: practitionerId,
          finding_id: (findingRow as { id: string }).id,
          severity: finding.severity,
          status: "issued",
          remediation_due_at: due.toISOString(),
        })
        .select("id")
        .single();
      if (notice) noticeIds.push((notice as { id: string }).id);
    }
  }

  return {
    persistedFindingIds,
    noticeIds,
    reviewQueueIds: [],
    signalStatus: "finding_opened",
    action: decision,
  };
}
