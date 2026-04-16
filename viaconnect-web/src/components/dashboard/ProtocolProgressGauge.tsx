'use client';

// ProtocolProgressGauge — small circular ring meter for the Daily Schedule
// header. Combines today's supplement check-offs with today's logged meals
// (4 slots) into one progress fraction. At 100% it morphs into a
// "Finish Protocol" pill so the user sees a clear completion state.

import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';

export interface ProtocolProgressGaugeProps {
  supplementsDone: number;
  supplementsTotal: number;
  mealsDone: number;
  mealsTotal: number;
}

export function ProtocolProgressGauge({
  supplementsDone,
  supplementsTotal,
  mealsDone,
  mealsTotal,
}: ProtocolProgressGaugeProps) {
  const totalDone = supplementsDone + mealsDone;
  const totalAll = supplementsTotal + mealsTotal;
  const percent = totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0;
  const isComplete = totalAll > 0 && totalDone >= totalAll;

  const size = 46;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  const ringColor =
    isComplete
      ? '#22C55E'
      : percent >= 67
        ? '#2DA5A0'
        : percent >= 33
          ? '#F59E0B'
          : '#EF4444';

  return (
    <AnimatePresence mode="wait" initial={false}>
      {isComplete ? (
        <motion.div
          key="finish"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="flex items-center gap-1.5 rounded-full border border-[#22C55E]/40 bg-[#22C55E]/15 px-2.5 py-1 shadow-[0_0_12px_rgba(34,197,94,0.25)]"
          aria-label="Protocol complete"
        >
          <Check className="h-3 w-3 text-[#22C55E]" strokeWidth={2.5} />
          <span className="text-[11px] font-semibold text-[#22C55E]">
            Finish Protocol
          </span>
        </motion.div>
      ) : (
        <motion.div
          key="ring"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="relative shrink-0"
          style={{ width: size, height: size }}
          aria-label={`Protocol progress ${totalDone} of ${totalAll}`}
          role="img"
        >
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="-rotate-90"
          >
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={strokeWidth}
              fill="none"
            />
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={ringColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={circumference}
              initial={false}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
            <span
              className="text-[10px] font-bold tabular-nums"
              style={{ color: ringColor }}
            >
              {totalDone}/{totalAll}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
