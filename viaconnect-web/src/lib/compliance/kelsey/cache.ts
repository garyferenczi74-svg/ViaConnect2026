// Prompt #113 — Kelsey verdict cache.
// Cache key: sha256({text_normalized + jurisdiction + ingredient_scope_sorted}).
// Storage: regulatory_kelsey_reviews rows within 90-day TTL.

import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "node:crypto";
import { normalize } from "../detector/normalizer";
import type { JurisdictionCode, KelseyVerdictType } from "../types";

export function hashSubject(text: string, jurisdiction: JurisdictionCode, ingredientScope: string[] = []): string {
  const sortedScope = [...ingredientScope].map((s) => s.toLowerCase()).sort().join(",");
  const material = `${normalize(text)}||${jurisdiction}||${sortedScope}`;
  return crypto.createHash("sha256").update(material).digest("hex");
}

export interface CachedVerdict {
  review_id: string;
  verdict: KelseyVerdictType;
  rationale: string;
  rule_references: string[];
  suggested_rewrite: string | null;
  confidence: number;
  reviewer_model: string;
}

export async function lookupCached(
  subjectTextHash: string,
  jurisdictionId: string,
): Promise<CachedVerdict | null> {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await admin
    .from("regulatory_kelsey_reviews")
    .select("id, verdict, rationale, rule_references, suggested_rewrite, confidence, reviewer_model")
    .eq("subject_text_hash", subjectTextHash)
    .eq("jurisdiction_id", jurisdictionId)
    .gte("reviewed_at", cutoff)
    .order("reviewed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const row = data as { id: string; verdict: KelseyVerdictType; rationale: string; rule_references: string[] | null; suggested_rewrite: string | null; confidence: number | null; reviewer_model: string };
  return {
    review_id: row.id,
    verdict: row.verdict,
    rationale: row.rationale,
    rule_references: row.rule_references ?? [],
    suggested_rewrite: row.suggested_rewrite,
    confidence: row.confidence ?? 0.5,
    reviewer_model: row.reviewer_model,
  };
}
