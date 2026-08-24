import { describe, it, expect } from 'vitest';
import { buildScanWrite } from '../buildScanWrite';

describe('buildScanWrite', () => {
  it('writes total body fat and leaves every other field UNKNOWN (absent), never 0', () => {
    const { entry, segFat, weight } = buildScanWrite({
      userId: 'u1', scanId: 's1', scanDate: '2026-06-22',
      derived: { totalBodyFatPct: 20.5, estimatedBodyFatMin: 18, estimatedBodyFatMax: 23, confidence: 0.65 },
    });
    expect(entry).toMatchObject({ user_id: 'u1', scan_id: 's1', source: 'scan', device_name: 'FormaVision', confidence: 0.65, entry_date: '2026-06-22' });
    expect(entry.notes).toMatch(/18\.0–23\.0%/);
    expect(segFat).toMatchObject({ user_id: 'u1', total_body_fat_pct: 20.5 });
    expect(weight).toMatchObject({ user_id: 'u1', weight_lbs: null, body_fat_pct: null });
    // honest model: regional, visceral, body water are NOT written as 0
    for (const k of ['right_arm_pct', 'left_arm_pct', 'trunk_pct', 'right_leg_pct', 'left_leg_pct', 'visceral_fat_rating', 'body_water_pct']) {
      expect(segFat[k]).toBeUndefined();
    }
  });

  it('keeps total_body_fat_pct null when the scan could not estimate it', () => {
    const { segFat } = buildScanWrite({ userId: 'u1', scanId: 's1', scanDate: '2026-06-22', derived: { totalBodyFatPct: null, confidence: 0.4 } });
    expect(segFat.total_body_fat_pct).toBeNull();
  });
});
