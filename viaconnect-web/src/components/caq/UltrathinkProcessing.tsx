"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BrainCircuit, GitBranch, Fingerprint, Sparkles, Dna } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ProcessingStep {
  icon: LucideIcon;
  text: string;
  delay: number;
}

const PROCESSING_STEPS: ProcessingStep[] = [
  { icon: BrainCircuit, text: "Absorbing your assessment data...", delay: 0 },
  { icon: GitBranch, text: "Cross-referencing 14 specialty lenses...", delay: 2500 },
  { icon: Fingerprint, text: "Identifying your master patterns...", delay: 5000 },
  { icon: Sparkles, text: "Generating your personalized blueprint...", delay: 7500 },
];

interface UltrathinkProcessingProps {
  onComplete: () => void;
  topSymptomAreas?: string[];
}

function generateTease(areas: string[]): string {
  if (areas.length === 0) return "Your complete Ultrathink analysis is ready in moments.";

  const area1 = areas[0]?.toLowerCase() || "stress";
  const area2 = areas[1]?.toLowerCase() || "energy";

  const teases: Record<string, string> = {
    fatigue: "adrenal and mitochondrial",
    energy: "adrenal and mitochondrial",
    stress: "HPA axis and cortisol",
    anxiety: "neurotransmitter and HPA axis",
    brain_fog: "methylation and neuroinflammation",
    sleep: "circadian rhythm and cortisol",
    digestive: "gut-brain axis and microbiome",
    pain: "inflammatory cascade and recovery",
    hormonal: "endocrine and metabolic",
    immune: "immune modulation and inflammatory",
  };

  const pattern = teases[area1] || teases[area2] || "multi-system optimization";
  return `We're seeing a possible ${pattern} pattern \, your full report is ready in moments.`;
}

export function UltrathinkProcessing({ onComplete, topSymptomAreas = [] }: UltrathinkProcessingProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = PROCESSING_STEPS.map((s, i) =>
      setTimeout(() => setStep(i), s.delay)
    );
    const completeTimer = setTimeout(onComplete, 10000);
    return () => { timers.forEach(clearTimeout); clearTimeout(completeTimer); };
  }, [onComplete]);

  const teaseText = generateTease(topSymptomAreas);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      {/* Animated helix */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      >
        <Dna className="w-16 h-16 text-teal-400/40" strokeWidth={1} />
      </motion.div>

      {/* Processing steps */}
      <div className="mt-8 space-y-3">
        {PROCESSING_STEPS.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: step >= i ? 1 : 0.2, x: 0 }}
            transition={{ delay: s.delay / 1000, duration: 0.5 }}
            className="flex items-center gap-3"
          >
            <s.icon
              className={`w-4 h-4 ${step >= i ? "text-teal-400" : "text-white/10"}`}
              strokeWidth={1.5}
            />
            <span className={`text-sm ${step >= i ? "text-white/60" : "text-white/15"}`}>
              {s.text}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Personalized tease */}
      {step >= 3 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-teal-400/70 mt-8 max-w-md leading-relaxed"
        >
          {teaseText}
        </motion.p>
      )}
    </div>
  );
}
