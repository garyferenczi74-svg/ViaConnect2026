"use client";

import { useState } from "react";
import {
  TrendingUp,
  BarChart3,
  Clock,
  ThumbsUp,
  Download,
  SlidersHorizontal,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  ReferenceArea,
  ReferenceLine,
} from "recharts";

/* ───────── Mock Data ───────── */

const kpis = [
  { value: "78%", label: "Protocols Improving", delta: "+6%", deltaColor: "text-green-400", icon: TrendingUp },
  { value: "+2.4 pts", label: "Avg Improvement", delta: null, deltaColor: "", icon: BarChart3 },
  { value: "42 days", label: "Time to First Improvement", delta: "-8 days", deltaColor: "text-green-400", icon: Clock },
  { value: "74", label: "Patient NPS", delta: null, deltaColor: "", icon: ThumbsUp },
];

const effectivenessData = [
  { day: "30d", cardio: 1.2, sleep: 0.8, immune: 0.5, gi: 0.3 },
  { day: "60d", cardio: 2.8, sleep: 2.1, immune: 1.4, gi: 1.0 },
  { day: "90d", cardio: 4.5, sleep: 3.8, immune: 2.9, gi: 2.2 },
  { day: "120d", cardio: 6.1, sleep: 5.4, immune: 4.2, gi: 3.5 },
  { day: "150d", cardio: 7.4, sleep: 6.8, immune: 5.6, gi: 4.8 },
  { day: "180d", cardio: 8.2, sleep: 7.6, immune: 6.4, gi: 5.9 },
];

const series = [
  { key: "cardio", name: "Cardiovascular", color: "#4ade80" },
  { key: "sleep", name: "Sleep", color: "#a78bfa" },
  { key: "immune", name: "Immune", color: "#f472b6" },
  { key: "gi", name: "GI", color: "#fbbf24" },
];

const cohortResults = [
  { indication: "Cardiovascular", patients: 34, avgImprove: "+3.8 pts", adherence: "89%", status: "Active" },
  { indication: "Sleep Optimization", patients: 28, avgImprove: "+3.2 pts", adherence: "82%", status: "Active" },
  { indication: "Immune Support", patients: 22, avgImprove: "+2.6 pts", adherence: "76%", status: "Active" },
  { indication: "GI Restoration", patients: 19, avgImprove: "+2.1 pts", adherence: "71%", status: "Active" },
  { indication: "Metabolic Balance", patients: 15, avgImprove: "+1.8 pts", adherence: "68%", status: "Completed" },
];

interface BiomarkerData {
  label: string;
  unit: string;
  normalLow: number;
  normalHigh: number;
  baseline: number;
  data: { month: string; value: number }[];
}

const biomarkers: BiomarkerData[] = [
  {
    label: "Vitamin D",
    unit: "ng/mL",
    normalLow: 30,
    normalHigh: 60,
    baseline: 22,
    data: [
      { month: "Jan", value: 22 }, { month: "Feb", value: 28 }, { month: "Mar", value: 35 },
      { month: "Apr", value: 42 }, { month: "May", value: 48 }, { month: "Jun", value: 52 },
    ],
  },
  {
    label: "Homocysteine",
    unit: "µmol/L",
    normalLow: 5,
    normalHigh: 12,
    baseline: 18.2,
    data: [
      { month: "Jan", value: 18.2 }, { month: "Feb", value: 16.1 }, { month: "Mar", value: 14.4 },
      { month: "Apr", value: 12.8 }, { month: "May", value: 11.2 }, { month: "Jun", value: 10.1 },
    ],
  },
  {
    label: "hsCRP",
    unit: "mg/L",
    normalLow: 0,
    normalHigh: 3,
    baseline: 5.8,
    data: [
      { month: "Jan", value: 5.8 }, { month: "Feb", value: 4.9 }, { month: "Mar", value: 4.1 },
      { month: "Apr", value: 3.4 }, { month: "May", value: 2.8 }, { month: "Jun", value: 2.2 },
    ],
  },
  {
    label: "Cortisol (AM)",
    unit: "µg/dL",
    normalLow: 6,
    normalHigh: 18,
    baseline: 24.5,
    data: [
      { month: "Jan", value: 24.5 }, { month: "Feb", value: 21.8 }, { month: "Mar", value: 19.2 },
      { month: "Apr", value: 16.8 }, { month: "May", value: 15.1 }, { month: "Jun", value: 14.2 },
    ],
  },
];

const benchmarkData = [
  { category: "Improvement Rate", practice: 78, national: 62 },
  { category: "Time to Improve", practice: 72, national: 55 },
  { category: "Adherence", practice: 81, national: 64 },
  { category: "Satisfaction", practice: 74, national: 58 },
];

/* ───────── Tooltip ───────── */

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-green-400/15 rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="text-white/60 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

/* ───────── Page ───────── */

export default function OutcomesPage() {
  const [cohortIndication, setCohortIndication] = useState("All");
  const [cohortDuration, setCohortDuration] = useState(90);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white">Outcomes & Analytics</h1>
          <p className="text-sm text-white/60">Practice-wide performance metrics</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-green-400/20 text-green-400 text-sm hover:bg-green-400/10 transition-colors">
          <Download className="w-4 h-4" /> Export Report
        </button>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-6">
              <div className="bg-green-400/20 text-green-400 w-10 h-10 rounded-lg flex items-center justify-center mb-3">
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-3xl font-bold text-green-400 tabular-nums">{k.value}</p>
              <p className="text-xs font-medium text-white/40 uppercase tracking-wider mt-1">{k.label}</p>
              {k.delta && <p className={`text-xs mt-1 ${k.deltaColor}`}>{k.delta}</p>}
            </div>
          );
        })}
      </div>

      {/* ── Effectiveness Chart ── */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-4">Protocol Effectiveness Over Time</h2>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={effectivenessData} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 10]} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }} axisLine={false} tickLine={false} label={{ value: "Symptom Score Improvement", angle: -90, position: "insideLeft", fill: "rgba(255,255,255,0.3)", fontSize: 11 }} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }} />
            {series.map((s) => (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={{ r: 3, fill: s.color }} activeDot={{ r: 5 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Cohort Analysis ── */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-green-400" /> Cohort Analysis
          </h2>
          <button className="flex items-center gap-1.5 text-xs text-green-400 hover:underline">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <select
            value={cohortIndication}
            onChange={(e) => setCohortIndication(e.target.value)}
            className="bg-gray-900/60 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-green-400/50"
          >
            <option value="All">All Indications</option>
            <option value="Cardiovascular">Cardiovascular</option>
            <option value="Sleep">Sleep</option>
            <option value="Immune">Immune</option>
            <option value="GI">GI</option>
          </select>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">Duration:</span>
            <input
              type="range"
              min={30}
              max={180}
              step={30}
              value={cohortDuration}
              onChange={(e) => setCohortDuration(Number(e.target.value))}
              className="w-32 accent-green-400"
            />
            <span className="text-xs text-white/60 w-10">{cohortDuration}d</span>
          </div>
          <button className="px-4 py-2 rounded-lg bg-green-400 text-gray-900 text-xs font-semibold hover:bg-green-500 transition-colors">
            Apply
          </button>
        </div>
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="text-xs font-medium text-white/40 uppercase tracking-wider border-b border-gray-700/50">
                <th className="text-left py-2 pr-4">Indication</th>
                <th className="text-left py-2 pr-4">Patients</th>
                <th className="text-left py-2 pr-4">Avg Improvement</th>
                <th className="text-left py-2 pr-4">Adherence</th>
                <th className="text-left py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/30">
              {cohortResults
                .filter((r) => cohortIndication === "All" || r.indication.includes(cohortIndication))
                .map((r) => (
                  <tr key={r.indication} className="hover:bg-gray-700/20 transition-colors">
                    <td className="py-3 pr-4 text-sm font-medium text-white">{r.indication}</td>
                    <td className="py-3 pr-4 text-sm text-white/60">{r.patients}</td>
                    <td className="py-3 pr-4 text-sm text-green-400 font-medium">{r.avgImprove}</td>
                    <td className="py-3 pr-4 text-sm text-white/60">{r.adherence}</td>
                    <td className="py-3">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${r.status === "Active" ? "bg-green-400/20 text-green-400" : "bg-white/10 text-white/40"}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Biomarker Trending ── */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Biomarker Trending</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {biomarkers.map((b) => (
            <div key={b.label} className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">{b.label}</h3>
                  <p className="text-[10px] text-white/40">{b.unit}</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-green-400">
                    {b.data[b.data.length - 1].value}
                  </span>
                  <p className="text-[10px] text-white/40">Latest</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={b.data} margin={{ left: -10, right: 0, top: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`grad-${b.label}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4ade80" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#4ade80" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <ReferenceArea y1={b.normalLow} y2={b.normalHigh} fill="#4ade80" fillOpacity={0.08} />
                  <ReferenceLine y={b.baseline} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="value" stroke="#4ade80" strokeWidth={2} fill={`url(#grad-${b.label})`} dot={{ r: 2, fill: "#4ade80" }} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-3 mt-2 text-[10px] text-white/30">
                <span className="flex items-center gap-1">
                  <span className="w-4 h-2 bg-green-400/10 border border-green-400/20 rounded-sm" /> Normal range
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-4 border-t border-dashed border-white/20" /> Baseline
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Benchmarking ── */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-4">Practice Benchmarking</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={benchmarkData} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="category" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="practice" name="Your Practice" fill="#4ade80" radius={[4, 4, 0, 0]} barSize={28} />
            <Bar dataKey="national" name="National Avg" fill="#374151" radius={[4, 4, 0, 0]} barSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
