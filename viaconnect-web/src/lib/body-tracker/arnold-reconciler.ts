/**
 * Arnold Reconciler (Prompt #85, Section 7.1)
 *
 * Incoming data pipeline: outlier detection, dedup, conflict detection, store.
 * Every source (manual, wearable, plugin) passes through this reconciler
 * before being committed to body_tracker_entries.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function buildServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for ArnoldReconciler');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

const VALID_MEASUREMENTS = new Set([
  'weight_lbs', 'goal_weight_lbs', 'bmi', 'body_fat_pct', 'visceral_fat_rating',
  'body_water_pct', 'waist_in', 'hips_in', 'chest_in', 'neck_in',
  'right_arm_in', 'left_arm_in', 'right_thigh_in', 'left_thigh_in',
]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IncomingEntry {
  userId: string;
  entryDate: string;           // YYYY-MM-DD
  source: string;              // e.g. 'manual', 'wearable:apple_watch', 'plugin:apple_health'
  sourceId?: string;
  measurement: string;         // e.g. 'weight_lbs', 'body_fat_pct'
  value: number;
  metadata?: Record<string, unknown>;
}

export interface ReconciliationResult {
  action: 'stored' | 'duplicate_skipped' | 'conflict_resolved' | 'outlier_flagged' | 'averaged';
  entryId: string | null;
  detail: string;
}

interface RecentDataPoint {
  value: number;
  created_at: string;
}

interface ArnoldUserProfile {
  trust_overrides: Record<string, number> | null;
  outlier_z_threshold: number | null;
}

// ---------------------------------------------------------------------------
// Default trust scores
// ---------------------------------------------------------------------------

const DEFAULT_TRUST_SCORES: Record<string, number> = {
  'manual':                   1.00,
  'wearable:apple_watch':     0.85,
  'wearable:whoop':           0.85,
  'wearable:oura':            0.85,
  'wearable:garmin':          0.85,
  'wearable:fitbit':          0.85,
  'wearable:hume_body_pod':   0.80,
  'wearable:withings':        0.80,
  'plugin:apple_health':      0.75,
  'plugin:google_fit':        0.75,
  'plugin:myfitnesspal':      0.65,
  'plugin:cronometer':        0.65,
  'plugin:strava':            0.65,
};

// ---------------------------------------------------------------------------
// ArnoldReconciler
// ---------------------------------------------------------------------------

export class ArnoldReconciler {
  private _supabase: SupabaseClient | null = null;
  private get supabase(): SupabaseClient {
    if (!this._supabase) this._supabase = buildServiceClient();
    return this._supabase;
  }

  /**
   * Main pipeline: outlier detection -> dedup -> conflict detection -> store.
   */
  async process(entry: IncomingEntry): Promise<ReconciliationResult> {
    // Validate measurement name against whitelist
    if (!VALID_MEASUREMENTS.has(entry.measurement)) {
      return { action: 'outlier_flagged', entryId: null, detail: `Invalid measurement: ${entry.measurement}` };
    }

    try {
    // Step 1: Outlier detection
    const outlier = await this.detectOutlier(entry);
    if (outlier) {
      await this.logReconciliation(entry, 'outlier_flagged', null, null);
      return { action: 'outlier_flagged', entryId: null, detail: outlier };
    }

    // Step 2: Duplicate detection
    const duplicate = await this.findDuplicate(entry);
    if (duplicate) {
      await this.logReconciliation(entry, 'duplicate_skipped', duplicate.id, null);
      return { action: 'duplicate_skipped', entryId: duplicate.id, detail: 'Duplicate entry within 1% tolerance' };
    }

    // Step 3: Conflict detection
    const conflict = await this.findConflict(entry);
    if (conflict) {
      const resolved = await this.resolveConflict(entry, conflict);
      return resolved;
    }

    // Step 4: Store
    const entryId = await this.store(entry);
    await this.logReconciliation(entry, 'stored', entryId, null);
    return { action: 'stored', entryId, detail: 'Entry stored successfully' };
    } catch (err) {
      console.error(`[arnold-reconciler] process() failed: ${(err as Error).message}`);
      return { action: 'outlier_flagged', entryId: null, detail: `Error: ${(err as Error).message}` };
    }
  }

  /**
   * Z-score outlier detection. Requires 5+ recent data points.
   * Returns a reason string if outlier, null otherwise.
   */
  async detectOutlier(entry: IncomingEntry, threshold?: number): Promise<string | null> {
    const profile = await this.getUserProfile(entry.userId);
    const zThreshold = threshold ?? profile?.outlier_z_threshold ?? 3.0;

    const recent = await this.getRecentValues(entry.userId, entry.measurement, 30);
    if (recent.length < 5) return null;

    const values = recent.map((r) => r.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return null;

    const zScore = Math.abs((entry.value - mean) / stdDev);
    if (zScore > zThreshold) {
      return `Z-score ${zScore.toFixed(2)} exceeds threshold ${zThreshold} (mean=${mean.toFixed(2)}, stddev=${stdDev.toFixed(2)})`;
    }
    return null;
  }

  /**
   * Duplicate detection: same measurement, same day, value within 1% tolerance.
   */
  async findDuplicate(entry: IncomingEntry): Promise<{ id: string; value: number } | null> {
    const existing = await this.getSameDayEntries(entry.userId, entry.entryDate, entry.measurement);
    for (const row of existing) {
      const diff = Math.abs(row.value - entry.value);
      const tolerance = Math.abs(row.value) * 0.01;
      if (diff <= tolerance) {
        return { id: row.id, value: row.value };
      }
    }
    return null;
  }

  /**
   * Conflict detection: same measurement, same day, >1% difference.
   */
  async findConflict(entry: IncomingEntry): Promise<{ id: string; value: number; source: string } | null> {
    const existing = await this.getSameDayEntries(entry.userId, entry.entryDate, entry.measurement);
    for (const row of existing) {
      const diff = Math.abs(row.value - entry.value);
      const tolerance = Math.abs(row.value) * 0.01;
      if (diff > tolerance) {
        return { id: row.id, value: row.value, source: row.source };
      }
    }
    return null;
  }

  /**
   * Conflict resolution: higher trust wins; equal trust averages the values.
   */
  async resolveConflict(
    entry: IncomingEntry,
    conflict: { id: string; value: number; source: string },
  ): Promise<ReconciliationResult> {
    const newTrust = await this.getTrustScore(entry.userId, entry.source);
    const existingTrust = await this.getTrustScore(entry.userId, conflict.source);

    if (newTrust > existingTrust) {
      // New source is more trusted: store and deactivate old
      const entryId = await this.store(entry);
      await this.deactivateEntry(conflict.id);
      await this.logReconciliation(entry, 'conflict_resolved', entryId, conflict.id);
      return {
        action: 'conflict_resolved',
        entryId,
        detail: `New source (${entry.source}, trust=${newTrust}) beats existing (${conflict.source}, trust=${existingTrust})`,
      };
    }

    if (newTrust < existingTrust) {
      // Existing source is more trusted: skip the new entry
      await this.logReconciliation(entry, 'conflict_resolved', conflict.id, null);
      return {
        action: 'conflict_resolved',
        entryId: conflict.id,
        detail: `Existing source (${conflict.source}, trust=${existingTrust}) wins over new (${entry.source}, trust=${newTrust})`,
      };
    }

    // Equal trust: average the values
    const averaged = (entry.value + conflict.value) / 2;
    await this.updateEntryValue(conflict.id, averaged, `Averaged: ${entry.value} (${entry.source}) + ${conflict.value} (${conflict.source})`);
    await this.logReconciliation(entry, 'averaged', conflict.id, null);
    return {
      action: 'averaged',
      entryId: conflict.id,
      detail: `Equal trust (${newTrust}); averaged ${entry.value} and ${conflict.value} to ${averaged.toFixed(2)}`,
    };
  }

  /**
   * Trust score lookup. User overrides first, then DEFAULT_TRUST_SCORES.
   */
  async getTrustScore(userId: string, source: string): Promise<number> {
    const profile = await this.getUserProfile(userId);
    const overrides = (profile?.trust_overrides ?? {}) as Record<string, number>;
    if (typeof overrides[source] === 'number') {
      return overrides[source];
    }
    return DEFAULT_TRUST_SCORES[source] ?? 0.50;
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private async getUserProfile(userId: string): Promise<ArnoldUserProfile | null> {
    const { data } = await (this.supabase as any)
      .from('arnold_user_profiles')
      .select('trust_overrides, outlier_z_threshold')
      .eq('user_id', userId)
      .maybeSingle();
    return (data ?? null) as ArnoldUserProfile | null;
  }

  private async getRecentValues(userId: string, measurement: string, limit: number): Promise<RecentDataPoint[]> {
    // Query recent body_tracker_weight (most common case) for the given measurement column
    const { data } = await (this.supabase as any)
      .from('body_tracker_weight')
      .select(`${measurement}, created_at`)
      .eq('user_id', userId)
      .not(measurement, 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!data || data.length === 0) return [];
    return (data as Record<string, unknown>[]).map((row) => ({
      value: Number(row[measurement]),
      created_at: String(row.created_at),
    }));
  }

  private async getSameDayEntries(
    userId: string,
    entryDate: string,
    measurement: string,
  ): Promise<Array<{ id: string; value: number; source: string }>> {
    const { data: entries } = await (this.supabase as any)
      .from('body_tracker_entries')
      .select('id, source')
      .eq('user_id', userId)
      .eq('entry_date', entryDate)
      .eq('is_active', true);

    if (!entries || entries.length === 0) return [];

    const results: Array<{ id: string; value: number; source: string }> = [];
    for (const e of entries as Array<{ id: string; source: string }>) {
      const { data: weightRow } = await (this.supabase as any)
        .from('body_tracker_weight')
        .select(measurement)
        .eq('entry_id', e.id)
        .not(measurement, 'is', null)
        .maybeSingle();
      if (weightRow && weightRow[measurement] != null) {
        results.push({ id: e.id, value: Number(weightRow[measurement]), source: e.source });
      }
    }
    return results;
  }

  private async store(entry: IncomingEntry): Promise<string> {
    const { data, error } = await (this.supabase as any)
      .from('body_tracker_entries')
      .insert({
        user_id: entry.userId,
        entry_date: entry.entryDate,
        source: entry.source.split(':')[0] === 'wearable' || entry.source.split(':')[0] === 'plugin'
          ? 'device'
          : entry.source,
        source_id: entry.sourceId ?? null,
        is_active: true,
        is_outlier: false,
        notes: null,
      })
      .select('id')
      .single();

    if (error || !data?.id) {
      throw new Error(`Failed to store entry: ${error?.message ?? 'no id returned'}`);
    }

    const entryId = data.id as string;

    // Insert the measurement value into body_tracker_weight
    await (this.supabase as any)
      .from('body_tracker_weight')
      .insert({
        entry_id: entryId,
        user_id: entry.userId,
        [entry.measurement]: entry.value,
      });

    return entryId;
  }

  private async deactivateEntry(entryId: string): Promise<void> {
    await (this.supabase as any)
      .from('body_tracker_entries')
      .update({ is_active: false })
      .eq('id', entryId);
  }

  private async updateEntryValue(entryId: string, value: number, notes: string): Promise<void> {
    await (this.supabase as any)
      .from('body_tracker_entries')
      .update({ reconciliation_notes: notes })
      .eq('id', entryId);

    // The averaged value replaces in body_tracker_weight; we fetch the measurement column
    // dynamically in the caller, so here we just update via the entry relationship
    const { data: weightRow } = await (this.supabase as any)
      .from('body_tracker_weight')
      .select('*')
      .eq('entry_id', entryId)
      .maybeSingle();

    if (weightRow) {
      const numericColumns = Object.entries(weightRow).filter(
        ([key, val]) => key !== 'id' && key !== 'entry_id' && key !== 'user_id' && key !== 'created_at' && typeof val === 'number',
      );
      if (numericColumns.length === 1) {
        await (this.supabase as any)
          .from('body_tracker_weight')
          .update({ [numericColumns[0][0]]: value })
          .eq('entry_id', entryId);
      }
    }
  }

  private async logReconciliation(
    entry: IncomingEntry,
    action: string,
    primaryEntryId: string | null,
    conflictingEntryId: string | null,
  ): Promise<void> {
    await (this.supabase as any)
      .from('body_tracker_reconciliation_log')
      .insert({
        user_id: entry.userId,
        action,
        primary_entry_id: primaryEntryId,
        conflicting_entry_id: conflictingEntryId,
        source: entry.source,
        source_id: entry.sourceId ?? null,
        reconciliation_decision: {
          measurement: entry.measurement,
          value: entry.value,
          date: entry.entryDate,
          metadata: entry.metadata ?? {},
        },
      });
  }
}

/** Singleton reconciler instance */
export const arnoldReconciler = new ArnoldReconciler();
