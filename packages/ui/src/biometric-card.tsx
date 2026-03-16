import React from 'react';

export interface BiometricCardProps {
  label: string;
  value: string;
  marker?: string;
  color?: 'cyan' | 'emerald' | 'amber' | 'violet';
  className?: string;
}

const colorClasses: Record<NonNullable<BiometricCardProps['color']>, string> = {
  cyan: 'text-[#05bed6]',
  emerald: 'text-[#10b981]',
  amber: 'text-[#f59e0b]',
  violet: 'text-[#8b5cf6]',
};

export function BiometricCard({
  label,
  value,
  marker,
  color = 'cyan',
  className = '',
}: BiometricCardProps) {
  return (
    <div className={`p-3 bg-white/5 rounded-lg border border-white/5 ${className}`}>
      <p className="text-[10px] text-slate-400 uppercase">{label}</p>
      <p className={`font-mono text-lg ${colorClasses[color]}`}>
        {value}
        {marker && <span className="text-[10px] opacity-50 ml-1">{marker}</span>}
      </p>
    </div>
  );
}
