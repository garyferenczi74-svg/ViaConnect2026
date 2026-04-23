/**
 * Operator replay tool: given a signal row, re-normalize and re-evaluate
 * without writing any new findings. Used for regression testing and rule-
 * tuning validation. Never mutates compliance_findings.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { evaluateSignal } from "./evaluate";
import type { SocialSignal } from "./bridge-types";

export interface ReplayResult {
  signalId: string;
  wouldOpenFindings: string[];
  confidence: number;
  decision: string;
  decisionReason: string;
  durationMs: number;
}

export async function replaySignal(db: SupabaseClient, signalId: string): Promise<ReplayResult | null> {
  const { data } = await db.from("social_signals").select("*").eq("id", signalId).maybeSingle();
  if (!data) return null;
  const row = data as Record<string, unknown>;

  const signal: SocialSignal = {
    id: row.id as string,
    rawSignalRef: (row.raw_signal_id as string) ?? undefined,
    collectorId: row.collector_id as SocialSignal["collectorId"],
    url: row.url as string,
    capturedAt: row.captured_at as string,
    publishedAt: (row.published_at as string) ?? undefined,
    author: {
      handle: row.author_handle as string,
      externalId: (row.author_external_id as string) ?? undefined,
      displayName: (row.author_display_name as string) ?? undefined,
      matchedPractitionerId: (row.matched_practitioner_id as string) ?? null,
      practitionerMatchConfidence: (row.practitioner_match_confidence as number) ?? null,
      practitionerMatchMethod: (row.practitioner_match_method as SocialSignal["author"]["practitionerMatchMethod"]) ?? null,
    },
    content: {
      language: (row.language as string) ?? undefined,
      textRaw: (row.text_derived as string) ?? undefined,
      textDerived: (row.text_derived as string) ?? undefined,
      mediaHashes: {},
      fingerprint: (row.fingerprint_simhash as string) ?? undefined,
    },
    productMatches: ((row.product_matches as unknown) as SocialSignal["productMatches"]) ?? [],
    pricing: ((row.pricing as unknown) as SocialSignal["pricing"]) ?? undefined,
    jurisdiction: {
      country: (row.jurisdiction_country as string) ?? undefined,
      region: (row.jurisdiction_region as string) ?? undefined,
    },
    contentQualityScore: Number(row.content_quality_score ?? 1),
    overallConfidence: Number(row.overall_confidence ?? 0),
  };

  const result = await evaluateSignal(signal);
  return {
    signalId,
    wouldOpenFindings: result.findings.map((f) => f.ruleId),
    confidence: result.confidence,
    decision: result.decision,
    decisionReason: result.decisionReason,
    durationMs: result.durationMs,
  };
}
