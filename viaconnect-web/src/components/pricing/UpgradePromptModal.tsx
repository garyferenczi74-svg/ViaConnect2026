'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, Lock, X } from 'lucide-react';
import type { TierId, TierLevel } from '@/types/pricing';
import { tierLevelToId } from '@/types/pricing';

interface UpgradePromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName: string;
  requiredTierLevel: TierLevel;
  currentTierLevel: TierLevel;
  reason?: string;
  onSelectUpgrade?: (tierId: TierId) => void;
}

const TIER_DISPLAY: Record<TierId, string> = {
  free: 'Free',
  gold: 'Gold',
  platinum: 'Platinum',
  platinum_family: 'Platinum+ Family',
};

export function UpgradePromptModal({
  open,
  onOpenChange,
  featureName,
  requiredTierLevel,
  currentTierLevel,
  reason,
  onSelectUpgrade,
}: UpgradePromptModalProps) {
  const requiredTierId = tierLevelToId(requiredTierLevel);
  const requiredTierName = TIER_DISPLAY[requiredTierId];
  const currentTierName = TIER_DISPLAY[tierLevelToId(currentTierLevel)];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                className="fixed left-1/2 top-1/2 z-[61] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/[0.08] bg-[#1A2744] shadow-2xl p-6"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8803A]/20 flex-none">
                      <Lock className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
                    </div>
                    <div>
                      <Dialog.Title className="text-lg font-semibold text-white">
                        Upgrade to {requiredTierName}
                      </Dialog.Title>
                      <Dialog.Description className="text-xs text-white/60 mt-0.5">
                        {featureName} requires {requiredTierName}; you are currently on {currentTierName}.
                      </Dialog.Description>
                    </div>
                  </div>
                  <Dialog.Close
                    aria-label="Close"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-white/55 hover:bg-white/[0.06] hover:text-white"
                  >
                    <X className="h-4 w-4" strokeWidth={1.5} />
                  </Dialog.Close>
                </div>

                {reason && (
                  <p className="text-sm text-white/70 leading-relaxed mb-5">{reason}</p>
                )}

                <div className="rounded-xl border border-[#2DA5A0]/25 bg-[#2DA5A0]/10 p-3.5 mb-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#2DA5A0] mb-1">
                    What you unlock
                  </p>
                  <p className="text-sm text-white/75 leading-snug">
                    {requiredTierName} includes this feature and every feature from lower tiers.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="w-full sm:w-auto rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-white/75 hover:bg-white/[0.08] min-h-[44px]"
                  >
                    Not now
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectUpgrade?.(requiredTierId)}
                    className="w-full sm:flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#2DA5A0] text-[#0B1520] px-4 py-2.5 text-sm font-semibold hover:bg-[#2DA5A0]/90 min-h-[44px]"
                  >
                    Upgrade to {requiredTierName}
                    <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
