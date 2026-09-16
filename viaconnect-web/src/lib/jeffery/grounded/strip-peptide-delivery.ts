/**
 * Arnold lock: strip / redact deliveryOptions_raw (and similar) before model context.
 * Never restate raw mcg/mg option arrays as coaching, titration, or a new listing.
 * Engine dosage strings on protocol items are not stripped.
 */

const BANNED_KEYS = new Set([
  "deliveryoptions_raw",
  "deliveryoptions",
  "delivery_options_raw",
  "delivery_options",
  "deliveryoption_raw",
  "rawdeliveryoptions",
]);

function isBannedKey(key: string): boolean {
  return BANNED_KEYS.has(key.replace(/[\s-]/g, "").toLowerCase());
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Deep-clone and drop display-banned delivery-option fields.
 * Leaves primitives, dates, and non-JSON values as-is.
 */
export function stripPeptideDeliveryOptions<T>(value: T): T {
  return stripValue(value) as T;
}

function stripValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stripValue(item));
  }
  if (!isPlainObject(value)) {
    return value;
  }
  const next: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (isBannedKey(key)) continue;
    next[key] = stripValue(child);
  }
  return next;
}

export function hasPeptideDeliveryOptions(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => hasPeptideDeliveryOptions(item));
  }
  if (!isPlainObject(value)) return false;
  for (const [key, child] of Object.entries(value)) {
    if (isBannedKey(key)) return true;
    if (hasPeptideDeliveryOptions(child)) return true;
  }
  return false;
}
