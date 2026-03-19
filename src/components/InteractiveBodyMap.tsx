"use client";

import { useState } from "react";
import { BodyZone } from "@/data/assessment";

interface InteractiveBodyMapProps {
  zones: BodyZone[];
}

const statusColors: Record<string, { border: string; bg: string; text: string; icon: string }> = {
  green: { border: "border-[#6bfb9a]", bg: "bg-[#6bfb9a]/20", text: "text-[#6bfb9a]", icon: "#6bfb9a" },
  yellow: { border: "border-[#ffb657]", bg: "bg-[#ffb657]/20", text: "text-[#ffb657]", icon: "#ffb657" },
  red: { border: "border-[#ffb4ab]", bg: "bg-[#ffb4ab]/20", text: "text-[#ffb4ab]", icon: "#ffb4ab" },
};

const statusLabel: Record<string, string> = { green: "Optimized", yellow: "Attention", red: "Critical" };

interface ZoneMarker {
  id: string;
  top: string;
  left: string;
  iconPath: string;
  hoverLabel: string;
  hoverDetail: string;
}

const zoneMarkers: ZoneMarker[] = [
  { id: "brain", top: "3%", left: "45%", iconPath: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z", hoverLabel: "Cerebral Load", hoverDetail: "Status: Optimized" },
  { id: "heart", top: "22%", left: "45%", iconPath: "M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z", hoverLabel: "Cardiovascular", hoverDetail: "HRV: 82ms (High)" },
  { id: "gi", top: "38%", left: "45%", iconPath: "M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.379a48.474 48.474 0 00-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M12.265 3.11a.375.375 0 11-.53 0L12 2.845l.265.265z", hoverLabel: "GI Tract", hoverDetail: "Dysbiosis Detected" },
  { id: "liver", top: "35%", left: "58%", iconPath: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z", hoverLabel: "Hepatic System", hoverDetail: "GGT: Elevated" },
  { id: "joints", top: "72%", left: "36%", iconPath: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z", hoverLabel: "Joint Inflammation", hoverDetail: "Zone: Left Meniscus" },
];

export default function InteractiveBodyMap({ zones }: InteractiveBodyMapProps) {
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const selectedZone = zones.find((z) => z.id === selectedZoneId) ?? null;

  return (
    <div className="glass-card p-8 rounded-3xl relative">
      <h3 className="text-[#dce2f7]/60 text-xs uppercase tracking-widest mb-6 font-medium">
        Interactive Body Map
      </h3>

      <div className="flex justify-center relative h-[450px]">
        {/* Body silhouette */}
        <svg className="h-full opacity-40" viewBox="0 0 200 500">
          <path
            d="M100 20 c -20 0 -20 40 0 40 c 20 0 20 -40 0 -40 M100 60 L100 250 M100 60 L60 180 M100 60 L140 180 M100 250 L80 450 M100 250 L120 450"
            fill="none"
            stroke="#dce2f7"
            strokeLinecap="round"
            strokeWidth="4"
          />
        </svg>

        {/* Clickable zone markers */}
        {zoneMarkers.map((marker) => {
          const zone = zones.find((z) => z.id === marker.id);
          if (!zone) return null;
          const colors = statusColors[zone.status];
          const isSelected = selectedZoneId === marker.id;

          return (
            <div
              key={marker.id}
              className="absolute group cursor-pointer"
              style={{ top: marker.top, left: marker.left }}
              onClick={() => setSelectedZoneId(isSelected ? null : marker.id)}
            >
              <div className={`w-8 h-8 rounded-full ${colors.bg} border-2 ${colors.border} flex items-center justify-center transition-all ${
                zone.status === "green" && !isSelected ? "animate-none" : ""
              } ${zone.status === "red" ? "animate-pulse" : ""} ${isSelected ? "scale-110 shadow-lg" : ""}`}
                style={isSelected ? { boxShadow: `0 0 0 3px #0c1322, 0 0 0 5px ${colors.icon}` } : {}}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke={colors.icon} strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={marker.iconPath} />
                </svg>
              </div>
              {/* Hover tooltip */}
              {!isSelected && (
                <div className="absolute hidden group-hover:block left-10 top-0 bg-[#2e3545] p-3 rounded-lg shadow-xl border border-[#3d4a3e]/20 z-10 w-40">
                  <div className={`text-[10px] font-bold ${colors.text} uppercase`}>{marker.hoverLabel}</div>
                  <div className="text-xs text-[#dce2f7] mt-1">{marker.hoverDetail}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected zone detail panel */}
      {selectedZone && (
        <div className="mt-6 p-5 rounded-2xl bg-[#141b2b] border border-[#3d4a3e]/10 animate-fadeIn">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-[#dce2f7]">{selectedZone.label}</h4>
              <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border mt-1 inline-block ${
                statusColors[selectedZone.status].bg
              } ${statusColors[selectedZone.status].text} ${statusColors[selectedZone.status].border}`}>
                {statusLabel[selectedZone.status]}
              </span>
            </div>
            <button
              onClick={() => setSelectedZoneId(null)}
              className="w-7 h-7 rounded-full hover:bg-[#2e3545] flex items-center justify-center text-[#dce2f7]/40 hover:text-[#dce2f7] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-xs text-[#dce2f7]/60 mb-4 leading-relaxed">{selectedZone.summary}</p>

          <div className="grid grid-cols-1 gap-3">
            {/* Clinical Findings */}
            <div>
              <h5 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6bfb9a] mb-2">Findings</h5>
              <div className="space-y-1">
                {selectedZone.details.slice(0, 3).map((d, i) => (
                  <div key={i} className="text-[11px] text-[#dce2f7]/50 font-mono flex gap-2">
                    <span className="text-[#6bfb9a]/40">›</span> {d}
                  </div>
                ))}
              </div>
            </div>

            {/* Protocols & Supplements inline */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {selectedZone.protocols.map((p, i) => (
                <span key={i} className="text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/15 px-2 py-1 rounded-full">
                  {p}
                </span>
              ))}
              {selectedZone.supplements.slice(0, 2).map((s, i) => (
                <span key={i} className="text-[10px] font-mono bg-[#0c1322]/60 text-[#dce2f7]/50 px-2 py-1 rounded-full">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .glass-card {
          background: rgba(46, 53, 69, 0.4);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(107, 251, 154, 0.15);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 250ms ease-out;
        }
      `}</style>
    </div>
  );
}
