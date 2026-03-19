"use client";

import {
  Heart,
  Shield,
  Moon,
  Bone,
  Apple,
  Brain,
  Flame,
  Pill,
  Sparkles,
  Plus,
} from "lucide-react";

const templates = [
  { name: "Cardiovascular", icon: Heart, supplements: 8, outcome: 87 },
  { name: "Immune", icon: Shield, supplements: 6, outcome: 72 },
  { name: "Sleep", icon: Moon, supplements: 5, outcome: 78 },
  { name: "Joint", icon: Bone, supplements: 7, outcome: 65 },
  { name: "GI", icon: Apple, supplements: 9, outcome: 68 },
  { name: "Cognitive", icon: Brain, supplements: 6, outcome: 74 },
  { name: "Metabolic", icon: Flame, supplements: 8, outcome: 64 },
  { name: "Hormonal", icon: Pill, supplements: 7, outcome: 71 },
  { name: "Detox", icon: Sparkles, supplements: 5, outcome: 69 },
];

interface TemplateSelectorProps {
  onSelect: (name: string) => void;
}

export default function TemplateSelector({ onSelect }: TemplateSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {templates.map((t) => {
        const Icon = t.icon;
        return (
          <button
            key={t.name}
            onClick={() => onSelect(t.name)}
            className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-5 text-left hover:bg-green-400/5 hover:border-green-400/30 transition-all duration-200 group"
          >
            <div className="w-10 h-10 rounded-lg bg-green-400/20 flex items-center justify-center mb-3 group-hover:bg-green-400/30 transition-colors">
              <Icon className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-2">{t.name}</h3>
            <div className="flex items-center gap-3 text-xs text-white/40">
              <span>{t.supplements} supplements</span>
              <span className="text-green-400 font-medium">
                {t.outcome}% avg outcome
              </span>
            </div>
          </button>
        );
      })}
      <button
        onClick={() => onSelect("blank")}
        className="border-2 border-dashed border-gray-600/50 rounded-xl p-5 flex flex-col items-center justify-center gap-2 hover:border-green-400/30 transition-all duration-200 min-h-[140px]"
      >
        <Plus className="w-6 h-6 text-white/30" />
        <span className="text-sm text-white/40 font-medium">Start Blank</span>
      </button>
    </div>
  );
}
