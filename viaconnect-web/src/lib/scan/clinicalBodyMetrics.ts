// Shared CAQ ↔ clinical_assessments body-metric bridge.
// Geometric height SSOT is clinical_assessments.height_cm. Web CAQ historically
// wrote only assessment_results / body_goals, so readers fall back in order
// and writers copy finite values through. Never invent height or weight —
// Gary's CAQ 180 cm / 120 kg is real fixture data, not a default.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

const SCOPE = 'scan.clinicalBodyMetrics';
const TIMEOUT_MS = 4000;

export const INCHES_TO_CM = 2.54;

export type ClinicalMetricsClient = SupabaseClient<Database>;

export type HeightCmSource = 'clinical_assessment' | 'body_goals' | 'caq_demographics';

export type ResolvedHeightCm = {
  heightCm: number | null;
  source: HeightCmSource | null;
};

export type ClinicalBodyMetrics = {
  heightCm?: number | null;
  weightKg?: number | null;
  biologicalSex?: 'male' | 'female' | null;
};

export type ClinicalUpsertResult = {
  ok: boolean;
  wrote: { heightCm: number | null; weightKg: number | null };
};

type ClinicalInsert = Database['public']['Tables']['clinical_assessments']['Insert'];

export function parsePositiveFinite(raw: unknown): number | null {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.length === 0) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

export function asDemographicsRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function parseCaqHeightCm(
  demographics: Record<string, unknown> | null | undefined,
): number | null {
  if (!demographics) return null;
  return parsePositiveFinite(demographics.height) ?? parsePositiveFinite(demographics.height_cm);
}

export function parseCaqWeightKg(
  demographics: Record<string, unknown> | null | undefined,
): number | null {
  if (!demographics) return null;
  return parsePositiveFinite(demographics.weight) ?? parsePositiveFinite(demographics.weight_kg);
}

export function parseBiologicalSex(raw: unknown): 'male' | 'female' | null {
  if (typeof raw !== 'string') return null;
  const s = raw.toLowerCase().replace(/[_\s-]/g, '');
  if (s === 'male' || s === 'm') return 'male';
  if (s === 'female' || s === 'f' || s === 'woman' || s === 'w') return 'female';
  return null;
}

export function heightInchesToCm(heightIn: unknown): number | null {
  const inches = parsePositiveFinite(heightIn);
  if (inches === null) return null;
  const cm = inches * INCHES_TO_CM;
  return Number.isFinite(cm) && cm > 0 ? cm : null;
}

function emptyWrite(): ClinicalUpsertResult {
  return { ok: false, wrote: { heightCm: null, weightKg: null } };
}

export async function upsertClinicalBodyMetrics(
  supabase: ClinicalMetricsClient,
  userId: string,
  metrics: ClinicalBodyMetrics,
): Promise<ClinicalUpsertResult> {
  const heightCm = parsePositiveFinite(metrics.heightCm);
  const weightKg = parsePositiveFinite(metrics.weightKg);
  const biologicalSex = metrics.biologicalSex ?? null;
  if (heightCm === null && weightKg === null && biologicalSex === null) {
    return emptyWrite();
  }

  const row: ClinicalInsert = { user_id: userId, updated_at: new Date().toISOString() };
  if (heightCm !== null) row.height_cm = heightCm;
  if (weightKg !== null) row.weight_kg = weightKg;
  if (biologicalSex !== null) row.biological_sex = biologicalSex;

  try {
    const result = await withTimeout(
      Promise.resolve(
        supabase.from('clinical_assessments').upsert(row, { onConflict: 'user_id' }),
      ),
      TIMEOUT_MS,
      `${SCOPE}.upsert`,
    );
    if (result.error) {
      safeLog.warn(SCOPE, 'clinical_assessments upsert failed (fail-open)', {
        message: result.error.message,
      });
      return emptyWrite();
    }
    return { ok: true, wrote: { heightCm, weightKg } };
  } catch (error) {
    safeLog.warn(SCOPE, 'clinical_assessments upsert threw (fail-open)', { error });
    return emptyWrite();
  }
}

export async function writeThroughCaqDemographicsToClinical(
  supabase: ClinicalMetricsClient,
  userId: string,
  demographics: Record<string, unknown> | null | undefined,
): Promise<ClinicalUpsertResult> {
  return upsertClinicalBodyMetrics(supabase, userId, {
    heightCm: parseCaqHeightCm(demographics),
    weightKg: parseCaqWeightKg(demographics),
    biologicalSex: parseBiologicalSex(demographics?.sex ?? demographics?.biological_sex),
  });
}

export async function persistEnteredHeightCm(
  supabase: ClinicalMetricsClient,
  userId: string,
  heightCm: unknown,
): Promise<ClinicalUpsertResult> {
  return upsertClinicalBodyMetrics(supabase, userId, {
    heightCm: parsePositiveFinite(heightCm),
  });
}

type QueryPack<T> = {
  data: T | null;
  error: { message: string } | null;
};

async function timedMaybeSingle<T>(
  promise: PromiseLike<QueryPack<T>>,
  label: string,
): Promise<T | null> {
  try {
    const result = await withTimeout(Promise.resolve(promise), TIMEOUT_MS, `${SCOPE}.${label}`);
    if (result.error) {
      safeLog.warn(SCOPE, `${label} query error (fail-open)`, { message: result.error.message });
      return null;
    }
    return result.data ?? null;
  } catch (error) {
    safeLog.warn(SCOPE, `${label} fetch failed (fail-open)`, { error });
    return null;
  }
}

export async function readClinicalHeightCm(
  supabase: ClinicalMetricsClient,
  userId: string,
): Promise<number | null> {
  const row = await timedMaybeSingle(
    supabase
      .from('clinical_assessments')
      .select('height_cm')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    'clinical',
  );
  return parsePositiveFinite(row?.height_cm);
}

export async function readBodyGoalsHeightCm(
  supabase: ClinicalMetricsClient,
  userId: string,
): Promise<number | null> {
  const row = await timedMaybeSingle(
    supabase
      .from('body_goals')
      .select('height_in')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    'body_goals',
  );
  return heightInchesToCm(row?.height_in);
}

export async function readCaqAssessmentHeightCm(
  supabase: ClinicalMetricsClient,
  userId: string,
): Promise<number | null> {
  const row = await timedMaybeSingle(
    supabase
      .from('assessment_results')
      .select('data')
      .eq('user_id', userId)
      .eq('phase', 1)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    'caq_phase1',
  );
  return parseCaqHeightCm(asDemographicsRecord(row?.data));
}

export async function resolveHeightCm(
  supabase: ClinicalMetricsClient,
  userId: string,
): Promise<ResolvedHeightCm> {
  const clinical = await readClinicalHeightCm(supabase, userId);
  if (clinical !== null) {
    return { heightCm: clinical, source: 'clinical_assessment' };
  }
  const fromGoals = await readBodyGoalsHeightCm(supabase, userId);
  if (fromGoals !== null) {
    return { heightCm: fromGoals, source: 'body_goals' };
  }
  const fromCaq = await readCaqAssessmentHeightCm(supabase, userId);
  if (fromCaq !== null) {
    return { heightCm: fromCaq, source: 'caq_demographics' };
  }
  return { heightCm: null, source: null };
}

/**
 * One-time heal: if clinical height is missing, copy a finite fallback from
 * body_goals.height_in or CAQ phase-1 demographics. Never invents a value.
 */
export async function backfillClinicalHeightIfMissing(
  supabase: ClinicalMetricsClient,
  userId: string,
): Promise<ClinicalUpsertResult> {
  const existing = await readClinicalHeightCm(supabase, userId);
  if (existing !== null) {
    return { ok: true, wrote: { heightCm: existing, weightKg: null } };
  }

  const fromGoals = await readBodyGoalsHeightCm(supabase, userId);
  if (fromGoals !== null) {
    return upsertClinicalBodyMetrics(supabase, userId, { heightCm: fromGoals });
  }

  const row = await timedMaybeSingle(
    supabase
      .from('assessment_results')
      .select('data')
      .eq('user_id', userId)
      .eq('phase', 1)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    'caq_phase1_backfill',
  );
  const demographics = asDemographicsRecord(row?.data);
  const fromCaq = parseCaqHeightCm(demographics);
  if (fromCaq === null) return emptyWrite();
  return writeThroughCaqDemographicsToClinical(supabase, userId, demographics);
}
