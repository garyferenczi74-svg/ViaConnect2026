/**
 * In-process lookup_snp assemble (chat wrap).
 *
 * Genotype SSOT: same helpers as GET /api/genetics/variants
 *   loadHubVariants / unauthorizedHubPayload / errorHubPayload
 *   normalizeObservedPanelKey / panelKeyAliasesFor
 *
 * NutrigenDX (nutrition-panel rsids/findings only): same helpers as
 *   GET /api/nutrition/genetics/nutrigendx
 *   buildNutrigenDxCrossRefPayload + panelKeyAliasesFor("nutrition")
 *
 * No HTTP loopback. No third genetics path.
 * Nutrigen catch / query error is a read fail, not a verified empty genotype.
 * HormoneIQ / EpigenHQ rows are not SNP length.
 */

import { createClient } from "@/lib/supabase/server";
import { loadHubVariants } from "@/lib/genetics/loadHubVariants";
import {
  errorHubPayload,
  unauthorizedHubPayload,
  type HubVariantsPayload,
} from "@/lib/genetics/hubVariantsPayload";
import { normalizeObservedPanelKey, panelKeyAliasesFor } from "@/lib/genetics/panelKeyAliases";
import type { PanelKey } from "@/lib/genetics/panelLabels";
import { isLifemetricsDemoSource } from "@/lib/genetics/lifemetricsDemoGuard";
import { severityFor } from "@/lib/genetics/variantSeverity";
import { fetchActiveFindings } from "@/lib/nutrition/genetics/recommendations";
import {
  buildNutrigenDxCrossRefPayload,
  type NutrigenDxVariantRow,
} from "@/lib/nutrition/genetics/nutrigenDxCrossRef";
import { safeLog } from "@/lib/utils/safe-log";

export const LOOKUP_SNP_ROUTE = "GET /api/genetics/variants";
export const LOOKUP_SNP_NUTRIGEN_ROUTE = "GET /api/nutrition/genetics/nutrigendx";

const SNP_COUNT_PANELS: readonly PanelKey[] = [
  "methylation",
  "nutrition",
  "peptide",
  "cannabis",
];

export interface LookupSnpAssembleInput {
  userId: string;
  rsid?: string;
  gene?: string;
  consultNutrigen: boolean;
}

export interface LookupSnpHubRow {
  rsid: string;
  gene: string | null;
  genotype: string | null;
  panel_key: string;
  stored_panel_key: string | null;
  status: string | null;
  clinical_significance: string | null;
  is_sample: boolean;
  chip: string | null;
}

export interface LookupSnpNutrigenMarker {
  gene: string;
  rsid: string;
  genotype: string;
  impactSummary: string;
}

export type LookupSnpEngineLoadStatus = "ok" | "unauthorized" | "error";

export interface LookupSnpEnginePayload {
  loadStatus: LookupSnpEngineLoadStatus;
  variants: LookupSnpHubRow[];
  snpCountsUnknown?: boolean;
  demoAccount?: boolean;
  nutrigenAttempted?: boolean;
  nutrigenFailed?: boolean;
  nutrigenMarkers?: LookupSnpNutrigenMarker[];
  error?: string;
}

export type AssembleLookupSnpFn = (
  input: LookupSnpAssembleInput
) => Promise<LookupSnpEnginePayload>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

function asOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function flattenSnpRows(
  payload: HubVariantsPayload<Record<string, unknown> & { panel_key: string }>
): LookupSnpHubRow[] {
  const out: LookupSnpHubRow[] = [];
  for (const key of SNP_COUNT_PANELS) {
    const rows = payload.variantsByPanel[key] ?? [];
    for (const row of rows) {
      const rsid = asOptionalString(row.rsid);
      if (!rsid) continue;
      const remapped =
        normalizeObservedPanelKey(asOptionalString(row.panel_key) ?? key);
      if (remapped === "hormone" || remapped === "epigenetic") continue;
      out.push({
        rsid,
        gene: asOptionalString(row.gene),
        genotype: typeof row.genotype === "string" ? row.genotype : null,
        panel_key: remapped ?? key,
        stored_panel_key:
          asOptionalString(row.stored_panel_key) ?? asOptionalString(row.panel_key),
        status: asOptionalString(row.status),
        clinical_significance: asOptionalString(row.clinical_significance),
        is_sample: row.is_sample === true,
        chip: asOptionalString(row.chip),
      });
    }
  }
  return out;
}

function snpCountsUnknown(
  payload: HubVariantsPayload<Record<string, unknown> & { panel_key: string }>
): boolean {
  for (const key of SNP_COUNT_PANELS) {
    const panel = payload.observedByPanel[key];
    if (!panel || panel.status === "unknown" || panel.count === null) return true;
  }
  return false;
}

export function isBannedDemoAccount(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): boolean {
  const email = typeof user.email === "string" ? user.email : null;
  const meta = user.user_metadata ?? {};
  const displayName =
    asOptionalString(meta.full_name) ??
    asOptionalString(meta.name) ??
    asOptionalString(meta.display_name);
  if (isLifemetricsDemoSource({ email, displayName })) return true;
  const e = (email ?? "").trim().toLowerCase();
  if (e.startsWith("demo@")) return true;
  const name = (displayName ?? "").trim().toLowerCase();
  return name.includes("demo client 4634");
}

function flattenHub(
  payload: HubVariantsPayload<Record<string, unknown> & { panel_key: string }>,
  extra: Partial<LookupSnpEnginePayload> = {}
): LookupSnpEnginePayload {
  const loadStatus: LookupSnpEngineLoadStatus =
    payload.loadStatus === "unauthorized"
      ? "unauthorized"
      : payload.loadStatus === "error"
        ? "error"
        : "ok";
  return {
    loadStatus,
    variants: flattenSnpRows(payload),
    snpCountsUnknown: loadStatus === "ok" ? snpCountsUnknown(payload) : true,
    ...extra,
  };
}

async function loadNutrigenDxSameAsRoute(
  supabase: SupabaseLike,
  userId: string
): Promise<{ failed: boolean; markers: LookupSnpNutrigenMarker[] }> {
  const [{ data: varData, error: varError }, findings] = await Promise.all([
    supabase
      .from("user_variants")
      .select("panel_key, rsid, gene, genotype, status, clinical_significance, is_sample")
      .eq("user_id", userId)
      .in("panel_key", panelKeyAliasesFor("nutrition")),
    fetchActiveFindings(supabase, userId),
  ]);

  if (varError) {
    safeLog.warn("advisor.grounded.lookup-snp", "nutrigen variants read failed", {
      user_id: userId,
      error: varError.message ?? "supabase error",
    });
    return { failed: true, markers: [] };
  }

  const variants: NutrigenDxVariantRow[] = (
    (varData ?? []) as Array<{
      rsid?: string | null;
      gene?: string | null;
      genotype?: string | null;
      status?: string | null;
      clinical_significance?: string | null;
      is_sample?: boolean | null;
    }>
  ).map((row) => ({
    rsid: String(row.rsid ?? ""),
    gene: row.gene ?? null,
    genotype: row.genotype ?? null,
    status: row.status ?? null,
    clinical_significance: row.clinical_significance ?? null,
    is_sample: row.is_sample === true,
    severity: severityFor("nutrigen-dx", String(row.rsid ?? ""), row.genotype ?? null) ?? null,
  }));

  const payload = buildNutrigenDxCrossRefPayload(variants, findings);
  return {
    failed: false,
    markers: payload.resultSet.markers.map((m) => ({
      gene: m.gene,
      rsid: m.rsid,
      genotype: m.genotype,
      impactSummary: m.impactSummary,
    })),
  };
}

/**
 * Shared genetics assemble used by the grounded chat wrap.
 * Unauthorized / hub throw → same UNKNOWN payloads as the variants route.
 * Nutrigen query error or throw → nutrigenFailed (not verified empty genotype).
 */
export async function assembleLookupSnp(
  input: LookupSnpAssembleInput
): Promise<LookupSnpEnginePayload> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return flattenHub(unauthorizedHubPayload(), { demoAccount: false });
    }
    if (input.userId && input.userId !== user.id) {
      return flattenHub(unauthorizedHubPayload(), {
        demoAccount: false,
        error: "user mismatch",
      });
    }

    const demoAccount = isBannedDemoAccount(user);

    let hub: HubVariantsPayload<Record<string, unknown> & { panel_key: string }>;
    try {
      hub = await loadHubVariants(supabase, user.id);
    } catch (err) {
      safeLog.error("advisor.grounded.lookup-snp", "loadHubVariants threw", {
        user_id: user.id,
        error: err instanceof Error ? err.message : String(err),
      });
      return flattenHub(errorHubPayload(), { demoAccount, error: "hub load failed" });
    }

    const base = flattenHub(hub, { demoAccount });

    if (!input.consultNutrigen) {
      return base;
    }

    try {
      const nutrigen = await loadNutrigenDxSameAsRoute(supabase, user.id);
      return {
        ...base,
        nutrigenAttempted: true,
        nutrigenFailed: nutrigen.failed,
        nutrigenMarkers: nutrigen.markers,
      };
    } catch (err) {
      safeLog.error("advisor.grounded.lookup-snp", "nutrigen read failed (not empty genotype)", {
        user_id: user.id,
        error: err instanceof Error ? err.message : String(err),
      });
      return {
        ...base,
        nutrigenAttempted: true,
        nutrigenFailed: true,
        nutrigenMarkers: [],
        error: base.error,
      };
    }
  } catch (err) {
    safeLog.error("advisor.grounded.lookup-snp", "unexpected error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return flattenHub(errorHubPayload(), { error: "lookup_snp assemble failed" });
  }
}
