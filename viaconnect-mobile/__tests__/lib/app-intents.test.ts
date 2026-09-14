import { readFileSync } from 'fs';
import { join } from 'path';
import { APP_INTENT_IDS, APP_INTENT_UTTERANCES } from '../../src/lib/app-intents/registry';

const root = join(__dirname, '../..');

function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

describe('Brief 66 Expo App Intents exposure', () => {
  it('registers three intents and Shortcuts utterances', () => {
    const swift = src('native/app-intents/ViaConnectAppIntents.swift');
    const app = src('app.json');
    const plugin = src('plugins/with-app-intents.js');

    expect(swift).toContain('GetBioOptimizationScoreIntent');
    expect(swift).toContain('GetTodaysProtocolNextIntent');
    expect(swift).toContain('GetWearableLastSyncIntent');
    expect(swift).toContain('ViaConnectAppShortcuts');
    expect(swift).toContain("What's my Bio Optimization Score in");
    expect(swift).toContain('Whoop is coming soon.');
    expect(swift).toContain(
      "Your Bio Optimization Score isn't ready yet. Missing pieces stay out, not counted as zero.",
    );
    expect(swift).not.toMatch(/Vitality/);
    expect(swift).not.toMatch(/Helix/);
    expect(swift).not.toMatch(/native_health_bridge/);

    expect(app).toContain('./plugins/with-app-intents');
    expect(app).toContain('NSSiriUsageDescription');
    expect(plugin).toContain('ViaConnectAppIntents.swift');

    expect(APP_INTENT_IDS.bos).toBe('GetBioOptimizationScore');
    expect(APP_INTENT_UTTERANCES.GetWearableLastSync).toContain('Is Hume connected?');
  });
});
