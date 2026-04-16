'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Brain } from 'lucide-react';

interface ThinkingIndicatorProps {
  visible: boolean;
}

export function ThinkingIndicator({ visible }: ThinkingIndicatorProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="flex items-center gap-3 rounded-2xl border border-[#2DA5A0]/20 bg-[#1E3054]/80 px-4 py-3 backdrop-blur-md"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2DA5A0]/15">
            <Brain className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white/80">Hannah is thinking deeply...</p>
            <p className="text-[11px] text-white/40">
              Analyzing multiple factors for a thorough answer
            </p>
          </div>
          <div className="flex gap-1 motion-reduce:hidden">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-[#2DA5A0]"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
