/**
 * Live get_education wrap for Stage A grounded chat.
 *
 * READ-only consumer peptide_education_entries (mechanism first).
 * Depth frameworks stay off. Non-peptides stay labeled.
 * Edu explain-only — engines remain SSOT for doses/conflicts.
 * Never invent monographs, doses, genotypes, Muscle lbs, stacks, or oral Retatrutide.
 * Semaglutide / excluded GLP-1 / tirzepatide edu invent → refuse.
 * safety_never_say is Lex/FAQ pass-through refuse, never treatment-soft education.
 */

import { isCircuitBreakerError } from "@/lib/utils/circuit-breaker";
import { isTimeoutError } from "@/lib/utils/with-timeout";
import {
  isAllowlistedNonPeptide,
  isPractitionerDepthEntryKey,
} from "@/lib/peptides/educationEntryFields";
import { dropPractitionerDepthEducation } from "./lookup-peptide-wrap";
import {
  firstEducationTopicId,
  isSafetyNeverSayId,
  isStageAEducationAllowlisted,
} from "./education-allowlist";
import {
  assembleGetEducation,
  GET_EDUCATION_ROUTE,
  type AssembleGetEducationFn,
  type GetEducationEnginePayload,
  type GetEducationStoredRow,
} from "./get-education-assemble";
import type {
  GetEducationData,
  GetEducationInput,
  GetEducationResult,
  GroundedToolContext,
  ToolError,
  ToolErrorCode,
} from "./types";

const BLOCKED_GLP1_RE = /\b(semaglutide|ozempic|wegovy|liraglutide|excluded glp-?1)\b/i;
const TIRZEPATIDE_RE = /\btirzepatide\b/i;
const EXCLUDED_GENE_RE = /\b(gcg|glp1r)\b/i;

function nowIso(): string {
  return new Date().toISOString();
}

function fail(code: ToolErrorCode, retryable: boolean): ToolError {
  return {
    ok: false,
    code,
    message: `get_education ${code}`,
    retryable,
    route: GET_EDUCATION_ROUTE,
  };
}

export function extractGetEducationAsk(
  input: Partial<GetEducationInput> | undefined,
  message: string | undefined
): GetEducationInput {
  return {
    topic_id: firstEducationTopicId(input?.topic_id, message),
  };
}

export function isBlockedGlp1EducationAsk(topicId: string, message?: string): boolean {
  return BLOCKED_GLP1_RE.test(`${topicId} ${message ?? ""}`);
}

export function isTirzepatideEducationAsk(topicId: string, message?: string): boolean {
  return TIRZEPATIDE_RE.test(`${topicId} ${message ?? ""}`);
}

export function isExcludedGlp1GeneAsk(message: string): boolean {
  return EXCLUDED_GENE_RE.test(message);
}

/** Invent oral / topical / stack schedules for Retatrutide — refuse. */
export function isRetatrutideOralOrStackInvent(message: string, topicId: string): boolean {
  const t = `${message} ${topicId}`.toLowerCase();
  if (!/\bretatrutide\b/.test(t) && topicId !== "edu-retatrutide") return false;
  if (/\b(oral|orally|by mouth|topical|cream|pill form)\b/.test(t)) return true;
  if (/\b(stacking schedule|stack retatrutide|retatrutide stack|stack it with)\b/.test(t)) {
    return true;
  }
  return false;
}

function storedEducationText(row: GetEducationStoredRow): string {
  return (
    row.mechanism?.trim() ||
    row.regulatoryStatus?.trim() ||
    row.safetyContext?.trim() ||
    ""
  );
}

function citationsFromStored(
  row: GetEducationStoredRow
): Array<{ cite_id: string; label: string }> {
  return row.pmids.map((pmid) => ({
    cite_id: `pmid:${pmid}`,
    label: `PMID ${pmid}`,
  }));
}

export function educationSafetyFlags(row: GetEducationStoredRow): string[] {
  const flags = new Set<string>(["edu_not_dx", "no_new_dose"]);
  if (row.entryKey === "edu-retatrutide") flags.add("no_glp1_adjacency");
  if (row.entryKey === "edu-peptideiq-topic-map") flags.add("index_only");
  if (isAllowlistedNonPeptide(row.entryKey)) flags.add("non_peptide");
  return [...flags];
}

function mapStoredToData(row: GetEducationStoredRow): GetEducationData | null {
  if (isPractitionerDepthEntryKey(row.entryKey)) return null;
  const dropped = dropPractitionerDepthEducation({
    entryKey: row.entryKey,
    title: row.title,
    isPeptide: row.isPeptide,
    mechanism: row.mechanism,
    evidenceGrade: row.evidenceGrade,
  });
  if (!dropped) return null;
  const text = storedEducationText(row);
  if (!text) return null;
  return {
    topic_id: row.entryKey,
    title: row.title,
    audience: "consumer",
    text,
    citations: citationsFromStored(row),
    safety_flags: educationSafetyFlags(row),
  };
}

export function mapEnginePayloadToEducationResult(
  payload: GetEducationEnginePayload,
  ask: GetEducationInput,
  message: string
): GetEducationResult {
  if (isBlockedGlp1EducationAsk(ask.topic_id, message)) {
    return fail("refuse_required", false);
  }
  if (isTirzepatideEducationAsk(ask.topic_id, message)) {
    return fail("refuse_required", false);
  }
  if (isExcludedGlp1GeneAsk(message)) {
    return fail("refuse_required", false);
  }
  if (isRetatrutideOralOrStackInvent(message, ask.topic_id)) {
    return fail("refuse_required", false);
  }
  if (isPractitionerDepthEntryKey(ask.topic_id) || payload.blocked === "depth") {
    return fail("refuse_required", false);
  }
  if (payload.blocked) {
    return fail("refuse_required", false);
  }
  if (payload.loadStatus === "unauthorized") {
    return fail("unauthorized", false);
  }
  if (payload.loadStatus === "error" || payload.educationFailed || payload.error) {
    return fail("upstream_5xx", true);
  }
  if (!ask.topic_id.trim()) {
    return fail("validation", false);
  }

  if (isSafetyNeverSayId(ask.topic_id) || payload.safetyFixture) {
    if (!payload.safetyFixture?.text.trim()) {
      return fail("not_found", false);
    }
    return fail("refuse_required", false);
  }

  if (!isStageAEducationAllowlisted(ask.topic_id)) {
    return fail("not_found", false);
  }

  const education = payload.education;
  if (!education) {
    return fail("not_found", false);
  }

  const data = mapStoredToData(education);
  if (!data) {
    return fail("not_found", false);
  }

  return {
    ok: true,
    data,
    route: GET_EDUCATION_ROUTE,
    retrieved_at: nowIso(),
  };
}

function thrownToToolError(err: unknown): ToolError {
  if (isTimeoutError(err)) return fail("upstream_timeout", true);
  if (isCircuitBreakerError(err)) return fail("circuit_open", true);
  return fail("upstream_5xx", true);
}

export function buildGetEducationInputFromContext(
  input: Partial<GetEducationInput> | undefined,
  ctx: GroundedToolContext
): GetEducationInput {
  return extractGetEducationAsk(input, ctx.message);
}

export async function getEducationLive(
  input: GetEducationInput,
  ctx: GroundedToolContext,
  assemble: AssembleGetEducationFn = ctx.getEducationAssemble ?? assembleGetEducation
): Promise<GetEducationResult> {
  if (isBlockedGlp1EducationAsk(input.topic_id, ctx.message)) {
    return fail("refuse_required", false);
  }
  if (isTirzepatideEducationAsk(input.topic_id, ctx.message)) {
    return fail("refuse_required", false);
  }
  if (isRetatrutideOralOrStackInvent(ctx.message ?? "", input.topic_id)) {
    return fail("refuse_required", false);
  }
  if (isExcludedGlp1GeneAsk(ctx.message ?? "")) {
    return fail("refuse_required", false);
  }
  if (isPractitionerDepthEntryKey(input.topic_id)) {
    return fail("refuse_required", false);
  }
  try {
    const payload = await assemble({ topic_id: input.topic_id });
    return mapEnginePayloadToEducationResult(
      payload ?? {
        loadStatus: "error",
        topicId: input.topic_id,
        education: null,
        educationFailed: true,
      },
      input,
      ctx.message ?? ""
    );
  } catch (err) {
    return thrownToToolError(err);
  }
}
