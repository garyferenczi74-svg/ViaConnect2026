"use client";

import { useState } from "react";
import { BodyZone } from "@/data/assessment";

interface InteractiveBodyMapProps {
  zones: BodyZone[];
}

const statusColors = {
  green: { fill: "rgba(74, 222, 128, 0.25)", stroke: "#4ade80", hover: "rgba(74, 222, 128, 0.4)" },
  yellow: { fill: "rgba(250, 204, 21, 0.2)", stroke: "#facc15", hover: "rgba(250, 204, 21, 0.35)" },
  red: { fill: "rgba(248, 113, 113, 0.25)", stroke: "#f87171", hover: "rgba(248, 113, 113, 0.4)" },
};

const statusLabel = { green: "Optimal", yellow: "Attention", red: "Priority" };
const statusBadge = {
  green: "bg-[#4ade80]/10 text-[#4ade80] border-[#4ade80]/20",
  yellow: "bg-yellow-400/10 text-yellow-400 border-yellow-400/20",
  red: "bg-red-400/10 text-red-400 border-red-400/20",
};

export default function InteractiveBodyMap({ zones }: InteractiveBodyMapProps) {
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<BodyZone | null>(null);

  return (
    <div className="flex gap-6">
      {/* Body Map */}
      <div
        className="rounded-2xl border border-[#3d4a3e]/15 p-6 flex-shrink-0"
        style={{ background: "rgba(46, 53, 69, 0.4)", backdropFilter: "blur(20px)" }}
      >
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#4ade80] mb-1">
          Somatic Assessment Map
        </h3>
        <p className="text-[10px] text-[#bccabb]/60 font-mono uppercase tracking-widest mb-6">
          Click zone for clinical detail
        </p>

        <div className="relative mx-auto" style={{ width: 300, height: 500 }}>
          <svg
            viewBox="0 0 350 520"
            width={300}
            height={500}
            className="mx-auto"
          >
            {/* Body silhouette background */}
            <defs>
              <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#2e3545" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#2e3545" stopOpacity="0.2" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Body outline */}
            <path
              d="M175,10 C195,10 210,25 210,45 C210,65 200,80 190,88
                 C210,92 230,100 240,115 C250,130 245,155 235,160
                 L245,180 C250,195 252,215 250,235 L248,260 C246,275 240,280 235,278
                 L225,270 C220,268 218,265 218,260
                 L220,240 C222,225 220,210 215,195
                 C212,200 210,215 210,235 C210,260 215,290 215,310
                 C215,330 218,350 220,365 C222,380 225,395 228,410
                 C230,425 232,440 230,455 C228,470 220,480 210,485
                 C200,490 192,488 188,480 L185,470 C182,460 180,445 178,430
                 L175,410 L172,430 C170,445 168,460 165,470
                 L162,480 C158,488 150,490 140,485
                 C130,480 122,470 120,455 C118,440 120,425 122,410
                 C125,395 128,380 130,365 C132,350 135,330 135,310
                 C135,290 140,260 140,235 C140,215 138,200 135,195
                 C130,210 128,225 130,240 L132,260
                 C132,265 130,268 125,270 L115,278
                 C110,280 104,275 102,260 L100,235
                 C98,215 100,195 105,180 L115,160
                 C105,155 100,130 110,115 C120,100 140,92 160,88
                 C150,80 140,65 140,45 C140,25 155,10 175,10 Z"
              fill="url(#bodyGradient)"
              stroke="#3d4a3e"
              strokeWidth="1.5"
            />

            {/* Clickable Zones */}
            {zones.map((zone) => {
              const colors = statusColors[zone.status];
              const isHovered = hoveredZone === zone.id;
              const isSelected = selectedZone?.id === zone.id;

              return (
                <g key={zone.id}>
                  <path
                    d={zone.path}
                    fill={isHovered || isSelected ? colors.hover : colors.fill}
                    stroke={colors.stroke}
                    strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 1.5}
                    className="cursor-pointer transition-all duration-200"
                    style={{ filter: isHovered || isSelected ? "url(#glow)" : "none" }}
                    onMouseEnter={() => setHoveredZone(zone.id)}
                    onMouseLeave={() => setHoveredZone(null)}
                    onClick={() => setSelectedZone(selectedZone?.id === zone.id ? null : zone)}
                  />
                  {/* Pulse for red zones */}
                  {zone.status === "red" && (
                    <circle
                      cx={getZoneCenter(zone.path).x}
                      cy={getZoneCenter(zone.path).y}
                      r="6"
                      fill="none"
                      stroke="#f87171"
                      strokeWidth="1.5"
                      opacity="0.6"
                    >
                      <animate attributeName="r" from="4" to="12" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Hover Tooltip */}
          {hoveredZone && !selectedZone && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#0c1322] border border-[#3d4a3e]/30 rounded-xl px-4 py-2 shadow-xl pointer-events-none whitespace-nowrap">
              <p className="text-xs font-bold text-[#dce2f7]">
                {zones.find((z) => z.id === hoveredZone)?.label}
              </p>
              <p className="text-[10px] text-[#bccabb]/60">
                Status: {statusLabel[zones.find((z) => z.id === hoveredZone)?.status || "green"]}
              </p>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-6 mt-4">
          {(["green", "yellow", "red"] as const).map((status) => (
            <div key={status} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: statusColors[status].stroke }}
              />
              <span className="text-[10px] text-[#bccabb]/60 font-mono uppercase tracking-widest">
                {statusLabel[status]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Zone Detail Panel */}
      {selectedZone ? (
        <div
          className="rounded-2xl border border-[#3d4a3e]/15 p-6 flex-1 min-w-0 animate-fadeIn"
          style={{ background: "rgba(46, 53, 69, 0.4)", backdropFilter: "blur(20px)" }}
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-[#dce2f7]">{selectedZone.label}</h3>
              <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${statusBadge[selectedZone.status]}`}>
                {statusLabel[selectedZone.status]}
              </span>
            </div>
            <button
              onClick={() => setSelectedZone(null)}
              className="w-8 h-8 rounded-full hover:bg-[#2e3545] flex items-center justify-center text-[#bccabb]/40 hover:text-[#dce2f7] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-sm text-[#bccabb] mb-6 leading-relaxed">{selectedZone.summary}</p>

          {/* Clinical Details */}
          <section className="mb-6">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4ade80] mb-3">
              Clinical Findings
            </h4>
            <div className="space-y-2">
              {selectedZone.details.map((detail, i) => (
                <div key={i} className="flex gap-2 text-xs text-[#bccabb]">
                  <span className="text-[#4ade80]/40 mt-0.5 shrink-0">›</span>
                  <span className="font-mono">{detail}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Linked Protocols */}
          <section className="mb-6">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400 mb-3">
              Linked Protocols
            </h4>
            <div className="space-y-2">
              {selectedZone.protocols.map((protocol, i) => (
                <div
                  key={i}
                  className="bg-purple-500/5 border border-purple-500/15 rounded-lg px-3 py-2 text-xs text-purple-300 flex items-center gap-2 cursor-pointer hover:border-purple-500/30 transition-colors"
                >
                  <svg className="w-3.5 h-3.5 text-purple-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                  {protocol}
                </div>
              ))}
            </div>
          </section>

          {/* Supplements */}
          <section>
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4ade80] mb-3">
              Current Supplements
            </h4>
            <div className="space-y-2">
              {selectedZone.supplements.map((supp, i) => (
                <div
                  key={i}
                  className="bg-[#0c1322]/60 rounded-lg px-3 py-2 text-xs text-[#bccabb] font-mono flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] shrink-0" />
                  {supp}
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div
          className="rounded-2xl border border-[#3d4a3e]/15 border-dashed p-6 flex-1 min-w-0 flex flex-col items-center justify-center text-center"
          style={{ background: "rgba(46, 53, 69, 0.15)" }}
        >
          <svg className="w-10 h-10 text-[#3d4a3e] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
          </svg>
          <p className="text-sm font-bold text-[#bccabb]/40">Select a body zone</p>
          <p className="text-xs text-[#bccabb]/25 mt-1">Click any highlighted region on the body map</p>
        </div>
      )}

      <style jsx>{`
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

function getZoneCenter(path: string): { x: number; y: number } {
  const coords: { x: number; y: number }[] = [];
  const regex = /(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)/g;
  let match;
  while ((match = regex.exec(path)) !== null) {
    coords.push({ x: parseFloat(match[1]), y: parseFloat(match[2]) });
  }
  if (coords.length === 0) return { x: 175, y: 250 };
  const avgX = coords.reduce((s, c) => s + c.x, 0) / coords.length;
  const avgY = coords.reduce((s, c) => s + c.y, 0) / coords.length;
  return { x: avgX, y: avgY };
}
