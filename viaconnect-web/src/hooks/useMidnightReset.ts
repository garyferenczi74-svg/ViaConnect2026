'use client';

import { useEffect } from 'react';
import { localMidnightUTC } from '@/lib/checkinReset';
import { localDateString } from '@/lib/timezone';

export function useMidnightReset(timezone: string, onReset: () => void): void {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let lastFiredDate = localDateString(timezone);

    function fireIfNewDay() {
      const now = localDateString(timezone);
      if (now !== lastFiredDate) {
        lastFiredDate = now;
        onReset();
      }
    }

    function scheduleNext() {
      const now = Date.now();
      const tomorrow = localMidnightUTC(timezone, 1).getTime();
      const msUntil = Math.max(tomorrow - now, 1000);

      timer = setTimeout(() => {
        fireIfNewDay();
        scheduleNext();
      }, msUntil);
    }

    // Defense against setTimeout drift when the tab is backgrounded or
    // the system sleeps across midnight: re-check the local date
    // whenever the page regains visibility or focus.
    const onActive = () => {
      if (document.visibilityState === 'visible') fireIfNewDay();
    };

    scheduleNext();
    document.addEventListener('visibilitychange', onActive);
    window.addEventListener('focus', onActive);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onActive);
      window.removeEventListener('focus', onActive);
    };
  }, [timezone, onReset]);
}
