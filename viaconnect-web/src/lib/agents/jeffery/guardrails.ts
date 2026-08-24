/**
 * Jeffery: orchestrator guardrails.
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

  // House fold-number bioavailability claims are retired.
  if (
    /bioavail/i.test(text) &&
    (/\b\d+\s*(?:to|-|\u2013)\s*\d+\s*x?\b/i.test(text) || /\b\d+x?\s*to\s*\d+x?\b/i.test(text))
  ) {
    violations.push({
      code: "bioavailability_range",
      detail: "Bioavailability must be stated as Maximum Bioavailability, never a fold-number range.",
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

// === PROMPT 208a EXTENSION START ===
// Additive only, see Prompt 208a. Does not modify any existing export above.
export const JEFFERY_208A_DIRECTIVE = `Jeffery 208a cross-agent conflict arbitration path.

SCOPE: This directive applies ONLY to the cross-agent conflict arbitration path.
No other Jeffery behavior changes under Prompt 208a.

CONFLICT DETECTION
When Gordon (nutrition) and Arnold (body tracking) produce guidance for the same
member context, Jeffery evaluates both outputs for conflicts before surfacing either
to the user. A conflict exists when:
  - Gordon recommends a caloric target or macro split that is directionally inconsistent
    with Arnold's body composition trajectory assessment for the stated goal.
  - Gordon recommends a nutrient or supplement that Arnold has flagged as potentially
    contraindicated by a tracked metric (e.g., high-dose iron when ferritin is already elevated).
  - Arnold surfaces a composition change direction (e.g., fat gain) that is inconsistent
    with Gordon's meal quality assessment for the same period.

ARBITRATION RULE
When a conflict is detected, route it to Jeffery's arbitration path:
  1. Identify the conflict: state the two conflicting guidance items precisely.
  2. Apply the safety-first rule: the output that is more conservative with respect to
     published safe ranges, established guidelines, and practitioner-deferral wins.
  3. Apply the published-only rule: if one output relies on an unpublished or predisposition-only
     genetic signal while the other relies on confirmed lab or tracked data, weight the
     confirmed-data output higher.
  4. The winning output is surfaced to the user; the losing output is suppressed.
  5. Both the conflict and its resolution are logged to the arbitration audit trail with
     the conflict description, the winning rule applied, and the session trace ID.

LOGGING REQUIREMENT
Every arbitration event must produce an audit log entry: timestamp, session ID, conflicting
agent outputs (summarized), rule applied, and resolution. This log is not surfaced to the
user but is available for clinical review.

No other Jeffery behavior changes under this directive.`;
// === PROMPT 208a EXTENSION END ===

// === PROMPT 208b EXTENSION START ===
// Additive only, see Prompt 208b. Does not modify any existing export above.
export const JEFFERY_208B_DIRECTIVE = `Jeffery 208b cross-reference conflict arbitration.

SCOPE
This directive covers only the extension of the 208a conflict arbitration path to
the shared canonical contract. No other Jeffery behavior changes under Prompt 208b.

SHARED CANONICAL CONTRACT AS ARBITRATION SOURCE
When two agents draw DIFFERENT conclusions from the shared canonical contract, Jeffery
arbitrates using the contract as the single source of truth:
  1. Identify the specific contract field(s) each agent read and how each interpreted it.
  2. If the agents read different contract fields (for example, one read reconciled
     intake and the other read raw supplement data), the agent that read the more
     complete and reconciled source wins.
  3. If both agents read the same field and reached different conclusions, apply the
     safety-first rule: the more conservative conclusion with respect to published safe
     ranges and practitioner-deferral wins.
  4. If one agent relied on a predisposition-only genetic signal while the other relied
     on a confirmed lab or tracked metric, the confirmed-data interpretation wins.

PUBLISHED-ONLY RESULT RULE
The winning output must be supported by published evidence or confirmed member data.
No unpublished, speculative, or predisposition-only inference may win an arbitration
against a confirmed result.

CONFLICT AND RESOLUTION LOGGING
Every conflict detected under this directive is logged to the arbitration audit trail:
timestamp, session trace ID, contract field in dispute, agent outputs summarized,
rule applied, and resolution. The log is available for clinical review but is not
surfaced to the member.

No other Jeffery behavior changes under this directive.`;
// === PROMPT 208b EXTENSION END ===
