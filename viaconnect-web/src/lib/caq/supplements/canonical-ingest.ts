// =============================================================================
// Prompt 175l (2026-06-05): canonical product ingest helper.
//
// Upserts a confirmed product into public.supplement_reference_canonical
// keyed by normalized identity (UPC when present, otherwise
// brand|name|strength). Idempotent: re-scanning the same product
// updates the existing row rather than duplicating.
//
// Called from the barcode-confirmation save path so every user-confirmed
// product feeds the internal catalog. Hannah reads from this table
// directly per the 175f Section 2.7 resolution; clinical fact triples
// stay in ultrathink_knowledge_base.
//
// PHI-FREE: product catalog fields only. No user id, no email, no
// scan event details, no image.
// =============================================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import { safeLog } from '@/lib/utils/safe-log';

export type CanonicalSource = 'lnhpd' | 'dsld' | 'curated' | 'user_scan';

export interface CanonicalIngestInput {
  upc?: string | null;
  npn?: string | null;
  dsldId?: string | null;
  brand?: string | null;
  productName: string;
  primaryStrength?: string | null;
  form?: string | null;
  structuredIngredients?: ReadonlyArray<Record<string, unknown>>;
  source: CanonicalSource;
}

export interface CanonicalIngestResult {
  ok: boolean;
  identityKey: string | null;
  upserted: boolean;
  reason?: string;
}

/**
 * Normalize a string for identity-key construction. Lowercase, trim,
 * collapse whitespace to a single underscore, strip everything other
 * than alphanumerics + underscore + dash. Empty result returns null.
 */
function normalizeForKey(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  const cleaned = trimmed
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_\-]/g, '');
  return cleaned.length > 0 ? cleaned : null;
}

/**
 * Compute the identity_key the canonical row is keyed by. UPC wins when
 * present and looks numeric. NPN next. Otherwise a brand+name+strength
 * composite. Returns null when there is not enough information to make
 * a stable key.
 */
export function computeIdentityKey(input: CanonicalIngestInput): string | null {
  const upcRaw = typeof input.upc === 'string' ? input.upc.trim() : '';
  if (/^\d{8,14}$/.test(upcRaw)) {
    return `upc:${upcRaw}`;
  }
  const npnRaw = typeof input.npn === 'string' ? input.npn.trim() : '';
  if (/^\d{8}$/.test(npnRaw)) {
    return `npn:${npnRaw}`;
  }
  const brand = normalizeForKey(input.brand);
  const name = normalizeForKey(input.productName);
  const strength = normalizeForKey(input.primaryStrength);
  if (!name) return null;
  const parts: string[] = [];
  if (brand) parts.push(`brand:${brand}`);
  parts.push(`name:${name}`);
  if (strength) parts.push(`strength:${strength}`);
  return parts.join('|');
}

/**
 * Upsert a confirmed product into supplement_reference_canonical. The
 * caller passes a service-role-backed admin client because RLS is
 * SELECT-only for authenticated and INSERT/UPDATE require service
 * role. Returns the identity_key that was upserted so the caller can
 * include it in telemetry.
 */
export async function ingestCanonicalProduct(
  input: CanonicalIngestInput,
  admin: SupabaseClient,
): Promise<CanonicalIngestResult> {
  const identityKey = computeIdentityKey(input);
  if (!identityKey) {
    return { ok: false, identityKey: null, upserted: false, reason: 'no_identity' };
  }
  const row = {
    identity_key: identityKey,
    brand: input.brand ?? null,
    product_name: input.productName,
    primary_strength: input.primaryStrength ?? null,
    form: input.form ?? null,
    npn: input.npn ?? null,
    upc: input.upc ?? null,
    dsld_id: input.dsldId ?? null,
    structured_ingredients: input.structuredIngredients ?? [],
    source_of_record: input.source,
    updated_at: new Date().toISOString(),
  };
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any)
      .from('supplement_reference_canonical')
      .upsert(row, { onConflict: 'identity_key', ignoreDuplicates: false });
    if (error) {
      safeLog.warn('caq.canonical-ingest', 'upsert failed', { identityKey, error });
      return { ok: false, identityKey, upserted: false, reason: 'upsert_error' };
    }
    safeLog.info('caq.canonical-ingest', 'upserted', { identityKey, source: input.source });
    return { ok: true, identityKey, upserted: true };
  } catch (err) {
    safeLog.error('caq.canonical-ingest', 'upsert threw', { identityKey, error: err });
    return { ok: false, identityKey, upserted: false, reason: 'unexpected' };
  }
}
