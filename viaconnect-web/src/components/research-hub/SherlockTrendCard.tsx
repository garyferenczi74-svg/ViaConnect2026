'use client';

// SherlockTrendCard — displayed when Sherlock detects a topic trending
// across multiple sources. Shows topic, source count, and relevance.

import { motion } from 'framer-motion';
import { TrendingUp, X } from 'lucide-react';
import type { SherlockTrend } from '@/lib/agents/sherlock/types';

interface SherlockTrendCardProps {
  trend: SherlockTrend;
  onView?: (trend: SherlockTrend) => void;
  onDismiss?: (trend: SherlockTrend) => void;
}

export function SherlockTrendCard({ trend, onView, onDismiss }: SherlockTrendCardProps) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="rounded-2xl border border-[#FBBF24]/30 bg-gradient-to-br from-[#FBBF24]/[0.08] to-[#1E3054] p-3.5 sm:p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#FBBF24]/30 bg-[#FBBF24]/15">
            <TrendingUp className="h-3.5 w-3.5 text-[#FBBF24]" strokeWidth={1.5} />
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#FBBF24]">
            Trending · Discovered by Sherlock
          </p>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={() => onDismiss(trend)}
            aria-label="Dismiss"
            className="text-white/30 hover:text-white/70"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        )}
      </div>

      <h3 className="mt-2 text-sm font-bold capitalize text-white">{trend.topic}</h3>
      <p className="mt-0.5 text-[11px] text-white/55">
        Mentioned across {trend.source_count} source{trend.source_count === 1 ? '' : 's'}
      </p>

      {onView && (
        <button
          type="button"
          onClick={() => onView(trend)}
          className="mt-3 inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-[#FBBF24]/30 bg-[#FBBF24]/10 px-3 py-1.5 text-[11px] font-medium text-[#FBBF24] hover:bg-[#FBBF24]/20"
        >
          View related research
        </button>
      )}
    </motion.article>
  );
}
