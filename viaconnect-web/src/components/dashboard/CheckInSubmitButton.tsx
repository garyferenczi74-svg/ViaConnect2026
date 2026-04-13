'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';

interface CheckInSubmitButtonProps {
  isSubmitted: boolean;
  isLoading: boolean;
  onSubmit: () => void;
  label?: string;
}

export function CheckInSubmitButton({
  isSubmitted,
  isLoading,
  onSubmit,
  label = 'Save',
}: CheckInSubmitButtonProps) {
  return (
    <AnimatePresence mode="wait">
      {isSubmitted ? (
        <motion.div
          key="confirmed"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/15 px-4 py-2"
        >
          <Check className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />
          <span className="text-sm text-[#2DA5A0]">Saved for today</span>
        </motion.div>
      ) : (
        <motion.button
          key="submit"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={onSubmit}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2DA5A0] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#2DA5A0]/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
          ) : (
            <Check className="h-4 w-4" strokeWidth={1.5} />
          )}
          {isLoading ? 'Saving...' : label}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
