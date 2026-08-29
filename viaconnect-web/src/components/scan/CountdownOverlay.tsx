'use client';

/**
 * FormaVision capture countdown overlay.
 *
 * Renders the huge countdown digit shown between pose title card and capture.
 * Ticks 5 to 3 render white, 2 to 1 render amber (design tokens orange-300/400),
 * and 0 renders a shutter ring instead of a bare digit. A visually-hidden
 * aria-live="assertive" region mirrors the current digit and coaching line for
 * screen reader users, since the visual digit and its tick animation convey no
 * information to them.
 *
 * Token discipline: the digit stroke uses var(--navy-700) (Deep Navy), never a
 * raw hex literal. The tick scale animation is skipped entirely when
 * reducedMotion is set, per prefers-reduced-motion.
 */

export interface CountdownOverlayProps {
  value: number;
  coaching: string;
  reducedMotion?: boolean;
}

const TICK_ANIMATION_NAME = 'formavisionCountdownTick';

const AMBER_CLASS_BY_VALUE: Record<number, string> = {
  2: 'text-orange-300',
  1: 'text-orange-400',
};

export function CountdownOverlay({
  value,
  coaching,
  reducedMotion = false,
}: CountdownOverlayProps) {
  const isShutter = value === 0;
  const amberClass = AMBER_CLASS_BY_VALUE[value];
  const digitColorClass = amberClass ?? 'text-white';

  return (
    <div
      className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
      data-testid="countdown-overlay"
    >
      {!reducedMotion && (
        <style>{`
          @keyframes ${TICK_ANIMATION_NAME} {
            0% { transform: scale(1); }
            100% { transform: scale(1.08); }
          }
        `}</style>
      )}
      {isShutter ? (
        <div
          data-testid="countdown-shutter-ring"
          aria-hidden="true"
          className="h-24 w-24 rounded-full border-4 border-white"
          style={{ boxShadow: '0 0 0 4px var(--navy-700)' }}
        />
      ) : (
        <span
          key={value}
          data-testid="countdown-digit"
          aria-hidden="true"
          className={`font-bold ${digitColorClass}`}
          style={{
            fontSize: 'clamp(4rem, 18vw, 9rem)',
            lineHeight: 1,
            WebkitTextStroke: '2px var(--navy-700)',
            animation: reducedMotion
              ? undefined
              : `${TICK_ANIMATION_NAME} 80ms ease-out`,
          }}
        >
          {value}
        </span>
      )}
      <p aria-live="assertive" className="sr-only">
        {isShutter ? 'Capturing.' : `${value}.`} {coaching}
      </p>
    </div>
  );
}
