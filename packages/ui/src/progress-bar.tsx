import React from 'react';

export type ProgressGradient = 'cyan-emerald' | 'cyan-violet' | 'emerald' | 'amber' | 'violet';

export interface ProgressBarProps {
  label: string;
  value: number;
  gradient?: ProgressGradient;
  glow?: boolean;
  className?: string;
}

const gradientClasses: Record<ProgressGradient, string> = {
  'cyan-emerald': 'bg-gradient-to-r from-[#05bed6] to-[#10b981]',
  'cyan-violet': 'bg-gradient-to-r from-[#05bed6] to-[#8b5cf6]',
  emerald: 'bg-[#10b981]',
  amber: 'bg-[#f59e0b]',
  violet: 'bg-[#8b5cf6]',
};

const glowClasses: Record<ProgressGradient, string> = {
  'cyan-emerald': 'shadow-[0_0_15px_rgba(6,182,212,0.3)]',
  'cyan-violet': 'shadow-[0_0_15px_rgba(139,92,246,0.3)]',
  emerald: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]',
  amber: 'shadow-[0_0_15px_rgba(245,158,11,0.3)]',
  violet: 'shadow-[0_0_15px_rgba(139,92,246,0.3)]',
};

export function ProgressBar({
  label,
  value,
  gradient = 'cyan-emerald',
  glow = true,
  className = '',
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between items-end">
        <span className="text-xs font-semibold text-slate-300">{label}</span>
        <span className="font-mono text-[#05bed6] text-sm">{clamped.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${gradientClasses[gradient]} ${glow ? glowClasses[gradient] : ''}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
