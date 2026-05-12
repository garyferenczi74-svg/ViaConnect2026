// Prompt #162: count-up hook for animated metric values. 800ms easeOutQuad.

'use client';

import { useEffect, useRef, useState } from 'react';

interface UseCountUpOptions {
  readonly duration?: number;
}

function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function useCountUp(target: number, { duration = 800 }: UseCountUpOptions = {}): number {
  const [value, setValue] = useState<number>(target);
  const valueRef = useRef<number>(target);
  const rafRef = useRef<number | null>(null);

  // Keep ref in sync with state so the next animation reads the latest value
  // without re-running the animation effect on every value change.
  useEffect(() => {
    valueRef.current = value;
  });

  useEffect(() => {
    const from = valueRef.current;
    if (target === from) return;

    const startedAt = performance.now();

    function step(now: number) {
      const elapsed = now - startedAt;
      const t = Math.min(1, elapsed / duration);
      const eased = easeOutQuad(t);
      const next = from + (target - from) * eased;
      setValue(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    }

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return value;
}
