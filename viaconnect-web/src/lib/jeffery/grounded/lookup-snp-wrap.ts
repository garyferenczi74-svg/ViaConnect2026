/**
 * Live lookup_snp wrap for Stage A grounded chat.
 *
 * Genotype SSOT is the hub variants path (never NutrigenDX for MTHFR / APOE / CYP).
 * NutrigenDX helpers are consulted only for live nutrition-panel rsids/findings.
 * is_sample / Demo Client 4634 / demo@ are never restated as member genotype.
 * null / UNKNOWN / pending stay verbatim. Never invent alleles, 0, normal, negative, or clear.
 * educational_summary is stored-only. NutrigenDX fallback filler is dropped.
 */

import { isMthfrFolateTarget } from "@/lib/genetics/mthfrFolate";
import { normalizeObservedPanelKey } from "@/lib/genetics/panelKeyAliases";
import { isTimeoutError } from "@/lib/utils/with-timeout";
import { isCircuitBreakerError } from "@/lib/utils/circuit-breaker";
import {
  assembleLookupSnp,
  LOOKUP_SNP_ROUTE,
  type AssembleLookupSnpFn,
  type LookupSnpEnginePayload,
  type LookupSnpHubRow,
} from "./lookup-snp-assemble";
import type {
  GroundedToolContext,
  LookupSnpData,
  LookupSnpInput,
  LookupSnpResult,
  ToolError,
  ToolErrorCode,
} from "./types";

const NUTRIGEN_LIVE_RSIDS = new Set(["rs9939609", "rs1544410", "rs1815739"]);
const NUTRIGEN_LIVE_GENES = new Set(["fto", "vdr", "actn3"]);

const GENEXM_RSIDS = new Set([
  "rs1801133",
  "rs1801131",
  "rs2066470",
  "rs429358",
  "rs7412",
  "rs762551",
  "rs1799853",
  "rs1057910",
  "rs4244285",
  "rs4986893",
  "rs3892097",
  "rs1056836",
  "rs1695",
]);

const GENEXM_GENES = new Set([
  "mthfr",
  "apoe",
  "cyp1a2",
  "cyp2c9",
  "cyp2d6",
  "cyp2c19",
  "cyp1b1",
  "gstp1",
]);

const NUTRIGEN_FALLBACK_RE =
  /NutrigenDX result\.\s*Educational genotype context is not available/i;

const RSID_RE = /\b(rs\d{4,})\b/i;

const GENE_ASSISTS: Array<{ re: RegExp; gene: string }> = [
  { re: /\bmthfr\b/i, gene: "MTHFR" },
  { re: /\bapoe\b/i, gene: "APOE" },
  { re: /\bfto\b/i, gene: "FTO" },
  { re: /\bvdr\b/i, gene: "VDR" },
  { re: /\bactn3\b/i, gene: "ACTN3" },
  { re: /\bcyp1a2\b/i, gene: "CYP1A2" },
  { re: /\bcyp2c9\b/i, gene: "CYP2C9" },
  { re: /\bcyp2d6\b/i, gene: "CYP2D6" },
  { re: /\bcyp2c19\b/i, gene: "CYP2C19" },
  { re: /\bcyp1b1\b/i, gene: "CYP1B1" },
  { re: /\bfads1\b/i, gene: "FADS1" },
  { re: /\bcomt\b/i, gene: "COMT" },
];

function nowIso(): string {
  return new Date().toISOString();
}

function fail(code: ToolErrorCode, retryable: boolean): ToolError {
  return {
    ok: false,
    code,
    message: `lookup_snp ${code}`,
    retryable,
    route: LOOKUP_SNP_ROUTE,
  };
}

function normRsid(rsid: string | undefined): string {
  return (rsid ?? "").trim().toLowerCase();
}

function normGene(gene: string | undefined): string {
  return (gene ?? "").trim().toLowerCase();
}

export function isNutrigenLiveTarget(rsid?: string, gene?: string): boolean {
  if (isMthfrFolateTarget(rsid, gene)) return false;
  const id = normRsid(rsid);
  const g = normGene(gene);
  if (id && NUTRIGEN_LIVE_RSIDS.has(id)) return true;
  return Boolean(g && NUTRIGEN_LIVE_GENES.has(g));
}

export function isGenexmTarget(rsid?: string, gene?: string): boolean {
  if (isMthfrFolateTarget(rsid, gene)) return true;
  const id = normRsid(rsid);
  const g = normGene(gene);
  if (id && GENEXM_RSIDS.has(id)) return true;
  if (g && GENEXM_GENES.has(g)) return true;
  return Boolean(g.startsWith("cyp"));
}

export function shouldConsultNutrigenDx(ask: {
  rsid?: string;
  gene?: string;
  message?: string;
}): boolean {
  if (isGenexmTarget(ask.rsid, ask.gene)) return false;
  if (isNutrigenLiveTarget(ask.rsid, ask.gene)) return true;
  if (/\bnutrigendx\b/i.test(ask.message ?? "")) return true;
  return false;
}

export function extractLookupSnpAsk(
  input: Partial<LookupSnpInput> | undefined,
  message: string | undefined
): LookupSnpInput {
  const fromInputRsid = typeof input?.rsid === "string" ? input.rsid.trim() : "";
  const fromInputGene = typeof input?.gene === "string" ? input.gene.trim() : "";
  const text = message ?? "";
  const rsidMatch = text.match(RSID_RE);
  let gene = fromInputGene;
  if (!gene) {
    for (const token of GENE_ASSISTS) {
      if (token.re.test(text)) {
        gene = token.gene;
        break;
      }
    }
  }
  return {
    rsid: fromInputRsid || (rsidMatch?.[1] ?? ""),
    gene: gene || undefined,
    user_id: input?.user_id,
  };
}

export function isBannedDemoGenotypeRow(row: {
  is_sample?: boolean | null;
  chip?: string | null;
}): boolean {
  if (row.is_sample === true) return true;
  return row.chip === "demo";
}

/** Restate stored genotype tokens verbatim. Empty stays null. Never rewrite. */
export function honestGenotype(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Stored edu only. NutrigenDX fallback filler is not chat edu. */
export function storedEducationalSummary(raw: string | null | undefined): string {
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (NUTRIGEN_FALLBACK_RE.test(trimmed)) return "";
  return trimmed;
}

/** methylation/reference → genex_m; nutrition → nutrigen_dx. Hormone/epigen not SNP. */
export function restatedPanelKey(raw: string | null | undefined): string | null {
  const hub = normalizeObservedPanelKey(raw);
  if (hub === "methylation") return "genex_m";
  if (hub === "nutrition") return "nutrigen_dx";
  if (hub === "hormone" || hub === "epigenetic") return null;
  return hub ?? (typeof raw === "string" && raw.trim() ? raw.trim() : null);
}

function targetHubPanel(ask: LookupSnpInput): "methylation" | "nutrition" | null {
  if (isGenexmTarget(ask.rsid, ask.gene)) return "methylation";
  if (isNutrigenLiveTarget(ask.rsid, ask.gene)) return "nutrition";
  return null;
}

function rowHubPanel(row: LookupSnpHubRow): string | null {
  return (
    normalizeObservedPanelKey(row.panel_key) ??
    normalizeObservedPanelKey(row.stored_panel_key)
  );
}

export function matchMemberSnpRow(
  rows: LookupSnpHubRow[],
  ask: LookupSnpInput
): LookupSnpHubRow | null {
  const panel = targetHubPanel(ask);
  const searchable = rows.filter((row) => {
    if (isBannedDemoGenotypeRow(row)) return false;
    const hub = rowHubPanel(row);
    if (hub === "hormone" || hub === "epigenetic") return false;
    if (panel && hub !== panel) return false;
    return true;
  });

  const wantRsid = normRsid(ask.rsid);
  if (wantRsid) {
    return searchable.find((row) => normRsid(row.rsid) === wantRsid) ?? null;
  }
  const wantGene = normGene(ask.gene);
  if (wantGene) {
    return searchable.find((row) => normGene(row.gene ?? undefined) === wantGene) ?? null;
  }
  return null;
}

function mapRowToData(row: LookupSnpHubRow, ask: LookupSnpInput): LookupSnpData {
  return {
    rsid: row.rsid || ask.rsid,
    gene: row.gene,
    genotype: honestGenotype(row.genotype),
    panel_key: restatedPanelKey(row.stored_panel_key ?? row.panel_key),
    status: row.status,
    educational_summary: storedEducationalSummary(row.clinical_significance),
    severity_tier: null,
    citations: [],
    loadStatus: "ok",
  };
}

export function mapEnginePayloadToSnpResult(
  payload: LookupSnpEnginePayload,
  ask: LookupSnpInput
): LookupSnpResult {
  if (payload.loadStatus === "unauthorized") {
    return { ...fail("unauthorized", false), message: "lookup_snp unauthorized" };
  }
  if (payload.loadStatus === "error" || payload.error) {
    return fail("upstream_5xx", true);
  }
  if (payload.demoAccount) {
    return fail("not_found", false);
  }

  const match = matchMemberSnpRow(payload.variants, ask);
  const consultNutrigen = shouldConsultNutrigenDx({
    rsid: ask.rsid,
    gene: ask.gene,
  });

  if (payload.nutrigenFailed && consultNutrigen && !match) {
    return fail("upstream_5xx", true);
  }
  if (payload.snpCountsUnknown && !match) {
    return fail("upstream_5xx", true);
  }
  if (!match) {
    return fail("not_found", false);
  }

  return {
    ok: true,
    data: mapRowToData(match, ask),
    route: LOOKUP_SNP_ROUTE,
    retrieved_at: nowIso(),
  };
}

function thrownToToolError(err: unknown): ToolError {
  if (isTimeoutError(err)) return fail("upstream_timeout", true);
  if (isCircuitBreakerError(err)) return fail("circuit_open", true);
  return fail("upstream_5xx", true);
}

export function buildLookupSnpInputFromContext(
  input: Partial<LookupSnpInput> | undefined,
  ctx: GroundedToolContext
): LookupSnpInput {
  const ask = extractLookupSnpAsk(input, ctx.message);
  return {
    ...ask,
    user_id: ask.user_id ?? ctx.userId,
  };
}

export async function lookupSnpLive(
  input: LookupSnpInput,
  ctx: GroundedToolContext,
  assemble: AssembleLookupSnpFn = ctx.lookupSnpAssemble ?? assembleLookupSnp
): Promise<LookupSnpResult> {
  if (input.user_id && input.user_id !== ctx.userId) {
    return fail("forbidden", false);
  }
  try {
    const payload = await assemble({
      userId: ctx.userId,
      rsid: input.rsid,
      gene: input.gene,
      consultNutrigen: shouldConsultNutrigenDx({
        rsid: input.rsid,
        gene: input.gene,
        message: ctx.message,
      }),
    });
    return mapEnginePayloadToSnpResult(payload ?? { loadStatus: "error", variants: [] }, input);
  } catch (err) {
    return thrownToToolError(err);
  }
}
