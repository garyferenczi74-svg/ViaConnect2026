import { describe, it, expect, beforeEach } from 'vitest';
import {
  DAILY_SCHEDULE_SHARE_TTL_MS,
  clearDailyScheduleShare,
  peekDailyScheduleShare,
  rememberDailyScheduleShare,
  takeDailyScheduleInFlight,
  type DailyScheduleShareResult,
} from '../dailyScheduleReadShare';
import { EMPTY_SCHEDULE_VIEW } from '../dailyScheduleShared';

const ready: DailyScheduleShareResult = {
  ok: true,
  view: {
    ...EMPTY_SCHEDULE_VIEW,
    evening: [],
  },
};

describe('dailyScheduleReadShare', () => {
  beforeEach(() => {
    clearDailyScheduleShare();
  });

  it('returns a remembered ready read inside the TTL', () => {
    rememberDailyScheduleShare(ready, 1_000);
    expect(peekDailyScheduleShare(1_000)).toEqual(ready);
    expect(peekDailyScheduleShare(1_000 + DAILY_SCHEDULE_SHARE_TTL_MS - 1)).toEqual(
      ready,
    );
  });

  it('drops the remember after the TTL so a remount re-reads', () => {
    rememberDailyScheduleShare(ready, 1_000);
    expect(peekDailyScheduleShare(1_000 + DAILY_SCHEDULE_SHARE_TTL_MS)).toBeNull();
  });

  it('reuses one in-flight promise for concurrent callers', async () => {
    let starts = 0;
    const start = (): Promise<DailyScheduleShareResult> => {
      starts += 1;
      return Promise.resolve(ready);
    };
    const a = takeDailyScheduleInFlight(start);
    const b = takeDailyScheduleInFlight(start);
    expect(a).toBe(b);
    await expect(a).resolves.toEqual(ready);
    expect(starts).toBe(1);
  });
});
