"use client";

import { Herb } from "@/data/herbs";

interface HerbCardProps {
  herb: Herb;
  onClick: () => void;
}

export default function HerbCard({ herb, onClick }: HerbCardProps) {
  const totalCautions = herb.contraindications.length;
  const isSevere = totalCautions >= 3;
  const hasWarnings = totalCautions > 0;

  return (
    <div
      onClick={onClick}
      className="group relative p-6 rounded-3xl border border-[#3d4a3e]/15 hover:border-[#4ade80]/30 transition-all duration-300 cursor-pointer overflow-hidden"
      style={{ background: "rgba(46, 53, 69, 0.4)", backdropFilter: "blur(20px)" }}
    >
      {/* FarmCeutica Match Badge */}
      {herb.farmceuticaMatch && (
        <div className="absolute top-0 right-0 p-4">
          <span className="text-[10px] font-mono bg-[#4ade80]/10 text-[#4ade80] px-2 py-1 rounded border border-[#4ade80]/20">
            In {herb.farmceuticaMatch}
          </span>
        </div>
      )}

      {/* Name */}
      <div className="mb-4">
        <h3 className="text-xl font-bold text-[#dce2f7] group-hover:text-[#4ade80] transition-colors">
          {herb.commonName}
        </h3>
        <p className="text-sm italic text-[#4ade80]/70">{herb.latinName}</p>
      </div>

      {/* Action Pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {herb.actions.map((action) => (
          <span
            key={action}
            className="text-[10px] uppercase font-bold tracking-tight bg-[#2e3545] px-2 py-1 rounded-full text-[#bccabb]"
          >
            {action}
          </span>
        ))}
      </div>

      {/* Energetics & Safety */}
      <div className="space-y-3 mb-6">
        <div className="flex justify-between items-center text-xs">
          <span className="text-[#bccabb]/60 font-mono uppercase tracking-widest">Energetics</span>
          <span className="text-[#dce2f7]">{herb.energetics.replace("•", "/")}</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-[#bccabb]/60 font-mono uppercase tracking-widest">Safety</span>
          {isSevere ? (
            <span className="bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full font-bold text-[11px]">
              {totalCautions}+ contraindications
            </span>
          ) : hasWarnings ? (
            <span className="bg-yellow-500/15 text-yellow-400 px-2 py-0.5 rounded-full font-bold text-[11px]">
              {totalCautions} caution{totalCautions > 1 ? "s" : ""}
            </span>
          ) : (
            <span className="bg-[#4ade80]/10 text-[#4ade80] px-2 py-0.5 rounded-full font-bold text-[11px]">
              Safe
            </span>
          )}
        </div>
      </div>

      {/* View Monograph Button */}
      <button className="w-full bg-[#2e3545] py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 group-hover:bg-[#4ade80] group-hover:text-[#003919] transition-all active:scale-95">
        View Monograph
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      </button>
    </div>
  );
}
