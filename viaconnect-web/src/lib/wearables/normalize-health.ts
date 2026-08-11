// Prompt 212: normalize HealthKit / Health Connect sample batches.

import type { WearableProvider } from "./types";
import { numOrNull } from "./types";

export interface HealthSample {
  type: string;
  value?: number | null;
  unit?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  sourceApp?: string | null;
  id?: string | null;
}

export interface HealthBatch {
  batch_id: string;
  source: "health_kit" | "health_connect";
  samples: HealthSample[];
}

export function groupDailyVitals(
  userId: string,
  provider: WearableProvider,
  samples: HealthSample[],
) {
  const byDate = new Map<
    string,
    {
      steps?: number | null;
      active_calories?: number | null;
      hrv_ms?: number | null;
      resting_hr_bpm?: number | null;
      respiratory_rate?: number | null;
      spo2_pct?: number | null;
      source_app?: string | null;
    }
  >();

  for (const s of samples) {
    const day = (s.startDate ?? s.endDate ?? "").slice(0, 10);
    if (!day) continue;
    const row = byDate.get(day) ?? {};
    const t = (s.type || "").toLowerCase();
    const v = numOrNull(s.value);
    if (t.includes("step")) row.steps = v;
    else if (t.includes("activeenergy") || t.includes("active_calorie") || t.includes("calories"))
      row.active_calories = v;
    else if (t.includes("hrv") || t.includes("variability")) row.hrv_ms = v;
    else if (t.includes("resting") && t.includes("heart")) row.resting_hr_bpm = v;
    else if (t.includes("respiratory")) row.respiratory_rate = v;
    else if (t.includes("oxygen") || t.includes("spo2")) row.spo2_pct = v;
    if (s.sourceApp) row.source_app = s.sourceApp;
    byDate.set(day, row);
  }

  return Array.from(byDate.entries()).map(([metric_date, metrics]) => ({
    user_id: userId,
    source_provider: provider,
    metric_date,
    steps: metrics.steps ?? null,
    active_calories: metrics.active_calories ?? null,
    hrv_ms: metrics.hrv_ms ?? null,
    resting_hr_bpm: metrics.resting_hr_bpm ?? null,
    respiratory_rate: metrics.respiratory_rate ?? null,
    spo2_pct: metrics.spo2_pct ?? null,
    source_app: metrics.source_app ?? null,
    deleted_at: null,
    updated_at: new Date().toISOString(),
  }));
}

export function extractBodyComposition(
  userId: string,
  provider: WearableProvider,
  samples: HealthSample[],
) {
  const bodySamples = samples.filter((s) => {
    const t = (s.type || "").toLowerCase();
    return (
      t.includes("bodymass") ||
      t.includes("body_mass") ||
      t.includes("bodyfat") ||
      t.includes("body_fat") ||
      t.includes("leanbody") ||
      t.includes("weight")
    );
  });
  if (bodySamples.length === 0) return [];

  // Group by measured day
  const byDay = new Map<string, HealthSample[]>();
  for (const s of bodySamples) {
    const day = (s.startDate ?? s.endDate ?? new Date().toISOString()).slice(0, 10);
    const list = byDay.get(day) ?? [];
    list.push(s);
    byDay.set(day, list);
  }

  return Array.from(byDay.entries()).map(([day, list]) => {
    let weight_kg: number | null = null;
    let body_fat_pct: number | null = null;
    let muscle_mass_kg: number | null = null;
    let source_app: string | null = null;
    for (const s of list) {
      const t = (s.type || "").toLowerCase();
      const v = numOrNull(s.value);
      if (t.includes("fat")) body_fat_pct = v;
      else if (t.includes("lean")) muscle_mass_kg = v;
      else if (t.includes("mass") || t.includes("weight")) weight_kg = v;
      if (s.sourceApp) source_app = s.sourceApp;
    }
    return {
      user_id: userId,
      source_provider: provider,
      measured_at: `${day}T12:00:00.000Z`,
      weight_kg,
      body_fat_pct,
      muscle_mass_kg,
      water_pct: null,
      visceral_fat_index: null,
      source_app,
      external_id: `${provider}:${day}`,
      deleted_at: null,
      updated_at: new Date().toISOString(),
    };
  });
}

export function extractSleepSessions(
  userId: string,
  provider: WearableProvider,
  samples: HealthSample[],
) {
  return samples
    .filter((s) => (s.type || "").toLowerCase().includes("sleep"))
    .map((s, idx) => {
      const start = s.startDate ?? new Date().toISOString();
      const end = s.endDate ?? start;
      const mins =
        start && end
          ? Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / 60000)
          : null;
      return {
        user_id: userId,
        source_provider: provider,
        external_id: s.id || `${provider}:sleep:${start}:${idx}`,
        start_at: start,
        end_at: end,
        time_in_bed_min: mins,
        total_sleep_min: mins,
        rem_min: null,
        deep_min: null,
        light_min: null,
        awake_min: null,
        sleep_efficiency_pct: null,
        respiratory_rate: null,
        source_app: s.sourceApp ?? null,
        deleted_at: null,
        updated_at: new Date().toISOString(),
      };
    });
}
