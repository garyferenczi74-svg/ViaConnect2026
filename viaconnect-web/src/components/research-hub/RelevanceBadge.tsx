'use client';

// RelevanceBadge — visual 0–100 score indicator with color-coded tiers.

import { motion } from 'framer-motion';

interface RelevanceBadgeProps {
  score: number;
  size?: 'sm' | 'md';
}

const tierFor = (score: number): { color: string; label: string; bg: string; border: string } => {
  if (score >= 90) return { color: '#22C55E', label: 'Highly Relevant', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.40)' };
  if (score >= 70) return { color: '#EAB308', label: 'Relevant',        bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.40)' };
  if (score >= 50) return { color: '#3B82F6', label: 'Interesting',     bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.40)' };
  return                  { color: 'rgba(255,255,255,0.45)', label: 'Low Match', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.10)' };
};

export function RelevanceBadge({ score, size = 'md' }: RelevanceBadgeProps) {
  const tier = tierFor(score);
  const isHigh = score >= 90;
  const sizeClasses = size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-[11px] px-2.5 py-1';

  return (
    <motion.span
      animate={isHigh ? { opacity: [1, 0.7, 1] } : {}}
      transition={isHigh ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : undefined}
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${sizeClasses}`}
      style={{
        background: tier.bg,
        borderColor: tier.border,
        color: tier.color,
      }}
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: tier.color }}
      />
      {score}% {tier.label}
    </motion.span>
  );
}
