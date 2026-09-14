import { describe, expect, it } from 'vitest';
import { HANNAH_APP_INTENT_VOICE } from '@/lib/hannah/app-intent-voice';
import { HANNAH_BOS_INTENDED_WEIGHTS } from '@/lib/scoring/hannah-bos';
import {
  BOS_BAND_CUTOFFS,
  bandFromScore,
  bosGlanceFromScore,
  buildBosExplainLines,
  isUnwiredComingSoonSource,
  protocolNextGlance,
  protocolNextGlanceFromBuckets,
  shouldShowBosExplainChip,
  speakBosGlance,
  speakWearablesLastSync,
  topDriverChip,
  wearableLastSyncGlance,
  type BosBandCutoffs,
} from '../glance';
import type { MorningProtocolBuckets, MorningProtocolItem } from '../protocol-cta';

const DRAFT_CUTOFFS: BosBandCutoffs = {
  easeUpMax: 39,
  steadyMax: 59,
  readyMax: 79,
};

function item(
  partial: Pick<MorningProtocolItem, 'slotId' | 'name' | 'timeOfDay' | 'taken'>,
): MorningProtocolItem {
  return {
    userSupplementId: `u-${partial.slotId}`,
    dose: '1 capsule',
    ...partial,
  };
}

describe('Brief 66 glance honesty adapters', () => {
  it('UNKNOWN is null, never 0', () => {
    expect(bosGlanceFromScore(null)).toEqual({ score: null, band: null });
    expect(bosGlanceFromScore(Number.NaN)).toEqual({ score: null, band: null });
    expect(speakBosGlance({ score: null })).toBe(HANNAH_APP_INTENT_VOICE.bosUnknown);
    expect(speakBosGlance({ score: null })).not.toMatch(/\b0\b/);
    expect(speakBosGlance({ score: null, variant: 'push_ease' })).toBe(
      HANNAH_APP_INTENT_VOICE.bosPushEaseUnknown,
    );
  });

  it('omits every band append when Brief 62 cutoffs are absent', () => {
    expect(BOS_BAND_CUTOFFS).toBeNull();
    expect(bosGlanceFromScore(12).band).toBeNull();
    expect(bosGlanceFromScore(88).band).toBeNull();
    expect(bandFromScore(90)).toBeNull();
    expect(speakBosGlance({ score: 72 })).toBe(
      'Your Bio Optimization Score is 72 today.',
    );
    expect(speakBosGlance({ score: 72 })).not.toMatch(/range/);
    expect(speakBosGlance({ score: 72, variant: 'push_ease' })).toBe(
      'Your Bio Optimization Score is 72.',
    );
    expect(speakBosGlance({ score: 72, variant: 'push_ease' })).not.toMatch(
      /Ease up|Steady|Ready|Push/,
    );
    expect(buildBosExplainLines({ score: 72, chips: ['from check-in'] })).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/You're in /)]),
    );
  });

  it('appends Hannah band copy only when cutoffs exist and the score is known', () => {
    expect(bandFromScore(20, DRAFT_CUTOFFS)).toBe('Ease up');
    expect(bandFromScore(50, DRAFT_CUTOFFS)).toBe('Steady');
    expect(bandFromScore(70, DRAFT_CUTOFFS)).toBe('Ready');
    expect(bandFromScore(90, DRAFT_CUTOFFS)).toBe('Push');
    expect(bandFromScore(null, DRAFT_CUTOFFS)).toBeNull();
    expect(
      speakBosGlance({ score: 70, band: 'Ready' }),
    ).toBe("Your Bio Optimization Score is 70 today. That's in the Ready range.");
    expect(
      speakBosGlance({ score: 70, band: 'Ready', topDriverChip: 'from check-in' }),
    ).toBe(
      "Your Bio Optimization Score is 70 today. That's in the Ready range. The strongest piece in it today is from check-in.",
    );
    expect(
      speakBosGlance({ score: 70, band: 'Ready', variant: 'push_ease' }),
    ).toBe("Your Bio Optimization Score is 70. That's in the Ready range.");
  });

  it('uses Hannah empty and complete strings, never invents a molecule', () => {
    expect(protocolNextGlance([]).spoken).toBe('No protocol item due today.');
    expect(protocolNextGlance([]).spoken).not.toBe('No protocol items yet');
    expect(
      protocolNextGlance([
        { name: 'MTHFR+', taken: true },
        { name: 'NAD+', taken: true },
      ]).spoken,
    ).toBe("You're caught up on today's protocol.");
    const next = protocolNextGlance([
      { name: 'MTHFR+', taken: true },
      { name: 'NAD+', taken: false },
    ]);
    expect(next.spoken).toBe("Next on today's protocol: NAD+. Take NAD+.");
    expect(next.spoken).not.toMatch(/Semaglutide|shop|mg/i);
  });

  it('reuses web morning-card protocol-cta order and stays silent when unavailable', () => {
    const view: MorningProtocolBuckets = {
      morning: [item({ slotId: 'm1', name: 'MTHFR+', timeOfDay: 'morning', taken: true })],
      afternoon: [item({ slotId: 'a1', name: 'NAD+', timeOfDay: 'afternoon', taken: false })],
      evening: [],
    };
    expect(protocolNextGlanceFromBuckets(view, { nowBucket: 'morning' }).spoken).toBe(
      "Next on today's protocol: NAD+. Take NAD+.",
    );
    expect(protocolNextGlanceFromBuckets(null, { status: 'unavailable' }).spoken).toBeNull();
    expect(protocolNextGlanceFromBuckets(view, { status: 'loading' }).spoken).toBeNull();
    expect(
      protocolNextGlanceFromBuckets({ morning: [], afternoon: [], evening: [] }).spoken,
    ).toBe('No protocol item due today.');
  });

  it('Coming soon never invents last-sync and never feeds BOS', () => {
    const leftover = wearableLastSyncGlance({
      sourceId: 'whoop',
      connected: true,
      lastSyncedAt: '2026-09-14T12:00:00.000Z',
    });
    expect(leftover.kind).toBe('coming_soon');
    expect(leftover.lastSyncedAt).toBeNull();
    expect(leftover.spoken).toBe('Whoop is coming soon.');
    expect(isUnwiredComingSoonSource('oura')).toBe(true);
    expect(isUnwiredComingSoonSource('google_health')).toBe(true);
    expect(isUnwiredComingSoonSource('garmin')).toBe(true);
    expect(isUnwiredComingSoonSource('apple_health')).toBe(false);

    expect(
      wearableLastSyncGlance({
        sourceId: 'apple_health',
        sourceName: 'Apple Health',
        connected: false,
        lastSyncedAt: null,
      }).spoken,
    ).toBe("Apple Health isn't connected.");
    expect(
      wearableLastSyncGlance({
        sourceId: 'hume',
        sourceName: 'Hume Body Pod',
        connected: true,
        lastSyncedAt: null,
      }).spoken,
    ).toBe('No sync yet for Hume Body Pod.');
    expect(
      wearableLastSyncGlance({
        sourceId: 'apple_health',
        sourceName: 'Apple Health',
        connected: true,
        lastSyncedAt: '2026-09-14T16:00:00.000Z',
        now: Date.parse('2026-09-14T16:05:00.000Z'),
      }).spoken,
    ).toBe('Apple Health last synced 5 min ago.');

    expect(
      speakWearablesLastSync([
        { sourceId: 'whoop', connected: false, lastSyncedAt: null },
        { sourceId: 'oura', connected: false, lastSyncedAt: null },
      ]),
    ).toBe('Whoop is coming soon. Oura is coming soon.');
  });

  it('Explain chip omits UNKNOWN and omitted-band-why', () => {
    expect(shouldShowBosExplainChip(null, ['from CAQ'])).toBe(false);
    expect(shouldShowBosExplainChip(Number.NaN, ['from CAQ'])).toBe(false);
    expect(shouldShowBosExplainChip(72, [])).toBe(false);
    expect(shouldShowBosExplainChip(71, [])).toBe(false);
    expect(shouldShowBosExplainChip(72, ['from check-in'])).toBe(true);
    expect(shouldShowBosExplainChip(71, ['from CAQ'])).toBe(true);
    expect(buildBosExplainLines({ score: 72, chips: ['from Hume Body Pod'] })).toEqual([
      HANNAH_APP_INTENT_VOICE.explainDefault,
      'Right now the strongest real piece is from Hume Body Pod.',
    ]);
    expect(topDriverChip([
      {
        key: 'checkin',
        chip: 'from check-in',
        weight: HANNAH_BOS_INTENDED_WEIGHTS.checkin,
        score: 70,
      },
      {
        key: 'caq',
        chip: 'from CAQ',
        weight: HANNAH_BOS_INTENDED_WEIGHTS.caq,
        score: 60,
      },
    ])).toBe('from CAQ');
  });
});
