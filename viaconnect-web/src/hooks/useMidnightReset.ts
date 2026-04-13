'use client';

import { useEffect } from 'react';
import { localMidnightUTC } from '@/lib/checkinReset';

export function useMidnightReset(timezone: string, onReset: () => void): void {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    function scheduleNext() {
      const now = Date.now();
      const tomorrow = localMidnightUTC(timezone, 1).getTime();
      const msUntil = Math.max(tomorrow - now, 1000);

      timer = setTimeout(() => {
        onReset();
        scheduleNext();
      }, msUntil);
    }

    scheduleNext();
    return () => clearTimeout(timer);
  }, [timezone, onReset]);
}
