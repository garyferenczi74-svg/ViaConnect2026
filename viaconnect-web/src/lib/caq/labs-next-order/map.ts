/**
 * Map on-file labs → ViaCura SKUs only from concrete pairs.
 * Engines/labs remain SSOT (loadLabResults / lab_biomarkers).
 * Never invent lab values, doses, milligrams, COAs, BA folds, genotypes, or pairs.
 * Demo Client 4634 / demo@ / is_sample never map.
 * Missing labs / unread engines → empty / unavailable (no phantom SKUs).
 */

import type { ProtocolNextOrderEntry } from "@/lib/caq/protocol-next-order/types";
import { citeForMappedSku, findLabSkuPair } from "./lab-sku-map";
import type { LabsEngineLoadStatus, LabsEngineStatus, LabsMapStatus } from "./types";

export interface LabsMemberRow {
  biomarker_key: string;
  is_sample?: boolean | null;
  source_type?: string | null;
  lab_name?: string | null;
}

export interface LabsEnginePayload {
  loadStatus: LabsEngineLoadStatus;
  biomarkers: LabsMemberRow[];
  demoAccount?: boolean;
  labsUnread?: boolean;
  error?: string;
}

export interface LabsMapHit {
  biomarker_key: string;
  status: LabsMapStatus;
  via_cura_sku?: string;
}

export interface LabsMapResult {
  engine_status: LabsEngineStatus;
  hits: LabsMapHit[];
  suggestions: ProtocolNextOrderEntry[];
}

const EMPTY_UNREAD: LabsMapResult = {
  engine_status: "engines_unread",
  hits: [],
  suggestions: [],
};

const EMPTY_DEMO: LabsMapResult = {
  engine_status: "demo_refused",
  hits: [],
  suggestions: [],
};

const DEMO_TOKEN_RE = /sample|demo|4634/i;

export function isBannedDemoLabRow(row: {
  is_sample?: boolean | null;
  source_type?: string | null;
  lab_name?: string | null;
}): boolean {
  if (row.is_sample === true) return true;
  const source = (row.source_type ?? "").trim();
  const labName = (row.lab_name ?? "").trim();
  if (source && DEMO_TOKEN_RE.test(source)) return true;
  if (labName && DEMO_TOKEN_RE.test(labName)) return true;
  return false;
}

function suggestionForSku(sku: string): ProtocolNextOrderEntry {
  return {
    brand: "ViaCura",
    product_name: sku,
    status: "suggested_viacura",
    source: "hannah_suggest",
    via_cura_sku: sku,
    cite: citeForMappedSku(sku),
  };
}

function hitFromRow(row: LabsMemberRow): LabsMapHit {
  const biomarker_key = (row.biomarker_key ?? "").trim();
  if (!biomarker_key) {
    return { biomarker_key: "", status: "empty" };
  }

  const pair = findLabSkuPair(biomarker_key);
  if (!pair || !pair.via_cura_sku) {
    return { biomarker_key, status: "unavailable" };
  }

  return {
    biomarker_key: pair.biomarker_key,
    status: "mapped",
    via_cura_sku: pair.via_cura_sku,
  };
}

export function mapMemberLabsToNextOrder(rows: readonly LabsMemberRow[]): LabsMapResult {
  const hits: LabsMapHit[] = [];
  const suggestions: ProtocolNextOrderEntry[] = [];
  const seenSku = new Set<string>();

  for (const row of rows) {
    if (isBannedDemoLabRow(row)) continue;
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
  payload: LabsEnginePayload | null | undefined
): LabsMapResult {
  if (!payload) return EMPTY_UNREAD;
  if (payload.demoAccount) return EMPTY_DEMO;
  if (payload.labsUnread) return EMPTY_UNREAD;
  if (payload.loadStatus === "unauthorized" || payload.loadStatus === "error") {
    return EMPTY_UNREAD;
  }
  if (payload.loadStatus !== "ok") return EMPTY_UNREAD;
  return mapMemberLabsToNextOrder(payload.biomarkers);
}
