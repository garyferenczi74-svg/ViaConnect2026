'use client';

// BOSScoreDisplay: large numeric score with a Framer Motion spring
// tween on change. Also shows tier confidence display ("72% / 86% /
// 96%") and the BOS baseline below the main score.
//
// Animation: useSpring(score) per Framer's pattern; the on-screen
// number is rounded for display. aria-live polite so screen readers
// announce score changes but do not interrupt.

import { useEffect } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import type { BOSCurrentResponse } from '@/lib/scoring/types';

export interface BOSScoreDisplayProps {
  data: BOSCurrentResponse;
}

const BOS_LABEL = 'Bio Optimization Score';

export function BOSScoreDisplay({ data }: BOSScoreDisplayProps) {
  const target = data.score ?? 0;
  const spring = useSpring(0, { stiffness: 80, damping: 16, mass: 1 });
  const rounded = useTransform(spring, (v) => Math.round(v).toString());

  useEffect(() => {
    spring.set(target);
  }, [spring, target]);

  if (data.score === null) {
    return (
      <div className="flex flex-col items-start">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
          {BOS_LABEL}
        </p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-5xl font-bold text-white/40 sm:text-6xl" aria-label="No score yet">
            --
          </span>
          <span className="text-sm text-white/40">/ 100</span>
        </div>
        <p className="mt-2 text-xs text-white/60">
          Confidence locked at {data.confidence_display} until your CAQ is complete
        </p>
      </div>
    );
  }

  const baseline = data.baseline ?? null;

  return (
    <div className="flex flex-col items-start">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
        {BOS_LABEL}
      </p>
      <div className="mt-2 flex items-baseline gap-2" aria-live="polite">
        <motion.span className="text-5xl font-bold text-[#2DA5A0] sm:text-6xl">
          {rounded}
        </motion.span>
        <span className="text-sm text-white/40">/ 100</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="text-white/60">
          Confidence{' '}
          <span className="font-semibold text-white">{data.confidence_display}</span>
        </span>
        {baseline !== null ? (
          <>
            <span className="text-white/20">,</span>
            <span className="text-white/60">
              Baseline <span className="font-semibold text-white">{Math.round(baseline)}</span>
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
}
