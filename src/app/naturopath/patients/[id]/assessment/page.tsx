"use client";

import { useState } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import { X } from "lucide-react";

/* ───────── Data ───────── */

const constitutionData = [
  { dim: "Vata", value: 82 },
  { dim: "Pitta", value: 68 },
  { dim: "Kapha", value: 35 },
  { dim: "Structural", value: 55 },
  { dim: "Functional", value: 72 },
  { dim: "Mental", value: 78 },
];

interface VitalDim {
  label: string;
  score: number;
}

const vitalDimensions: VitalDim[] = [
  { label: "Energy", score: 7 },
  { label: "Sleep", score: 4 },
  { label: "Digestion", score: 7 },
  { label: "Immunity", score: 6 },
  { label: "Cognition", score: 7 },
  { label: "Mood", score: 5 },
  { label: "Pain", score: 3 },
  { label: "Skin/Hair", score: 6 },
  { label: "Hormonal", score: 5 },
  { label: "Cardiovascular", score: 8 },
];

const overallScore = 58;

interface BodyZone {
  id: string;
  label: string;
  color: "green" | "yellow" | "red";
  details: string;
  x: number;
  y: number;
  r: number;
}

const bodyZones: BodyZone[] = [
  { id: "brain", label: "Brain / CNS", color: "green", details: "Cognitive function stable. COMT variant managed with SAMe support. No neurological concerns.", x: 150, y: 45, r: 22 },
  { id: "heart", label: "Cardiovascular", color: "green", details: "BP 118/76, resting HR 68. Lipid panel within range. CoQ10 protocol ongoing.", x: 140, y: 130, r: 18 },
  { id: "gi", label: "GI / Digestive", color: "yellow", details: "Intermittent bloating. SIBO breath test pending. GI Restore protocol in progress — Day 28 of 60.", x: 150, y: 195, r: 22 },
  { id: "joints", label: "Musculoskeletal", color: "red", details: "Bilateral knee pain, morning stiffness >30min. hsCRP elevated at 4.1 mg/L. Joint inflammation protocol recommended.", x: 110, y: 310, r: 16 },
  { id: "liver", label: "Hepatic", color: "yellow", details: "ALT mildly elevated (42 U/L). CYP2D6 intermediate metabolizer — dose adjustments active. Milk thistle ongoing.", x: 170, y: 170, r: 16 },
];

const zoneColors: Record<string, { fill: string; stroke: string }> = {
  green: { fill: "rgba(74,222,128,0.25)", stroke: "#4ade80" },
  yellow: { fill: "rgba(251,191,36,0.25)", stroke: "#fbbf24" },
  red: { fill: "rgba(248,113,113,0.25)", stroke: "#f87171" },
};

const assessmentHistory = [
  { date: "Mar 15, 2026", score: 58, delta: "+4", note: "GI protocol showing early response" },
  { date: "Feb 15, 2026", score: 54, delta: "+2", note: "Sleep score improved after RELAX+ addition" },
  { date: "Jan 15, 2026", score: 52, delta: "-1", note: "Joint pain flare — adjusted protocol" },
  { date: "Dec 15, 2025", score: 53, delta: "+5", note: "Methylation support showing results" },
  { date: "Nov 15, 2025", score: 48, delta: null, note: "Baseline assessment — initial intake" },
];

/* ───────── Mini Gauge ───────── */

function VitalGauge({ label, score }: { label: string; score: number }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const pct = score / 10;
  const offset = circ * (1 - pct);
  const color = score >= 7 ? "#4ade80" : score >= 4 ? "#fbbf24" : "#f87171";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-12 h-12">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r={r} fill="transparent" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
          <circle cx="24" cy="24" r={r} fill="transparent" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color }}>{score}</span>
      </div>
      <span className="text-[10px] text-white/40 text-center leading-tight">{label}</span>
    </div>
  );
}

/* ───────── Page ───────── */

export default function AssessmentPage() {
  const [selectedZone, setSelectedZone] = useState<BodyZone | null>(null);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Integrative Assessment</h1>
        <p className="text-sm text-white/60">Jane Smith &bull; MRN: 1042</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Constitutional Typing ── */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-white">Constitutional Typing</h2>
            <span className="bg-purple-400/20 text-purple-400 text-xs font-bold px-3 py-1 rounded-full">
              Vata-Pitta
            </span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={constitutionData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="rgba(255,255,255,0.08)" />
              <PolarAngleAxis dataKey="dim" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar dataKey="value" stroke="#4ade80" fill="#4ade80" fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* ── Vitality Score Grid ── */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Vitality Score</h2>
          <div className="flex items-center gap-6 mb-5">
            {/* Overall large gauge */}
            <div className="relative w-24 h-24 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="transparent" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                <circle cx="50" cy="50" r="42" fill="transparent" stroke="#4ade80" strokeWidth="6" strokeLinecap="round" strokeDasharray={2 * Math.PI * 42} strokeDashoffset={2 * Math.PI * 42 * (1 - overallScore / 100)} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-green-400">{overallScore}</span>
                <span className="text-[10px] text-white/40">/100</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-white/60">Overall vitality composite score based on 10 health dimensions.</p>
              <p className="text-xs text-green-400 mt-1">+4 pts from last assessment</p>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {vitalDimensions.map((d) => (
              <VitalGauge key={d.label} label={d.label} score={d.score} />
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Body Map ── */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Body Systems Map</h2>
          <div className="flex gap-4">
            <div className="relative mx-auto">
              <svg viewBox="0 0 300 420" className="w-full max-w-[260px] h-auto">
                {/* Body outline */}
                <ellipse cx="150" cy="40" rx="28" ry="32" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
                <line x1="150" y1="72" x2="150" y2="220" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
                <line x1="150" y1="90" x2="85" y2="180" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
                <line x1="150" y1="90" x2="215" y2="180" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
                <line x1="150" y1="220" x2="110" y2="380" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
                <line x1="150" y1="220" x2="190" y2="380" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />

                {/* Zones */}
                {bodyZones.map((z) => {
                  const c = zoneColors[z.color];
                  return (
                    <g key={z.id} className="cursor-pointer" onClick={() => setSelectedZone(z)}>
                      <circle cx={z.x} cy={z.y} r={z.r} fill={c.fill} stroke={c.stroke} strokeWidth="1.5" className="hover:opacity-80 transition-opacity" />
                      <circle cx={z.x} cy={z.y} r={z.r + 4} fill="none" stroke={c.stroke} strokeWidth="0.5" strokeDasharray="3 3" opacity={0.4} />
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Zone detail panel */}
            {selectedZone ? (
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-white">{selectedZone.label}</h3>
                  <button onClick={() => setSelectedZone(null)} className="text-white/30 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full mb-2 inline-block ${
                  selectedZone.color === "green" ? "bg-green-400/20 text-green-400" :
                  selectedZone.color === "yellow" ? "bg-yellow-400/20 text-yellow-400" :
                  "bg-red-400/20 text-red-400"
                }`}>
                  {selectedZone.color === "green" ? "Normal" : selectedZone.color === "yellow" ? "Monitor" : "Attention"}
                </span>
                <p className="text-xs text-white/60 leading-relaxed">{selectedZone.details}</p>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-xs text-white/30 text-center">Click a body zone to view system details</p>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-4 pt-3 border-t border-gray-700/50">
            {[
              { label: "Normal", color: "bg-green-400" },
              { label: "Monitor", color: "bg-yellow-400" },
              { label: "Attention", color: "bg-red-400" },
            ].map((l) => (
              <span key={l.label} className="flex items-center gap-1.5 text-[10px] text-white/40">
                <span className={`w-2 h-2 rounded-full ${l.color}`} /> {l.label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Assessment History ── */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-5">Assessment History</h2>
          <div className="border-l-2 border-green-400/20 ml-3 space-y-6">
            {assessmentHistory.map((a, i) => (
              <div key={a.date} className="relative pl-6">
                <span className={`absolute -left-[5px] top-1.5 w-2 h-2 rounded-full ${i === 0 ? "bg-green-400" : "bg-green-400/40"}`} />
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-xs text-white/40">{a.date}</span>
                  <span className="text-sm font-bold text-white">{a.score}/100</span>
                  {a.delta && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      a.delta.startsWith("+") ? "bg-green-400/20 text-green-400" : "bg-red-400/20 text-red-400"
                    }`}>
                      {a.delta}
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/50">{a.note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
