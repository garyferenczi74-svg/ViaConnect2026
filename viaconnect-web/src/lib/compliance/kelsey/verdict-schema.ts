// Prompt #113 — Kelsey verdict schema validation.
// Runtime validation of the LLM's JSON response.

import type { KelseyCitation, KelseyVerdictType } from "../types";

export interface RawKelseyResponse {
  verdict: string;
  rationale: string;
  rule_references?: string[];
  suggested_rewrite?: string | null;
  confidence?: number;
  citations?: Array<{ title?: string; url?: string; doi?: string; loe?: string }>;
}

export interface ValidatedKelseyResponse {
  verdict: KelseyVerdictType;
  rationale: string;
  rule_references: string[];
  suggested_rewrite: string | null;
  confidence: number;
  citations: KelseyCitation[];
}

const VALID_VERDICTS: KelseyVerdictType[] = ["APPROVED", "CONDITIONAL", "BLOCKED", "ESCALATE"];
const VALID_LOE = ["A", "B", "C", "D"] as const;

export function validateKelseyResponse(raw: unknown): ValidatedKelseyResponse | null {
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as RawKelseyResponse;
  if (typeof obj.verdict !== "string") return null;
  const verdict = obj.verdict.toUpperCase() as KelseyVerdictType;
  if (!VALID_VERDICTS.includes(verdict)) return null;
  if (typeof obj.rationale !== "string" || obj.rationale.trim().length < 10) return null;
  const ruleRefs = Array.isArray(obj.rule_references)
    ? obj.rule_references.filter((r): r is string => typeof r === "string")
    : [];
  const rewrite = typeof obj.suggested_rewrite === "string" ? obj.suggested_rewrite : null;
  const confidence = typeof obj.confidence === "number" && obj.confidence >= 0 && obj.confidence <= 1
    ? obj.confidence : 0.5;
  const citations: KelseyCitation[] = Array.isArray(obj.citations)
    ? obj.citations
        .filter((c): c is { title: string } => c !== null && typeof c === "object" && typeof (c as { title?: string }).title === "string")
        .map((c) => {
          const loe = (c as { loe?: string }).loe;
          return {
            title: (c as { title: string }).title,
            url: (c as { url?: string }).url,
            doi: (c as { doi?: string }).doi,
            loe: loe && (VALID_LOE as readonly string[]).includes(loe) ? loe as "A" | "B" | "C" | "D" : undefined,
          };
        })
    : [];
  return { verdict, rationale: obj.rationale, rule_references: ruleRefs, suggested_rewrite: rewrite, confidence, citations };
}

/**
 * Extracts JSON from a model response that may contain preamble or trailing
 * text. Finds first '{' to matching last '}'. Returns null on failure.
 */
export function extractJson(raw: string): string | null {
  const trimmed = raw.trim();
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first < 0 || last <= first) return null;
  return trimmed.slice(first, last + 1);
}
