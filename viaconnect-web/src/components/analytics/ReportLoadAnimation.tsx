"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface ReportLoadAnimationProps {
  onComplete: () => void;
}

export function ReportLoadAnimation({ onComplete }: ReportLoadAnimationProps) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ delay: 1.5, duration: 0.5 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0F1520]/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        <div className="relative">
          <motion.div
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="absolute -inset-8 rounded-full bg-teal-400/10 blur-2xl"
          />
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-400/20 to-orange-400/10 border border-teal-400/20 flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-teal-400" strokeWidth={1} />
          </div>
        </div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-8 text-sm text-white/50 font-medium"
      >
        Your blueprint is ready
      </motion.p>
    </motion.div>
  );
}
