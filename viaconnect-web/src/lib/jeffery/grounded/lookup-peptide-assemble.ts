/**
 * In-process lookup_peptide assemble (chat wrap).
 *
 * Search SSOT: same stack as GET /api/peptides/search
 *   supabase.rpc("search_peptides", { search_query, result_limit })
 *   then optional peptide_delivery_options enrich
 *
 * Edu SSOT: same consumer helper as browse — loadConsumerEducationEntries
 *   (peptide_education_entries, is_practitioner_depth false, Thanos 33 keys).
 *   Prefer live mechanism. Depth frameworks stay off this path.
 *
 * Listed (optional): same tables as GET /api/peptides/prescribed
 *   user_prescribed_peptides + kb_peptides name/slug join.
 *   Names only — never select Rx dose / vial / frequency for chat.
 *   Converter allowlist / dose compute stay OOB.
 *
 * No HTTP loopback. Search catch/RPC empty is a read fail, not a verified catalog miss.
 */

import { createClient } from "@/lib/supabase/server";
import {
  isPractitionerDepthEntryKey,
  type EducationEntry,
} from "@/lib/peptides/educationEntryFields";
import { loadConsumerEducationEntries } from "@/lib/peptides/educationEntries";
import { isTimeoutError, withTimeout } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";

export const LOOKUP_PEPTIDE_ROUTE = "GET /api/peptides/search";
export const LOOKUP_PEPTIDE_LISTED_ROUTE = "GET /api/peptides/prescribed";

export interface LookupPeptideAssembleInput {
  userId: string;
  searchQuery: string;
  name?: string;
  slug?: string;
}

export interface LookupPeptideSearchRow {
  peptide_id: string;
  product_name: string;
  category_name: string | null;
  evidence_level: string | null;
  genex_panel: string | null;
  match_score: number | null;
  deliveryOptions?: unknown;
}

export interface LookupPeptideEducationRow {
  entryKey: string;
  title: string;
  isPeptide: boolean;
  mechanism: string | null;
  evidenceGrade: string;
}

export type LookupPeptideEngineLoadStatus = "ok" | "unauthorized" | "error";

export interface LookupPeptideEnginePayload {
  loadStatus: LookupPeptideEngineLoadStatus;
  searchVerified: boolean;
  searchFailed: boolean;
  queryTooShort?: boolean;
  results: LookupPeptideSearchRow[];
  education: LookupPeptideEducationRow | null;
  educationFailed?: boolean;
  listedNames: string[];
  listedFailed?: boolean;
  error?: string;
}

export type AssembleLookupPeptideFn = (
  input: LookupPeptideAssembleInput
) => Promise<LookupPeptideEnginePayload>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

function asOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function failedLookupPeptidePayload(
  extra: Partial<LookupPeptideEnginePayload> = {}
): LookupPeptideEnginePayload {
  return {
    loadStatus: "error",
    searchVerified: false,
    searchFailed: true,
    results: [],
    education: null,
    listedNames: [],
    ...extra,
  };
}

export function mapSearchRows(raw: unknown): LookupPeptideSearchRow[] {
  if (!Array.isArray(raw)) return [];
  const out: LookupPeptideSearchRow[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const peptideId = asOptionalString(row.peptide_id);
    const productName = asOptionalString(row.product_name);
    if (!peptideId || !productName) continue;
    out.push({
      peptide_id: peptideId,
      product_name: productName,
      category_name: asOptionalString(row.category_name),
      evidence_level: asOptionalString(row.evidence_level),
      genex_panel: asOptionalString(row.genex_panel),
      match_score: asNumber(row.match_score),
      deliveryOptions: row.deliveryOptions,
    });
  }
  return out;
}

export function educationRowFromEntry(entry: EducationEntry): LookupPeptideEducationRow | null {
  if (isPractitionerDepthEntryKey(entry.entryKey)) return null;
  return {
    entryKey: entry.entryKey,
    title: entry.title,
    isPeptide: entry.isPeptide,
    mechanism: entry.mechanism,
    evidenceGrade: entry.evidenceGrade,
  };
}

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const META_ENTRY_KEYS = new Set([
  "edu-peptideiq-topic-map",
  "edu-generative-ai-peptide-design",
  "edu-peptide-drug-conjugates",
  "edu-therapeutic-peptide-chem-strategies",
  "edu-cdk5-inhibitory-peptides",
  "edu-fr-alpha-binding",
  "edu-uacd-acps",
]);

export function matchConsumerEducation(
  entries: EducationEntry[],
  ask: { name?: string; slug?: string; searchQuery?: string }
): LookupPeptideEducationRow | null {
  const tokens = [ask.slug, ask.name, ask.searchQuery]
    .map((part) => (typeof part === "string" ? normalizeToken(part) : ""))
    .filter((part) => part.length >= 3 && part !== "peptide" && part !== "peptideiq");
  if (tokens.length === 0) return null;

  const wantsTopicMap = tokens.some(
    (token) => token.includes("topicmap") || token.includes("peptideiqtopic")
  );

  let best: EducationEntry | null = null;
  for (const entry of entries) {
    if (isPractitionerDepthEntryKey(entry.entryKey)) continue;
    const mapped = educationRowFromEntry(entry);
    if (!mapped) continue;
    const keyToken = normalizeToken(
      entry.entryKey.replace(/^edu-/, "").replace(/-nonpeptide$/, "").replace(/-pause$/, "")
    );
    const titleToken = normalizeToken(entry.title);
    const hit = tokens.some(
      (token) =>
        keyToken === token ||
        titleToken === token ||
        (keyToken.length >= 4 && (keyToken.includes(token) || token.includes(keyToken))) ||
        (titleToken.length >= 4 && titleToken.includes(token))
    );
    if (!hit) continue;
    if (META_ENTRY_KEYS.has(entry.entryKey) && !wantsTopicMap) continue;
    if (entry.entryKey === "edu-peptideiq-topic-map" && !wantsTopicMap) continue;
    best = entry;
    if (keyToken === tokens[0] || titleToken === tokens[0]) break;
  }
  return best ? educationRowFromEntry(best) : null;
}

async function enrichDeliveryOptions(
  supabase: SupabaseLike,
  results: LookupPeptideSearchRow[]
): Promise<LookupPeptideSearchRow[]> {
  if (results.length === 0) return results;
  return Promise.all(
    results.map(async (peptide) => {
      try {
        const { data: options } = await supabase
          .from("peptide_delivery_options")
          .select(
            "delivery_form, dose_amount, dose_unit, dose_frequency, bioavailability_estimate, price_range_low, price_range_high, onset_timeline"
          )
          .eq("peptide_id", peptide.peptide_id)
          .eq("is_available", true);
        return {
          ...peptide,
          deliveryOptions: options ?? [],
        };
      } catch {
        return peptide;
      }
    })
  );
}

async function loadListedNamesSameAsRoute(
  supabase: SupabaseLike,
  userId: string,
  ask: { name?: string; slug?: string; searchQuery?: string }
): Promise<{ names: string[]; failed: boolean }> {
  const { data, error } = await supabase
    .from("user_prescribed_peptides")
    .select("peptide_id")
    .eq("user_id", userId);

  if (error) {
    safeLog.warn("advisor.grounded.lookup-peptide", "listed read failed", {
      user_id: userId,
      error: error.message ?? "supabase error",
    });
    return { names: [], failed: true };
  }

  const peptideIds = [
    ...new Set(
      (data ?? [])
        .map((row: { peptide_id?: string | null }) => asOptionalString(row.peptide_id))
        .filter((id: string | null): id is string => Boolean(id))
    ),
  ];
  if (peptideIds.length === 0) return { names: [], failed: false };

  const { data: peps, error: pepError } = await supabase
    .from("kb_peptides")
    .select("id, display_name, slug")
    .in("id", peptideIds);

  if (pepError) {
    safeLog.warn("advisor.grounded.lookup-peptide", "listed name join failed", {
      user_id: userId,
      error: pepError.message ?? "supabase error",
    });
    return { names: [], failed: true };
  }

  const tokens = [ask.slug, ask.name, ask.searchQuery]
    .map((part) => (typeof part === "string" ? normalizeToken(part) : ""))
    .filter((part) => part.length >= 3);

  const names: string[] = [];
  for (const pep of peps ?? []) {
    const displayName = asOptionalString(
      (pep as { display_name?: string | null }).display_name
    );
    const slug = asOptionalString((pep as { slug?: string | null }).slug);
    if (!displayName) continue;
    if (tokens.length > 0) {
      const nameToken = normalizeToken(displayName);
      const slugToken = slug ? normalizeToken(slug) : "";
      const hit = tokens.some(
        (token) =>
          nameToken === token ||
          slugToken === token ||
          nameToken.includes(token) ||
          (slugToken && slugToken.includes(token))
      );
      if (!hit) continue;
    }
    names.push(displayName);
  }
  return { names, failed: false };
}

/**
 * Shared peptide assemble used by the grounded chat wrap.
 * RPC error / timeout → searchFailed (not verified empty catalog).
 * Successful [] → searchVerified, results empty.
 */
export async function assembleLookupPeptide(
  input: LookupPeptideAssembleInput
): Promise<LookupPeptideEnginePayload> {
  try {
    const supabase = await createClient();
    const searchQuery = (input.searchQuery || input.slug || input.name || "").trim().toLowerCase();

    if (!searchQuery || searchQuery.length < 2) {
      return {
        loadStatus: "ok",
        searchVerified: false,
        searchFailed: false,
        queryTooShort: true,
        results: [],
        education: null,
        listedNames: [],
      };
    }

    let searchVerified = false;
    let searchFailed = false;
    let results: LookupPeptideSearchRow[] = [];
    let error: string | undefined;

    try {
      const { data, error: rpcError } = await withTimeout(
        (async () =>
          supabase.rpc("search_peptides", {
            search_query: searchQuery,
            result_limit: 8,
          }))(),
        8000,
        "advisor.grounded.lookup-peptide.search"
      );

      if (rpcError) {
        searchFailed = true;
        error = rpcError.message ?? "search_peptides rpc error";
        safeLog.warn("advisor.grounded.lookup-peptide", "RPC error (not verified miss)", {
          query: searchQuery,
          error,
        });
      } else {
        searchVerified = true;
        results = mapSearchRows(data ?? []);
        results = await enrichDeliveryOptions(supabase, results);
      }
    } catch (err) {
      searchFailed = true;
      error = isTimeoutError(err) ? "timeout" : err instanceof Error ? err.message : String(err);
      safeLog.warn("advisor.grounded.lookup-peptide", "search threw (not verified miss)", {
        query: searchQuery,
        error,
      });
      return failedLookupPeptidePayload({
        loadStatus: "error",
        error,
      });
    }

    if (searchFailed) {
      return failedLookupPeptidePayload({
        loadStatus: "error",
        error,
      });
    }

    let education: LookupPeptideEducationRow | null = null;
    let educationFailed = false;
    try {
      const catalog = await loadConsumerEducationEntries();
      if (!catalog.ok) {
        educationFailed = true;
      } else {
        education = matchConsumerEducation(catalog.entries, {
          name: input.name,
          slug: input.slug,
          searchQuery,
        });
      }
    } catch (err) {
      educationFailed = true;
      safeLog.warn("advisor.grounded.lookup-peptide", "education read failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    let listedNames: string[] = [];
    let listedFailed = false;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && (!input.userId || input.userId === user.id)) {
        const listed = await loadListedNamesSameAsRoute(supabase, user.id, {
          name: input.name,
          slug: input.slug,
          searchQuery,
        });
        listedNames = listed.names;
        listedFailed = listed.failed;
      }
    } catch (err) {
      listedFailed = true;
      safeLog.warn("advisor.grounded.lookup-peptide", "listed optional read failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return {
      loadStatus: "ok",
      searchVerified,
      searchFailed: false,
      results,
      education,
      educationFailed,
      listedNames,
      listedFailed,
    };
  } catch (err) {
    safeLog.error("advisor.grounded.lookup-peptide", "unexpected error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return failedLookupPeptidePayload({
      error: "lookup_peptide assemble failed",
    });
  }
}
