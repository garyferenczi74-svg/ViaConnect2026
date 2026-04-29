// Prompt #113 — /api/compliance/kelsey/review
// End-to-end Kelsey gate: Stage 1 detector -> cache lookup -> Stage 2 LLM
// -> persist to regulatory_kelsey_reviews -> audit log -> return verdict.

import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { detectDiseaseClaim } from "@/lib/compliance/detector";
import { hashSubject, lookupCached } from "@/lib/compliance/kelsey/cache";
import { callKelseyLLM } from "@/lib/compliance/kelsey/client";
import { getJurisdictionId } from "@/lib/compliance/jurisdiction";
import { recordRegulatoryAudit } from "@/lib/compliance/audit-logger";
import type { KelseyReviewRequest, KelseyVerdict } from "@/lib/compliance/types";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";

export async function POST(request: Request) {
  try {
    const sb = createClient();
    const { data: { user } } = await withTimeout(sb.auth.getUser(), 5000, 'api.compliance.kelsey.auth');
    if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const { data: profile } = await withTimeout(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async () => (sb as any).from("profiles").select("role").eq("id", user.id).maybeSingle())(),
      8000,
      'api.compliance.kelsey.profile',
    );
    const role = (profile as { role?: string } | null)?.role;
    if (!role || !["admin", "compliance_admin", "medical"].includes(role)) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

  const body = (await request.json().catch(() => null)) as KelseyReviewRequest | null;
  if (!body || typeof body.text !== "string" || body.text.trim().length === 0) {
    return NextResponse.json({ ok: false, error: "missing_text" }, { status: 400 });
  }
  if (body.jurisdiction !== "US" && body.jurisdiction !== "CA") {
    return NextResponse.json({ ok: false, error: "invalid_jurisdiction" }, { status: 400 });
  }

  const jurisdictionId = await getJurisdictionId(body.jurisdiction);
  if (!jurisdictionId) return NextResponse.json({ ok: false, error: "jurisdiction_not_found" }, { status: 500 });

  // Stage 1 — deterministic detector (always runs)
  const stage1 = await detectDiseaseClaim(body.text);

  // Cache lookup
  const subjectHash = hashSubject(body.text, body.jurisdiction, body.ingredient_scope ?? []);
  const cached = await lookupCached(subjectHash, jurisdictionId);
  if (cached) {
    const verdict: KelseyVerdict = {
      verdict: cached.verdict,
      rationale: cached.rationale,
      rule_references: cached.rule_references,
      suggested_rewrite: cached.suggested_rewrite ?? undefined,
      confidence: cached.confidence,
      citations: [],
      stage_1_flags: stage1.flags,
      review_id: cached.review_id,
    };
    return NextResponse.json({ ok: true, cached: true, ...verdict });
  }

  // Stage 2 — LLM call (always on — prompt §6.4 says Stage 2 is invoked for
  // any claim marked for pre-publication review; we route every /review
  // request here, with Stage 1 flags provided as context).
  const llmResult = await callKelseyLLM({
    text: body.text,
    jurisdiction: body.jurisdiction,
    subject_type: body.subject_type,
    ingredient_scope: body.ingredient_scope,
    sku_scope: body.sku_scope,
    context: body.context,
    stage_1_flags: stage1.flags,
  });

  if (!llmResult) {
    // LLM unavailable or malformed response. Fail closed: ESCALATE so
    // compliance humans handle it rather than silently passing.
    const admin = createAdminClient();
    const subjectId = crypto.randomUUID();
    const { data: inserted } = await admin
      .from("regulatory_kelsey_reviews")
      .insert({
        subject_type: body.subject_type,
        subject_id: body.subject_id ?? subjectId,
        subject_text_hash: subjectHash,
        subject_text_excerpt: body.text.slice(0, 500),
        jurisdiction_id: jurisdictionId,
        verdict: "ESCALATE",
        rationale: "Kelsey LLM unavailable or returned malformed response. Routed to human compliance review (fail-closed).",
        rule_references: [],
        stage_1_flags: stage1.flags,
        reviewer_model: "fail_closed",
      })
      .select("id")
      .single();
    const reviewId = inserted ? (inserted as { id: string }).id : subjectId;
    await recordRegulatoryAudit({
      actor_id: user.id,
      actor_role: role,
      action: "kelsey.review.escalate_fail_closed",
      target_type: body.subject_type,
      target_id: body.subject_id ?? reviewId,
      jurisdiction_id: jurisdictionId,
      after_value: { stage_1_flags: stage1.flags },
    });
    return NextResponse.json({
      ok: true,
      cached: false,
      verdict: "ESCALATE",
      rationale: "Kelsey LLM unavailable. Routed to human compliance review.",
      rule_references: [],
      confidence: 0,
      citations: [],
      stage_1_flags: stage1.flags,
      review_id: reviewId,
    });
  }

  const v = llmResult.validated;
  const admin = createAdminClient();
  const subjectId = body.subject_id ?? crypto.randomUUID();
  const { data: inserted, error: insErr } = await admin
    .from("regulatory_kelsey_reviews")
    .insert({
      subject_type: body.subject_type,
      subject_id: subjectId,
      subject_text_hash: subjectHash,
      subject_text_excerpt: body.text.slice(0, 500),
      jurisdiction_id: jurisdictionId,
      verdict: v.verdict,
      rationale: v.rationale,
      rule_references: v.rule_references,
      suggested_rewrite: v.suggested_rewrite,
      confidence: v.confidence,
      stage_1_flags: stage1.flags,
      stage_2_raw: { raw_response: llmResult.raw_response, citations: v.citations },
      reviewer_model: llmResult.model_used,
    })
    .select("id")
    .single();
  if (insErr || !inserted) {
    return NextResponse.json({ ok: false, error: "persist_failed" }, { status: 500 });
  }
  const reviewId = (inserted as { id: string }).id;

  await recordRegulatoryAudit({
    actor_id: user.id,
    actor_role: role,
    action: `kelsey.review.${v.verdict.toLowerCase()}`,
    target_type: body.subject_type,
    target_id: subjectId,
    jurisdiction_id: jurisdictionId,
    after_value: { verdict: v.verdict, confidence: v.confidence, stage_1_flag_count: stage1.flags.length },
  });

  const verdict: KelseyVerdict = {
    verdict: v.verdict,
    rationale: v.rationale,
    rule_references: v.rule_references,
    suggested_rewrite: v.suggested_rewrite ?? undefined,
    confidence: v.confidence,
    citations: v.citations,
    stage_1_flags: stage1.flags,
    review_id: reviewId,
  };
  return NextResponse.json({ ok: true, cached: false, ...verdict });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.compliance.kelsey', 'auth/db timeout', { error: err });
      return NextResponse.json({ ok: false, error: 'timeout' }, { status: 503 });
    }
    safeLog.error('api.compliance.kelsey', 'unexpected error', { error: err });
    return NextResponse.json({ ok: false, error: 'unexpected_error' }, { status: 500 });
  }
}
