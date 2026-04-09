/**
 * FarmCeutica Product Mapper (Prompt #60d — Section 2)
 *
 * Maps a free-text health/ingredient query to a ranked list of FarmCeutica
 * products from the real `product_catalog` table. Uses tag arrays
 * (symptom_tags, genetic_tags, lifestyle_tags, goal_tags) for semantic match
 * + falls back to keyword search on name/description when tags don't hit.
 *
 * Output is injected into the advisor system prompt BEFORE Claude is called,
 * so the model is constrained to recommend ONLY from the supplied list. This
 * is a guardrail layer — the model is also told via system prompt rules to
 * never recommend non-FarmCeutica products.
 *
 * Server-side only — uses a service-role client.
 *
 * Pre-launch reality: product_catalog has 72 rows so this returns real data
 * even before the rest of the platform is fully populated.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface ProductMatch {
  productName: string;
  productSku: string | null;
  category: string | null;
  subcategory: string | null;
  deliveryForm: string | null;
  shortDescription: string | null;
  matchedTags: string[];
  matchReason: string;
  score: number;
}

export interface PeptideMatch {
  peptideName: string;
  productName: string;
  category: string | null;
  deliveryForm: string | null;
  description: string | null;
  isFarmceutica: boolean;
  requiresPractitionerConsult: boolean;
}

function buildServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/**
 * Pull tag-like keywords from a query. This is intentionally simple — the
 * tag matching downstream is forgiving, so we just need to surface the right
 * stems. Stop-words filtered.
 */
const STOP = new Set([
  "the","a","an","is","are","was","were","be","being","been","have","has","had",
  "do","does","did","i","you","my","me","mine","your","what","which","when","where",
  "how","why","can","could","should","would","will","may","might","must","shall",
  "and","or","but","with","without","for","of","to","in","on","at","by","from",
  "this","that","these","those","it","its","also","more","less","very","really","just",
  "good","bad","help","helps","helping","helped","need","needs","want","wants",
]);

export function extractKeywords(query: string): string[] {
  const tokens = query
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(t => t.length >= 3 && !STOP.has(t));
  return Array.from(new Set(tokens));
}

interface ProductCatalogRow {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  subcategory: string | null;
  description: string | null;
  short_description: string | null;
  delivery_form: string | null;
  symptom_tags: string[] | null;
  genetic_tags: string[] | null;
  lifestyle_tags: string[] | null;
  goal_tags: string[] | null;
  active: boolean | null;
}

/**
 * Map a query to FarmCeutica products. Returns up to `limit` matches ordered
 * by relevance (tag-match strength + description keyword hits). Empty array
 * if no matches — caller should still call Claude but the system prompt will
 * tell it to admit FarmCeutica has no matching product.
 */
export async function mapToFarmceuticaProducts(
  query: string,
  opts: { limit?: number; db?: SupabaseClient } = {}
): Promise<ProductMatch[]> {
  const limit = opts.limit ?? 6;
  const client = opts.db ?? buildServiceClient();
  const keywords = extractKeywords(query);
  if (keywords.length === 0) return [];

  // Pull a wider set than `limit` (active only), score in JS, return top N.
  // 72 rows total — this is cheap.
  const { data, error } = await client
    .from("product_catalog")
    .select("id, name, sku, category, subcategory, description, short_description, delivery_form, symptom_tags, genetic_tags, lifestyle_tags, goal_tags, active")
    .eq("active", true);
  if (error || !data) return [];

  const matches: ProductMatch[] = [];
  for (const row of data as ProductCatalogRow[]) {
    const allTags = [
      ...(row.symptom_tags ?? []),
      ...(row.genetic_tags ?? []),
      ...(row.lifestyle_tags ?? []),
      ...(row.goal_tags ?? []),
    ].map(t => t.toLowerCase());

    const matchedTags: string[] = [];
    let score = 0;

    // Strong: tag-on-tag matches
    for (const k of keywords) {
      for (const t of allTags) {
        if (t === k || t.includes(k) || k.includes(t)) {
          matchedTags.push(t);
          score += 5;
          break;
        }
      }
    }

    // Medium: keyword in name
    const nameLower = row.name.toLowerCase();
    for (const k of keywords) {
      if (nameLower.includes(k)) score += 3;
    }

    // Weak: keyword in description
    const descLower = (row.description ?? "").toLowerCase() + " " + (row.short_description ?? "").toLowerCase();
    for (const k of keywords) {
      if (descLower.includes(k)) score += 1;
    }

    // Bonus: subcategory match
    if (row.subcategory) {
      const sub = row.subcategory.toLowerCase();
      for (const k of keywords) if (sub.includes(k)) score += 2;
    }

    if (score > 0) {
      const reasons: string[] = [];
      if (matchedTags.length > 0) reasons.push(`matches ${matchedTags.slice(0, 3).join(", ")}`);
      if (nameLower.match(new RegExp(keywords.join("|")))) reasons.push("name match");
      if (descLower.match(new RegExp(keywords.join("|")))) reasons.push("description match");

      matches.push({
        productName: row.name,
        productSku: row.sku,
        category: row.category,
        subcategory: row.subcategory,
        deliveryForm: row.delivery_form,
        shortDescription: row.short_description ?? row.description?.slice(0, 120) ?? null,
        matchedTags: Array.from(new Set(matchedTags)),
        matchReason: reasons.join("; ") || "keyword match",
        score,
      });
    }
  }

  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, limit);
}

/**
 * Format ProductMatches as a compact context block to inject into the system prompt.
 * Returns empty string if there are no matches (so the system prompt instructs
 * the model to say FarmCeutica doesn't currently offer a product).
 */
export function formatProductsForPrompt(matches: ProductMatch[]): string {
  if (matches.length === 0) {
    return `\n\nFARMCEUTICA CATALOG SEARCH: No matching FarmCeutica products were found for this query. Per the rules, you must say: "FarmCeutica does not currently offer a product for that specific need. I recommend discussing this with your practitioner for alternative options."`;
  }
  const lines = matches.map(m =>
    `- ${m.productName}${m.deliveryForm ? ` (${m.deliveryForm})` : ""}${m.category ? ` — ${m.category}` : ""}${m.shortDescription ? `: ${m.shortDescription}` : ""}`
  );
  return `\n\nRELEVANT FARMCEUTICA PRODUCTS (recommend ONLY from this list — never any other brand):\n${lines.join("\n")}`;
}

// ─── Peptide registry helpers (used by detection in advisor-stream) ────────

/**
 * Module-level cache of peptide names from the real peptide_registry table.
 * 5-minute TTL — refreshed lazily by getPeptideRegistry().
 */
let peptideCache: { fetchedAt: number; rows: PeptideMatch[] } | null = null;
const PEPTIDE_CACHE_TTL_MS = 5 * 60 * 1000;

interface PeptideRegistryRow {
  product_name: string;
  category_name: string | null;
  delivery_form: string | null;
  description: string | null;
  is_farmceutica: boolean | null;
  requires_practitioner_consult: boolean | null;
}

/**
 * Get the cached peptide registry. Refreshes from DB if stale or absent.
 * Returns the full peptide list — used by detectPeptideMention to scan
 * advisor responses for peptide names.
 */
export async function getPeptideRegistry(db?: SupabaseClient): Promise<PeptideMatch[]> {
  const now = Date.now();
  if (peptideCache && now - peptideCache.fetchedAt < PEPTIDE_CACHE_TTL_MS) {
    return peptideCache.rows;
  }
  const client = db ?? buildServiceClient();
  const { data, error } = await client
    .from("peptide_registry")
    .select("product_name, category_name, delivery_form, description, is_farmceutica, requires_practitioner_consult");
  if (error || !data) {
    return peptideCache?.rows ?? [];
  }
  const rows: PeptideMatch[] = (data as PeptideRegistryRow[])
    .filter(r => r.product_name)
    .map(r => ({
      peptideName: r.product_name,
      productName: r.product_name,
      category: r.category_name,
      deliveryForm: r.delivery_form,
      description: r.description,
      isFarmceutica: !!r.is_farmceutica,
      requiresPractitionerConsult: !!r.requires_practitioner_consult,
    }));
  peptideCache = { fetchedAt: now, rows };
  return rows;
}

/**
 * Detect if any peptide name from the registry appears in the given text.
 * Returns the FIRST match (so the share button only points to one peptide).
 * Excludes Semaglutide explicitly per the standing rules — even though it's
 * not in the registry, this is a defensive guard.
 */
export async function detectPeptideMention(text: string, db?: SupabaseClient): Promise<string | null> {
  const lowerText = text.toLowerCase();
  if (lowerText.includes("semaglutide")) {
    // This shouldn't happen given the system prompt rules, but if it does
    // we still don't want to surface a share button for an excluded molecule.
    return null;
  }
  const peptides = await getPeptideRegistry(db);
  for (const p of peptides) {
    if (lowerText.includes(p.peptideName.toLowerCase())) {
      return p.peptideName;
    }
  }
  return null;
}
