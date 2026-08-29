import { useEffect, useRef } from 'react';

export function tickState(
  startMs: number,
  nowMs: number,
  totalSeconds: number,
): { display: number; done: boolean } {
  const elapsedSeconds = (nowMs - startMs) / 1000;
  // Display = remaining whole seconds, clamped to 0..totalSeconds
  const display = Math.max(0, totalSeconds - Math.floor(elapsedSeconds));
  const done = display === 0;
  return { display, done };
}

export function useCountdown({
  totalSeconds,
  active,
  onTick,
  onComplete,
}: {
  totalSeconds: number;
  active: boolean;
  onTick?: (display: number) => void;
  onComplete?: () => void;
}) {
  const startMsRef = useRef<number | null>(null);
  const lastDisplayRef = useRef<number | null>(null);
  const completedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const onTickRef = useRef(onTick);
  const onCompleteRef = useRef(onComplete);

  // Update callback refs on every render to use latest (prevents clock restart)
  onTickRef.current = onTick;
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!active) {
      // Clear timer when becoming inactive
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    // Record start time when active becomes true
    startMsRef.current = Date.now();
    lastDisplayRef.current = totalSeconds;
    completedRef.current = false;

    const loop = () => {
      if (startMsRef.current === null) return;

      const nowMs = Date.now();
      const state = tickState(startMsRef.current, nowMs, totalSeconds);

      // Fire onTick only when whole second display value changes
      if (state.display !== lastDisplayRef.current) {
        onTickRef.current?.(state.display);
        lastDisplayRef.current = state.display;
      }

      // Fire onComplete exactly once when done
      if (state.done && !completedRef.current) {
        onCompleteRef.current?.();
        completedRef.current = true;
      }

      // Continue looping until done
      if (!state.done) {
        rafRef.current = requestAnimationFrame(loop);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(loop);

    // Cleanup on unmount or when active changes
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [active, totalSeconds]);
}
