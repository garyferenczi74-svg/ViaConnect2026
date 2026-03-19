"use client";

import { Dna } from "lucide-react";

interface Variant {
  gene: string;
  variant: string;
  risk: "HIGH" | "MODERATE" | "LOW";
}

const variants: Variant[] = [
  { gene: "MTHFR", variant: "C677T", risk: "MODERATE" },
  { gene: "CYP2D6", variant: "*4/*41", risk: "HIGH" },
  { gene: "COMT", variant: "Val158Met", risk: "MODERATE" },
];

const riskStyles: Record<string, string> = {
  HIGH: "bg-red-400/20 text-red-400",
  MODERATE: "bg-yellow-400/20 text-yellow-400",
  LOW: "bg-green-400/20 text-green-400",
};

export default function GenomicSummary() {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-purple-400/20 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Dna className="w-5 h-5 text-purple-400" />
        <h3 className="text-lg font-semibold text-white">Genomic Summary</h3>
      </div>
      <div className="space-y-3">
        {variants.map((v) => (
          <div
            key={v.gene}
            className="flex items-center justify-between bg-gray-900/40 rounded-lg px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-white">{v.gene}</p>
              <p className="text-xs text-white/40">{v.variant}</p>
            </div>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${riskStyles[v.risk]}`}
            >
              {v.risk}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
