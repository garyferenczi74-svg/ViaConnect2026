/**
 * Optional in-frame reference-object scale anchor.
 *
 * This module is OPT-IN ONLY (Section 6.2). The caller is responsible for
 * passing inputs only when the user has explicitly chosen to use a reference
 * object. When inputs are absent, invalid, or not provided, the function
 * returns null (UNKNOWN) - never 0, never a fabricated value (RULE 9).
 *
 * The returned unit (cm per pixel) is consistent with the `scaleCmPerPx`
 * convention used throughout silhouetteProcessor.ts and types.ts:
 *   measurement_cm = width_px * scaleCmPerPx
 */

/**
 * Returns true when the value is a positive, finite, non-NaN number.
 */
function isPositiveFinite(v: number): boolean {
  return typeof v === 'number' && isFinite(v) && v > 0;
}

/**
 * Computes the cm-per-pixel scale from a known physical object size and its
 * measured pixel extent in the captured image.
 *
 * MUST be called only when the user has explicitly opted in to providing a
 * reference object. Pass the inputs only when opt-in is confirmed; otherwise
 * do not call this function (or call it and receive null, which is safe).
 *
 * @param knownSizeCm - The real-world longest dimension of the reference
 *   object in centimetres (must be positive and finite, e.g. 8.56 for a
 *   credit card long edge).
 * @param measuredPx  - The pixel span of that same dimension in the captured
 *   image (must be positive and finite; 0 would produce Infinity, so null is
 *   returned instead).
 * @returns cm per pixel, or null when either input is absent, zero, negative,
 *   non-finite, or NaN.
 */
export function scaleFromReference(
  knownSizeCm: number,
  measuredPx: number,
): number | null {
  if (!isPositiveFinite(knownSizeCm) || !isPositiveFinite(measuredPx)) {
    return null;
  }
  return knownSizeCm / measuredPx;
}
