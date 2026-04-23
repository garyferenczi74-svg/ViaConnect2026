/**
 * SKU adapter — runs the peptide + brand rules against a single product row.
 */

import { ViolationDetector } from "../engine/ViolationDetector";

export interface SkuInput {
  id: string;
  name: string;
  description?: string;
  category?: string;
}

export async function scanSku(sku: SkuInput) {
  const detector = new ViolationDetector();
  const combined = [sku.id, sku.name, sku.description ?? "", sku.category ?? ""].filter(Boolean).join(" | ");
  return detector.detect({
    surface: "product_db",
    source: "runtime",
    sku,
    content: combined,
    location: { dbTable: "products", dbRowId: sku.id },
  });
}

export async function scanManySkus(skus: SkuInput[]) {
  const all = [];
  for (const sku of skus) {
    const r = await scanSku(sku);
    if (r.findings.length > 0) all.push({ sku: sku.id, findings: r.findings });
  }
  return all;
}
