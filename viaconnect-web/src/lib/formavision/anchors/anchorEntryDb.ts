// Task 211b-W3d - Anchor ENTRY write path: fail-open inserts into
// user_measurement_anchors (own-row) plus the covering consent_ledger grant,
// for the tape guided-entry flow and the DEXA/clinic import form.
//
// user_measurement_anchors is created by migration
// 20260713120000_prompt_211b_measurement_anchors.sql, which is merge-deferred
// (not yet applied), so it is absent from the generated Database type; every
// insert here goes through a narrow, hand-written interface, matching the
// exact pattern src/lib/formavision/personalPrecision/personalPrecisionDb.ts
// and src/lib/formavision/cycle/cycleContextDb.ts already established for
// this same situation (consent_ledger IS generated, but is queried the same
// thin way for consistency, matching cycleContextDb.ts's own note). Zero any.
//
// HONESTY (the point of this module):
//   - Every stored value is exactly the value the USER TYPED. toStoredCm /
//     toStoredKg are pure unit conversions of the user's own entered number;
//     nothing here is auto-filled, defaulted, or derived from a scan.
//   - stated_reliability is DEFAULT_SOURCE_RELIABILITY for the source (tape:
//     medium, dexa: high), imported read-only from the W3a-approved
//     fusion/anchorTypes.ts, never invented in this file.
//   - Consent write FIRST, then the anchor write, per the task contract. A
//     consent write failure never blocks the anchor write in flight (the
//     migration's own comment on consent_ledger_id: "a consent lookup
//     failure must never block an otherwise-valid write"); it degrades to
//     consent_ledger_id: null and logs via safeLog.warn.
//   - Every write is fail-open: withTimeout + try/catch + safeLog.warn, never
//     throws into the caller. Resolves to a boolean (true = the anchor row
//     landed; false = something failed and was logged - the caller shows an
//     honest retry state, never a fabricated success).
//
// No em or en dashes, no emojis, zero any, TS strict.

import type { SupabaseClient } from '@supabase/supabase-js';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import type { Region } from '@/lib/arnold/scanning/types';
import {
  DEFAULT_SOURCE_RELIABILITY,
  type AnchorSource,
  type StatedReliability,
} from '@/lib/arnold/scanning/accuracy/fusion/anchorTypes';

const SCOPE = 'formavision.anchor-entry';
const WRITE_TIMEOUT_MS = 5000;

export const TAPE_ANCHOR_CONSENT_VERSION = 'v1-2026-07';
export const DEXA_ANCHOR_CONSENT_VERSION = 'v1-2026-07';

const IN_TO_CM = 2.54;
const LBS_TO_KG = 0.45359237;

export type LengthUnit = 'cm' | 'in';
export type WeightUnit = 'kg' | 'lbs';

/** Pure: converts a user-entered inch value to centimetres. Never guesses or
 *  substitutes a value; the caller supplies the exact number the user typed. */
export function inchesToCm(inches: number): number {
  return Math.round(inches * IN_TO_CM * 100) / 100;
}

/** Pure: resolves a user-entered circumference value + unit to the stored cm
 *  value. A 'cm' entry is only rounded to the column's own precision (2
 *  decimals), never altered otherwise. */
export function toStoredCm(value: number, unit: LengthUnit): number {
  return unit === 'in' ? inchesToCm(value) : Math.round(value * 100) / 100;
}

/** Pure: converts a user-entered pound value to kilograms. */
export function lbsToKg(lbs: number): number {
  return Math.round(lbs * LBS_TO_KG * 100) / 100;
}

/** Pure: resolves a user-entered weight value + unit to the stored kg value. */
export function toStoredKg(value: number, unit: WeightUnit): number {
  return unit === 'lbs' ? lbsToKg(value) : Math.round(value * 100) / 100;
}

export type AnchorEntryConsentType = 'tape_anchor' | 'dexa_anchor';

// ---------------------------------------------------------------------------
// Row shapes (hand-written; see the file banner for why).
// ---------------------------------------------------------------------------

export interface AnchorConsentInsertRow {
  user_id: string;
  consent_type: AnchorEntryConsentType;
  version: string;
  granted: boolean;
  granted_at: string;
  revoked_at: string | null;
}

export interface MeasurementAnchorInsertRow {
  user_id: string;
  source: AnchorSource;
  region: Region | null;
  value_cm: number | null;
  weight_kg: number | null;
  stated_reliability: StatedReliability;
  taken_at: string;
  consent_ledger_id: string | null;
}

interface SingleResult<T> {
  data: T | null;
  error: { message: string } | null;
}

interface WriteResult {
  error: { message: string } | null;
}

/** Inserts one consent_ledger grant row, returning its id for the anchor's
 *  soft FK. Own-row (RLS requires auth.uid() = user_id server-side). */
export function insertAnchorConsent(
  supabase: SupabaseClient,
  row: AnchorConsentInsertRow,
): Promise<SingleResult<{ id: string }>> {
  const builder = supabase.from('consent_ledger') as unknown as {
    insert: (values: AnchorConsentInsertRow) => {
      select: (cols: string) => {
        single: () => Promise<SingleResult<{ id: string }>>;
      };
    };
  };
  return builder.insert(row).select('id').single();
}

/** Inserts one user_measurement_anchors row (own-row RLS; merge-deferred,
 *  ungenerated table). */
export function insertMeasurementAnchor(
  supabase: SupabaseClient,
  row: MeasurementAnchorInsertRow,
): Promise<WriteResult> {
  const builder = supabase.from('user_measurement_anchors') as unknown as {
    insert: (values: MeasurementAnchorInsertRow) => Promise<WriteResult>;
  };
  return builder.insert(row);
}

// ---------------------------------------------------------------------------
// Fail-open orchestration: consent write first, then the anchor write. Never
// throws; resolves to false (logged) on any failure.
// ---------------------------------------------------------------------------

export interface WriteAnchorParams {
  userId: string;
  source: AnchorSource;
  region: Region | null;
  valueCm: number | null;
  weightKg: number | null;
  takenAt: string;
  consentType: AnchorEntryConsentType;
  consentVersion: string;
}

async function writeConsentFailOpen(
  supabase: SupabaseClient,
  params: Pick<WriteAnchorParams, 'userId' | 'consentType' | 'consentVersion'>,
): Promise<string | null> {
  const nowIso = new Date().toISOString();
  try {
    const result = await withTimeout(
      insertAnchorConsent(supabase, {
        user_id: params.userId,
        consent_type: params.consentType,
        version: params.consentVersion,
        granted: true,
        granted_at: nowIso,
        revoked_at: null,
      }),
      WRITE_TIMEOUT_MS,
      `${SCOPE}.consent`,
    );
    if (result.error) throw new Error(result.error.message);
    return result.data?.id ?? null;
  } catch (error) {
    // A consent write failure must never block the anchor write itself (the
    // migration's own comment on consent_ledger_id); degrade to no FK link.
    safeLog.warn(SCOPE, 'anchor consent write failed; continuing without a consent link', {
      consentType: params.consentType,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Writes one user_measurement_anchors row, own-row, preceded by a
 * consent_ledger grant for the anchor's source. Fail-open: any failure at
 * either step is logged via safeLog.warn and this resolves to false; it
 * never throws into the caller and never fabricates a stored value (valueCm
 * / weightKg are exactly what the caller passed in).
 */
export async function writeAnchorFailOpen(
  supabase: SupabaseClient,
  params: WriteAnchorParams,
): Promise<boolean> {
  const consentLedgerId = await writeConsentFailOpen(supabase, params);
  try {
    const result = await withTimeout(
      insertMeasurementAnchor(supabase, {
        user_id: params.userId,
        source: params.source,
        region: params.region,
        value_cm: params.valueCm,
        weight_kg: params.weightKg,
        stated_reliability: DEFAULT_SOURCE_RELIABILITY[params.source],
        taken_at: params.takenAt,
        consent_ledger_id: consentLedgerId,
      }),
      WRITE_TIMEOUT_MS,
      `${SCOPE}.anchor`,
    );
    if (result.error) throw new Error(result.error.message);
    return true;
  } catch (error) {
    safeLog.warn(SCOPE, 'anchor write failed, failing open', {
      source: params.source,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/** Convenience wrapper for a tape circumference anchor: converts the user's
 *  entered value + unit to stored cm (never substituting a value) and writes
 *  it with source 'tape' / stated_reliability 'medium' / consent_type
 *  'tape_anchor'. */
export async function writeTapeAnchorFailOpen(
  supabase: SupabaseClient,
  params: {
    userId: string;
    region: Region;
    value: number;
    unit: LengthUnit;
    takenAt: string;
  },
): Promise<boolean> {
  return writeAnchorFailOpen(supabase, {
    userId: params.userId,
    source: 'tape',
    region: params.region,
    valueCm: toStoredCm(params.value, params.unit),
    weightKg: null,
    takenAt: params.takenAt,
    consentType: 'tape_anchor',
    consentVersion: TAPE_ANCHOR_CONSENT_VERSION,
  });
}

/** Convenience wrapper for one DEXA circumference anchor row (source 'dexa',
 *  stated_reliability 'high', consent_type 'dexa_anchor'). */
export async function writeDexaRegionAnchorFailOpen(
  supabase: SupabaseClient,
  params: {
    userId: string;
    region: Region;
    value: number;
    unit: LengthUnit;
    takenAt: string;
  },
): Promise<boolean> {
  return writeAnchorFailOpen(supabase, {
    userId: params.userId,
    source: 'dexa',
    region: params.region,
    valueCm: toStoredCm(params.value, params.unit),
    weightKg: null,
    takenAt: params.takenAt,
    consentType: 'dexa_anchor',
    consentVersion: DEXA_ANCHOR_CONSENT_VERSION,
  });
}

/** Convenience wrapper for the DEXA session's own weight-only anchor row
 *  (weight_kg set, region null), per the migration's weight-only anchor
 *  shape. Converts lbs -> kg when the user entered pounds. */
export async function writeDexaWeightAnchorFailOpen(
  supabase: SupabaseClient,
  params: {
    userId: string;
    value: number;
    unit: WeightUnit;
    takenAt: string;
  },
): Promise<boolean> {
  return writeAnchorFailOpen(supabase, {
    userId: params.userId,
    source: 'dexa',
    region: null,
    valueCm: null,
    weightKg: toStoredKg(params.value, params.unit),
    takenAt: params.takenAt,
    consentType: 'dexa_anchor',
    consentVersion: DEXA_ANCHOR_CONSENT_VERSION,
  });
}
