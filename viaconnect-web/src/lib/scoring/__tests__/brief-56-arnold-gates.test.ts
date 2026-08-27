import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { BIOLOGICAL_AGE_FRAMING_DRAFT } from '@/lib/body-tracker/biological-age';
import { xmlUnlockedDimensions } from '@/lib/body-tracker/wearable-snapshot';
import { emptyWearableTilesSnapshot } from '@/hooks/useWearableTilesSnapshot';
import { buildHannahBosLiveInput } from '@/hooks/useHannahBosDisplay';
import {
  HANNAH_BOS_BLEND_SENTENCE,
  HANNAH_BODY_CHIPS,
  HANNAH_LEAN_EVEN_BASELINE,
  blendBodyBlock,
  blendHannahBos,
  bodyFatContributorScore,
  chipForBodySource,
  emptyHannahBosInput,
  resolveHannahBodyContributor,
  wearableHannahGate,
} from '../hannah-bos';

const root = process.cwd();

function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

function live(over: Partial<Parameters<typeof buildHannahBosLiveInput>[0]> = {}) {
  return buildHannahBosLiveInput({
    caqCompleted: false,
    caqScore: null,
    sleep: null,
    energy: null,
    mood: null,
    activity: null,
    hydration: null,
    nutritionMealCount: 0,
    nutritionScore: undefined,
    macrosScore: undefined,
    bodyFatPct: null,
    muscleLbs: null,
    biologicalAge: null,
    wearableTiles: emptyWearableTilesSnapshot('web'),
    ...over,
  });
}

describe('Brief 56 Arnold body gates', () => {
  it('keeps blendHannahBos, chips, and the one Hannah sentence', () => {
    expect(HANNAH_BOS_BLEND_SENTENCE).toBe(
      'Bio Optimization Score blends only what you actually have today. Missing pieces are left out, not counted as zero.',
    );
    expect(HANNAH_BODY_CHIPS).toEqual([
      'from profile',
      'from FormaVision',
      'from Hume Body Pod',
      'from Apple Health',
    ]);
  });

  it('chips only the four named body sources; unknown and Coming soon have no chip', () => {
    expect(chipForBodySource('manual')).toBe('from profile');
    expect(chipForBodySource('profile')).toBe('from profile');
    expect(chipForBodySource({ source: 'scan', deviceName: 'FormaVision' })).toBe(
      'from FormaVision',
    );
    expect(chipForBodySource('hume_body_pod')).toBe('from Hume Body Pod');
    expect(chipForBodySource('apple_health')).toBe('from Apple Health');
    expect(chipForBodySource('hume')).toBeNull();
    expect(chipForBodySource('Hume Health')).toBeNull();
    expect(chipForBodySource('phone_health')).toBeNull();
    expect(chipForBodySource('whoop')).toBeNull();
    expect(chipForBodySource('oura')).toBeNull();
    expect(chipForBodySource('google_health')).toBeNull();
    expect(chipForBodySource('garmin')).toBeNull();
    expect(chipForBodySource('scan')).toBeNull();
    expect(chipForBodySource(null)).toBeNull();
  });

  it('includes fat and lean independently and omits the missing one, never averaging 0', () => {
    expect(blendBodyBlock({ fatPct: 18, leanLbs: null })).toBe(100);
    expect(blendBodyBlock({ fatPct: null, leanLbs: 140 })).toBe(HANNAH_LEAN_EVEN_BASELINE);
    expect(blendBodyBlock({ fatPct: 18, leanLbs: 140 })).toBe(
      Math.round((100 + HANNAH_LEAN_EVEN_BASELINE) / 2),
    );
    expect(blendBodyBlock({ fatPct: null, leanLbs: null })).toBeNull();
    expect(blendBodyBlock({ fatPct: 0, leanLbs: 0 })).toBeNull();

    const fatOnly = resolveHannahBodyContributor({
      fatPct: 18,
      leanLbs: null,
      source: 'manual',
    });
    expect(fatOnly.hasRealFat).toBe(true);
    expect(fatOnly.hasRealLean).toBe(false);
    expect(fatOnly.chip).toBe('from profile');
    expect(fatOnly.score).toBe(100);

    const leanOnly = resolveHannahBodyContributor({
      fatPct: null,
      leanLbs: 140,
      source: 'manual',
    });
    expect(leanOnly.hasRealFat).toBe(false);
    expect(leanOnly.hasRealLean).toBe(true);
    expect(leanOnly.chip).toBe('from profile');
    expect(leanOnly.score).toBe(HANNAH_LEAN_EVEN_BASELINE);

    const neither = resolveHannahBodyContributor({
      fatPct: null,
      leanLbs: null,
      source: 'manual',
    });
    expect(neither.score).toBeNull();
    expect(neither.chip).toBeNull();
  });

  it('does not require both fat and lean on the same row', () => {
    const result = blendHannahBos({
      ...emptyHannahBosInput(),
      body: {
        hasRealFatOrMuscle: true,
        score: HANNAH_LEAN_EVEN_BASELINE,
        chip: 'from profile',
      },
    });
    expect(result.score).toBe(HANNAH_LEAN_EVEN_BASELINE);
    expect(result.chips).toEqual(['from profile']);
  });

  it('FormaVision scan fat chips from FormaVision; photo scans do not invent muscle or Navy', () => {
    const forma = resolveHannahBodyContributor({
      fatPct: 20.5,
      leanLbs: 140,
      source: 'scan',
      deviceName: 'FormaVision',
      isPhotoScan: true,
      navyInvented: false,
    });
    expect(forma.chip).toBe('from FormaVision');
    expect(forma.hasRealFat).toBe(true);
    expect(forma.hasRealLean).toBe(false);
    expect(forma.score).toBe(bodyFatContributorScore(20.5));

    const navy = resolveHannahBodyContributor({
      fatPct: 22,
      leanLbs: null,
      source: 'scan',
      deviceName: 'FormaVision',
      isPhotoScan: true,
      navyInvented: true,
    });
    expect(navy.score).toBeNull();
    expect(navy.chip).toBeNull();

    const write = src('src/lib/body-tracker/composition/buildScanWrite.ts');
    expect(write).toContain("device_name: 'FormaVision'");
    expect(write).toContain("source: 'scan'");
    expect(write).toContain('Only write total_body_fat_pct');
    expect(write).not.toMatch(/navyBodyFat|navy_primary|lean_body_mass_lbs/);
    expect(write).not.toMatch(/total_muscle_mass_lbs/);
  });

  it('Coming soon never feeds the body 15', () => {
    expect(resolveHannahBodyContributor({
      fatPct: 18,
      leanLbs: 140,
      sourceName: 'whoop',
    }).score).toBeNull();
  });
});

describe('Brief 56 Arnold biological age gates', () => {
  it('is a contributor only, never 0 YEARS, omitted while DRAFT / pending Marshall', () => {
    expect(BIOLOGICAL_AGE_FRAMING_DRAFT.disclaimer).toContain('pending Marshall');
    const pending = blendHannahBos({
      ...emptyHannahBosInput(),
      biologicalAge: { state: 'estimated', score: 70, marshallPending: true },
    });
    expect(pending.score).toBeNull();
    expect(pending.chips).not.toContain('from biological age');

    const livePending = live({
      biologicalAge: {
        state: 'estimated',
        chronologicalAge: 45,
        displayAge: 40,
        biologicalAge: 40,
        deltaYears: -5,
        confidencePct: 80,
        contributors: [],
        inputsUsed: ['metabolicAge'],
      },
    });
    expect(livePending.biologicalAge.marshallPending).toBe(true);
    expect(blendHannahBos(livePending).chips).not.toContain('from biological age');

    const tile = src('src/components/body-tracker/dashboard/BiologicalAgeHeroTile.tsx');
    expect(tile).not.toContain('result?.displayAge ?? 0');
    expect(tile).toContain('UNKNOWN');
    expect(src('src/components/dashboard/morning-card/MorningCard.tsx')).not.toContain(
      'BiologicalAgeHeroTile',
    );
  });

  it('Metabolic age and RHR use Brief 32 chips or --', () => {
    const bento = src('src/components/body-tracker/dashboard/DashboardBento.tsx');
    expect(bento).toContain('vitalValueDisplay');
    expect(bento).toContain('ANALYTICS_PROVENANCE_EMPTY');
    expect(bento).toContain('metabolicAgeSourceName');
    expect(bento).toContain('restingHrSourceName');
  });
});

describe('Brief 56 Arnold wearable / XML dim gates', () => {
  it('omits the wearable slice unless Hume/Apple last-sync or XML; Coming soon never feeds', () => {
    const empty = emptyWearableTilesSnapshot('web');
    expect(wearableHannahGate(empty).pluggedIn).toBe(false);

    const leftoverWhoop = empty.map((tile) =>
      tile.id === 'whoop'
        ? { ...tile, lastSyncState: 'synced' as const, lastSyncAt: '2026-08-22T08:00:00.000Z' }
        : tile,
    );
    expect(wearableHannahGate(leftoverWhoop).pluggedIn).toBe(false);

    const humeSynced = empty.map((tile) =>
      tile.id === 'hume'
        ? { ...tile, lastSyncState: 'synced' as const, lastSyncAt: '2026-08-22T08:00:00.000Z' }
        : tile,
    );
    expect(wearableHannahGate(humeSynced).pluggedIn).toBe(true);

    const minted = blendHannahBos({
      ...emptyHannahBosInput(),
      wearable: {
        pluggedIn: true,
        comingSoonOnly: false,
        mintedFromDailyVitals: true,
        score: 88,
      },
    });
    expect(minted.score).toBeNull();
  });

  it('Hume XML unlocks Body comp + Metabolic after sourceName hume_body_pod only, never Sleep', () => {
    expect(xmlUnlockedDimensions({ vendor: 'hume', sourceName: 'hume_body_pod' })).toEqual([
      'body_comp',
      'metabolic',
    ]);
    expect(xmlUnlockedDimensions({ vendor: 'hume', sourceName: 'Hume Health' })).toEqual([]);
    expect(xmlUnlockedDimensions({ vendor: 'hume', sourceName: 'phone_health' })).toEqual([]);
    expect(xmlUnlockedDimensions({ vendor: 'hume', sourceName: 'hume_body_pod' })).not.toContain(
      'sleep',
    );
  });

  it('Apple XML unlocks Body comp + Metabolic only; Sleep waits for wearable_sleep_sessions', () => {
    expect(xmlUnlockedDimensions({ vendor: 'apple' })).toEqual(['body_comp', 'metabolic']);
    expect(xmlUnlockedDimensions({
      vendor: 'apple',
      hasWearableSleepSessions: false,
    })).not.toContain('sleep');
    expect(xmlUnlockedDimensions({
      vendor: 'apple',
      hasWearableSleepSessions: true,
    })).toEqual(['body_comp', 'metabolic', 'sleep']);
  });

  it('Hume-only last-sync does not unlock Sleep', () => {
    const snapshot = src('src/lib/body-tracker/wearable-snapshot.ts');
    expect(snapshot).toContain('Never Sleep');
    expect(snapshot).toContain("sourceName !== 'hume_body_pod'");
    const pair = src('src/lib/body-tracker/__tests__/habit-sleep-pair.test.ts');
    expect(pair).toContain('does not unlock Sleep from Hume-only last-sync');
  });
});
