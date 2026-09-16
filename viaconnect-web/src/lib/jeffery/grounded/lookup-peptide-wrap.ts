/**
 * Live lookup_peptide wrap for Stage A grounded chat.
 *
 * Catalog search + consumer peptide_education_entries (mechanism first).
 * Always strip deliveryOptions via preparePeptideToolPayload.
 * Soft-empty RPC ≠ verified catalog miss. Depth frameworks stay off.
 * Non-peptides stay labeled. Listed names only — never Rx dose coaching.
 * Retatrutide = injectable-only restatement; never invent oral / stack.
 * Semaglutide / excluded GLP-1 refuse. Never invent doses or genotypes.
 */

import { isCircuitBreakerError } from "@/lib/utils/circuit-breaker";
import { isTimeoutError } from "@/lib/utils/with-timeout";
import { isPractitionerDepthEntryKey } from "@/lib/peptides/educationEntryFields";
import {
  assembleLookupPeptide,
  LOOKUP_PEPTIDE_ROUTE,
  type AssembleLookupPeptideFn,
  type LookupPeptideEducationRow,
  type LookupPeptideEnginePayload,
  type LookupPeptideSearchRow,
} from "./lookup-peptide-assemble";
import { preparePeptideToolPayload } from "./strip-peptide-delivery";
import type {
  GroundedToolContext,
  LookupPeptideData,
  LookupPeptideInput,
  LookupPeptideResult,
  ToolError,
  ToolErrorCode,
} from "./types";

const BLOCKED_GLP1_RE = /\b(semaglutide|ozempic|wegovy|liraglutide|excluded glp-?1)\b/i;
const EXCLUDED_GENE_RE = /\b(gcg|glp1r)\b/i;

const PEPTIDE_ASK_TOKENS: Array<{ re: RegExp; name: string; slug: string }> = [
  { re: /\bretatrutide\b/i, name: "Retatrutide", slug: "retatrutide" },
  { re: /\btirzepatide\b/i, name: "Tirzepatide", slug: "tirzepatide" },
  { re: /\bsermorelin\b/i, name: "Sermorelin", slug: "sermorelin" },
  { re: /\bbpc-?157\b/i, name: "BPC-157", slug: "bpc-157" },
  { re: /\btesamorelin\b/i, name: "Tesamorelin", slug: "tesamorelin" },
  { re: /\bipamorelin\b/i, name: "Ipamorelin", slug: "ipamorelin" },
  { re: /\bcjc-?1295\b/i, name: "CJC-1295", slug: "cjc-1295" },
  { re: /\bss-?31\b/i, name: "SS-31", slug: "ss-31" },
  { re: /\bsemax\b/i, name: "Semax", slug: "semax" },
  { re: /\bselank\b/i, name: "Selank", slug: "selank" },
  { re: /\bghk-?cu\b/i, name: "GHK-Cu", slug: "ghk-cu" },
  { re: /\bepitalon\b/i, name: "Epitalon", slug: "epitalon" },
  { re: /\bmots-?c\b/i, name: "MOTS-c", slug: "mots-c" },
  { re: /\bkpv\b/i, name: "KPV", slug: "kpv" },
  { re: /\btesofensine\b/i, name: "Tesofensine", slug: "tesofensine" },
  { re: /\b5-?amino-?1-?mq\b/i, name: "5-Amino-1MQ", slug: "5-amino-1mq" },
  { re: /\bslu-?pp-?332\b/i, name: "SLU-PP-332", slug: "slu-pp-332" },
  { re: /\bpeptideiq topic map\b/i, name: "PeptideIQ topic map", slug: "peptideiq-topic-map" },
  { re: /\bsemaglutide\b/i, name: "Semaglutide", slug: "semaglutide" },
  { re: /\bozempic\b/i, name: "Ozempic", slug: "semaglutide" },
  { re: /\bwegovy\b/i, name: "Wegovy", slug: "semaglutide" },
  { re: /\bliraglutide\b/i, name: "Liraglutide", slug: "liraglutide" },
];

function nowIso(): string {
  return new Date().toISOString();
}

function fail(code: ToolErrorCode, retryable: boolean): ToolError {
  return {
    ok: false,
    code,
    message: `lookup_peptide ${code}`,
    retryable,
    route: LOOKUP_PEPTIDE_ROUTE,
  };
}

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function slugFromEntryKey(entryKey: string): string {
  return entryKey.replace(/^edu-/, "").replace(/-nonpeptide$/, "").replace(/-pause$/, "");
}

export function extractLookupPeptideAsk(
  input: Partial<LookupPeptideInput> | undefined,
  message: string | undefined
): LookupPeptideInput {
  const fromName = typeof input?.name === "string" ? input.name.trim() : "";
  const fromSlug = typeof input?.slug === "string" ? input.slug.trim() : "";
  const text = message ?? "";
  let name = fromName;
  let slug = fromSlug || undefined;
  if (!name && !slug) {
    for (const token of PEPTIDE_ASK_TOKENS) {
      if (token.re.test(text)) {
        name = token.name;
        slug = token.slug;
        break;
      }
    }
  }
  return {
    name,
    slug,
  };
}

export function isBlockedGlp1Ask(name: string, message?: string): boolean {
  return BLOCKED_GLP1_RE.test(`${name} ${message ?? ""}`);
}

export function isExcludedGlp1GeneAsk(message: string): boolean {
  return EXCLUDED_GENE_RE.test(message);
}

/** Invent oral / topical / stack schedules for Retatrutide — refuse. Interact-with-stack is not invent. */
export function isRetatrutideOralOrStackInvent(message: string, name: string): boolean {
  const t = `${message} ${name}`.toLowerCase();
  if (!/\bretatrutide\b/.test(t)) return false;
  if (/\b(oral|orally|by mouth|topical|cream|pill form)\b/.test(t)) return true;
  if (/\b(stacking schedule|stack retatrutide|retatrutide stack|stack it with)\b/.test(t)) {
    return true;
  }
  return false;
}

export function dropPractitionerDepthEducation(
  education: LookupPeptideEducationRow | null
): LookupPeptideEducationRow | null {
  if (!education) return null;
  if (isPractitionerDepthEntryKey(education.entryKey)) return null;
  return education;
}

export function listedNamesOnly(names: unknown): string[] {
  if (!Array.isArray(names)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of names) {
    if (typeof raw !== "string") continue;
    const name = raw.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

function pickSearchRow(
  results: LookupPeptideSearchRow[],
  ask: LookupPeptideInput
): LookupPeptideSearchRow | null {
  const token = normalizeToken(ask.slug || ask.name);
  if (!token) return results[0] ?? null;
  return (
    results.find((row) => {
      if (isBlockedGlp1Ask(row.product_name)) return false;
      const nameToken = normalizeToken(row.product_name);
      return nameToken === token || nameToken.includes(token) || token.includes(nameToken);
    }) ??
    results.find((row) => !isBlockedGlp1Ask(row.product_name)) ??
    null
  );
}

function pathwayTags(input: {
  education: LookupPeptideEducationRow | null;
  search: LookupPeptideSearchRow | null;
}): string[] {
  const tags: string[] = [];
  const seen = new Set<string>();
  const push = (value: string | null | undefined) => {
    const trimmed = value?.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    tags.push(trimmed);
  };
  if (input.education && !input.education.isPeptide) push("non-peptide");
  if (input.education?.entryKey === "edu-peptideiq-topic-map") push("index");
  push(input.search?.genex_panel);
  push(input.search?.category_name);
  return tags;
}

function mapToData(
  ask: LookupPeptideInput,
  search: LookupPeptideSearchRow | null,
  education: LookupPeptideEducationRow | null,
  listedNames: string[]
): LookupPeptideData {
  const name = education?.title || search?.product_name || ask.name;
  const slug =
    (ask.slug && ask.slug.trim()) ||
    (education ? slugFromEntryKey(education.entryKey) : null) ||
    (search ? normalizeToken(search.product_name) : null);
  const listed = listedNamesOnly(listedNames);
  return {
    name,
    slug,
    educational_only: true,
    summary: education?.mechanism ?? "",
    pathway_tags: pathwayTags({ education, search }),
    entry_key: education?.entryKey ?? null,
    is_peptide: education ? education.isPeptide : true,
    listed_names: listed.length ? listed : undefined,
    prescribed: listed.length ? { listed: true, names: listed } : undefined,
    deliveryOptions_raw: search?.deliveryOptions,
  };
}

export function mapEnginePayloadToPeptideResult(
  payload: LookupPeptideEnginePayload,
  ask: LookupPeptideInput,
  message: string
): LookupPeptideResult {
  if (isBlockedGlp1Ask(ask.name, message) || isBlockedGlp1Ask(ask.slug ?? "", message)) {
    return fail("refuse_required", false);
  }
  if (isExcludedGlp1GeneAsk(message)) {
    return fail("refuse_required", false);
  }
  if (isRetatrutideOralOrStackInvent(message, ask.name)) {
    return fail("refuse_required", false);
  }
  if (payload.loadStatus === "unauthorized") {
    return fail("unauthorized", false);
  }
  if (payload.loadStatus === "error" || payload.searchFailed || payload.error) {
    return fail("upstream_5xx", true);
  }
  if (payload.queryTooShort || !ask.name.trim()) {
    return fail("validation", false);
  }

  const education = dropPractitionerDepthEducation(payload.education);
  const search = pickSearchRow(payload.results, ask);

  if (search && isBlockedGlp1Ask(search.product_name)) {
    return fail("refuse_required", false);
  }
  if (!payload.searchVerified && !education) {
    return fail("upstream_5xx", true);
  }
  if (payload.searchVerified && !search && !education) {
    return fail("not_found", false);
  }
  if (!search && !education) {
    return fail("not_found", false);
  }

  const data = mapToData(ask, search, education, payload.listedNames);
  return {
    ok: true,
    data: preparePeptideToolPayload(data),
    route: LOOKUP_PEPTIDE_ROUTE,
    retrieved_at: nowIso(),
  };
}

function thrownToToolError(err: unknown): ToolError {
  if (isTimeoutError(err)) return fail("upstream_timeout", true);
  if (isCircuitBreakerError(err)) return fail("circuit_open", true);
  return fail("upstream_5xx", true);
}

export function buildLookupPeptideInputFromContext(
  input: Partial<LookupPeptideInput> | undefined,
  ctx: GroundedToolContext
): LookupPeptideInput {
  return extractLookupPeptideAsk(input, ctx.message);
}

export async function lookupPeptideLive(
  input: LookupPeptideInput,
  ctx: GroundedToolContext,
  assemble: AssembleLookupPeptideFn = ctx.lookupPeptideAssemble ?? assembleLookupPeptide
): Promise<LookupPeptideResult> {
  if (isBlockedGlp1Ask(input.name, ctx.message)) {
    return fail("refuse_required", false);
  }
  if (isRetatrutideOralOrStackInvent(ctx.message ?? "", input.name)) {
    return fail("refuse_required", false);
  }
  if (isExcludedGlp1GeneAsk(ctx.message ?? "")) {
    return fail("refuse_required", false);
  }
  try {
    const payload = await assemble({
      userId: ctx.userId,
      searchQuery: (input.slug || input.name || "").trim().toLowerCase(),
      name: input.name,
      slug: input.slug,
    });
    return mapEnginePayloadToPeptideResult(
      payload ?? {
        loadStatus: "error",
        searchVerified: false,
        searchFailed: true,
        results: [],
        education: null,
        listedNames: [],
      },
      input,
      ctx.message ?? ""
    );
  } catch (err) {
    return thrownToToolError(err);
  }
}
