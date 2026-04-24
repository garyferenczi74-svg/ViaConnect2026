// Prompt #124 P4: Verdict badge with label + icon.
//
// Text label always accompanies the icon (WCAG AA; never color-only).

import {
  ShieldCheck,
  Ban,
  ShieldAlert,
  HelpCircle,
  Image as ImageIcon,
  FileImage,
  EyeOff,
  type LucideIcon,
} from 'lucide-react';

type Verdict =
  | 'authentic'
  | 'counterfeit_suspected'
  | 'unauthorized_channel_suspected'
  | 'inconclusive'
  | 'unrelated_product'
  | 'insufficient_image_quality'
  | 'content_safety_skip';

const CONFIG: Record<Verdict, { label: string; icon: LucideIcon; tone: string; bg: string; border: string; text: string }> = {
  authentic: {
    label: 'Authentic',
    icon: ShieldCheck,
    tone: 'green',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-400/30',
    text: 'text-emerald-300',
  },
  counterfeit_suspected: {
    label: 'Counterfeit suspected',
    icon: Ban,
    tone: 'red',
    bg: 'bg-red-500/15',
    border: 'border-red-400/40',
    text: 'text-red-300',
  },
  unauthorized_channel_suspected: {
    label: 'Unauthorized channel',
    icon: ShieldAlert,
    tone: 'amber',
    bg: 'bg-amber-500/15',
    border: 'border-amber-400/40',
    text: 'text-amber-200',
  },
  inconclusive: {
    label: 'Inconclusive',
    icon: HelpCircle,
    tone: 'slate',
    bg: 'bg-slate-500/15',
    border: 'border-slate-400/30',
    text: 'text-slate-200',
  },
  unrelated_product: {
    label: 'Unrelated product',
    icon: ImageIcon,
    tone: 'slate',
    bg: 'bg-slate-500/10',
    border: 'border-slate-400/20',
    text: 'text-slate-300',
  },
  insufficient_image_quality: {
    label: 'Image quality insufficient',
    icon: FileImage,
    tone: 'slate',
    bg: 'bg-slate-500/10',
    border: 'border-slate-400/20',
    text: 'text-slate-300',
  },
  content_safety_skip: {
    label: 'Content safety skip',
    icon: EyeOff,
    tone: 'purple',
    bg: 'bg-purple-500/15',
    border: 'border-purple-400/30',
    text: 'text-purple-200',
  },
};

export interface VerdictBadgeProps {
  verdict: Verdict;
  confidence?: number;
  compact?: boolean;
}

export default function VerdictBadge({ verdict, confidence, compact }: VerdictBadgeProps) {
  const c = CONFIG[verdict];
  const Icon = c.icon;
  const label = compact ? shortLabel(verdict) : c.label;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${c.border} ${c.bg} ${c.text} ${compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'} font-medium`}>
      <Icon className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} strokeWidth={1.5} aria-hidden />
      <span>{label}</span>
      {typeof confidence === 'number' ? (
        <span className="opacity-70 tabular-nums">· {confidence.toFixed(2)}</span>
      ) : null}
    </span>
  );
}

function shortLabel(verdict: Verdict): string {
  switch (verdict) {
    case 'authentic': return 'Authentic';
    case 'counterfeit_suspected': return 'Counterfeit';
    case 'unauthorized_channel_suspected': return 'Unauthorized';
    case 'inconclusive': return 'Inconclusive';
    case 'unrelated_product': return 'Unrelated';
    case 'insufficient_image_quality': return 'Low quality';
    case 'content_safety_skip': return 'Safety skip';
  }
}
