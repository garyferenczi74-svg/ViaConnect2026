/**
 * Prompt 221/221A: Marshall/Lex promote then Jeffery review (hard-block retrieval).
 * Sequence: promote_kb_item -> programmatic Jeffery checks -> record_jeffery_review.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { safeLog } from "@/lib/utils/safe-log";
import { runKbPromotionChecks } from "@/lib/jeffery/reviews/checkSuites";
import { persistJefferyReview } from "@/lib/jeffery/reviews/recordReview";
import { isKbItemRetrievable } from "@/lib/jeffery/reviews/runReview";
import { canPromoteKbItem, type KbGateStatus } from "./promote";
import type { KbGateProfile } from "./collections";

export interface PromoteThenReviewResult {
  itemId: string;
  gateStatus: string;
  jefferyVerdict: string | null;
  retrievable: boolean;
  promoteOk: boolean;
  reviewOk: boolean;
  reasonCodes: string[];
  error?: string;
}

/**
 * Call promote_kb_item then Jeffery review. Item becomes retrievable only if
 * Jeffery verdict is approved.
 */
export async function promoteThenJefferyReview(opts: {
  itemId: string;
  targetStatus: "approved" | "lex_approved" | "rejected" | "lex_review";
  gateReason?: string;
  lexDecisionId?: string | null;
  producedByAgent?: string;
}): Promise<PromoteThenReviewResult> {
  const sb = createAdminClient();
  const reasonCodes: string[] = [];

  const { data: item, error: loadErr } = await sb
    .from("kb_items")
    .select(
      "id, gate_status, extraction_confidence, content_hash, title, summary, source_urls, evidence_grade, payload_type, provenance, primary_collection_id, jeffery_verdict"
    )
    .eq("id", opts.itemId)
    .maybeSingle();

  if (loadErr || !item) {
    return {
      itemId: opts.itemId,
      gateStatus: "unknown",
      jefferyVerdict: null,
      retrievable: false,
      promoteOk: false,
      reviewOk: false,
      reasonCodes: ["item_not_found"],
      error: loadErr?.message ?? "item_not_found",
    };
  }

  const { data: coll } = await sb
    .from("kb_collections")
    .select("slug, gate_profile")
    .eq("id", (item as { primary_collection_id: string }).primary_collection_id)
    .maybeSingle();

  const gateProfile = (coll?.gate_profile ?? "standard") as KbGateProfile;
  const synthesisType =
    (item as { payload_type?: string }).payload_type === "synthesis"
      ? await loadSynthesisType(opts.itemId)
      : null;

  const guard = canPromoteKbItem({
    currentStatus: String((item as { gate_status: string }).gate_status) as KbGateStatus,
    targetStatus: opts.targetStatus,
    gateProfile,
    synthesisType,
    extractionConfidence: (item as { extraction_confidence?: number | null })
      .extraction_confidence,
    hasLexApprovedDecision: Boolean(opts.lexDecisionId) || opts.targetStatus !== "lex_approved",
  });

  if (!guard.ok && opts.targetStatus !== "rejected") {
    return {
      itemId: opts.itemId,
      gateStatus: String((item as { gate_status: string }).gate_status),
      jefferyVerdict: (item as { jeffery_verdict?: string | null }).jeffery_verdict ?? null,
      retrievable: false,
      promoteOk: false,
      reviewOk: false,
      reasonCodes: [guard.reason ?? "promote_guard_failed"],
    };
  }

  const { data: promoted, error: promErr } = await sb.rpc("promote_kb_item", {
    p_item_id: opts.itemId,
    p_target_status: opts.targetStatus,
    p_gate_reason: opts.gateReason ?? null,
    p_lex_decision_id: opts.lexDecisionId ?? null,
  });

  if (promErr) {
    safeLog.warn("kb.promotePipeline", "promote rpc failed", {
      error: promErr.message,
    });
    return {
      itemId: opts.itemId,
      gateStatus: String((item as { gate_status: string }).gate_status),
      jefferyVerdict: null,
      retrievable: false,
      promoteOk: false,
      reviewOk: false,
      reasonCodes: ["promote_rpc_failed"],
      error: promErr.message,
    };
  }

  const gateStatus = String(
    (promoted as { gate_status?: string } | null)?.gate_status ?? opts.targetStatus
  );

  if (opts.targetStatus === "rejected" || opts.targetStatus === "lex_review") {
    return {
      itemId: opts.itemId,
      gateStatus,
      jefferyVerdict: "pending",
      retrievable: false,
      promoteOk: true,
      reviewOk: false,
      reasonCodes: [],
    };
  }

  // Reload fields for Jeffery suite
  const { data: fresh } = await sb
    .from("kb_items")
    .select(
      "id, gate_status, extraction_confidence, content_hash, title, summary, source_urls, evidence_grade, payload_type, provenance, jeffery_verdict"
    )
    .eq("id", opts.itemId)
    .maybeSingle();

  const row = (fresh ?? item) as Record<string, unknown>;
  const checks = runKbPromotionChecks({
    gateStatus: String(row.gate_status),
    gateProfile,
    extractionConfidence:
      typeof row.extraction_confidence === "number"
        ? row.extraction_confidence
        : null,
    contentHash: typeof row.content_hash === "string" ? row.content_hash : null,
    title: typeof row.title === "string" ? row.title : null,
    summary: typeof row.summary === "string" ? row.summary : null,
    sourceUrls: Array.isArray(row.source_urls)
      ? (row.source_urls as string[])
      : [],
    evidenceGrade:
      typeof row.evidence_grade === "string" ? row.evidence_grade : null,
    payloadType: String(row.payload_type ?? "education_entry"),
    provenance:
      row.provenance && typeof row.provenance === "object"
        ? (row.provenance as Record<string, unknown>)
        : null,
    hasLexDecisionIfRequired:
      gateProfile !== "lex_lane" || Boolean(opts.lexDecisionId),
    synthesisType,
    requiredFieldsPresent: Boolean(row.title && row.summary && row.content_hash),
    unknownsHonest: true,
    dedupeCleared: true,
    collectionSlug: String(coll?.slug ?? "unknown"),
  });

  const review = await persistJefferyReview({
    artifactType:
      String(row.payload_type) === "synthesis" ? "synthesis" : "kb_promotion",
    artifactRef: opts.itemId,
    checks,
    producedByAgent: opts.producedByAgent ?? "hounddog",
  });

  reasonCodes.push(...review.outcome.reasonCodes);

  const { data: after } = await sb
    .from("kb_items")
    .select("gate_status, jeffery_verdict")
    .eq("id", opts.itemId)
    .maybeSingle();

  const jefferyVerdict =
    (after as { jeffery_verdict?: string } | null)?.jeffery_verdict ??
    review.outcome.verdict;
  const finalGate =
    (after as { gate_status?: string } | null)?.gate_status ?? gateStatus;

  return {
    itemId: opts.itemId,
    gateStatus: finalGate,
    jefferyVerdict,
    retrievable: isKbItemRetrievable({
      gateStatus: finalGate,
      jefferyVerdict,
    }),
    promoteOk: true,
    reviewOk: review.ok && review.outcome.verdict === "approved",
    reasonCodes,
    error: review.error,
  };
}

async function loadSynthesisType(itemId: string): Promise<string | null> {
  try {
    const sb = createAdminClient();
    const { data } = await sb
      .from("kb_syntheses")
      .select("synthesis_type")
      .eq("item_id", itemId)
      .maybeSingle();
    return data?.synthesis_type ? String(data.synthesis_type) : null;
  } catch {
    return null;
  }
}

/**
 * Process kb_items already Marshall/Lex gated but Jeffery still pending.
 */
export async function processPendingJefferyKbReviews(
  limit = 20
): Promise<{
  reviewed: number;
  approved: number;
  rejected: number;
  needsHuman: number;
  errors: number;
}> {
  const stats = {
    reviewed: 0,
    approved: 0,
    rejected: 0,
    needsHuman: 0,
    errors: 0,
  };
  const sb = createAdminClient();

  const { data, error } = await sb
    .from("kb_items")
    .select(
      "id, gate_status, extraction_confidence, content_hash, title, summary, source_urls, evidence_grade, payload_type, provenance, primary_collection_id, jeffery_verdict"
    )
    .in("gate_status", ["approved", "lex_approved"])
    .or("jeffery_verdict.eq.pending,jeffery_verdict.is.null")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !data?.length) {
    if (error) {
      safeLog.warn("kb.jefferyReview", "list pending failed", {
        error: error.message,
      });
    }
    return stats;
  }

  for (const raw of data) {
    const item = raw as Record<string, unknown>;
    const id = String(item.id);
    try {
      const { data: coll } = await sb
        .from("kb_collections")
        .select("slug, gate_profile")
        .eq("id", String(item.primary_collection_id))
        .maybeSingle();

      const gateProfile = (coll?.gate_profile ?? "standard") as KbGateProfile;
      const synthesisType =
        item.payload_type === "synthesis" ? await loadSynthesisType(id) : null;

      const checks = runKbPromotionChecks({
        gateStatus: String(item.gate_status),
        gateProfile,
        extractionConfidence:
          typeof item.extraction_confidence === "number"
            ? item.extraction_confidence
            : null,
        contentHash:
          typeof item.content_hash === "string" ? item.content_hash : null,
        title: typeof item.title === "string" ? item.title : null,
        summary: typeof item.summary === "string" ? item.summary : null,
        sourceUrls: Array.isArray(item.source_urls)
          ? (item.source_urls as string[])
          : [],
        evidenceGrade:
          typeof item.evidence_grade === "string" ? item.evidence_grade : null,
        payloadType: String(item.payload_type ?? "education_entry"),
        provenance:
          item.provenance && typeof item.provenance === "object"
            ? (item.provenance as Record<string, unknown>)
            : null,
        hasLexDecisionIfRequired: gateProfile !== "lex_lane",
        synthesisType,
        requiredFieldsPresent: Boolean(
          item.title && item.summary && item.content_hash
        ),
        unknownsHonest: true,
        dedupeCleared: true,
        collectionSlug: String(coll?.slug ?? "unknown"),
      });

      const review = await persistJefferyReview({
        artifactType:
          item.payload_type === "synthesis" ? "synthesis" : "kb_promotion",
        artifactRef: id,
        checks,
        producedByAgent: "hounddog",
      });

      stats.reviewed += 1;
      if (!review.ok) stats.errors += 1;
      else if (review.outcome.verdict === "approved") stats.approved += 1;
      else if (review.outcome.verdict === "rejected") stats.rejected += 1;
      else stats.needsHuman += 1;
    } catch (err) {
      stats.errors += 1;
      safeLog.warn("kb.jefferyReview", "item failed", {
        id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return stats;
}
