"use client";

import { Users, Battery, Dna, Brain, Flame } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface PatternCircle {
  name: string;
  pattern: string;
  memberCount: number;
  description: string;
  icon: LucideIcon;
}

const CIRCLES: PatternCircle[] = [
  { name: "Adrenal Support Circle", pattern: "HPA Axis", memberCount: 247, description: "Supporting each other through adrenal recovery protocols", icon: Battery },
  { name: "Methylation Warriors", pattern: "Methylation", memberCount: 183, description: "MTHFR + COMT variant optimization strategies", icon: Dna },
  { name: "Brain Fog Breakers", pattern: "Neuroinflammation", memberCount: 156, description: "Cognitive clarity optimization and nootropic protocols", icon: Brain },
  { name: "Gut Reset Community", pattern: "Gut-Brain", memberCount: 201, description: "Microbiome restoration and gut barrier healing journeys", icon: Flame },
];

interface PatternCirclePreviewProps {
  userPatterns: string[];
}

export function PatternCirclePreview({ userPatterns }: PatternCirclePreviewProps) {
  const matchedCircles = CIRCLES.filter((c) =>
    userPatterns.some((p) => p.toLowerCase().includes(c.pattern.toLowerCase().split(" ")[0].toLowerCase()))
  );

  const displayCircles = matchedCircles.length > 0 ? matchedCircles : CIRCLES.slice(0, 2);

  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/8 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-teal-400/50" strokeWidth={1.5} />
        <h3 className="text-sm font-semibold text-white/50">Pattern Circles</h3>
        <span className="text-[9px] px-2 py-0.5 rounded-full bg-orange-400/10 text-orange-400/60 border border-orange-400/15 uppercase tracking-wider font-semibold">
          Coming Soon
        </span>
      </div>
      <p className="text-xs text-white/25 mb-4">
        Connect with others on similar optimization journeys. Moderated, private, supportive.
      </p>
      {displayCircles.map((circle) => (
        <div key={circle.name} className="flex items-center gap-3 py-2.5 border-t border-white/5 first:border-0">
          <circle.icon className="w-4 h-4 text-white/20" strokeWidth={1.5} />
          <div className="flex-1">
            <p className="text-xs text-white/40 font-medium">{circle.name}</p>
            <p className="text-[10px] text-white/20">{circle.memberCount} members</p>
          </div>
          <button disabled className="text-[10px] text-white/15 px-3 py-1 rounded-full border border-white/8 cursor-not-allowed">
            Notify Me
          </button>
        </div>
      ))}
    </div>
  );
}
