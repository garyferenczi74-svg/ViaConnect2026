'use client';

import { ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react';

interface ConfidenceBadgeProps {
  confidence: number;
  critiquePassed: boolean;
}

export function ConfidenceBadge({ confidence, critiquePassed }: ConfidenceBadgeProps) {
  const level =
    confidence >= 0.8 ? 'high' : confidence >= 0.5 ? 'moderate' : 'low';

  const config = {
    high: {
      icon: ShieldCheck,
      label: 'High confidence',
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/10 border-emerald-400/20',
    },
    moderate: {
      icon: ShieldQuestion,
      label: 'Moderate confidence',
      color: 'text-amber-400',
      bg: 'bg-amber-400/10 border-amber-400/20',
    },
    low: {
      icon: ShieldAlert,
      label: 'Low confidence',
      color: 'text-red-400',
      bg: 'bg-red-400/10 border-red-400/20',
    },
  }[level];

  const Icon = config.icon;

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 ${config.bg}`}
    >
      <Icon className={`h-3 w-3 ${config.color}`} strokeWidth={1.5} />
      <span className={`text-[10px] font-medium ${config.color}`}>
        {config.label}
        {!critiquePassed && ' (review flagged)'}
      </span>
    </div>
  );
}
