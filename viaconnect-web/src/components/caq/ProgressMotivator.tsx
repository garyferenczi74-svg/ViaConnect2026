"use client";

import { motion } from "framer-motion";

const MOTIVATION_MESSAGES: Record<number, string> = {
  1: "Let's get to know you \u2014 this helps Ultrathink personalize everything.",
  2: "Great start. Ultrathink is already building your health map.",
  3: "Ultrathink is already spotting patterns from your answers.",
  4: "Your neurological picture is taking shape.",
  5: "Almost done with symptoms. The connections are getting clearer.",
  6: "This is where it gets powerful \u2014 your current regimen shapes your protocol.",
  7: "Last phase! Your complete Ultrathink analysis launches after this.",
};

interface ProgressMotivatorProps {
  currentPhase: number;
  totalPhases: number;
}

export function ProgressMotivator({ currentPhase, totalPhases }: ProgressMotivatorProps) {
  const percent = Math.round((currentPhase / totalPhases) * 100);

  return (
    <div className="mb-6">
      {/* Progress bar */}
      <div className="relative h-1.5 rounded-full bg-white/5 overflow-hidden mb-3">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-teal-400 to-teal-400/60"
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>

      {/* Phase label + percent */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/30">Phase {currentPhase} of {totalPhases}</p>
        <p className="text-xs text-teal-400/60 font-medium">{percent}% complete</p>
      </div>

      {/* Motivation message */}
      <motion.p
        key={currentPhase}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-xs text-white/25 mt-1.5 leading-relaxed"
      >
        {MOTIVATION_MESSAGES[currentPhase] || ""}
      </motion.p>
    </div>
  );
}
