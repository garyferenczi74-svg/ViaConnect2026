// Prompt #113 hotfix P0 #4 — Health Canada NPN / DIN-HM validator.
//
// Validates Natural Product Number (NPN) and Drug Identification Number
// for Homeopathic Medicine (DIN-HM) against the Health Canada Licensed
// Natural Health Products Database format:
//
//   NPN    : 8 digits (e.g., 80012345)
//   DIN-HM : "DIN-HM" prefix (case-insensitive, optional hyphen) + 8 digits
//            (e.g., "DIN-HM 80012345" or "DINHM80012345")
//
// Closes P0 #4 from docs/audits/prompt-113-audit-2026-04-22.md. The
// `regulatory_sku_compliance` table (migration 20260424000160) has `npn`
// and `din_hm` TEXT columns; without a validator any string can land.
// This module is the gatekeeper write-side callers should invoke.
//
// Pure module — no I/O, no DB, no side effects. Safe to import from
// Node, edge, or browser.

export interface ValidationResult {
  ok: boolean;
  normalized: string | null;
  error?: string;
}

/**
 * Validate a raw Natural Product Number string.
 *
 * Accepts leading/trailing whitespace. Strips any internal whitespace or
 * hyphens before matching the 8-digit pattern. Returns the normalized
 * 8-digit form when valid.
 *
 * Spec: 8 digits. Health Canada in practice assigns NPNs starting with
 * "8" (NPN) or "9" (EN — emergency number); the validator allows any
 * 8-digit string so future HC number blocks don't break the product.
 */
export function validateNpn(raw: string | null | undefined): ValidationResult {
  if (raw == null) return { ok: false, normalized: null, error: "NPN is required" };
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { ok: false, normalized: null, error: "NPN is empty" };

  // Strip internal spaces + hyphens used for readability (e.g. "80012 345").
  const compact = trimmed.replace(/[\s-]/g, "");

  if (!/^\d{8}$/.test(compact)) {
    return {
      ok: false,
      normalized: null,
      error: `NPN must be exactly 8 digits after removing whitespace and hyphens; got "${trimmed}"`,
    };
  }

  return { ok: true, normalized: compact };
}

/**
 * Validate a raw DIN-HM string.
 *
 * Accepts any of the following input shapes (case-insensitive on the
 * prefix, optional inner whitespace / hyphen between prefix and digits):
 *
 *   "DIN-HM 80012345"
 *   "DIN-HM80012345"
 *   "DINHM-80012345"
 *   "dinhm 80012345"
 *   "80012345"                 (bare digits; prefix inferred)
 *
 * Returns the normalized canonical form "DIN-HM 80012345".
 */
export function validateDinHm(raw: string | null | undefined): ValidationResult {
  if (raw == null) return { ok: false, normalized: null, error: "DIN-HM is required" };
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { ok: false, normalized: null, error: "DIN-HM is empty" };

  // Strip the prefix (any casing, any whitespace/hyphen placement).
  const withoutPrefix = trimmed.replace(/^din[\s-]?hm[\s-]*/i, "").trim();
  const compact = withoutPrefix.replace(/[\s-]/g, "");

  if (!/^\d{8}$/.test(compact)) {
    return {
      ok: false,
      normalized: null,
      error: `DIN-HM must be exactly 8 digits (optionally prefixed with DIN-HM); got "${trimmed}"`,
    };
  }

  return { ok: true, normalized: `DIN-HM ${compact}` };
}

/**
 * Convenience combined check for callers that accept either format. Tries
 * NPN first, then DIN-HM. Returns which kind matched and the normalized
 * form.
 */
export interface NpnOrDinHmResult {
  ok: boolean;
  kind: "NPN" | "DIN-HM" | null;
  normalized: string | null;
  error?: string;
}

export function validateNpnOrDinHm(raw: string | null | undefined): NpnOrDinHmResult {
  if (raw == null || raw.trim().length === 0) {
    return { ok: false, kind: null, normalized: null, error: "NPN or DIN-HM is required" };
  }
  // If the caller supplied a DIN-HM prefix, treat it as DIN-HM; else NPN.
  if (/^din[\s-]?hm/i.test(raw.trim())) {
    const r = validateDinHm(raw);
    return { ok: r.ok, kind: "DIN-HM", normalized: r.normalized, error: r.error };
  }
  const r = validateNpn(raw);
  return { ok: r.ok, kind: "NPN", normalized: r.normalized, error: r.error };
}
