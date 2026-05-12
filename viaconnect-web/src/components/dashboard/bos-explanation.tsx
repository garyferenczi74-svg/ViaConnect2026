'use client';

// BOSExplanation: Hannah's plain-language explanation panel.
//
// Per #162 §6.5: in-card panel, always visible, no avatar / chat-bubble
// framing. Text fades 200ms on change via Framer Motion AnimatePresence
// keyed on the explanation string. The text is already sanitized at the
// API boundary by sanitizeExplanation().

import { AnimatePresence, motion } from 'framer-motion';

export interface BOSExplanationProps {
  text: string;
}

export function BOSExplanation({ text }: BOSExplanationProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
        From Hannah
      </p>
      <AnimatePresence mode="wait">
        <motion.p
          key={text}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="mt-2 whitespace-pre-line text-sm leading-relaxed text-white/80"
        >
          {text}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
