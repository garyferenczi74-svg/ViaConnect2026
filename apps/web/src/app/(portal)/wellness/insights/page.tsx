"use client";

import { useState } from "react";
import {
  Target,
  Activity,
  TrendingUp,
  BarChart3,
  FlaskConical,
} from "lucide-react";
import PortalHeader from "@/components/wellness/PortalHeader";
import {
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ────────────────────────────────────────────
   TypeScript Interfaces
   ──────────────────────────────────────────── */

interface StatCard {
  title: string;
  titleColor: string;
  rows: { label: string; value: string }[];
  barPercent: number;
  barColor: string;
}

interface ChartPoint {
  name: string;
  value: number;
}

interface ScatterPoint {
  gene: string;
  accuracy: number;
  confidence: number;
}

interface DualLinePoint {
  month: string;
  line1: number;
  line2: number;
}

/* ────────────────────────────────────────────
   Sample Data
   ──────────────────────────────────────────── */

const statCards: StatCard[] = [
  {
    title: "Biomarker Status",
    titleColor: "text-green-400",
    rows: [
      { label: "Tracked", value: "4" },
      { label: "Optimal", value: "3" },
      { label: "Attention", value: "1" },
    ],
    barPercent: 75,
    barColor: "bg-green-400",
  },
  {
    title: "Genetic Correlation",
    titleColor: "text-[#a78bfa]",
    rows: [
      { label: "Match", value: "4/5" },
      { label: "Correlation", value: "88%" },
    ],
    barPercent: 88,
    barColor: "bg-[#a78bfa]",
  },
  {
    title: "Wellness Impact",
    titleColor: "text-green-400",
    rows: [
      { label: "Score", value: "8.1/10" },
      { label: "Trend", value: "+31%" },
    ],
    barPercent: 81,
    barColor: "bg-green-400",
  },
  {
    title: "Protocol Response",
    titleColor: "text-[#f472b6]",
    rows: [
      { label: "Positive", value: "94%" },
      { label: "Time", value: "6-8 weeks" },
    ],
    barPercent: 94,
    barColor: "bg-[#f472b6]",
  },
];

const wellnessAreaData: ChartPoint[] = [
  { name: "Jan", value: 62 },
  { name: "Feb", value: 68 },
  { name: "Mar", value: 71 },
  { name: "Apr", value: 75 },
  { name: "May", value: 79 },
  { name: "Jun", value: 84 },
];

const scatterData: ScatterPoint[] = [
  { gene: "MTHFR", accuracy: 92, confidence: 88 },
  { gene: "COMT", accuracy: 88, confidence: 82 },
  { gene: "VDR", accuracy: 85, confidence: 78 },
  { gene: "APOE", accuracy: 91, confidence: 86 },
  { gene: "FTO", accuracy: 86, confidence: 80 },
];

const vitDEnergyData: DualLinePoint[] = [
  { month: "Jan", line1: 28, line2: 52 },
  { month: "Feb", line1: 32, line2: 58 },
  { month: "Mar", line1: 38, line2: 64 },
  { month: "Apr", line1: 42, line2: 70 },
  { month: "May", line1: 45, line2: 76 },
  { month: "Jun", line1: 50, line2: 81 },
];

const homocysteineData: DualLinePoint[] = [
  { month: "Jan", line1: 14.2, line2: 58 },
  { month: "Feb", line1: 13.8, line2: 62 },
  { month: "Mar", line1: 13.1, line2: 67 },
  { month: "Apr", line1: 12.8, line2: 72 },
  { month: "May", line1: 12.4, line2: 76 },
  { month: "Jun", line1: 11.9, line2: 81 },
];

const CORRELATION_TABS = [
  "Biomarker Trends",
  "Correlation Analysis",
  "Genetic Predictions",
  "Current Status",
];

/* ────────────────────────────────────────────
   Page Component
   ──────────────────────────────────────────── */

export default function InsightsPage() {
  const [activeCorrelationTab, setActiveCorrelationTab] = useState(
    CORRELATION_TABS[0]
  );

  return (
    <div className="min-h-screen bg-[#111827] text-white font-sans antialiased">
      {/* ── Header ── */}
      <PortalHeader activeTab="insights" />

      {/* ── Main Content ── */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* ── 1. Stat Cards ── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <div
              key={card.title}
              className="bg-gray-800/50 border border-green-400/15 rounded-xl backdrop-blur-sm p-4 space-y-3"
            >
              <h3 className={`text-sm font-bold ${card.titleColor}`}>
                {card.title}
              </h3>
              <div className="space-y-1">
                {card.rows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between"
                  >
                    <span className="text-[10px] text-gray-500">
                      {row.label}
                    </span>
                    <span className="text-sm font-bold">{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`${card.barColor} h-full rounded-full transition-all`}
                  style={{ width: `${card.barPercent}%` }}
                />
              </div>
            </div>
          ))}
        </section>

        {/* ── 2. Chart Cards ── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Wellness vs Biomarker Trends — Area Chart */}
          <div className="bg-gray-800/50 border border-green-400/15 rounded-xl backdrop-blur-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <h3 className="font-bold text-sm">
                Wellness vs Biomarker Trends
              </h3>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={wellnessAreaData}>
                  <defs>
                    <linearGradient
                      id="greenGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#4ade80"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="#4ade80"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#374151"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#6b7280", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#6b7280", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    domain={[50, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "#9ca3af" }}
                    itemStyle={{ color: "#4ade80" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#4ade80"
                    strokeWidth={2}
                    fill="url(#greenGrad)"
                    name="Wellness Score"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Genetic Prediction Accuracy — Scatter Plot */}
          <div className="bg-gray-800/50 border border-green-400/15 rounded-xl backdrop-blur-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-4 w-4 text-[#f472b6]" />
              <h3 className="font-bold text-sm">
                Genetic Prediction Accuracy
              </h3>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#374151"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="accuracy"
                    name="Accuracy"
                    tick={{ fill: "#4ade80", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    domain={[80, 100]}
                    label={{
                      value: "Accuracy %",
                      position: "insideBottom",
                      offset: -2,
                      style: { fill: "#6b7280", fontSize: 10 },
                    }}
                  />
                  <YAxis
                    dataKey="confidence"
                    name="Confidence"
                    tick={{ fill: "#6b7280", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    domain={[70, 95]}
                    label={{
                      value: "Confidence",
                      angle: -90,
                      position: "insideLeft",
                      style: { fill: "#6b7280", fontSize: 10 },
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "#9ca3af" }}
                    formatter={(value: number, name: string) => [
                      `${value}%`,
                      name,
                    ]}
                  />
                  <Scatter
                    data={scatterData}
                    fill="#f472b6"
                    name="Gene"
                    shape="circle"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            {/* Gene labels */}
            <div className="flex items-center justify-center gap-3 mt-2">
              {scatterData.map((d) => (
                <span
                  key={d.gene}
                  className="text-[10px] text-green-400 font-medium"
                >
                  {d.gene} {d.accuracy}%
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── 3. Correlation Analysis Section ── */}
        <section className="bg-gray-800/50 border border-green-400/15 rounded-xl backdrop-blur-sm p-5 space-y-5">
          {/* Header */}
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-green-400" />
            <h3 className="font-bold text-lg">
              Biomarker-Wellness Correlation Analysis
            </h3>
          </div>

          {/* Sub-tabs */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {CORRELATION_TABS.map((tab) => {
              const isActive = activeCorrelationTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveCorrelationTab(tab)}
                  className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-white text-gray-900"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {/* Dual-axis charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Vitamin D & Energy */}
            <div className="bg-gray-900/40 border border-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-sm">Vitamin D &amp; Energy</h4>
                <span className="bg-green-500/20 text-green-400 text-[10px] px-2 py-0.5 rounded font-bold">
                  r = 0.87
                </span>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={vitDEnergyData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#374151"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: "#6b7280", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fill: "#4ade80", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      label={{
                        value: "Vit D (ng/mL)",
                        angle: -90,
                        position: "insideLeft",
                        style: { fill: "#4ade80", fontSize: 9 },
                      }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: "#facc15", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      label={{
                        value: "Energy %",
                        angle: 90,
                        position: "insideRight",
                        style: { fill: "#facc15", fontSize: 9 },
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      labelStyle={{ color: "#9ca3af" }}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="line1"
                      stroke="#4ade80"
                      strokeWidth={2}
                      dot={{ fill: "#4ade80", r: 3 }}
                      name="Vitamin D"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="line2"
                      stroke="#facc15"
                      strokeWidth={2}
                      dot={{ fill: "#facc15", r: 3 }}
                      name="Energy Level"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-4 mt-2">
                <span className="flex items-center gap-1 text-[10px]">
                  <span className="w-3 h-0.5 bg-green-400 rounded" />
                  <span className="text-green-400">Vitamin D</span>
                </span>
                <span className="flex items-center gap-1 text-[10px]">
                  <span className="w-3 h-0.5 bg-yellow-400 rounded" />
                  <span className="text-yellow-400">Energy Level</span>
                </span>
              </div>
            </div>

            {/* Homocysteine & Wellness */}
            <div className="bg-gray-900/40 border border-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-sm">
                  Homocysteine &amp; Wellness
                </h4>
                <span className="bg-red-500/20 text-red-400 text-[10px] px-2 py-0.5 rounded font-bold">
                  r = -0.74
                </span>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={homocysteineData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#374151"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: "#6b7280", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fill: "#f87171", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      reversed
                      label={{
                        value: "Hcy (µmol/L)",
                        angle: -90,
                        position: "insideLeft",
                        style: { fill: "#f87171", fontSize: 9 },
                      }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: "#a78bfa", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      label={{
                        value: "Wellness %",
                        angle: 90,
                        position: "insideRight",
                        style: { fill: "#a78bfa", fontSize: 9 },
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      labelStyle={{ color: "#9ca3af" }}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="line1"
                      stroke="#f87171"
                      strokeWidth={2}
                      dot={{ fill: "#f87171", r: 3 }}
                      name="Homocysteine"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="line2"
                      stroke="#a78bfa"
                      strokeWidth={2}
                      dot={{ fill: "#a78bfa", r: 3 }}
                      name="Wellness Score"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-4 mt-2">
                <span className="flex items-center gap-1 text-[10px]">
                  <span className="w-3 h-0.5 bg-red-400 rounded" />
                  <span className="text-red-400">Homocysteine</span>
                </span>
                <span className="flex items-center gap-1 text-[10px]">
                  <span className="w-3 h-0.5 bg-[#a78bfa] rounded" />
                  <span className="text-[#a78bfa]">Wellness Score</span>
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
