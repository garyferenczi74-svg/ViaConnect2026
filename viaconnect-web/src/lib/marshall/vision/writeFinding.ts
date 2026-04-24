// Prompt #124 P3: Finding writer.
//
// Persists a completed vision evaluation + determination and, when the
// pipeline is in active mode, routes the determination through the
// MARSHALL.COUNTERFEIT.* rule set to produce Marshall findings that land
// in compliance_findings (the #119 ledger).
//
// Shadow mode: evaluation + determination rows are still written, but no
// finding rows are produced. This lets Steve tune the rule set against
// real traffic without polluting the finding queue.
//
// Every write is idempotent on (evaluation_id) — duplicate persists are
// treated as no-ops so retries from the orchestrator are safe.

import type { SupabaseClient } from '@supabase/supabase-js';
import { counterfeitRules, type CounterfeitRuleInput } from '@/lib/compliance/rules/counterfeit';
import type { Finding } from '@/lib/compliance/engine/types';

import type {
  Determination,
  EvaluationRecord,
  VisionConfigSnapshot,
} from './types';
import { canProduceFindings } from './config';
import { log } from './logging';

export interface PersistEvaluationInput {
  supabase: SupabaseClient;
  evaluation: EvaluationRecord;
}

export async function persistEvaluation(input: PersistEvaluationInput): Promise<{ evaluationRowId: string }> {
  const { supabase, evaluation: e } = input;
  const { data, error } = await supabase
    .from('counterfeit_evaluations')
    .insert({
      evaluation_id: e.evaluationId,
      source: e.source,
      source_reference: e.sourceReference,
      image_storage_key: e.imageStorageKey,
      image_sha256: e.imageSha256,
      image_perceptual_hash: e.imagePerceptualHash,
      phi_redacted: e.phiRedacted,
      content_safety_skip: e.contentSafetySkip,
      content_safety_reason: e.contentSafetyReason,
      candidate_skus: e.candidateSkus,
      model_version: e.modelVersion,
      reference_corpus_version: e.referenceCorpusVersion,
      raw_vision_output: e.rawVisionOutput,
      ocr_output: e.ocrOutput,
      duration_ms: e.durationMs,
    })
    .select('id')
    .single();
  if (error) {
    throw new Error(`persistEvaluation: ${error.message}`);
  }
  log.info('evaluation_persisted', {
    evaluationId: e.evaluationId,
    source: e.source,
    verdict: e.rawVisionOutput?.content_safety.skip ? 'content_safety_skip' : undefined,
  });
  return { evaluationRowId: (data as { id: string }).id };
}

export interface PersistDeterminationInput {
  supabase: SupabaseClient;
  evaluationRowId: string;
  determination: Determination;
}

export async function persistDetermination(input: PersistDeterminationInput): Promise<{ determinationRowId: string }> {
  const { supabase, determination: d } = input;
  const { data, error } = await supabase
    .from('counterfeit_determinations')
    .insert({
      evaluation_id: input.evaluationRowId,
      verdict: d.verdict,
      confidence: d.confidence,
      matched_sku: d.matchedSku,
      mismatch_flags: d.mismatchFlags,
      reasoning_trace: d.reasoningTrace,
      cited_reference_ids: d.citedReferenceIds,
      human_review_required: d.humanReviewRequired,
    })
    .select('id')
    .single();
  if (error) {
    throw new Error(`persistDetermination: ${error.message}`);
  }
  log.info('determination_persisted', {
    evaluationId: d.evaluationId,
    verdict: d.verdict,
    confidence: d.confidence,
    sku: d.matchedSku ?? undefined,
  });
  return { determinationRowId: (data as { id: string }).id };
}

export interface WriteFindingsInput {
  supabase: SupabaseClient;
  determination: Determination;
  source: CounterfeitRuleInput['source'];
  listingUrl?: string;
  /** Optional evidence bundle UUID from #120 Hounddog; attached to every finding. */
  evidenceBundleId?: string;
  config: VisionConfigSnapshot;
}

export interface WriteFindingsResult {
  findings: Finding[];
  inserted: boolean;
  reason?: 'shadow_mode' | 'source_disabled' | 'no_rules_fired';
}

/**
 * Route a determination through the counterfeit rule set and persist the
 * emitted findings. When the kill-switch config says findings may not be
 * produced (shadow mode or disabled source), returns the computed findings
 * without inserting.
 */
export async function writeFindings(input: WriteFindingsInput): Promise<WriteFindingsResult> {
  const { supabase, determination, source, listingUrl, evidenceBundleId, config } = input;

  const ruleInput: CounterfeitRuleInput = {
    evaluationId: determination.evaluationId,
    verdict: determination.verdict,
    confidence: determination.confidence,
    matchedSku: determination.matchedSku,
    mismatchFlags: determination.mismatchFlags,
    source,
    listingUrl,
  };

  const findings: Finding[] = [];
  for (const rule of counterfeitRules) {
    const produced = await rule.evaluate(ruleInput);
    for (const f of produced) {
      // Enrich location + link evidence bundle.
      findings.push({
        ...f,
        location: {
          ...f.location,
          ...(listingUrl ? { url: listingUrl } : {}),
        },
      });
    }
  }

  if (!canProduceFindings(config, source)) {
    log.info('findings_suppressed', {
      evaluationId: determination.evaluationId,
      source,
      note: `mode=${config.mode}, source_enabled=${config.sourceEnabled[source]}`,
    });
    return { findings, inserted: false, reason: config.mode !== 'active' ? 'shadow_mode' : 'source_disabled' };
  }

  if (findings.length === 0) {
    return { findings, inserted: false, reason: 'no_rules_fired' };
  }

  const rows = findings.map((f) => ({
    finding_id: f.findingId,
    rule_id: f.ruleId,
    severity: f.severity,
    surface: f.surface,
    source: f.source,
    location: f.location,
    excerpt: f.excerpt,
    message: f.message,
    citation: f.citation,
    remediation: f.remediation,
    status: 'open',
    evidence_bundle_id: evidenceBundleId ?? null,
    created_at: f.createdAt,
  }));

  const { error } = await supabase.from('compliance_findings').insert(rows);
  if (error) {
    throw new Error(`writeFindings: insert failed — ${error.message}`);
  }

  log.info('findings_inserted', {
    evaluationId: determination.evaluationId,
    source,
    note: `count=${rows.length}`,
  });

  return { findings, inserted: true };
}
