'use client';

// HelixRewardToast — translucent slide-in toast that fires when a
// Helix Rewards score event awards points. Auto-dismisses after 4s.
// Prompt #62d.

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, type LucideIcon } from 'lucide-react';

interface HelixRewardToastProps {
  icon?: LucideIcon;
  title: string;
  basePoints: number;
  tierMultiplier: number;
  onDismiss: () => void;
}

export function HelixRewardToast({
  icon: Icon = Sparkles,
  title,
  basePoints,
  tierMultiplier,
  onDismiss,
}: HelixRewardToastProps) {
  const multipliedPoints = Math.round(basePoints * tierMultiplier);

  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24, scale: 0.98 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="fixed bottom-6 left-1/2 z-50 w-[min(360px,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-white/10 bg-[#1E3054]/80 backdrop-blur-md p-4 shadow-2xl"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/15">
          <Icon className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{title}</p>
          <p className="mt-0.5 text-xs text-white/55">
            +{basePoints} Helix Points
            {tierMultiplier > 1 && (
              <span className="text-[#2DA5A0]"> · {tierMultiplier}× tier = +{multipliedPoints}</span>
            )}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
