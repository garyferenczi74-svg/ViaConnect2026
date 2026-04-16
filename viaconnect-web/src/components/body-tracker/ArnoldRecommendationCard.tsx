'use client';

import { motion } from 'framer-motion';
import {
  Target,
  Lightbulb,
  Users,
  Pill,
  Flame,
  ShieldAlert,
  Dna,
  ArrowRight,
  Check,
  Eye,
  type LucideIcon,
} from 'lucide-react';

/* ── Category config ─────────────────────────────────── */
const CATEGORY_CONFIG: Record<
  string,
  { icon: LucideIcon; color: string; bg: string; border: string }
> = {
  milestone: { icon: Target,     color: '#2DA5A0', bg: 'rgba(45,165,160,0.15)',  border: 'rgba(45,165,160,0.30)' },
  pattern:   { icon: Lightbulb,  color: '#60A5FA', bg: 'rgba(96,165,250,0.15)',  border: 'rgba(96,165,250,0.30)' },
  cohort:    { icon: Users,      color: '#A78BFA', bg: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.30)' },
  supplement:{ icon: Pill,       color: '#B75E18', bg: 'rgba(183,94,24,0.15)',   border: 'rgba(183,94,24,0.30)' },
  streak:    { icon: Flame,      color: '#F59E0B', bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.30)' },
  recovery:  { icon: ShieldAlert,color: '#EF4444', bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.30)' },
  genetics:  { icon: Dna,        color: '#818CF8', bg: 'rgba(129,140,248,0.15)', border: 'rgba(129,140,248,0.30)' },
};

const PRIORITY_LABELS: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'High',   color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
  2: { label: 'Medium', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  3: { label: 'Low',    color: '#6B7280', bg: 'rgba(107,114,128,0.15)' },
};

/* ── Types ───────────────────────────────────────────── */
export interface ArnoldRecommendation {
  id: string;
  title: string;
  body: string;
  category: string;
  priority: number;
  suggestedAction?: string;
  supportingData?: unknown;
}

interface ArnoldRecommendationCardProps {
  recommendation: ArnoldRecommendation;
  onAction: (recId: string, action: 'view' | 'act' | 'dismiss') => void;
}

/* ── Component ───────────────────────────────────────── */
export function ArnoldRecommendationCard({
  recommendation,
  onAction,
}: ArnoldRecommendationCardProps) {
  const cat = CATEGORY_CONFIG[recommendation.category] ?? CATEGORY_CONFIG.pattern;
  const CatIcon = cat.icon;
  const pri = PRIORITY_LABELS[recommendation.priority] ?? PRIORITY_LABELS[3];

  const primaryLabel = recommendation.suggestedAction ?? 'View Details';
  const primaryAction: 'view' | 'act' =
    recommendation.suggestedAction ? 'act' : 'view';
  const PrimaryIcon = recommendation.suggestedAction ? ArrowRight : Eye;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="relative rounded-xl border border-white/[0.08] bg-white/5 p-4 backdrop-blur-md"
    >
      {/* Priority badge */}
      <span
        className="absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-semibold"
        style={{ color: pri.color, backgroundColor: pri.bg }}
      >
        {pri.label}
      </span>

      {/* Category icon + title */}
      <div className="flex items-start gap-3 pr-14">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: cat.bg, border: `1px solid ${cat.border}` }}
        >
          <CatIcon className="h-4 w-4" style={{ color: cat.color }} strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{recommendation.title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-white/60">
            {recommendation.body}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => onAction(recommendation.id, primaryAction)}
          className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg px-3 text-xs font-medium text-white transition-colors hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/50"
          style={{ backgroundColor: cat.color }}
        >
          <PrimaryIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
          {primaryLabel}
        </button>
        <button
          onClick={() => onAction(recommendation.id, 'dismiss')}
          className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 text-xs font-medium text-white/50 transition-colors hover:bg-white/[0.08] hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/50"
        >
          <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
          Got It
        </button>
      </div>
    </motion.div>
  );
}
