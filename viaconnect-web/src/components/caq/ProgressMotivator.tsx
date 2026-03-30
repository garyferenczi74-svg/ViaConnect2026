"use client";

import { motion } from "framer-motion";
import { getDynamicProgressText } from "@/lib/caq/dynamic-progress-text";

interface PartialSymptomData {
  [key: string]: { score: number; description: string };
}

interface ProgressMotivatorProps {
  currentPhase: number;
  totalPhases: number;
  partialData?: {
    symptomsPhysical?: PartialSymptomData;
    symptomsNeurological?: PartialSymptomData;
    symptomsEmotional?: PartialSymptomData;
    medications?: Array<{ name: string }>;
    supplements?: Array<{ name: string }>;
  };
}

export function ProgressMotivator({ currentPhase, totalPhases, partialData }: ProgressMotivatorProps) {
  const percent = Math.round((currentPhase / totalPhases) * 100);
  const message = getDynamicProgressText(currentPhase, partialData || {});

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

      {/* Dynamic motivation message */}
      <motion.p
        key={`${currentPhase}-${message}`}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-xs text-white/25 mt-1.5 leading-relaxed"
      >
        {message}
      </motion.p>
    </div>
  );
}
