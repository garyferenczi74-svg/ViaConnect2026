/**
 * Ultrathink Confidence Scorer (Prompt #60 — Layer 6)
 *
 * Combines two independent confidence dimensions:
 *   - Data Confidence    — strength of the underlying clinical evidence
 *                          (literature, RCTs, consensus). 0..1.
 *   - Outcome Confidence — observed real-world success rate of this
 *                          recommendation in similar profiles. 0..1.
 *                          Null when sample_n < k-anonymity threshold (10).
 *
 * Combined Confidence = (Data * 0.4) + (Outcome OR Data * 0.6)
 *   When outcome data exists, outcome dominates.
 *   When it doesn't, data carries the full weight (so the score is still
 *   meaningful pre-launch).
 */

export interface ConfidenceInputs {
  data_confidence: number;            // 0..1
  outcome_confidence?: number | null; // 0..1 or null
  sample_n?: number;                  // for the UI string
  avg_delta_60d?: number | null;      // average Bio Score delta over 60 days
}

export interface ConfidenceOutput {
  combined: number;                   // 0..1
  combined_pct: number;               // rounded percentage
  ui_string: string;                  // human-readable summary
  has_outcome_data: boolean;
}

const MIN_SAMPLE_N_FOR_OUTCOME = 10;

/**
 * Compute combined confidence from data + outcome scores.
 */
export function combineConfidence(input: ConfidenceInputs): number {
  const data = clamp01(input.data_confidence);
  const hasOutcome = typeof input.outcome_confidence === "number"
    && (input.sample_n ?? 0) >= MIN_SAMPLE_N_FOR_OUTCOME;
  const outcome = hasOutcome ? clamp01(input.outcome_confidence as number) : data;
  return clamp01(data * 0.4 + outcome * 0.6);
}

/**
 * Build the human-readable UI string per Prompt #60 spec:
 *   "★ 91% confidence · Helped 89% of similar profiles · Avg +6.3 Bio Score in 8 weeks"
 *
 * Pre-launch (no outcome data), the second and third clauses are omitted and
 * the string degrades to "91% confidence · evidence-only".
 */
export function score(input: ConfidenceInputs): ConfidenceOutput {
  const combined = combineConfidence(input);
  const combined_pct = Math.round(combined * 100);
  const has_outcome_data = typeof input.outcome_confidence === "number"
    && (input.sample_n ?? 0) >= MIN_SAMPLE_N_FOR_OUTCOME;

  let ui_string: string;
  if (has_outcome_data) {
    const helpedPct = Math.round((input.outcome_confidence as number) * 100);
    const deltaStr = input.avg_delta_60d != null
      ? `Avg ${input.avg_delta_60d > 0 ? "+" : ""}${input.avg_delta_60d.toFixed(1)} Bio Score in 8 weeks`
      : "";
    const parts = [
      `${combined_pct}% confidence`,
      `Helped ${helpedPct}% of similar profiles`,
      deltaStr,
    ].filter(Boolean);
    ui_string = parts.join(" · ");
  } else {
    ui_string = `${combined_pct}% confidence · evidence-only (no outcome data yet)`;
  }

  return { combined, combined_pct, ui_string, has_outcome_data };
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
