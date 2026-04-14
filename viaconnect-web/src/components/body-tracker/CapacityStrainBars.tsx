'use client';

import { motion } from 'framer-motion';
import { Flame, Zap } from 'lucide-react';

interface CapacityStrainBarsProps {
  capacity: number;
  strain: number;
  capacityBaseline?: number;
  strainBaseline?: number;
}

function ProgressBar({ value, gradient, baseline, label, icon }: {
  value: number; gradient: string; baseline?: number; label: string; icon: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-white/70">
          {icon}
          {label}
        </div>
        <span className="text-sm font-bold text-white">{value}</span>
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-white/10">
        <motion.div
          className={`h-full rounded-full ${gradient}`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
        />
        {baseline != null && (
          <div
            className="absolute top-0 h-full w-0.5 bg-white/60"
            style={{ left: `${baseline}%` }}
          />
        )}
      </div>
      <div className="flex justify-between text-[10px] text-white/35">
        <span>0</span>
        {baseline != null && <span style={{ marginLeft: `${baseline - 5}%` }}>Baseline</span>}
        <span>100</span>
      </div>
    </div>
  );
}

export function CapacityStrainBars({ capacity, strain, capacityBaseline, strainBaseline }: CapacityStrainBarsProps) {
  const strainGradient =
    strain < 30 ? 'bg-gradient-to-r from-green-500 to-yellow-400' :
    strain < 60 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
    'bg-gradient-to-r from-orange-500 to-red-500';

  return (
    <div className="space-y-6 rounded-2xl border border-white/[0.08] bg-[#1E3054]/75 p-5 backdrop-blur-sm">
      <ProgressBar
        value={capacity}
        gradient="bg-gradient-to-r from-blue-600 via-blue-400 to-cyan-400"
        baseline={capacityBaseline}
        label="Metabolic Capacity"
        icon={<Zap className="h-4 w-4 text-cyan-400" strokeWidth={1.5} />}
      />
      <ProgressBar
        value={strain}
        gradient={strainGradient}
        baseline={strainBaseline}
        label="Strain"
        icon={<Flame className="h-4 w-4 text-orange-400" strokeWidth={1.5} />}
      />
    </div>
  );
}
