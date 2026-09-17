/**
 * Map current protocol rows → ViaCura next-order suggestions.
 * Never deletes a competitor `current` row. Never invents milligrams / COAs / BA.
 * GeneX360 Soft maps in genex360-next-order; this file stays CAQ-only.
 */

import {
  STAGE_A_VIACURA_SUPPLEMENT_EDU_SEEDS,
  isStageAViacuraSupplementEduId,
} from "@/lib/jeffery/grounded/viacura-supplement-edu";
import { matchCaqReplacement, VIA_CURA_MAP_SKUS } from "./caq-replacement-map";
import type {
  CaqMapMatch,
  CurrentProtocolProduct,
  ProtocolEntryCite,
  ProtocolEntrySource,
  ProtocolNextOrderEntry,
} from "./types";
import { PROTOCOL_ENTRY_SOURCES } from "./types";

const KNOWN_BRANDS = [
  "Renue By Science",
  "Life Extension",
  "Garden of Life",
  "Transparent Labs",
  "Spring Valley",
  "One A Day",
  "Nature Made",
  "Via Cura",
  "ViaCura",
  "Renew Life",
  "Athletic Greens",
  "MegaFood",
  "Codeage",
  "Thorne",
  "Centrum",
  "Natrol",
  "Ritual",
  "Onnit",
  "Legion",
  "Kirkland",
  "Equate",
  "Enzymedica",
  "Culturelle",
  "Bloom",
  "OLLY",
  "NOW",
  "IM8",
  "AG1",
] as const;

const BRANDS_BY_LENGTH = [...KNOWN_BRANDS].sort((a, b) => b.length - a.length);

function normSku(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9+]+/g, " ").replace(/\s+/g, " ").trim();
}

function skuAliases(sku: string): string[] {
  const aliases = [sku];
  for (const seed of Object.values(STAGE_A_VIACURA_SUPPLEMENT_EDU_SEEDS)) {
    if (seed.product_skus.some((name) => normSku(name) === normSku(sku))) {
      aliases.push(seed.label, ...seed.product_skus);
    }
  }
  return aliases;
}

export function splitBrandProduct(rawName: string): { brand: string; product_name: string } {
  const trimmed = rawName.trim();
  if (!trimmed) return { brand: "", product_name: "" };
  const lower = trimmed.toLowerCase();
  for (const brand of BRANDS_BY_LENGTH) {
    const prefix = brand.toLowerCase();
    if (lower === prefix) return { brand, product_name: trimmed };
    if (lower.startsWith(`${prefix} `) || lower.startsWith(`${prefix}+`)) {
      return { brand, product_name: trimmed.slice(brand.length).trim() || trimmed };
    }
  }
  return { brand: "", product_name: trimmed };
}

export function sourceFromDataSource(dataSource: string | undefined): ProtocolEntrySource {
  const raw = (dataSource ?? "").trim().toLowerCase();
  if (raw === "photo") return "photo";
  if (raw === "manual") return "manual";
  if (raw === "hannah_suggest") return "hannah_suggest";
  if ((PROTOCOL_ENTRY_SOURCES as readonly string[]).includes(raw)) {
    return raw as ProtocolEntrySource;
  }
  return "caq";
}

function isViaCuraName(brand: string, productName: string): boolean {
  const hay = `${brand} ${productName}`.toLowerCase();
  if (/\bvia[-\s]?cura\b/.test(hay)) return true;
  const productNorm = normSku(productName);
  return VIA_CURA_MAP_SKUS.some((sku) => normSku(sku) === productNorm);
}

function stackHasSku(currents: readonly CurrentProtocolProduct[], sku: string): boolean {
  const aliases = skuAliases(sku).map(normSku);
  return currents.some((row) => {
    const product = normSku(row.product_name);
    const branded = normSku(`${row.brand ?? ""} ${row.product_name}`);
    return aliases.some((alias) => product === alias || branded.includes(alias));
  });
}

function eduCiteForSku(sku: string): ProtocolEntryCite | undefined {
  for (const seed of Object.values(STAGE_A_VIACURA_SUPPLEMENT_EDU_SEEDS)) {
    const names = [seed.label, ...seed.product_skus].map(normSku);
    if (names.includes(normSku(sku)) && isStageAViacuraSupplementEduId(seed.cite_id)) {
      return { cite_id: seed.cite_id, label: seed.label };
    }
  }
  return undefined;
}

function mapCite(match: CaqMapMatch, sku: string): ProtocolEntryCite {
  const edu = eduCiteForSku(sku);
  if (edu) return edu;
  return {
    cite_id: match.map_row_id ?? `caq-map:${match.category ?? "unmapped"}`,
    label: sku,
  };
}

function currentCite(
  match: CaqMapMatch,
  brand: string,
  productName: string
): ProtocolEntryCite | undefined {
  if (isViaCuraName(brand, productName)) {
    return eduCiteForSku(productName) ?? eduCiteForSku(`${brand} ${productName}`.trim());
  }
  if (match.kind === "unmapped" || !match.map_row_id) return undefined;
  return {
    cite_id: match.map_row_id,
    label: productName,
  };
}

export function suggestProtocolNextOrder(
  currents: readonly CurrentProtocolProduct[]
): ProtocolNextOrderEntry[] {
  const entries: ProtocolNextOrderEntry[] = [];

  for (const current of currents) {
    const parsed = splitBrandProduct(
      current.brand?.trim()
        ? `${current.brand.trim()} ${current.product_name}`.trim()
        : current.product_name
    );
    const brand = current.brand?.trim() || parsed.brand;
    const product_name = current.brand?.trim()
      ? current.product_name.trim() || parsed.product_name
      : parsed.product_name;
    const source = current.source ?? "caq";
    const match = matchCaqReplacement(brand, product_name);

    const currentRow: ProtocolNextOrderEntry = {
      brand,
      product_name,
      status: "current",
      source,
    };
    if (match.category) currentRow.category = match.category;
    if (match.why_pillar_ids.length > 0) currentRow.why_pillar_ids = match.why_pillar_ids;
    const cite = currentCite(match, brand, product_name);
    if (cite) currentRow.cite = cite;
    if (isViaCuraName(brand, product_name)) {
      const sku =
        VIA_CURA_MAP_SKUS.find((name) => normSku(name) === normSku(product_name)) ?? product_name;
      currentRow.via_cura_sku = sku;
    }
    entries.push(currentRow);

    if (isViaCuraName(brand, product_name)) continue;
    if (match.via_cura_skus.length === 0) continue;

    for (const sku of match.via_cura_skus) {
      if (stackHasSku(currents, sku)) continue;
      entries.push({
        brand: "ViaCura",
        product_name: sku,
        status: "suggested_viacura",
        source: "hannah_suggest",
        via_cura_sku: sku,
        cite: mapCite(match, sku),
        category: match.category,
        why_pillar_ids: match.why_pillar_ids,
      });
    }
  }

  return entries;
}

export function attachProtocolNextOrder(
  currents: readonly CurrentProtocolProduct[],
  enabled: boolean
): ProtocolNextOrderEntry[] | undefined {
  if (!enabled) return undefined;
  return suggestProtocolNextOrder(currents);
}
