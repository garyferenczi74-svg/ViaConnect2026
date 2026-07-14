// Task 211b-W3c - Thin, hand-written Supabase accessors for the four reads
// personalFusionService.PersonalFusionReaders needs.
//
// user_measurement_anchors is created by migration
// 20260713120000_prompt_211b_measurement_anchors.sql, which is merge-deferred
// (not yet applied), so it is absent from the generated Database type;
// querying it through the typed client would fail to compile. Rather than
// reach for `any` (banned), every table here is queried through a narrow,
// hand-written interface describing only the shape this module reads,
// matching the pattern src/lib/formavision/cadence/cadenceDb.ts already
// established for the same situation (and the same MinimalClient pattern
// useCircumferenceHistory.ts uses for this same body_tracker_circumference
// table). Zero `any`.
//
// Each accessor returns rows or THROWS on a Supabase error; it never fails
// open itself. The caller (personalFusionService.readAnchorsFailOpen, via
// runPersonalFusion) is what applies withTimeout + circuit breaker + safeLog
// and converts any throw into an honest empty list -- duplicating that here
// per-accessor would be redundant defensive layering over the same read.
//
// No em or en dashes, no emojis, TS strict.

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ScaleWeightRow,
  UserMeasurementAnchorRow,
  ConsentLedgerRow,
} from '@/lib/arnold/scanning/accuracy/fusion/anchorIngestion';
import type { ScanCircumferenceRow } from '@/lib/arnold/scanning/accuracy/fusion/personalFusionService';

interface ListResult<T> {
  data: T[] | null;
  error: { message: string } | null;
}

function unwrap<T>(result: ListResult<T>): T[] {
  if (result.error) throw new Error(result.error.message);
  return result.data ?? [];
}

/** body_tracker_weight (the Prompt 201 pipeline's projected scale weight). */
export async function readScaleWeightRows(
  supabase: SupabaseClient,
  userId: string,
): Promise<ScaleWeightRow[]> {
  const builder = supabase.from('body_tracker_weight') as unknown as {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        order: (col: string, opts: { ascending: boolean }) => Promise<ListResult<ScaleWeightRow>>;
      };
    };
  };
  const result = await builder
    .select('weight_lbs, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  return unwrap(result);
}

/** user_measurement_anchors (tape / dexa; merge-deferred, ungenerated table). */
export async function readTapeDexaAnchorRows(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserMeasurementAnchorRow[]> {
  const builder = supabase.from('user_measurement_anchors') as unknown as {
    select: (cols: string) => {
      eq: (col: string, val: string) => Promise<ListResult<UserMeasurementAnchorRow>>;
    };
  };
  const result = await builder
    .select('source, region, value_cm, weight_kg, stated_reliability, taken_at')
    .eq('user_id', userId);
  return unwrap(result);
}

/** body_tracker_circumference, source='scan' rows only (post Prompt 85d columns). */
export async function readScanCircumferenceRows(
  supabase: SupabaseClient,
  userId: string,
): Promise<ScanCircumferenceRow[]> {
  const builder = supabase.from('body_tracker_circumference') as unknown as {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        eq: (col: string, val: string) => {
          is: (col: string, val: null) => Promise<ListResult<ScanCircumferenceRow>>;
        };
      };
    };
  };
  const result = await builder
    .select(
      'created_at, neck, shoulder_width, chest, waist, right_bicep, left_bicep, right_forearm, left_forearm, right_quadriceps, left_quadriceps, right_calf, left_calf',
    )
    .eq('user_id', userId)
    .eq('source', 'scan')
    .is('deleted_at', null);
  return unwrap(result);
}

/** consent_ledger, narrowed to the fields the fusion consent gate needs. */
export async function readConsentLedgerRows(
  supabase: SupabaseClient,
  userId: string,
): Promise<ConsentLedgerRow[]> {
  const builder = supabase.from('consent_ledger') as unknown as {
    select: (cols: string) => {
      eq: (col: string, val: string) => Promise<ListResult<ConsentLedgerRow>>;
    };
  };
  const result = await builder
    .select('consent_type, granted, granted_at, revoked_at')
    .eq('user_id', userId);
  return unwrap(result);
}
