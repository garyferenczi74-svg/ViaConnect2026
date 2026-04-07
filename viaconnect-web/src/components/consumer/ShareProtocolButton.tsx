"use client";

// ShareProtocolButton — small entry-point button that opens the
// ShareProtocolModal. Drop into any consumer page header where sharing
// makes sense (Protocol, Genetics, Dashboard, Account Settings, etc.).
//
// The actual multi-step share flow lives in ShareProtocolModal.tsx.

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Share2 } from "lucide-react";
import { ShareProtocolModal } from "./ShareProtocolModal";

interface ShareProtocolButtonProps {
  /** Optional override; defaults to "Share My Protocol" */
  label?: string;
  /** Compact pill rendering for tight headers */
  compact?: boolean;
  /** Optional className passthrough */
  className?: string;
}

export function ShareProtocolButton({
  label = "Share My Protocol",
  compact = false,
  className = "",
}: ShareProtocolButtonProps) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        whileHover={reduce ? undefined : { scale: 1.02 }}
        whileTap={reduce ? undefined : { scale: 0.97 }}
        aria-label={label}
        className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-white transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] bg-[#2DA5A0] hover:bg-[#2DA5A0]/85 shadow-lg shadow-[#2DA5A0]/20 ${
          compact ? "px-3 py-1.5 text-xs min-h-[32px]" : "px-4 py-2.5 text-sm min-h-[40px]"
        } ${className}`}
      >
        <Share2 className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} strokeWidth={1.5} />
        {label}
      </motion.button>
      <ShareProtocolModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
