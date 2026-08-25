import { describe, it, expect } from 'vitest';
import { CONTRIBUTOR_METRICS, METRIC_LABELS } from '@/lib/body-tracker/contributor-rows';
import { CONNECT_YOUR_DEVICE_COPY } from '@/components/body-tracker/connections/ContributorColumn';
import { buildMorningChips, chipByKey } from '../contributors';
import { MORNING_CHIP_KEYS } from '../keys';
import { MORNING_CONNECTIONS_HREF, MORNING_CONNECT_YOUR_DEVICE } from '../copy';

describe('morning-card contributors SSOT', () => {
  it('builds exactly the 7 METRIC_LABELS chips, not the 8 marketing keys', () => {
    const chips = buildMorningChips();
    expect(chips.map((c) => c.key)).toEqual([...CONTRIBUTOR_METRICS]);
    expect(chips.map((c) => c.label)).toEqual(CONTRIBUTOR_METRICS.map((k) => METRIC_LABELS[k]));
    expect(chips).toHaveLength(7);
    expect(chips.map((c) => c.key)).toEqual([...MORNING_CHIP_KEYS]);
    expect(chips.some((c) => c.key === 'strain' || c.key === 'immune')).toBe(false);
  });

  it('keeps coming soon / not connected rows UNKNOWN or Connect your device', () => {
    const chips = buildMorningChips();
    for (const chip of chips) {
      expect(chip.sourceStatus).toBe('pending');
      expect(chip.displayValue).toBe('UNKNOWN');
      expect(chip.href).toBe('/body-tracker/connections');
      expect(chip.contributors).toHaveLength(1);
      expect(chip.contributors[0]?.displayValue).toBe('UNKNOWN');
      expect(chip.contributors[0]?.name).toBe(CONNECT_YOUR_DEVICE_COPY);
      expect(chip.contributors[0]?.href).toBe(MORNING_CONNECTIONS_HREF);
    }
    expect(MORNING_CONNECT_YOUR_DEVICE).toBe('Connect your device');
  });

  it('does not invent last-sync, native_health_bridge HRV/RHR, or numeric zeros', () => {
    const chips = buildMorningChips();
    const blob = JSON.stringify(chips);
    expect(blob).not.toMatch(/last_sync/);
    expect(blob).not.toMatch(/native_health_bridge/);
    expect(blob).not.toMatch(/"displayValue":"0"/);
    expect(blob).not.toMatch(/Vitality/);
    expect(blob).not.toMatch(/Helix/);
  });

  it('gates Sleep until a real last-sync and never fabricates HRV', () => {
    const chips = buildMorningChips({
      lastSyncSynced: false,
      scoreDetail: [
        {
          dimension: 'sleep',
          source: 'apple_health',
          value: 90,
          displayValue: '90',
          status: 'sourced',
          showRing: true,
          manual: false,
          disagreement: null,
          sources: [],
        },
        {
          dimension: 'hrv',
          source: 'whoop',
          value: 55,
          displayValue: '55',
          status: 'sourced',
          showRing: true,
          manual: false,
          disagreement: null,
          sources: [],
        },
      ],
    });
    expect(chipByKey(chips, 'sleep')?.displayValue).toBe('UNKNOWN');
    expect(chipByKey(chips, 'sleep')?.contributors[0]?.name).toBe('Connect your device');
    expect(chipByKey(chips, 'hrv')?.displayValue).toBe('55');
    expect(chipByKey(chips, 'hrv')?.contributors[0]?.name).toBe('Whoop');
  });

  it('shows a real source after last-sync and deep-links to connections', () => {
    const chips = buildMorningChips({
      lastSyncSynced: true,
      scoreDetail: [
        {
          dimension: 'sleep',
          source: 'apple_health',
          value: 88,
          displayValue: '88',
          status: 'sourced',
          showRing: true,
          manual: false,
          disagreement: null,
          sources: [],
        },
      ],
    });
    expect(chipByKey(chips, 'sleep')?.displayValue).toBe('88');
    expect(chipByKey(chips, 'sleep')?.href).toBe('/body-tracker/connections');
    expect(chipByKey(chips, 'steps')?.displayValue).toBe('UNKNOWN');
  });
});
