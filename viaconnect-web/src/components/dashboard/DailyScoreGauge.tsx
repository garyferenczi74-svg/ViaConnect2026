'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Watch, Merge, type LucideIcon } from 'lucide-react';
import type { DataMode } from '@/lib/scoring/dailyScoreEngineV2';

interface DailyScoreGaugeProps {
  score: number;
  label: string;
  color: string;
  confidence: number;
  dataMode: DataMode;
  icon?: LucideIcon;
  size?: 'sm' | 'md';
  animate?: boolean;
}

const MODE_ICONS: Record<DataMode, LucideIcon> = {
  manual: ClipboardList,
  wearable: Watch,
  combined: Merge,
};

function useCountUp(target: number, duration = 1200): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

export function DailyScoreGauge({
  score,
  label,
  color,
  confidence,
  dataMode,
  icon: GaugeIcon,
  size = 'md',
  animate = true,
}: DailyScoreGaugeProps) {
  const animated = animate ? useCountUp(score) : score;
  const sz = size === 'sm' ? 100 : 120;
  const stroke = size === 'sm' ? 7 : 9;
  const radius = (sz - stroke) / 2;
  const center = sz / 2;
  const sweep = 270;
  const startAngle = 135;
  const circumference = 2 * Math.PI * radius;
  const arcLength = (sweep / 360) * circumference;
  const fillLength = (animated / 100) * arcLength;
  const ModeIcon = MODE_ICONS[dataMode];
  const noData = confidence === 0;

  return (
    <div className="relative flex flex-col items-center rounded-2xl border border-white/10 bg-gradient-to-br from-[#1E3054]/60 to-[#141E33]/60 backdrop-blur-md p-3.5 transition-all hover:border-white/20">
      <div
        className="pointer-events-none absolute -top-6 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full opacity-20 blur-2xl"
        style={{ backgroundColor: noData ? 'transparent' : color }}
      />

      <div className="relative" style={{ width: sz, height: sz }}>
        <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`} style={{ transform: `rotate(${startAngle}deg)` }}>
          <circle cx={center} cy={center} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} strokeDasharray={`${arcLength} ${circumference}`} strokeLinecap="round" />
          {!noData && (
            <motion.circle
              cx={center} cy={center} r={radius} fill="none"
              stroke={color} strokeWidth={stroke} strokeLinecap="round"
              initial={{ strokeDasharray: `0 ${circumference}` }}
              animate={{ strokeDasharray: `${fillLength} ${circumference}` }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              style={{ filter: `drop-shadow(0 0 8px ${color}55)` }}
            />
          )}
          {confidence > 0 && confidence < 1 && (
            <circle cx={center} cy={center} r={radius + stroke / 2 + 3} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1} strokeDasharray={`${arcLength * confidence} ${circumference}`} strokeLinecap="round" />
          )}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {noData ? (
            <span className="text-lg text-white/20">--</span>
          ) : (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="text-center">
              <div className="text-xl font-bold leading-none sm:text-2xl" style={{ color }}>{animated}</div>
              <div className="mt-0.5 text-[9px] text-white/40">/100</div>
            </motion.div>
          )}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        {GaugeIcon && <GaugeIcon className="h-3 w-3 text-white/40" strokeWidth={1.5} />}
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">{label}</p>
      </div>

      {confidence > 0 && (
        <div className="mt-1 flex items-center gap-1">
          <ModeIcon className="h-2.5 w-2.5 text-white/25" strokeWidth={1.5} />
          <span className="text-[8px] text-white/25">
            {dataMode === 'manual' ? 'Check-in' : dataMode === 'wearable' ? 'Device' : 'Blended'}
          </span>
        </div>
      )}
    </div>
  );
}
