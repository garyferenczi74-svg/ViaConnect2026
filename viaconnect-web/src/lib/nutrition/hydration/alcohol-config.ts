/**
 * Prompt 172e Phase C Workstream 2: alcohol diuretic config + pure
 * reduction math.
 *
 * Per spec section 5.3: a single standard drink retains fluid comparably
 * to water (Maughan 2016 Table 2 lager BHI 1.01), so the base hydration
 * coefficient for alcohol is 1.00. Alcohol is a dose dependent diuretic,
 * so apply a conservative reduction only above a daily threshold of
 * cumulative alcohol, configurable via ALCOHOL_DIURETIC_THRESHOLD_DRINKS,
 * and never below an effective floor. Do not invent a steep penalty
 * curve beyond the evidence.
 *
 * Rationale for default threshold of 3 drinks/day:
 *   The Maughan 2016 study measured a single serving of lager and found
 *   fluid retention comparable to water (BHI 1.01). The study does not
 *   extend to cumulative dose, but the literature on alcohol's dose
 *   dependent diuretic effect (Eggleton 1942; Hobson and Maughan 2010)
 *   places measurable diuresis at sustained intake above 2 to 3 standard
 *   drinks per day in euhydrated adults. 3 drinks is the conservative
 *   threshold above which we begin applying a linear reduction.
 *   ALCOHOL_DIURETIC_THRESHOLD_DRINKS overrides this default for post
 *   ship tuning.
 *
 * Rationale for floor of 0.80:
 *   The literature reports a maximum sustained diuretic effect on the
 *   order of 20 percent fluid loss at high cumulative dose. The floor
 *   0.80 caps the reduction at that level; even at very high intake the
 *   coefficient never goes below 0.80. This is intentionally conservative
 *   so the engine never zeros out hydration credit for a glass of water
 *   drunk alongside drinks.
 *
 * Rationale for ramp width of 3 drinks:
 *   Linear ramp from 1.00 to 0.80 over the 3 drinks immediately past
 *   the threshold means 6 drinks total reaches the floor and additional
 *   drinks stay clamped at 0.80. This is intentionally gentle and
 *   matches the conservative posture spec section 5.3 demands.
 *
 * The math layer runs in every mode (safety mode included; section 8
 * suppresses the COPY, not the math). The threshold note copy lives in
 * the hydration microcopy namespace and is suppressed in safety mode
 * via shouldShowDiureticCopy in picker-state.ts.
 */

export const ALCOHOL_DIURETIC_THRESHOLD_DEFAULT = 3;
export const ALCOHOL_DIURETIC_FLOOR = 0.8;
export const ALCOHOL_DIURETIC_RAMP_DRINKS = 3;

const ALCOHOL_DIURETIC_THRESHOLD_MAX = 20;
const ALCOHOL_DIURETIC_THRESHOLD_MIN = 1;

function parseEnvNumber(raw: string | undefined): number | null {
  if (raw === undefined || raw === null) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  if (!Number.isInteger(parsed)) return null;
  if (parsed < ALCOHOL_DIURETIC_THRESHOLD_MIN) return null;
  if (parsed > ALCOHOL_DIURETIC_THRESHOLD_MAX) return null;
  return parsed;
}

/**
 * Read the env override for the diuretic threshold (in standard drinks
 * per day). Mirrors the kill switch env override pattern so callers do
 * not have to learn a second knob shape. NEXT_PUBLIC_<FLAG> overrides
 * bare <FLAG> overrides the compile time default.
 */
export function getAlcoholDiureticThresholdDrinks(): number {
  const publicVal = parseEnvNumber(process.env.NEXT_PUBLIC_ALCOHOL_DIURETIC_THRESHOLD_DRINKS);
  if (publicVal !== null) return publicVal;
  const plainVal = parseEnvNumber(process.env.ALCOHOL_DIURETIC_THRESHOLD_DRINKS);
  if (plainVal !== null) return plainVal;
  return ALCOHOL_DIURETIC_THRESHOLD_DEFAULT;
}

/**
 * Pure linear ramp from 1.00 at the threshold toward the floor over the
 * next ALCOHOL_DIURETIC_RAMP_DRINKS drinks. Above threshold + ramp drinks,
 * stays clamped at the floor. Below or equal to threshold, returns
 * hydration_ml unchanged. Returns 0 for non finite or negative hydration
 * input as a defensive floor.
 *
 * Pure function: no env reads, no clock reads, no DB reads. The route
 * passes in the threshold + floor and the query layer passes in the
 * drink count, so this function is fully testable without mocks.
 */
export function applyAlcoholDiureticReduction(
  hydration_ml: number,
  daily_alcoholic_drinks: number,
  threshold: number,
  floor: number,
): number {
  if (!Number.isFinite(hydration_ml) || hydration_ml <= 0) return 0;
  // Treat non finite drink count as zero (defensive); zero drinks never reduces.
  const drinks = Number.isFinite(daily_alcoholic_drinks) ? daily_alcoholic_drinks : 0;
  if (drinks <= threshold) return hydration_ml;

  const pastThreshold = drinks - threshold;
  const rampWidth = ALCOHOL_DIURETIC_RAMP_DRINKS;
  const fraction = Math.min(1, pastThreshold / rampWidth);
  const coefficient = 1 - (1 - floor) * fraction;
  return hydration_ml * coefficient;
}
