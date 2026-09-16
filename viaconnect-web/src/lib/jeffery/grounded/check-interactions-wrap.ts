/**
 * Live check_interactions wrap for Stage A grounded chat.
 *
 * Body lock (Arnold / TOOL-CONTRACTS):
 *   meds → medications
 *   on-file protocol/stack (+ herbs) → supplements
 *   asked candidate under discussion → recommendations
 * Never LLM-author either list. No dose strings in arrays.
 *
 * Payload → CheckInteractionsData verbatim. Soft-empty + error → ok:false.
 * Empty meds early-return remains valid success.
 */

import {
  assembleCheckInteractions,
  CHECK_INTERACTIONS_ROUTE,
  emptyCheckInteractionsPayload,
  type AssembleCheckInteractionsFn,
  type CheckInteractionsEngineBody,
  type CheckInteractionsEnginePayload,
} from "./check-interactions-assemble";
import type {
  CheckInteractionsData,
  CheckInteractionsInput,
  CheckInteractionsResult,
  GroundedToolContext,
  InteractionFinding,
  InteractionSeverity,
  ProtocolItem,
  ToolError,
  ToolErrorCode,
} from "./types";
import { isCircuitBreakerError } from "@/lib/utils/circuit-breaker";
import { isTimeoutError } from "@/lib/utils/with-timeout";

const DOSE_ONLY_RE =
  /^\d+(\.\d+)?\s*(mg|mcg|µg|ug|iu|ml|g|capsule|capsules|tablet|tablets|drop|drops)?$/i;

const ASKED_CANDIDATE_TOKENS: Array<{ re: RegExp; name: string }> = [
  { re: /\bnad\+?\b/i, name: "NAD+" },
  { re: /\bmthfr\+?\b/i, name: "MTHFR+" },
  { re: /\bcomt\+?\b/i, name: "COMT+" },
  { re: /\bfocus\+?\b/i, name: "FOCUS+" },
  { re: /\bblast\+?\b/i, name: "BLAST+" },
  { re: /\bshred\+?\b/i, name: "SHRED+" },
  { re: /\brelax\+?\b/i, name: "RELAX+" },
  { re: /\bclean\+?\b/i, name: "CLEAN+" },
  { re: /\brise\+?\b/i, name: "RISE+" },
  { re: /\bapoe\+?\b/i, name: "APOE+" },
  { re: /\bcoq-?10\b/i, name: "CoQ10" },
  { re: /\bretatrutide\b/i, name: "retatrutide" },
  { re: /\btirzepatide\b/i, name: "tirzepatide" },
  { re: /\bsermorelin\b/i, name: "sermorelin" },
  { re: /\bbpc-?157\b/i, name: "BPC-157" },
  { re: /\btesamorelin\b/i, name: "tesamorelin" },
  { re: /\bipamorelin\b/i, name: "ipamorelin" },
  { re: /\bcjc-?1295\b/i, name: "CJC-1295" },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nowIso(): string {
  return new Date().toISOString();
}

function fail(code: ToolErrorCode, retryable: boolean): ToolError {
  return {
    ok: false,
    code,
    message: `check_interactions ${code}`,
    retryable,
    route: CHECK_INTERACTIONS_ROUTE,
  };
}

/** Strip parenthetical doses and drop empties / dose-only tokens. Never invent names. */
export function nameList(values: string[] | undefined): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of values ?? []) {
    if (typeof raw !== "string") continue;
    const stripped = raw.replace(/\s*\([^)]*\)\s*$/, "").trim();
    if (!stripped || stripped === "none" || stripped === "not available" || stripped === "none reported") {
      continue;
    }
    if (DOSE_ONLY_RE.test(stripped)) continue;
    const key = stripped.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(stripped);
  }
  return out;
}

export function extractAskedCandidate(message: string, onFileStack: string[]): string[] {
  if (!message.trim()) return [];
  const onFile = new Set(onFileStack.map((n) => n.toLowerCase()));
  const found: string[] = [];
  for (const token of ASKED_CANDIDATE_TOKENS) {
    if (!token.re.test(message)) continue;
    if (onFile.has(token.name.toLowerCase())) continue;
    found.push(token.name);
  }
  return nameList(found);
}

export function medsFromAdvisorContext(vars: Record<string, string> | undefined): string[] {
  const raw = vars?.medications?.trim();
  if (!raw) return [];
  return nameList(raw.split(","));
}

export function stackNamesFromItems(items: ProtocolItem[]): string[] {
  return nameList(items.map((item) => item.productName));
}

export function mapCheckInteractionsBody(input: CheckInteractionsInput): CheckInteractionsEngineBody {
  return {
    userId: input.user_id,
    medications: nameList(input.meds),
    supplements: nameList([...(input.stack ?? []), ...(input.herbs ?? [])]),
    recommendations: nameList(input.candidate ?? []),
    allergies: nameList(input.allergies ?? []),
  };
}

export function buildCheckInteractionsInputFromContext(
  input: Partial<CheckInteractionsInput> | undefined,
  ctx: GroundedToolContext,
  protocolItems: ProtocolItem[]
): CheckInteractionsInput {
  const stack = input?.stack?.length ? nameList(input.stack) : stackNamesFromItems(protocolItems);
  const meds = input?.meds?.length ? nameList(input.meds) : medsFromAdvisorContext(ctx.advisorContextVariables);
  const herbs = nameList(input?.herbs ?? []);
  const candidate = input?.candidate?.length
    ? nameList(input.candidate)
    : extractAskedCandidate(ctx.message ?? "", stack);
  return {
    stack,
    meds,
    herbs,
    user_id: input?.user_id ?? ctx.userId,
    allergies: nameList(input?.allergies ?? []),
    candidate,
  };
}

function isSeverity(value: unknown): value is InteractionSeverity {
  return value === "major" || value === "moderate" || value === "minor" || value === "synergistic";
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function mapFinding(raw: unknown): InteractionFinding | null {
  if (!isRecord(raw)) return null;
  const medication = asOptionalString(raw.medication);
  const interactsWith = asOptionalString(raw.interactsWith);
  if (!medication || !interactsWith || !isSeverity(raw.severity)) return null;
  const citations = Array.isArray(raw.citations)
    ? raw.citations.filter((c): c is string => typeof c === "string")
    : undefined;
  return {
    medication,
    interactsWith,
    interactionType: asOptionalString(raw.interactionType),
    severity: raw.severity,
    mechanism: asOptionalString(raw.mechanism),
    clinicalEffect: asOptionalString(raw.clinicalEffect),
    onsetTiming: asOptionalString(raw.onsetTiming),
    mitigation: asOptionalString(raw.mitigation),
    evidenceLevel: asOptionalString(raw.evidenceLevel),
    citations,
  };
}

function readSummary(
  value: unknown
): CheckInteractionsData["summary"] | null {
  if (!isRecord(value)) return null;
  const major = value.major;
  const moderate = value.moderate;
  const minor = value.minor;
  const synergistic = value.synergistic;
  if (
    typeof major !== "number" ||
    typeof moderate !== "number" ||
    typeof minor !== "number" ||
    typeof synergistic !== "number"
  ) {
    return null;
  }
  return { major, moderate, minor, synergistic };
}

export function mapEnginePayloadToData(
  payload: CheckInteractionsEnginePayload
): CheckInteractionsData | { error: ToolError } {
  if (typeof payload.error === "string" && payload.error.trim()) {
    return { error: fail("upstream_5xx", true) };
  }
  if (!Array.isArray(payload.interactions)) {
    return { error: fail("malformed_payload", false) };
  }
  const interactions: InteractionFinding[] = [];
  for (const row of payload.interactions) {
    const finding = mapFinding(row);
    if (!finding) return { error: fail("malformed_payload", false) };
    interactions.push(finding);
  }
  const summary = readSummary(payload.summary);
  if (!summary) return { error: fail("malformed_payload", false) };
  if (!Array.isArray(payload.blockedProducts)) {
    return { error: fail("malformed_payload", false) };
  }
  const blockedProducts = payload.blockedProducts.filter((v): v is string => typeof v === "string");
  if (blockedProducts.length !== payload.blockedProducts.length) {
    return { error: fail("malformed_payload", false) };
  }
  return { interactions, summary, blockedProducts };
}

function thrownToToolError(err: unknown): ToolError {
  if (isTimeoutError(err)) return fail("upstream_timeout", true);
  if (isCircuitBreakerError(err)) return fail("circuit_open", true);
  return fail("upstream_5xx", true);
}

export async function checkInteractionsLive(
  input: CheckInteractionsInput,
  ctx: GroundedToolContext,
  assemble: AssembleCheckInteractionsFn = ctx.checkInteractionsAssemble ?? assembleCheckInteractions
): Promise<CheckInteractionsResult> {
  const body = mapCheckInteractionsBody(input);
  try {
    const payload = await assemble(body);
    const mapped = mapEnginePayloadToData(payload ?? emptyCheckInteractionsPayload());
    if ("error" in mapped) return mapped.error;
    return {
      ok: true,
      data: mapped,
      route: CHECK_INTERACTIONS_ROUTE,
      retrieved_at: nowIso(),
    };
  } catch (err) {
    return thrownToToolError(err);
  }
}
