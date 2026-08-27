'use client';

/**
 * Brief 56 — live Hannah BOS for hero / Analytics / Connections.
 * Same hook, same blendHannahBos, same ConnectionsBosDisplay at one moment.
 */

import { useEffect, useMemo, useState } from 'react';
import { useDailyScores } from '@/hooks/journey/useDailyScores';
import { useUserDashboardData } from '@/hooks/useUserDashboardData';
import { useLatestComposition } from '@/hooks/body-tracker/useLatestComposition';
import { useWearableTilesSnapshot } from '@/hooks/useWearableTilesSnapshot';
import { useHydrationToday } from '@/components/hydration/useHydrationToday';
import { useNutritionHubMetrics } from '@/components/nutrition/hub/useNutritionHubMetrics';
import {
  BIOLOGICAL_AGE_FRAMING_DRAFT,
  type BiologicalAgeResult,
} from '@/lib/body-tracker/biological-age';
import {
  CONNECTIONS_BOS_COMPOSITE,
  type ConnectionsBosDisplay,
} from '@/lib/body-tracker/wearable-tiles';
import {
  HANNAH_BOS_BLEND_SENTENCE,
  biologicalAgeContributorScore,
  blendHannahBos,
  emptyHannahBosInput,
  hannahBosToConnectionsDisplay,
  hydrationScoreFromToday,
  resolveHannahBodyContributor,
  wearableHannahGate,
  type HannahBosInput,
  type HannahBosResult,
} from '@/lib/scoring/hannah-bos';

export interface HannahBosDisplayState {
  display: ConnectionsBosDisplay;
  result: HannahBosResult;
  sentence: typeof HANNAH_BOS_BLEND_SENTENCE;
  input: HannahBosInput;
}

function caqScoreFromHistory(
  rows: ReadonlyArray<{ source: string; score: number }> | null | undefined,
): number | null {
  if (!Array.isArray(rows)) return null;
  const row = rows.find(
    (r) => r.source === 'caq_initial' || r.source === 'caq_completed',
  );
  if (!row || typeof row.score !== 'number' || !Number.isFinite(row.score)) return null;
  return row.score;
}

export function buildHannahBosLiveInput(parts: {
  caqCompleted: boolean;
  caqScore: number | null;
  sleep: number | null;
  energy: number | null;
  mood: number | null;
  activity: number | null;
  hydration: number | null;
  nutritionMealCount: number;
  nutritionScore: number | undefined;
  macrosScore: number | undefined;
  bodyFatPct: number | null;
  muscleLbs: number | null;
  bodySource?: string | null;
  bodyDeviceName?: string | null;
  bodySourceName?: string | null;
  isPhotoScan?: boolean;
  navyInvented?: boolean;
  biologicalAge: BiologicalAgeResult | null;
  wearableTiles: Parameters<typeof wearableHannahGate>[0];
}): HannahBosInput {
  const next = emptyHannahBosInput();
  next.caq.complete = parts.caqCompleted;
  next.caq.score = parts.caqScore;

  next.checkin.subs.sleep = parts.sleep;
  next.checkin.subs.energy = parts.energy;
  next.checkin.subs.mood = parts.mood;
  next.checkin.subs.activity = parts.activity;
  next.checkin.subs.hydration = parts.hydration;
  next.checkin.hasTodayCheckin =
    parts.sleep !== null
    || parts.energy !== null
    || parts.mood !== null
    || parts.activity !== null
    || parts.hydration !== null;

  const meals = Number.isFinite(parts.nutritionMealCount) ? parts.nutritionMealCount : 0;
  next.nutrition.mealCount = meals;
  next.nutrition.score =
    typeof parts.nutritionScore === 'number' && Number.isFinite(parts.nutritionScore)
      ? parts.nutritionScore
      : null;
  next.macros.mealCount = meals;
  next.macros.score =
    typeof parts.macrosScore === 'number' && Number.isFinite(parts.macrosScore)
      ? parts.macrosScore
      : null;

  const body = resolveHannahBodyContributor({
    fatPct: parts.bodyFatPct,
    leanLbs: parts.muscleLbs,
    sourceName: parts.bodySourceName ?? parts.bodyDeviceName ?? parts.bodySource ?? null,
    source: parts.bodySource ?? null,
    deviceName: parts.bodyDeviceName ?? null,
    isPhotoScan: parts.isPhotoScan === true,
    navyInvented: parts.navyInvented === true,
  });
  next.body.hasRealFatOrMuscle = body.hasRealFat || body.hasRealLean;
  next.body.chip = body.chip;
  next.body.score = body.score;

  const bio = parts.biologicalAge;
  const marshallPending = BIOLOGICAL_AGE_FRAMING_DRAFT.disclaimer.includes('pending Marshall');
  if (bio && bio.state === 'estimated' && bio.biologicalAge !== null && bio.biologicalAge > 0) {
    next.biologicalAge.state = 'estimated';
    next.biologicalAge.score = biologicalAgeContributorScore(
      bio.biologicalAge,
      bio.chronologicalAge,
    );
    next.biologicalAge.marshallPending = marshallPending;
  } else if (bio && bio.state === 'insufficient') {
    next.biologicalAge.state = 'insufficient';
    next.biologicalAge.score = null;
    next.biologicalAge.marshallPending = marshallPending;
  } else {
    next.biologicalAge.state = bio ? 'draft' : null;
    next.biologicalAge.score = null;
    next.biologicalAge.marshallPending = marshallPending;
  }

  const gate = wearableHannahGate(parts.wearableTiles);
  next.wearable.pluggedIn = gate.pluggedIn;
  next.wearable.comingSoonOnly = gate.comingSoonOnly;
  next.wearable.mintedFromDailyVitals = false;
  next.wearable.score = null;

  return next;
}

export function useHannahBosDisplay(): HannahBosDisplayState {
  const dash = useUserDashboardData();
  const daily = useDailyScores(dash.userId);
  const hydration = useHydrationToday();
  const nutrition = useNutritionHubMetrics();
  const composition = useLatestComposition(dash.userId);
  const wearables = useWearableTilesSnapshot();
  const [biologicalAge, setBiologicalAge] = useState<BiologicalAgeResult | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/body-tracker/biological-age', { cache: 'no-store' });
        if (!res.ok) return;
        const json = (await res.json()) as BiologicalAgeResult;
        if (active) setBiologicalAge(json);
      } catch {
        if (active) setBiologicalAge(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [dash.userId]);

  const input = useMemo(() => {
    const caqCompleted = Boolean(
      dash.profile?.caq_completed_at || dash.assessmentCompleted,
    );
    return buildHannahBosLiveInput({
      caqCompleted,
      caqScore: caqScoreFromHistory(dash.bioHistory),
      sleep: daily.sleepQuality,
      energy: daily.energyLevel,
      mood: daily.moodStress,
      activity: daily.physicalActivity,
      hydration: hydrationScoreFromToday(hydration.data),
      nutritionMealCount: nutrition.metrics.nutritionMealCount ?? 0,
      nutritionScore: nutrition.metrics.nutritionScore,
      macrosScore: nutrition.metrics.dailyMacrosPct,
      bodyFatPct: composition.snapshot?.totalBodyFatPct ?? composition.weightBodyFatPct ?? null,
      muscleLbs:
        composition.snapshot?.totalMuscleMassLbs
        ?? composition.snapshot?.skeletalMuscleMassLbs
        ?? composition.weightLeanLbs
        ?? null,
      bodySource: composition.snapshot?.source ?? (composition.weightBodyFatPct || composition.weightLeanLbs ? 'manual' : null),
      bodyDeviceName: composition.snapshot?.deviceName ?? null,
      bodySourceName: composition.snapshot?.deviceName ?? composition.snapshot?.source ?? null,
      isPhotoScan:
        composition.snapshot?.source === 'scan'
        && (
          composition.snapshot.deviceName === 'FormaVision'
          || Boolean(composition.snapshot.scanId)
        ),
      navyInvented: false,
      biologicalAge,
      wearableTiles: wearables.tiles,
    });
  }, [
    dash.profile?.caq_completed_at,
    dash.assessmentCompleted,
    dash.bioHistory,
    daily.sleepQuality,
    daily.energyLevel,
    daily.moodStress,
    daily.physicalActivity,
    hydration.data,
    nutrition.metrics,
    composition.snapshot,
    composition.weightBodyFatPct,
    composition.weightLeanLbs,
    biologicalAge,
    wearables.tiles,
  ]);

  const result = useMemo(() => blendHannahBos(input), [input]);
  const display = useMemo(() => hannahBosToConnectionsDisplay(result), [result]);

  return {
    display,
    result,
    sentence: HANNAH_BOS_BLEND_SENTENCE,
    input,
  };
}

export function unknownHannahBosDisplay(): HannahBosDisplayState {
  const result = blendHannahBos(emptyHannahBosInput());
  return {
    display: CONNECTIONS_BOS_COMPOSITE,
    result,
    sentence: HANNAH_BOS_BLEND_SENTENCE,
    input: emptyHannahBosInput(),
  };
}
