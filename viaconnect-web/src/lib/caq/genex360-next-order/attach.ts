/**
 * Additive GeneX360 Soft attach onto #238 protocol_entries.
 * Never deletes `current` rows. Never invents milligrams / genotypes / fake SKUs.
 */

import type { ProtocolNextOrderEntry } from "@/lib/caq/protocol-next-order/types";
import type { LookupSnpEnginePayload } from "@/lib/jeffery/grounded/lookup-snp-assemble";
import { mapEnginePayloadToNextOrder } from "./map";

function normSku(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9+]+/g, " ").replace(/\s+/g, " ").trim();
}

function entriesHaveSku(entries: readonly ProtocolNextOrderEntry[], sku: string): boolean {
  const want = normSku(sku);
  return entries.some((row) => {
    if (row.via_cura_sku && normSku(row.via_cura_sku) === want) return true;
    return normSku(row.product_name) === want;
  });
}

export function attachGenex360NextOrder(
  entries: readonly ProtocolNextOrderEntry[],
  payload: LookupSnpEnginePayload | null | undefined
): ProtocolNextOrderEntry[] {
  const mapped = mapEnginePayloadToNextOrder(payload);
  const out = [...entries];
  for (const suggestion of mapped.suggestions) {
    const sku = suggestion.via_cura_sku;
    if (!sku || entriesHaveSku(out, sku)) continue;
    out.push(suggestion);
  }
  return out;
}
