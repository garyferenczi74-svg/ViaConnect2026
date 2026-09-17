/**
 * Map on-file engine genotypes → ViaCura SNP SKUs.
 * Engines remain SSOT. Never invent alleles, doses, milligrams, or fake SKUs.
 * null / UNKNOWN / pending → no SNP SKU. CYP2C9 UNKNOWN/pending never drives a SKU.
 * Demo Client 4634 / demo@ / is_sample never map. HormoneIQ / EpigenHQ are not SNPs.
 */

import {
  isBannedDemoGenotypeRow,
  honestGenotype,
  restatedPanelKey,
} from "@/lib/jeffery/grounded/lookup-snp-wrap";
import type { LookupSnpEnginePayload, LookupSnpHubRow } from "@/lib/jeffery/grounded/lookup-snp-assemble";
import type { ProtocolNextOrderEntry } from "@/lib/caq/protocol-next-order/types";
import { citeForMappedSku, findGeneSkuPair } from "./gene-sku-map";
import type {
  Genex360EngineStatus,
  Genex360MapStatus,
  Genex360SkuPanel,
} from "./types";

export interface Genex360MemberSnp {
  rsid: string;
  gene?: string | null;
  genotype?: string | null;
  status?: string | null;
  panel_key?: string | null;
  stored_panel_key?: string | null;
  is_sample?: boolean | null;
  chip?: string | null;
}

export interface Genex360MapHit {
  gene: string;
  rsid: string;
  panel_key: Genex360SkuPanel | null;
  genotype: string | null;
  status: Genex360MapStatus;
  via_cura_sku?: string;
}

export interface Genex360MapResult {
  engine_status: Genex360EngineStatus;
  hits: Genex360MapHit[];
  suggestions: ProtocolNextOrderEntry[];
}

const EMPTY_UNREAD: Genex360MapResult = {
  engine_status: "engines_unread",
  hits: [],
  suggestions: [],
};

const EMPTY_DEMO: Genex360MapResult = {
  engine_status: "demo_refused",
  hits: [],
  suggestions: [],
};

const NON_PRESENT = new Set(["unknown", "pending", "null", "n/a", "na", "none"]);

export function isPresentGenotype(
  raw: string | null | undefined,
  rowStatus?: string | null
): boolean {
  const genotype = honestGenotype(raw);
  if (genotype == null) return false;
  if (NON_PRESENT.has(genotype.toLowerCase())) return false;
  const status = (rowStatus ?? "").trim().toLowerCase();
  if (status === "pending" || status === "unknown") return false;
  return true;
}

function asSkuPanel(raw: string | null | undefined): Genex360SkuPanel | null {
  const key = restatedPanelKey(raw);
  if (key === "genex_m" || key === "nutrigen_dx") return key;
  return null;
}

function isHormoneOrEpigen(raw: string | null | undefined): boolean {
  const key = restatedPanelKey(raw);
  return key == null && Boolean((raw ?? "").trim());
}

function suggestionForSku(sku: string): ProtocolNextOrderEntry {
  return {
    brand: "ViaCura",
    product_name: sku,
    status: "suggested_viacura",
    source: "hannah_suggest",
    via_cura_sku: sku,
    cite: citeForMappedSku(sku),
    why_pillar_ids: ["snp_targeted_catalog"],
  };
}

function hitFromRow(row: Genex360MemberSnp): Genex360MapHit {
  const rsid = (row.rsid ?? "").trim();
  const gene = (row.gene ?? "").trim().toUpperCase() || rsid;
  const panel = asSkuPanel(row.stored_panel_key ?? row.panel_key);
  const genotype = honestGenotype(row.genotype);

  if (isHormoneOrEpigen(row.stored_panel_key ?? row.panel_key) && !panel) {
    return { gene, rsid, panel_key: null, genotype, status: "not_snp" };
  }

  const pair = findGeneSkuPair({ rsid, gene, panel });
  if (!pair) {
    if (gene === "CYP2C9") {
      return { gene, rsid, panel_key: panel, genotype, status: "unavailable" };
    }
    return { gene, rsid, panel_key: panel, genotype, status: "unavailable" };
  }

  if (panel !== pair.panel) {
    return { gene: pair.gene, rsid, panel_key: panel, genotype, status: "wrong_panel" };
  }

  if (!isPresentGenotype(row.genotype, row.status)) {
    return { gene: pair.gene, rsid, panel_key: panel, genotype, status: "empty" };
  }

  if (!pair.via_cura_sku) {
    return { gene: pair.gene, rsid, panel_key: panel, genotype, status: "unavailable" };
  }

  return {
    gene: pair.gene,
    rsid,
    panel_key: panel,
    genotype,
    status: "mapped",
    via_cura_sku: pair.via_cura_sku,
  };
}

export function mapMemberSnpsToNextOrder(rows: readonly Genex360MemberSnp[]): Genex360MapResult {
  const hits: Genex360MapHit[] = [];
  const suggestions: ProtocolNextOrderEntry[] = [];
  const seenSku = new Set<string>();

  for (const row of rows) {
    if (isBannedDemoGenotypeRow({ is_sample: row.is_sample, chip: row.chip })) {
      continue;
    }
    const remapped = restatedPanelKey(row.stored_panel_key ?? row.panel_key);
    if (remapped === null) {
      const raw = (row.stored_panel_key ?? row.panel_key ?? "").trim().toLowerCase();
      if (raw === "hormone" || raw === "epigenetic" || raw.includes("hormone") || raw.includes("epigen")) {
        hits.push({
          gene: (row.gene ?? "").trim().toUpperCase() || row.rsid,
          rsid: row.rsid,
          panel_key: null,
          genotype: honestGenotype(row.genotype),
          status: "not_snp",
        });
        continue;
      }
    }
    const hit = hitFromRow(row);
    hits.push(hit);
    if (hit.status !== "mapped" || !hit.via_cura_sku) continue;
    if (seenSku.has(hit.via_cura_sku)) continue;
    seenSku.add(hit.via_cura_sku);
    suggestions.push(suggestionForSku(hit.via_cura_sku));
  }

  return { engine_status: "ok", hits, suggestions };
}

export function mapEnginePayloadToNextOrder(
  payload: LookupSnpEnginePayload | null | undefined
): Genex360MapResult {
  if (!payload) return EMPTY_UNREAD;
  if (payload.demoAccount) return EMPTY_DEMO;
  if (payload.loadStatus === "unauthorized" || payload.loadStatus === "error") {
    return EMPTY_UNREAD;
  }
  if (payload.loadStatus !== "ok") return EMPTY_UNREAD;
  if (payload.snpCountsUnknown && payload.variants.length === 0) return EMPTY_UNREAD;

  const usable: LookupSnpHubRow[] = payload.variants.filter(
    (row) => !isBannedDemoGenotypeRow(row)
  );
  return mapMemberSnpsToNextOrder(usable);
}
