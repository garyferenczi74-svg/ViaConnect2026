/**
 * Ultrathink Pattern Matcher (Prompt #60 — Layer 4)
 *
 * Hashes a user signal vector into a stable pattern key, then queries
 * ultrathink_pattern_cache for a pre-computed protocol. If a match is found
 * with combined_confidence >= 0.85 AND sample_n >= 10, the cached protocol is
 * returned in <100ms (no Claude call required).
 *
 * Pre-launch reality: the cache is empty until cross-population learning has
 * accumulated outcomes. patternMatcher will return null in nearly all calls
 * until June 2026+. This is expected and correct — generateProtocol.ts should
 * fall back to its existing Claude path on null.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface UserSignals {
  /** age in years (will be bracketed) */
  age?: number | null;
  /** "m" | "f" | "x" | "unknown" */
  sex?: string | null;
  /** primary symptoms or conditions, e.g. ["fatigue","poor_sleep"] */
  symptoms?: string[];
  /** active medications (lowercased generic names) */
  medications?: string[];
  /** notable lab values e.g. {ferritin: "low", vitamin_d: "low"} */
  labs?: Record<string, string>;
  /** active genetic variants e.g. ["MTHFR_C677T_homozygous"] */
  genetic_variants?: string[];
  /** current Bio Optimization score */
  bio_score?: number | null;
}

export interface CacheHit {
  pattern_hash: string;
  signal_summary: string;
  protocol_payload: unknown;
  combined_confidence: number;
  data_confidence: number;
  outcome_confidence: number | null;
  sample_n: number;
}

const MIN_CONFIDENCE = 0.85;
const MIN_SAMPLE_N = 10;

/** Bracket a numeric age into the 6 buckets used by outcome tracking. */
function ageBracket(age: number | null | undefined): string {
  if (age == null) return "unknown";
  if (age < 30) return "18-29";
  if (age < 40) return "30-39";
  if (age < 50) return "40-49";
  if (age < 60) return "50-59";
  if (age < 70) return "60-69";
  return "70+";
}

/** Stable canonicalization: sort arrays, lowercase, JSON-stringify. */
function canonicalize(signals: UserSignals): string {
  const canonical = {
    age: ageBracket(signals.age),
    sex: (signals.sex ?? "unknown").toLowerCase(),
    symptoms: [...(signals.symptoms ?? [])].map(s => s.toLowerCase()).sort(),
    medications: [...(signals.medications ?? [])].map(s => s.toLowerCase()).sort(),
    labs: signals.labs
      ? Object.fromEntries(
          Object.entries(signals.labs)
            .map(([k, v]) => [k.toLowerCase(), v.toLowerCase()])
            .sort(([a], [b]) => a.localeCompare(b))
        )
      : {},
    variants: [...(signals.genetic_variants ?? [])].map(s => s.toLowerCase()).sort(),
    score_bracket: signals.bio_score == null ? "unknown" : Math.floor(signals.bio_score / 10) * 10,
  };
  return JSON.stringify(canonical);
}

/**
 * Compute a stable SHA-256 hex digest of the canonicalized signal vector.
 * Works in both Node.js (server) and Edge runtime.
 */
export async function hashSignals(signals: UserSignals): Promise<string> {
  const canonical = canonicalize(signals);
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Query the pattern cache for a hit on the given user signals.
 * Returns null if no qualifying entry exists (which is expected pre-launch).
 *
 * @param db   service-role Supabase client
 * @param signals  user signal vector
 * @returns matched cache entry or null
 */
export async function matchPattern(
  db: SupabaseClient,
  signals: UserSignals
): Promise<CacheHit | null> {
  const pattern_hash = await hashSignals(signals);

  const { data, error } = await db
    .from("ultrathink_pattern_cache")
    .select("pattern_hash, signal_summary, protocol_payload, combined_confidence, data_confidence, outcome_confidence, sample_n, hit_count")
    .eq("pattern_hash", pattern_hash)
    .gte("combined_confidence", MIN_CONFIDENCE)
    .gte("sample_n", MIN_SAMPLE_N)
    .maybeSingle();

  if (error || !data) return null;

  // Best-effort hit counter (fire and forget)
  const row = data as { hit_count: number | null };
  void db
    .from("ultrathink_pattern_cache")
    .update({
      hit_count: (row.hit_count ?? 0) + 1,
      last_hit_at: new Date().toISOString(),
    })
    .eq("pattern_hash", pattern_hash);

  return data as unknown as CacheHit;
}

/** Convenience: build a service-role client from env vars. */
export function buildServiceClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
