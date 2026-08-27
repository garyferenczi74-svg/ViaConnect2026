import { describe, expect, it } from 'vitest';
import {
  CONNECTIONS_BOS_COMPOSITE,
  connectionsBosNumericScore,
} from '@/lib/body-tracker/wearable-tiles';
import {
  HANNAH_BOS_BLEND_SENTENCE,
  HANNAH_BOS_INTENDED_WEIGHTS,
  biologicalAgeContributorScore,
  blendCheckinBlock,
  blendHannahBos,
  bodyFatContributorScore,
  chipForBodySource,
  emptyHannahBosInput,
  hannahBosToConnectionsDisplay,
  sameMomentBosDisplays,
  type HannahBosInput,
} from '../hannah-bos';

function input(over: Partial<HannahBosInput> = {}): HannahBosInput {
  const base = emptyHannahBosInput();
  return {
    ...base,
    ...over,
    caq: { ...base.caq, ...over.caq },
    checkin: {
      ...base.checkin,
      ...over.checkin,
      subs: { ...base.checkin.subs, ...over.checkin?.subs },
    },
    nutrition: { ...base.nutrition, ...over.nutrition },
    macros: { ...base.macros, ...over.macros },
    body: { ...base.body, ...over.body },
    biologicalAge: { ...base.biologicalAge, ...over.biologicalAge },
    wearable: { ...base.wearable, ...over.wearable },
  };
}

describe('blendHannahBos', () => {
  it('empty set is UNKNOWN, never 0', () => {
    const result = blendHannahBos(emptyHannahBosInput());
    expect(result.score).toBeNull();
    expect(result.contributors).toEqual([]);
    expect(result.remainingWeightSum).toBe(0);
    expect(result.sentence).toBe(HANNAH_BOS_BLEND_SENTENCE);
    expect(hannahBosToConnectionsDisplay(result)).toEqual(CONNECTIONS_BOS_COMPOSITE);
    expect(connectionsBosNumericScore(hannahBosToConnectionsDisplay(result))).toBeNull();
    expect(result.score).not.toBe(0);
  });

  it('omits missing contributors and renormalizes; never averages zeros', () => {
    const result = blendHannahBos(input({
      caq: { complete: true, score: 80 },
      nutrition: { mealCount: 1, score: 60 },
    }));
    expect(result.contributors.map((c) => c.key)).toEqual(['caq', 'nutrition']);
    expect(result.remainingWeightSum).toBe(
      HANNAH_BOS_INTENDED_WEIGHTS.caq + HANNAH_BOS_INTENDED_WEIGHTS.nutrition,
    );
    // 80 * 25/40 + 60 * 15/40 = 50 + 22.5 = 72.5 → 73
    expect(result.score).toBe(73);
    expect(result.chips).toEqual(['from CAQ', 'from nutrition']);
    expect(result.sentence).not.toMatch(/\b25\b/);
    expect(result.sentence).not.toMatch(/\b15\b/);
  });

  it('does not count a missing contributor as 0', () => {
    const onlyCaq = blendHannahBos(input({
      caq: { complete: true, score: 80 },
    }));
    expect(onlyCaq.score).toBe(80);
    expect(onlyCaq.remainingWeightSum).toBe(25);
    expect(onlyCaq.contributors).toHaveLength(1);
  });

  it('CAQ incomplete or scoreless is omitted', () => {
    expect(blendHannahBos(input({ caq: { complete: false, score: 80 } })).score).toBeNull();
    expect(blendHannahBos(input({ caq: { complete: true, score: null } })).score).toBeNull();
  });

  it('check-in block omits missing subs and renormalizes inside the block', () => {
    expect(blendCheckinBlock({
      sleep: 80,
      energy: 60,
      mood: null,
      activity: 40,
      hydration: null,
    })).toBe(60);

    const result = blendHannahBos(input({
      checkin: {
        hasTodayCheckin: true,
        subs: { sleep: 80, energy: 60, mood: null, activity: 40, hydration: null },
      },
    }));
    expect(result.score).toBe(60);
    expect(result.chips).toEqual(['from check-in']);
  });

  it('hydration 0 only when logged 0 ml; unlogged hydration is omitted', () => {
    const loggedZero = blendCheckinBlock({
      sleep: 100,
      energy: null,
      mood: null,
      activity: null,
      hydration: 0,
    });
    expect(loggedZero).toBe(50);

    const unlogged = blendCheckinBlock({
      sleep: 100,
      energy: null,
      mood: null,
      activity: null,
      hydration: null,
    });
    expect(unlogged).toBe(100);
  });

  it('nutrition and macros stay UNKNOWN with no meals; 0 kcal is a count not a score', () => {
    expect(blendHannahBos(input({
      nutrition: { mealCount: 0, score: 0 },
      macros: { mealCount: 0, score: 0 },
    })).score).toBeNull();

    expect(blendHannahBos(input({
      nutrition: { mealCount: 1, score: 0 },
      macros: { mealCount: 1, score: 0 },
    })).score).toBe(0);

    expect(blendHannahBos(input({
      macros: { mealCount: 1, score: 0 },
    })).score).toBeNull();
  });

  it('omits biological age while DRAFT / pending / no estimate', () => {
    expect(blendHannahBos(input({
      biologicalAge: { state: 'draft', score: 70 },
    })).score).toBeNull();
    expect(blendHannahBos(input({
      biologicalAge: { state: 'insufficient', score: 0 },
    })).score).toBeNull();
    expect(blendHannahBos(input({
      biologicalAge: { state: 'pending', score: 40 },
    })).score).toBeNull();
    expect(blendHannahBos(input({
      biologicalAge: { state: 'estimated', score: 55 },
    })).score).toBe(55);
    expect(blendHannahBos(input({
      biologicalAge: { state: 'estimated', score: 55, marshallPending: true },
    })).score).toBeNull();
  });

  it('Whoop/Oura/Google/Garmin coming soon never move BOS', () => {
    const result = blendHannahBos(input({
      wearable: {
        pluggedIn: false,
        comingSoonOnly: true,
        mintedFromDailyVitals: false,
        score: 90,
      },
    }));
    expect(result.score).toBeNull();
  });

  it('does not mint wearable BOS from wearable_daily_vitals HRV/RHR', () => {
    const minted = blendHannahBos(input({
      wearable: {
        pluggedIn: true,
        comingSoonOnly: false,
        mintedFromDailyVitals: true,
        score: 88,
      },
    }));
    expect(minted.score).toBeNull();

    const realXml = blendHannahBos(input({
      wearable: {
        pluggedIn: true,
        comingSoonOnly: false,
        mintedFromDailyVitals: false,
        score: 70,
      },
    }));
    expect(realXml.score).toBe(70);
    expect(realXml.chips).toEqual(['from wearable']);
  });

  it('body requires a real fat/muscle source chip', () => {
    expect(blendHannahBos(input({
      body: { hasRealFatOrMuscle: true, score: 66, chip: null },
    })).score).toBeNull();

    const fromHume = blendHannahBos(input({
      body: { hasRealFatOrMuscle: true, score: 66, chip: 'from Hume Body Pod' },
    }));
    expect(fromHume.score).toBe(66);
    expect(fromHume.chips).toEqual(['from Hume Body Pod']);
    expect(chipForBodySource('hume_body_pod')).toBe('from Hume Body Pod');
    expect(chipForBodySource('hume')).toBeNull();
    expect(chipForBodySource('apple_health')).toBe('from Apple Health');
    expect(chipForBodySource('manual')).toBe('from profile');
    expect(chipForBodySource({ source: 'scan', deviceName: 'FormaVision' })).toBe(
      'from FormaVision',
    );
    expect(chipForBodySource('scan')).toBeNull();
    expect(chipForBodySource('phone_health')).toBeNull();
    expect(chipForBodySource('whoop')).toBeNull();
  });

  it('no wearables + no XML is UNKNOWN or only real CAQ/check-in/nutrition/body', () => {
    const none = blendHannahBos(emptyHannahBosInput());
    expect(none.score).toBeNull();
    expect(hannahBosToConnectionsDisplay(none).band).toBe('UNKNOWN');

    const checkinOnly = blendHannahBos(input({
      checkin: {
        hasTodayCheckin: true,
        subs: { sleep: 59, energy: 59, mood: 59, activity: 59, hydration: null },
      },
    }));
    expect(checkinOnly.score).toBe(59);
    expect(checkinOnly.chips).toEqual(['from check-in']);
    expect(checkinOnly.chips).not.toContain('from wearable');
    const display = hannahBosToConnectionsDisplay(checkinOnly);
    expect(display.value).toBe('59');
    expect(display.band).not.toBe('Overall Wellness');
  });

  it('hero === analytics === connections at the same moment', () => {
    const result = blendHannahBos(input({
      caq: { complete: true, score: 70 },
      checkin: {
        hasTodayCheckin: true,
        subs: { sleep: 80, energy: 80, mood: 80, activity: 80, hydration: null },
      },
    }));
    const display = hannahBosToConnectionsDisplay(result);
    expect(sameMomentBosDisplays(display, display, display)).toBe(true);
    expect(display).not.toEqual(CONNECTIONS_BOS_COMPOSITE);
  });
});

describe('biologicalAgeContributorScore / bodyFatContributorScore', () => {
  it('maps a real Arnold estimate, never 0 YEARS as a display fallback', () => {
    expect(biologicalAgeContributorScore(40, 45)).toBe(75);
    expect(biologicalAgeContributorScore(45, 45)).toBe(50);
    expect(biologicalAgeContributorScore(50, 45)).toBe(25);
  });

  it('reuses the documented 18% body-fat deviation map', () => {
    expect(bodyFatContributorScore(18)).toBe(100);
    expect(bodyFatContributorScore(28)).toBe(70);
  });
});

describe('HANNAH_BOS_INTENDED_WEIGHTS', () => {
  it('sums to 100', () => {
    const sum = Object.values(HANNAH_BOS_INTENDED_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBe(100);
  });
});
