/**
 * Allowlisted Stage A tool router.
 * get_protocol reads advisor context / stored protocol only.
 * check_interactions is live in-process (Claude+local+floor assemble; no HTTP loopback).
 * allow_generate is hard false (never silent generate-protocol).
 * SNP / peptide / education still return ok:false not_implemented so the refuse path fires.
 *
 * Retatrutide lock (comment only; peptide stub does not invent routes or stacks):
 * injectable-only, never stacked. Semaglutide / excluded GLP-1 stay blocked.
 */

import {
  buildCheckInteractionsInputFromContext,
  checkInteractionsLive,
} from "./check-interactions-wrap";
import { preparePeptideToolPayload } from "./strip-peptide-delivery";
import type {
  CheckInteractionsInput,
  GetEducationInput,
  GetEducationResult,
  GetProtocolData,
  GetProtocolInput,
  GetProtocolResult,
  GroundedToolContext,
  GroundedToolName,
  LookupPeptideData,
  LookupPeptideInput,
  LookupPeptideResult,
  LookupSnpInput,
  LookupSnpResult,
  ProtocolBucket,
  ProtocolItem,
  StoredProtocolPayload,
  ToolError,
  ToolResult,
} from "./types";

const GET_PROTOCOL_ROUTE = "advisor.context / stored user_protocols";
const ALLOW_GENERATE = false;

export const GROUNDED_TOOL_ALLOWLIST: readonly GroundedToolName[] = [
  "get_protocol",
  "check_interactions",
  "lookup_snp",
  "lookup_peptide",
  "get_education",
] as const;

function nowIso(): string {
  return new Date().toISOString();
}

function notImplemented(route: string, tool: GroundedToolName): ToolError {
  return {
    ok: false,
    code: "not_implemented",
    message: `${tool} is not wired in Stage A stub. Refuse rather than invent.`,
    retryable: false,
    route,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asTier(value: unknown): 1 | 2 | 3 | undefined {
  if (value === 1 || value === 2 || value === 3) return value;
  if (value === "1") return 1;
  if (value === "2") return 2;
  if (value === "3") return 3;
  return undefined;
}

function asBucket(value: unknown, fallback: ProtocolBucket): ProtocolBucket {
  if (
    value === "morning" ||
    value === "afternoon" ||
    value === "evening" ||
    value === "asNeeded" ||
    value === "other"
  ) {
    return value;
  }
  return fallback;
}

function readProtocolItem(raw: unknown, bucket: ProtocolBucket): ProtocolItem | null {
  if (!isRecord(raw)) return null;
  const productName = asString(raw.productName) ?? asString(raw.name);
  if (!productName) return null;
  return {
    productName,
    dosage: asString(raw.dosage) ?? "",
    reason: asString(raw.reason) ?? "",
    priority: asString(raw.priority),
    dataSource: asString(raw.dataSource),
    bucket: asBucket(raw.bucket, bucket),
  };
}

function itemsFromStoredProtocol(payload: StoredProtocolPayload): ProtocolItem[] {
  const items: ProtocolItem[] = [];
  const buckets: ProtocolBucket[] = ["morning", "afternoon", "evening", "asNeeded", "other"];
  for (const bucket of buckets) {
    const raw = payload[bucket];
    if (!Array.isArray(raw)) continue;
    for (const row of raw) {
      const item = readProtocolItem(row, bucket);
      if (item) items.push(item);
    }
  }
  if (Array.isArray(payload.items)) {
    for (const row of payload.items) {
      const item = readProtocolItem(row, "other");
      if (item) items.push(item);
    }
  }
  return items;
}

export function protocolItemsFromContext(ctx: GroundedToolContext): ProtocolItem[] {
  const storedItems = ctx.storedProtocol ? itemsFromStoredProtocol(ctx.storedProtocol) : [];
  return storedItems.length ? storedItems : itemsFromAdvisorContext(ctx.advisorContextVariables);
}

function itemsFromAdvisorContext(vars: Record<string, string> | undefined): ProtocolItem[] {
  if (!vars) return [];
  const raw = vars.currentSupplements?.trim();
  if (!raw || raw === "none" || raw === "not available") return [];
  return raw
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^(.*)\((.*)\)\s*$/);
      const productName = (match?.[1] ?? part).trim();
      const dosage = match?.[2]?.trim() ?? "";
      return {
        productName,
        dosage,
        reason: "already on file in advisor context",
        dataSource: "advisor_context",
        bucket: "other" as const,
      };
    })
    .filter((item) => item.productName.length > 0);
}

function blockedFromStored(payload: StoredProtocolPayload | null | undefined): string[] {
  const raw = payload?.blockedProducts;
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === "string");
}

export function getProtocolFromContext(
  input: GetProtocolInput,
  ctx: GroundedToolContext
): GetProtocolResult {
  // LOCK: allow_generate stays false. Chat must not call generate-protocol.
  void input.allow_generate;
  if (input.user_id && input.user_id !== ctx.userId) {
    return {
      ok: false,
      code: "forbidden",
      message: "get_protocol user_id must match the authenticated chat subject.",
      retryable: false,
      route: GET_PROTOCOL_ROUTE,
    };
  }

  const contextItems = protocolItemsFromContext(ctx);
  if (!contextItems.length) {
    return {
      ok: false,
      code: "not_found",
      message: "No stored protocol on file and allow_generate is false.",
      retryable: false,
      route: GET_PROTOCOL_ROUTE,
    };
  }

  const stored = ctx.storedProtocol;
  const data: GetProtocolData = {
    protocol_name: stored?.protocol_name ?? "ViaConnect protocol on file",
    source: stored?.source ?? "advisor_context",
    tier: asTier(stored?.tier) ?? 1,
    confidenceLabel: stored?.confidenceLabel,
    confidenceScore: stored?.confidenceScore,
    items: contextItems,
    blockedProducts: blockedFromStored(stored),
    interactions_summary: stored?.interactions,
  };

  return {
    ok: true,
    data,
    route: GET_PROTOCOL_ROUTE,
    retrieved_at: nowIso(),
  };
}

export { checkInteractionsLive } from "./check-interactions-wrap";

export function lookupSnpStub(_input: LookupSnpInput): LookupSnpResult {
  return notImplemented("GET /api/genetics/variants", "lookup_snp");
}

/**
 * When lookup_peptide returns ok (live wrap or fixture), strip before assembler.
 * Stub still refuse-closes; success path cannot skip the display ban.
 */
export function finalizeLookupPeptideResult(result: LookupPeptideResult): LookupPeptideResult {
  if (result.ok !== true) return result;
  return {
    ...result,
    data: preparePeptideToolPayload(result.data),
  };
}

/** Success fixture so strip is proven on ok payloads, not only the refuse stub. */
export function lookupPeptideSuccessFixture(data: LookupPeptideData): LookupPeptideResult {
  return finalizeLookupPeptideResult({
    ok: true,
    data,
    route: "GET /api/peptides/search",
    retrieved_at: nowIso(),
  });
}

export function lookupPeptideStub(input: LookupPeptideInput): LookupPeptideResult {
  void preparePeptideToolPayload({ name: input.name, deliveryOptions_raw: null });
  return finalizeLookupPeptideResult(notImplemented("GET /api/peptides/search", "lookup_peptide"));
}

export function getEducationStub(_input: GetEducationInput): GetEducationResult {
  return notImplemented("RAG education / KB", "get_education");
}

export type RoutedToolResult = ToolResult<unknown>;

function readStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const names = value.filter((v): v is string => typeof v === "string");
  return names.length ? names : undefined;
}

function partialCheckInteractionsInput(input: unknown): Partial<CheckInteractionsInput> | undefined {
  if (!isRecord(input)) return undefined;
  const partial: Partial<CheckInteractionsInput> = {};
  const stack = readStringArray(input.stack);
  const meds = readStringArray(input.meds);
  const herbs = readStringArray(input.herbs);
  const candidate = readStringArray(input.candidate);
  const allergies = readStringArray(input.allergies);
  if (stack) partial.stack = stack;
  if (meds) partial.meds = meds;
  if (herbs) partial.herbs = herbs;
  if (candidate) partial.candidate = candidate;
  if (allergies) partial.allergies = allergies;
  if (typeof input.user_id === "string") partial.user_id = input.user_id;
  return Object.keys(partial).length ? partial : undefined;
}

export async function routeGroundedTool(
  name: GroundedToolName,
  ctx: GroundedToolContext,
  input?: unknown
): Promise<RoutedToolResult> {
  switch (name) {
    case "get_protocol": {
      const parsed: GetProtocolInput = {
        user_id: ctx.userId,
        allow_generate: false,
      };
      if (isRecord(input) && typeof input.user_id === "string") {
        parsed.user_id = input.user_id;
      }
      return getProtocolFromContext(parsed, ctx);
    }
    case "check_interactions":
      return checkInteractionsLive(
        buildCheckInteractionsInputFromContext(
          partialCheckInteractionsInput(input),
          ctx,
          protocolItemsFromContext(ctx)
        ),
        ctx
      );
    case "lookup_snp":
      return lookupSnpStub({ rsid: "" });
    case "lookup_peptide":
      return finalizeLookupPeptideResult(
        lookupPeptideStub({ name: isRecord(input) ? asString(input.name) ?? "" : "" })
      );
    case "get_education":
      return getEducationStub({ topic_id: "" });
  }
}

export async function runRequiredTools(
  required: GroundedToolName[],
  ctx: GroundedToolContext
): Promise<Record<GroundedToolName, RoutedToolResult | undefined>> {
  const out: Record<GroundedToolName, RoutedToolResult | undefined> = {
    get_protocol: undefined,
    check_interactions: undefined,
    lookup_snp: undefined,
    lookup_peptide: undefined,
    get_education: undefined,
  };
  for (const name of required) {
    if (!GROUNDED_TOOL_ALLOWLIST.includes(name)) continue;
    out[name] = await routeGroundedTool(name, ctx);
  }
  return out;
}

export function isAllowGenerateHardFalse(): boolean {
  return ALLOW_GENERATE === false;
}
