/**
 * Jeffery — orchestrator guardrails.
 *
 * Pure functions that validate any outbound recommendation from Hannah,
 * Gordon, Arnold, or any other agent before it reaches the user. These
 * encode the three non-negotiable platform rules:
 *
 *   1. FarmCeutica-only: no third-party supplement names.
 *   2. Semaglutide is EXCLUDED from all recommendations.
 *   3. Retatrutide is injectable-only and never stacked with oral protocol
 *      recommendations.
 *
 * The guardrails operate on recommendation text + structured payloads.
 * They return a validation result, never throw. Callers decide whether to
 * reject, sanitize, or substitute.
 */

export type GuardrailViolation = {
  code: "non_farmceutica" | "semaglutide" | "retatrutide_stack" | "bioavailability_range";
  detail: string;
};

export type GuardrailResult = {
  ok: boolean;
  violations: GuardrailViolation[];
};

const SEMAGLUTIDE_TERMS = ["semaglutide", "ozempic", "wegovy", "rybelsus"];
const RETATRUTIDE_TERMS = ["retatrutide"];

// Canonical FarmCeutica supplement strings used in recommendations. Any
// supplement named outside this list (case-insensitive) triggers a
// non_farmceutica violation. Keep this in sync with the products catalog.
const FARMCEUTICA_PRODUCT_NAMES = [
  "magnesium glycinate",
  "omega 3 elite",
  "vitamin d3",
  "k2",
  "ashwagandha root extract",
  "nad+ precursor",
  "bioboost methylated",
  "alpha-gpc",
  "creatine hcl",
  "neurocalm bh4+",
  "teloprime+",
  "nos+ vascular integrity",
  "comt+ neurotransmitter balance",
  "foundation stack",
];

// Common third-party brands that must never appear.
const BLOCKED_BRANDS = [
  "thorne",
  "pure encapsulations",
  "designs for health",
  "life extension",
  "now foods",
];

export function validateRecommendationText(text: string): GuardrailResult {
  const haystack = text.toLowerCase();
  const violations: GuardrailViolation[] = [];

  for (const term of SEMAGLUTIDE_TERMS) {
    if (haystack.includes(term)) {
      violations.push({
        code: "semaglutide",
        detail: `Recommendation mentions "${term}"; Semaglutide is excluded from the platform.`,
      });
    }
  }

  for (const brand of BLOCKED_BRANDS) {
    if (haystack.includes(brand)) {
      violations.push({
        code: "non_farmceutica",
        detail: `Third-party brand "${brand}" cannot appear in a recommendation.`,
      });
    }
  }

  // Bioavailability copy must read 10-28x, never 5-27x
  if (/\b5\s*(?:to|\-|–)\s*27x?\b/i.test(text) || /\b5x?\s*to\s*27x?\b/i.test(text)) {
    violations.push({
      code: "bioavailability_range",
      detail: "Bioavailability must be stated as 10 to 28 times, never 5 to 27.",
    });
  }

  return { ok: violations.length === 0, violations };
}

export type SupplementRecCandidate = {
  productName: string;
  deliveryForm?: "oral" | "injectable" | "topical";
  stackedWith?: string[];
};

export function validateSupplementCandidate(
  rec: SupplementRecCandidate,
): GuardrailResult {
  const name = rec.productName.toLowerCase();
  const violations: GuardrailViolation[] = [];

  if (SEMAGLUTIDE_TERMS.some((t) => name.includes(t))) {
    violations.push({
      code: "semaglutide",
      detail: `Semaglutide is excluded; remove "${rec.productName}" from the candidate set.`,
    });
  }

  if (RETATRUTIDE_TERMS.some((t) => name.includes(t))) {
    if (rec.deliveryForm && rec.deliveryForm !== "injectable") {
      violations.push({
        code: "retatrutide_stack",
        detail: "Retatrutide is injectable only; oral/topical forms are not permitted.",
      });
    }
    if (rec.stackedWith && rec.stackedWith.length > 0) {
      violations.push({
        code: "retatrutide_stack",
        detail: "Retatrutide must never be stacked with other supplements in a recommendation.",
      });
    }
  }

  const matchesCatalog = FARMCEUTICA_PRODUCT_NAMES.some((p) => name.includes(p));
  const matchesBlocked = BLOCKED_BRANDS.some((b) => name.includes(b));
  if (matchesBlocked || (!matchesCatalog && !RETATRUTIDE_TERMS.some((t) => name.includes(t)))) {
    // If we can't confirm FarmCeutica AND it isn't an allow-listed exception,
    // flag it. Callers may drop the rec or map it to an equivalent.
    violations.push({
      code: "non_farmceutica",
      detail: `"${rec.productName}" is not in the FarmCeutica catalog allow-list.`,
    });
  }

  return { ok: violations.length === 0, violations };
}
