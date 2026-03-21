"use client";

import { useState } from "react";
import {
  Users,
  Activity,
  ClipboardCheck,
  DollarSign,
} from "lucide-react";
import { Card, StatCard } from "@/components/ui";
import {
  LineChart,
  BarChart,
  AreaChart,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  Legend,
  Line,
  Bar,
  Area,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";

// ─── Date Range ──────────────────────────────────────────────────────────────

const ranges = ["7D", "30D", "90D", "1Y"] as const;
type Range = (typeof ranges)[number];

// ─── Mock Data ───────────────────────────────────────────────────────────────

// Months used by chart data xAxis
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]; // eslint-disable-line @typescript-eslint/no-unused-vars

const outcomesData = [
  { month: "Jan", vitality: 61, adherence: 64 },
  { month: "Feb", vitality: 63, adherence: 66 },
  { month: "Mar", vitality: 66, adherence: 69 },
  { month: "Apr", vitality: 70, adherence: 71 },
  { month: "May", vitality: 72, adherence: 73 },
  { month: "Jun", vitality: 75, adherence: 74 },
  { month: "Jul", vitality: 77, adherence: 76 },
  { month: "Aug", vitality: 80, adherence: 78 },
  { month: "Sep", vitality: 82, adherence: 80 },
  { month: "Oct", vitality: 85, adherence: 82 },
  { month: "Nov", vitality: 88, adherence: 85 },
  { month: "Dec", vitality: 91, adherence: 87 },
];

const protocolAdherence = [
  { protocol: "MTHFR+", adherence: 85 },
  { protocol: "COMT+", adherence: 72 },
  { protocol: "NAD+", adherence: 91 },
  { protocol: "FOCUS+", adherence: 68 },
  { protocol: "BLAST+", adherence: 77 },
  { protocol: "SHRED+", adherence: 83 },
];

const topSupplements = [
  { name: "MTHFR+", count: 34 },
  { name: "COMT+", count: 29 },
  { name: "NAD+", count: 27 },
  { name: "FOCUS+", count: 24 },
  { name: "BLAST+", count: 21 },
  { name: "SHRED+", count: 19 },
  { name: "CannabisIQ", count: 16 },
  { name: "PeptideIQ", count: 14 },
  { name: "VDR Support", count: 11 },
  { name: "CoQ10 Complex", count: 9 },
];

const variantFrequency = [
  { name: "MTHFR", value: 30, color: "#4ADE80" },
  { name: "COMT", value: 22, color: "#A78BFA" },
  { name: "CYP1A2", value: 18, color: "#FBBF24" },
  { name: "APOE", value: 15, color: "#F472B6" },
  { name: "VDR", value: 10, color: "#22D3EE" },
  { name: "Other", value: 5, color: "#6B7280" },
];

const newPatientsData = [
  { month: "Jan", patients: 2 },
  { month: "Feb", patients: 3 },
  { month: "Mar", patients: 4 },
  { month: "Apr", patients: 3 },
  { month: "May", patients: 5 },
  { month: "Jun", patients: 4 },
  { month: "Jul", patients: 6 },
  { month: "Aug", patients: 5 },
  { month: "Sep", patients: 7 },
  { month: "Oct", patients: 6 },
  { month: "Nov", patients: 8 },
  { month: "Dec", patients: 7 },
];

// ─── Chart Axis Styles ──────────────────────────────────────────────────────

const axisProps = {
  tick: { fill: "#9CA3AF", fontSize: 12 },
  axisLine: { stroke: "rgba(255,255,255,0.06)" },
  tickLine: false,
} as const;

const gridProps = {
  strokeDasharray: "3 3",
  stroke: "rgba(255,255,255,0.06)",
} as const;

const tooltipStyle = {
  contentStyle: {
    backgroundColor: "#1F2937",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    color: "#E5E7EB",
    fontSize: 13,
  },
  itemStyle: { color: "#E5E7EB" },
} as const;

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>("30D");

  return (
    <div className="min-h-screen bg-dark-bg p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-white/[0.04] border border-white/[0.06]">
            {ranges.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  range === r
                    ? "bg-portal-green/20 text-portal-green"
                    : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total Patients" value="47" trend="up" trendLabel="+3" />
          <StatCard icon={Activity} label="Avg Adherence" value="78%" trend="up" trendLabel="+4%" />
          <StatCard icon={ClipboardCheck} label="Active Protocols" value="34" trend="up" trendLabel="+7" />
          <StatCard icon={DollarSign} label="Monthly Revenue" value="$12,460" trend="up" trendLabel="+12%" />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1 - Patient Outcomes Over Time */}
          <Card hover={false} className="p-5">
            <h3 className="text-sm font-semibold text-white mb-1">Patient Outcomes Over Time</h3>
            <p className="text-xs text-gray-500 mb-4">Vitality score &amp; adherence rate trends</p>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={outcomesData}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis {...axisProps} domain={[40, 100]} />
                <RTooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12, color: "#9CA3AF" }} />
                <Line
                  type="monotone"
                  dataKey="vitality"
                  name="Vitality Score"
                  stroke="#4ADE80"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="adherence"
                  name="Adherence Rate"
                  stroke="#A78BFA"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Chart 2 - Protocol Adherence Rates */}
          <Card hover={false} className="p-5">
            <h3 className="text-sm font-semibold text-white mb-1">Protocol Adherence Rates</h3>
            <p className="text-xs text-gray-500 mb-4">Adherence % by protocol stack</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={protocolAdherence}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="protocol" {...axisProps} />
                <YAxis {...axisProps} domain={[0, 100]} />
                <RTooltip {...tooltipStyle} />
                <Bar dataKey="adherence" name="Adherence %" fill="#4ADE80" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Chart 3 - Top 10 Prescribed Supplements */}
          <Card hover={false} className="p-5">
            <h3 className="text-sm font-semibold text-white mb-1">Top 10 Prescribed Supplements</h3>
            <p className="text-xs text-gray-500 mb-4">Total prescriptions across all patients</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topSupplements} layout="vertical">
                <CartesianGrid {...gridProps} />
                <XAxis type="number" {...axisProps} />
                <YAxis type="category" dataKey="name" {...axisProps} width={100} />
                <RTooltip {...tooltipStyle} />
                <Bar dataKey="count" name="Prescriptions" fill="#B75F19" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Chart 4 - Genetic Variant Frequency */}
          <Card hover={false} className="p-5">
            <h3 className="text-sm font-semibold text-white mb-1">Genetic Variant Frequency</h3>
            <p className="text-xs text-gray-500 mb-4">Distribution across your patient base</p>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={variantFrequency}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={50}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }: { name?: string; value?: number }) => `${name ?? ""} ${value ?? 0}%`}
                  labelLine={{ stroke: "#6B7280" }}
                  fontSize={12}
                >
                  {variantFrequency.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <RTooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12, color: "#9CA3AF" }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* Chart 5 - New Patients Per Month (full width) */}
          <Card hover={false} className="p-5 lg:col-span-2">
            <h3 className="text-sm font-semibold text-white mb-1">New Patients Per Month</h3>
            <p className="text-xs text-gray-500 mb-4">Patient acquisition trend</p>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={newPatientsData}>
                <defs>
                  <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ADE80" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4ADE80" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis {...axisProps} />
                <RTooltip {...tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="patients"
                  name="New Patients"
                  stroke="#4ADE80"
                  strokeWidth={2}
                  fill="url(#greenGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
    </div>
  );
}
