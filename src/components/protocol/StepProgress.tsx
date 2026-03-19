"use client";

import { Check } from "lucide-react";

const steps = [
  "Template",
  "Indication",
  "Supplements",
  "Dosage",
  "Interactions",
  "Notes",
  "Monitoring",
  "Save",
];

interface StepProgressProps {
  current: number;
}

export default function StepProgress({ current }: StepProgressProps) {
  return (
    <div className="flex items-center justify-between w-full">
      {steps.map((label, i) => {
        const completed = i < current;
        const active = i === current;
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                  completed
                    ? "bg-green-400 text-gray-900"
                    : active
                    ? "border-2 border-green-400 text-green-400 animate-pulse"
                    : "bg-gray-700 text-white/40"
                }`}
              >
                {completed ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={`text-[10px] font-medium whitespace-nowrap ${
                  completed || active ? "text-green-400" : "text-white/30"
                }`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-px mx-2 mt-[-18px] ${
                  completed ? "bg-green-400" : "bg-gray-700"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
