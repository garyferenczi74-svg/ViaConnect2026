"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Brain, Heart, Flame, Shield, Zap, Bone, Droplets, AlertTriangle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface SystemData {
  status: string;
  findings: string;
  flags?: string[];
}

interface BodySystemMapProps {
  systems: Record<string, SystemData>;
}

const SYSTEM_CONFIG: { id: string; label: string; icon: LucideIcon; color: string }[] = [
  { id: "neurological", label: "Neurological", icon: Brain, color: "#A855F7" },
  { id: "endocrine", label: "Endocrine", icon: Zap, color: "#FBBF24" },
  { id: "cardiovascular", label: "Cardiovascular", icon: Heart, color: "#EF4444" },
  { id: "immune", label: "Immune", icon: Shield, color: "#2DA5A0" },
  { id: "digestive", label: "Digestive", icon: Flame, color: "#F97316" },
  { id: "metabolic", label: "Metabolic", icon: Activity, color: "#34D399" },
  { id: "musculoskeletal", label: "Musculoskeletal", icon: Bone, color: "#60A5FA" },
  { id: "mental_emotional", label: "Mental/Emotional", icon: Droplets, color: "#EC4899" },
];

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  optimal: { bg: "bg-teal-400/10", text: "text-teal-400", border: "border-teal-400/20" },
  suboptimal: { bg: "bg-yellow-400/10", text: "text-yellow-400", border: "border-yellow-400/20" },
  compromised: { bg: "bg-red-400/10", text: "text-red-400", border: "border-red-400/20" },
};

export function BodySystemMap({ systems }: BodySystemMapProps) {
  const [activeSystem, setActiveSystem] = useState<string | null>(null);

  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/8 p-5 md:p-6">
      <h3 className="text-base font-semibold text-white mb-4">Body Systems Overview</h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {SYSTEM_CONFIG.map(sys => {
          const data = systems[sys.id];
          const status = data?.status || "not_assessed";
          const styles = STATUS_STYLES[status] || { bg: "bg-white/5", text: "text-white/30", border: "border-white/5" };
          const isActive = activeSystem === sys.id;

          return (
            <button
              key={sys.id}
              onClick={() => setActiveSystem(isActive ? null : sys.id)}
              className={`rounded-xl p-3 text-center transition-all min-h-[44px] ${
                isActive
                  ? `${styles.bg} border ${styles.border}`
                  : "bg-white/[0.02] border border-white/5 hover:border-white/10"
              }`}
            >
              <sys.icon
                className="w-5 h-5 mx-auto mb-1.5"
                style={{ color: `${sys.color}99` }}
                strokeWidth={1.5}
              />
              <p className="text-[10px] font-medium text-white/50">{sys.label}</p>
              <p className={`text-[9px] capitalize mt-0.5 ${styles.text}`}>
                {status.replace("_", " ")}
              </p>
            </button>
          );
        })}
      </div>

      {/* Expanded system detail */}
      <AnimatePresence>
        {activeSystem && systems[activeSystem] && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden mt-4 pt-4 border-t border-white/5"
          >
            <p className="text-sm text-white/50 leading-relaxed">{systems[activeSystem].findings}</p>
            {systems[activeSystem].flags?.map((flag, i) => (
              <div key={i} className="flex items-center gap-2 mt-2">
                <AlertTriangle className="w-3 h-3 text-amber-400/60 flex-shrink-0" strokeWidth={1.5} />
                <span className="text-xs text-amber-400/50">{flag}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
