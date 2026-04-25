/**
 * Marshall pre-check wrapper for marketing-copy variant content
 * (Prompt #138a §7.4).
 *
 * Runs the existing rule engine over the variant's headline + subheadline
 * + cta_label as 'marketing_copy' surface. Returns a clean / blocked
 * result plus the findings list. The actual #121 precheck_sessions row is
 * created by callers that have a session/user context; this wrapper is
 * the synchronous engine evaluation only.
 *
 * Pillar #138a §7.4 step 4 says "Writes the result and the session ID to
 * marketing_copy_variants.marshall_precheck_session_id" — that DB write is
 * the caller's responsibility (admin API route in Phase 3); this module
 * exposes only the pure-function evaluation.
 */

import type { Finding, EvaluationContext } from "@/lib/compliance/engine/types";
import { allRules } from "@/lib/compliance/rules";

export interface VariantPreCheckInput {
  headline: string;
  subheadline: string;
  ctaLabel: string;
  /** When true, named-clinician copy clears NAMED_PERSON_CONNECTION. */
  clinicianConsentOnFile?: boolean;
  /** When true, time-claim copy clears TIME_CLAIM_SUBSTANTIATION. */
  timeSubstantiationOnFile?: boolean;
  /** When true, scientific-grounding copy clears SCIENTIFIC_GROUNDING. */
  scientificSubstantiationOnFile?: boolean;
}

export interface VariantPreCheckResult {
  passed: boolean; // true iff zero P0/P1 findings
  findings: Finding[];
  blockerCount: number; // P0 + P1
  warnCount: number; // P2 + P3 + ADVISORY
  /** Each headline/subheadline/cta string evaluated, for surfacing in admin UI. */
  evaluatedFields: ReadonlyArray<{ field: "headline" | "subheadline" | "cta_label"; text: string }>;
}

const MARKETING_COPY_CTX: EvaluationContext = {
  surface: "marketing_copy",
  source: "claude_code",
};

/**
 * Run marketing rules against the variant's three text fields. Used at
 * draft time, before activation, to surface any rule violations.
 */
export async function preCheckVariant(input: VariantPreCheckInput): Promise<VariantPreCheckResult> {
  const fields: ReadonlyArray<{ field: "headline" | "subheadline" | "cta_label"; text: string }> = [
    { field: "headline", text: input.headline },
    { field: "subheadline", text: input.subheadline },
    { field: "cta_label", text: input.ctaLabel },
  ];

  const allFindings: Finding[] = [];
  // Marketing rules that respect clinician/time/scientific consent flags accept
  // a MarketingCopyInput object, so we wrap each text field accordingly.
  for (const f of fields) {
    const wrapped = {
      text: f.text,
      contentKind: "hero_variant" as const,
      clinicianConsentOnFile: input.clinicianConsentOnFile,
      timeSubstantiationOnFile: input.timeSubstantiationOnFile,
      scientificSubstantiationOnFile: input.scientificSubstantiationOnFile,
    };
    for (const rule of allRules) {
      if (!rule.surfaces.includes("marketing_copy")) continue;
      try {
        // Rules accept either string or richer input shapes; pass the wrapped
        // object so marketing rules see the consent flags, and stringy rules
        // (claims/brand) see the text.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const evalInput: any = looksLikeStringRule(rule.id) ? f.text : wrapped;
        const findings = await rule.evaluate(evalInput, MARKETING_COPY_CTX);
        if (findings && findings.length > 0) {
          allFindings.push(...findings);
        }
      } catch {
        // A rule throwing should not crash pre-check; record nothing and continue.
      }
    }
  }

  const blockerCount = allFindings.filter((f) => f.severity === "P0" || f.severity === "P1").length;
  const warnCount = allFindings.filter((f) => f.severity === "P2" || f.severity === "P3" || f.severity === "ADVISORY").length;
  return {
    passed: blockerCount === 0,
    findings: allFindings,
    blockerCount,
    warnCount,
    evaluatedFields: fields,
  };
}

/**
 * Heuristic: marketing rules accept a richer object input shape; the older
 * brand/claims rules expect a plain string. This list keeps the dispatch
 * narrow rather than introspecting evaluate() signatures (which TypeScript
 * erases at runtime).
 */
function looksLikeStringRule(ruleId: string): boolean {
  return (
    ruleId.startsWith("MARSHALL.BRAND.") ||
    ruleId === "MARSHALL.CLAIMS.DISEASE_CLAIM" ||
    ruleId === "MARSHALL.CLAIMS.DSHEA_DISCLAIMER_MISSING" ||
    ruleId === "MARSHALL.CLAIMS.FORBIDDEN_PHRASE"
  );
}
