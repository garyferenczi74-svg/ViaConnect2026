"use client";

import { motion } from "framer-motion";
import { BrainCircuit } from "lucide-react";

interface DescriptionQualityIndicatorProps {
  hasText: boolean;
}

export function DescriptionQualityIndicator({ hasText }: DescriptionQualityIndicatorProps) {
  if (!hasText) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-1.5 mt-2"
    >
      <motion.div
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <BrainCircuit className="w-3.5 h-3.5 text-teal-400/60" strokeWidth={1.5} />
      </motion.div>
      <span className="text-[10px] text-teal-400/40 font-medium">
        Ultrathink is absorbing your insight
      </span>
    </motion.div>
  );
}
