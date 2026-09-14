import { HANNAH_APP_INTENT_VOICE } from '../../src/lib/hannah/app-intent-voice';
import {
  BOS_BAND_CUTOFFS,
  bandFromScore,
  bosGlanceFromScore,
  buildBosExplainLines,
  isUnwiredComingSoonSource,
  protocolNextGlance,
  shouldShowBosExplainChip,
  speakBosGlance,
  wearableLastSyncGlance,
} from '../../src/lib/morning-card/glance';
import { performAppIntent } from '../../src/lib/app-intents/perform';
import {
  APP_INTENT_IDS,
  APP_INTENT_UTTERANCES,
} from '../../src/lib/app-intents/registry';

describe('Brief 66 Expo glance honesty adapters', () => {
  it('UNKNOWN is null, never 0', () => {
    expect(bosGlanceFromScore(null)).toEqual({ score: null, band: null });
    expect(speakBosGlance({ score: null })).toBe(HANNAH_APP_INTENT_VOICE.bosUnknown);
    expect(speakBosGlance({ score: null })).not.toMatch(/\b0\b/);
    expect(
      performAppIntent({ intentId: APP_INTENT_IDS.bos, score: null }).spoken,
    ).toBe(HANNAH_APP_INTENT_VOICE.bosUnknown);
  });

  it('omits band appends when Brief 62 cutoffs are absent', () => {
    expect(BOS_BAND_CUTOFFS).toBeNull();
    expect(bandFromScore(88)).toBeNull();
    expect(speakBosGlance({ score: 64 })).toBe(
      'Your Bio Optimization Score is 64 today.',
    );
    expect(
      performAppIntent({
        intentId: APP_INTENT_IDS.bos,
        utterance: 'Am I ready to push or ease up?',
        score: 64,
      }).spoken,
    ).toBe('Your Bio Optimization Score is 64.');
  });

  it('uses Hannah empty and complete strings for protocol next', () => {
    expect(protocolNextGlance([]).spoken).toBe('No protocol item due today.');
    expect(protocolNextGlance([]).spoken).not.toBe('No protocol items yet');
    expect(
      protocolNextGlance([
        { name: 'MTHFR+', taken: true, slotId: '1', dose: null, timeOfDay: 'morning' },
      ]).spoken,
    ).toBe("You're caught up on today's protocol.");
    expect(
      performAppIntent({
        intentId: APP_INTENT_IDS.protocol,
        protocolItems: [
          { name: 'NAD+', taken: false, slotId: '1', dose: null, timeOfDay: 'morning' },
        ],
      }).spoken,
    ).toBe("Next on today's protocol: NAD+. Take NAD+.");
  });

  it('Coming soon never invents last-sync', () => {
    expect(isUnwiredComingSoonSource('whoop')).toBe(true);
    expect(
      wearableLastSyncGlance({
        sourceId: 'oura',
        connected: true,
        lastSyncedAt: '2026-09-14T12:00:00.000Z',
      }).spoken,
    ).toBe('Oura is coming soon.');
    expect(
      performAppIntent({
        intentId: APP_INTENT_IDS.lastSync,
        lastSyncSourceId: 'garmin',
      }).spoken,
    ).toBe('Garmin is coming soon.');
    expect(
      performAppIntent({
        intentId: APP_INTENT_IDS.lastSync,
        lastSyncSourceId: 'apple_health',
        wearables: [
          {
            sourceId: 'apple_health',
            sourceName: 'Apple Health',
            connected: true,
            lastSyncedAt: '2026-09-14T16:00:00.000Z',
            now: Date.parse('2026-09-14T16:05:00.000Z'),
          },
        ],
      }).spoken,
    ).toBe('Apple Health last synced 5 min ago.');
  });

  it('exposes Shortcuts-friendly utterances and omits Explain when UNKNOWN', () => {
    expect(APP_INTENT_UTTERANCES.GetBioOptimizationScore).toContain(
      "What's my Bio Optimization Score?",
    );
    expect(APP_INTENT_UTTERANCES.GetTodaysProtocolNext).toContain(
      "What's next on my protocol?",
    );
    expect(APP_INTENT_UTTERANCES.GetWearableLastSync).toContain(
      'Is Apple Health connected?',
    );
    expect(shouldShowBosExplainChip(null, ['from CAQ'])).toBe(false);
    expect(buildBosExplainLines({ score: null, chips: ['from CAQ'] })).toEqual([]);
  });
});
