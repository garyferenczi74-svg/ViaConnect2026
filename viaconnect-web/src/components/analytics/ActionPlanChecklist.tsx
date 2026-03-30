"use client";

import { useState } from "react";
import { Zap, Calendar, CalendarDays, Repeat, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ActionItem {
  action: string;
  rationale: string;
  category: string;
  expectedTimeframe: string;
  completed?: boolean;
}

interface ActionPlanChecklistProps {
  actionPlan: {
    immediate: ActionItem[];
    thisWeek: ActionItem[];
    thisMonth: ActionItem[];
    ongoing: ActionItem[];
  };
  onToggle?: (section: string, index: number) => void;
}

const SECTIONS: { key: string; label: string; icon: LucideIcon; accent: string }[] = [
  { key: "immediate", label: "Start Today", icon: Zap, accent: "#2DA5A0" },
  { key: "thisWeek", label: "This Week", icon: Calendar, accent: "#60A5FA" },
  { key: "thisMonth", label: "This Month", icon: CalendarDays, accent: "#A855F7" },
  { key: "ongoing", label: "Ongoing", icon: Repeat, accent: "#FBBF24" },
];

const CATEGORY_STYLES: Record<string, string> = {
  supplement: "bg-teal-400/10 text-teal-400",
  lifestyle: "bg-green-400/10 text-green-400",
  lab_work: "bg-blue-400/10 text-blue-400",
  practitioner: "bg-purple-400/10 text-purple-400",
};

function ActionChecklistItem({ item, accent, onToggle }: { item: ActionItem; accent: string; onToggle?: () => void }) {
  const [checked, setChecked] = useState(item.completed || false);

  const handleToggle = () => {
    setChecked(!checked);
    onToggle?.();
  };

  return (
    <div className="flex items-start gap-3 px-4 py-3 min-h-[44px]">
      <button
        onClick={handleToggle}
        className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border transition-all flex items-center justify-center ${
          checked ? "border-transparent" : "border-white/15 hover:border-white/25"
        }`}
        style={checked ? { backgroundColor: `${accent}33`, borderColor: `${accent}66` } : undefined}
      >
        {checked && <Check className="w-3 h-3" style={{ color: accent }} strokeWidth={2.5} />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-relaxed ${checked ? "text-white/30 line-through" : "text-white/70"}`}>
          {item.action}
        </p>
        <p className="text-xs text-white/25 mt-0.5">{item.rationale}</p>
        <div className="flex gap-2 mt-1.5">
          <span className={`text-[9px] px-2 py-0.5 rounded-full ${CATEGORY_STYLES[item.category] || "bg-orange-400/10 text-orange-400"}`}>
            {item.category.replace("_", " ")}
          </span>
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-white/20">
            {item.expectedTimeframe}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ActionPlanChecklist({ actionPlan, onToggle }: ActionPlanChecklistProps) {
  return (
    <div className="space-y-4">
      {SECTIONS.map(section => {
        const items = (actionPlan as Record<string, ActionItem[]>)[section.key] || [];
        if (items.length === 0) return null;
        const completed = items.filter(i => i.completed).length;

        return (
          <div key={section.key} className="rounded-xl bg-white/[0.02] border border-white/8 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <section.icon className="w-4 h-4" style={{ color: section.accent }} strokeWidth={1.5} />
                <span className="text-xs font-semibold text-white/60">{section.label}</span>
              </div>
              <span className="text-[10px] text-white/25">{completed}/{items.length}</span>
            </div>

            <div className="divide-y divide-white/[0.03]">
              {items.map((item, i) => (
                <ActionChecklistItem
                  key={i}
                  item={item}
                  accent={section.accent}
                  onToggle={onToggle ? () => onToggle(section.key, i) : undefined}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
