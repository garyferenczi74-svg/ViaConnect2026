// Prompt #113 — Disease lexicon loader (regulatory_disease_dictionary).
// Loaded once per request and cached by module closure for the duration of
// the serverless invocation.

import { createAdminClient } from "@/lib/supabase/admin";

export interface DiseaseEntry {
  term: string;
  variant_group: string | null;
  icd10_code: string | null;
  severity_level: number;
}

let cache: DiseaseEntry[] | null = null;
let cachedAt = 0;
const TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function loadDiseaseLexicon(): Promise<DiseaseEntry[]> {
  const now = Date.now();
  if (cache && now - cachedAt < TTL_MS) return cache;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("regulatory_disease_dictionary")
    .select("term, variant_group, icd10_code, severity_level");
  if (error || !data) {
    cache = [];
    cachedAt = now;
    return cache;
  }
  cache = data as DiseaseEntry[];
  cachedAt = now;
  return cache;
}

export function invalidateLexicon(): void {
  cache = null;
  cachedAt = 0;
}
