// Prompt #138c §3.4 + §4.3: single trust chip (Lucide icon + short text).
// Renders nothing if the icon name isn't recognized rather than crashing.

import {
  Stethoscope, ShieldCheck, Lock, Microscope,
  Award, Globe, FlaskConical, HeartPulse, Scale,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  'stethoscope': Stethoscope,
  'shield-check': ShieldCheck,
  'lock': Lock,
  'microscope': Microscope,
  'award': Award,
  'globe': Globe,
  'flask-conical': FlaskConical,
  'heart-pulse': HeartPulse,
  'scale': Scale,
};

export interface TrustChipProps {
  iconName: string;
  text: string;
}

export function TrustChip({ iconName, text }: TrustChipProps) {
  const Icon = ICONS[iconName];
  if (!Icon) return null;
  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 min-h-[44px]">
      <Icon className="h-4 w-4 text-[#2DA5A0] flex-none" strokeWidth={1.5} />
      <span className="text-xs sm:text-sm text-slate-200 leading-tight">{text}</span>
    </div>
  );
}
