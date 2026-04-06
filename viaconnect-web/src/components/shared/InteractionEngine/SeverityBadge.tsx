'use client';

import { ShieldAlert, AlertTriangle, Info, CheckCircle, Sparkles } from 'lucide-react';

export type Severity = 'major' | 'moderate' | 'minor' | 'synergistic';

const CONFIG: Record<Severity, { label: string; bg: string; text: string; border: string; Icon: React.ElementType }> = {
  major:       { label: 'Major',       bg: 'rgba(239,68,68,0.15)',  text: '#F87171', border: 'rgba(239,68,68,0.30)',  Icon: ShieldAlert },
  moderate:    { label: 'Moderate',    bg: 'rgba(245,158,11,0.15)', text: '#F59E0B', border: 'rgba(245,158,11,0.30)', Icon: AlertTriangle },
  minor:       { label: 'Minor',       bg: 'rgba(45,165,160,0.15)', text: '#2DA5A0', border: 'rgba(45,165,160,0.30)', Icon: Info },
  synergistic: { label: 'Synergistic', bg: 'rgba(139,92,246,0.15)', text: '#A78BFA', border: 'rgba(139,92,246,0.30)', Icon: Sparkles },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const c = CONFIG[severity] ?? CONFIG.minor;
  const { Icon } = c;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
    >
      <Icon className="w-3 h-3" strokeWidth={1.5} />
      {c.label}
    </span>
  );
}

export function SeverityDot({ severity }: { severity: Severity }) {
  const c = CONFIG[severity];
  return <div className="w-2 h-2 rounded-full shrink-0" style={{ background: c?.text ?? '#2DA5A0' }} />;
}

export function EvidenceBadge({ level }: { level: string }) {
  const color = level === 'strong' ? '#2DA5A0' : level === 'moderate' ? '#F59E0B' : '#A78BFA';
  return (
    <span className="text-xs font-medium" style={{ color }}>
      Evidence: {level}
    </span>
  );
}
