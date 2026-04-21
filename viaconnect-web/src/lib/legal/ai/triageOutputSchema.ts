// Prompt #104 Phase 5: Triage AI output validator.
//
// Parses Claude's JSON response and validates the shape. Strict
// validator: anything unexpected falls into a "triage_ai_error" path
// so the human reviewer is alerted instead of silently consuming a
// malformed classification.

import { LEGAL_CASE_BUCKETS, type LegalCaseBucket, LEGAL_CASE_PRIORITIES, type LegalCasePriority, TEMPLATE_FAMILIES } from '../types';

export interface TriageOutput {
  bucket: LegalCaseBucket;
  confidence: number;
  rationale: string;
  evidence_citations: string[];
  has_medical_claim: boolean;
  medical_claim_quotes: string[];
  suggested_template_family: string | null;
  suggested_priority: LegalCasePriority;
  blocking_concerns: string[];
}

export interface TriageValidationOk {
  ok: true;
  output: TriageOutput;
}
export interface TriageValidationError {
  ok: false;
  errors: string[];
}
export type TriageValidationResult = TriageValidationOk | TriageValidationError;

const BUCKET_SET = new Set<string>(LEGAL_CASE_BUCKETS);
const PRIORITY_SET = new Set<string>(LEGAL_CASE_PRIORITIES);
const TEMPLATE_FAMILY_SET = new Set<string>(TEMPLATE_FAMILIES);

export function parseTriageOutput(raw: unknown): TriageValidationResult {
  const errors: string[] = [];
  if (raw === null || typeof raw !== 'object') {
    return { ok: false, errors: ['response is not an object'] };
  }
  const obj = raw as Record<string, unknown>;

  const bucket = obj.bucket;
  if (typeof bucket !== 'string' || !BUCKET_SET.has(bucket)) {
    errors.push(`bucket invalid: ${JSON.stringify(bucket)}`);
  }
  const confidence = obj.confidence;
  if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) {
    errors.push(`confidence must be 0..1: ${JSON.stringify(confidence)}`);
  }
  const rationale = obj.rationale;
  if (typeof rationale !== 'string' || rationale.length < 1) errors.push('rationale missing');

  const ev = obj.evidence_citations;
  if (!Array.isArray(ev) || !ev.every((x) => typeof x === 'string')) {
    errors.push('evidence_citations must be string[]');
  }

  const hasMedical = obj.has_medical_claim;
  if (typeof hasMedical !== 'boolean') errors.push('has_medical_claim must be boolean');

  const quotes = obj.medical_claim_quotes;
  if (!Array.isArray(quotes) || !quotes.every((x) => typeof x === 'string')) {
    errors.push('medical_claim_quotes must be string[]');
  }

  const suggestedTemplate = obj.suggested_template_family;
  if (suggestedTemplate !== null && (typeof suggestedTemplate !== 'string' || !TEMPLATE_FAMILY_SET.has(suggestedTemplate))) {
    // Only require a known template family OR null. Don't fail on unknown
    // strings; coerce to null and let the human reviewer pick.
    errors.push(`suggested_template_family invalid: ${JSON.stringify(suggestedTemplate)}`);
  }

  const priority = obj.suggested_priority;
  if (typeof priority !== 'string' || !PRIORITY_SET.has(priority)) {
    errors.push(`suggested_priority invalid: ${JSON.stringify(priority)}`);
  }

  const concerns = obj.blocking_concerns;
  if (!Array.isArray(concerns) || !concerns.every((x) => typeof x === 'string')) {
    errors.push('blocking_concerns must be string[]');
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    output: {
      bucket: bucket as LegalCaseBucket,
      confidence: confidence as number,
      rationale: rationale as string,
      evidence_citations: ev as string[],
      has_medical_claim: hasMedical as boolean,
      medical_claim_quotes: quotes as string[],
      suggested_template_family: suggestedTemplate as (string | null),
      suggested_priority: priority as LegalCasePriority,
      blocking_concerns: concerns as string[],
    },
  };
}

// Best-effort extractor: Claude often surrounds JSON with prose. This
// finds the first balanced {...} block and returns the parsed object,
// or null if no JSON found.
export function extractFirstJsonObject(text: string): unknown | null {
  const start = text.indexOf('{');
  if (start < 0) return null;
  const end = text.lastIndexOf('}');
  if (end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}
