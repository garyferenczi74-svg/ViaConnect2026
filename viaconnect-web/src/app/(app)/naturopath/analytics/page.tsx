"use client";

import { useState } from "react";
import {
  Users,
  Activity,
  ClipboardCheck,
  Leaf,
} from "lucide-react";
import { Card, StatCard } from "@/components/ui";
import { PageTransition, StaggerChild } from "@/lib/motion";
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

// ─── Date Range ──────────────────────────────────────────────────────────────

const ranges = ["7D", "30D", "90D", "1Y"] as const;
type Range = (typeof ranges)[number];

// ─── Mock Data ───────────────────────────────────────────────────────────────

const outcomesData = [
  { month: "Jan", vitality: 58, adherence: 62, constitutional: 45 },
  { month: "Feb", vitality: 61, adherence: 65, constitutional: 50 },
  { month: "Mar", vitality: 65, adherence: 68, constitutional: 56 },
  { month: "Apr", vitality: 68, adherence: 70, constitutional: 60 },
  { month: "May", vitality: 71, adherence: 72, constitutional: 64 },
  { month: "Jun", vitality: 74, adherence: 74, constitutional: 68 },
  { month: "Jul", vitality: 76, adherence: 76, constitutional: 71 },
  { month: "Aug", vitality: 79, adherence: 78, constitutional: 74 },
  { month: "Sep", vitality: 81, adherence: 80, constitutional: 77 },
  { month: "Oct", vitality: 84, adherence: 82, constitutional: 79 },
  { month: "Nov", vitality: 86, adherence: 84, constitutional: 82 },
  { month: "Dec", vitality: 89, adherence: 86, constitutional: 85 },
];

const botanicalProtocols = [
  { protocol: "Ashwagandha KSM-66", adherence: 88 },
  { protocol: "Holy Basil (Tulsi)", adherence: 82 },
  { protocol: "Triphala", adherence: 76 },
  { protocol: "Rhodiola Rosea", adherence: 84 },
  { protocol: "Brahmi", adherence: 71 },
  { protocol: "Turmeric Phytosome", adherence: 90 },
  { protocol: "Milk Thistle", adherence: 79 },
  { protocol: "Valerian Root", adherence: 67 },
];

const constitutionalDistribution = [
  { name: "Vata (Air)", value: 38, color: "#A78BFA" },
  { name: "Pitta (Fire)", value: 32, color: "#F472B6" },
  { name: "Kapha (Earth)", value: 22, color: "#76866F" },
  { name: "Dual-Dosha", value: 8, color: "#22D3EE" },
];

const topFormulations = [
  { name: "CALM+", count: 31 },
  { name: "RELAX+", count: 28 },
  { name: "MTHFR+", count: 26 },
  { name: "BALANCE+", count: 23 },
  { name: "CLEAN+", count: 20 },
  { name: "FLEX+", count: 18 },
  { name: "RISE+", count: 16 },
  { name: "VDR+", count: 14 },
  { name: "COMT+", count: 12 },
  { name: "DigestiZorb+", count: 10 },
];

const newPatientsData = [
  { month: "Jan", patients: 3 },
  { month: "Feb", patients: 4 },
  { month: "Mar", patients: 5 },
  { month: "Apr", patients: 4 },
  { month: "May", patients: 6 },
  { month: "Jun", patients: 5 },
  { month: "Jul", patients: 7 },
  { month: "Aug", patients: 8 },
  { month: "Sep", patients: 6 },
  { month: "Oct", patients: 9 },
  { month: "Nov", patients: 8 },
  { month: "Dec", patients: 10 },
];

const symptomCategories = [
  { category: "Stress", score: 82 },
  { category: "Sleep", score: 75 },
  { category: "Digestion", score: 70 },
  { category: "Energy", score: 78 },
  { category: "Pain", score: 65 },
  { category: "Mood", score: 72 },
  { category: "Immune", score: 68 },
  { category: "Hormonal", score: 60 },
];

const herbInteractionAlerts = [
  { month: "Jan", critical: 0, major: 1, moderate: 3 },
  { month: "Feb", critical: 0, major: 0, moderate: 4 },
  { month: "Mar", critical: 1, major: 1, moderate: 2 },
  { month: "Apr", critical: 0, major: 2, moderate: 3 },
  { month: "May", critical: 0, major: 1, moderate: 5 },
  { month: "Jun", critical: 0, major: 0, moderate: 3 },
  { month: "Jul", critical: 0, major: 1, moderate: 2 },
  { month: "Aug", critical: 0, major: 0, moderate: 4 },
  { month: "Sep", critical: 0, major: 1, moderate: 3 },
  { month: "Oct", critical: 0, major: 0, moderate: 2 },
  { month: "Nov", critical: 0, major: 1, moderate: 1 },
  { month: "Dec", critical: 0, major: 0, moderate: 2 },
];

// ─── Chart Styles ──────────────────────────────────────────────────────────

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

export default function NaturopathAnalyticsPage() {
  const [range, setRange] = useState<Range>("30D");

  return (
    <PageTransition className="min-h-screen bg-dark-bg p-4 sm:p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <StaggerChild className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Practice Analytics</h1>
            <p className="text-gray-400 text-sm mt-1">Constitutional outcomes, botanical protocols, and patient trends</p>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-white/[0.04] border border-white/[0.06]">
            {ranges.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  range === r
                    ? "bg-sage/20 text-sage"
                    : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </StaggerChild>

        {/* Summary Cards */}
        <StaggerChild className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Active Patients" value="52" trend="up" trendLabel="+5" />
          <StatCard icon={Activity} label="Avg Vitality Improvement" value="+31pts" trend="up" trendLabel="+8%" />
          <StatCard icon={ClipboardCheck} label="Botanical Protocols" value="41" trend="up" trendLabel="+6" />
          <StatCard icon={Leaf} label="Herb Adherence" value="81%" trend="up" trendLabel="+3%" />
        </StaggerChild>

        {/* Charts Grid */}
        <StaggerChild className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1 - Patient Outcomes Over Time */}
          <Card hover={false} className="p-5">
            <h3 className="text-sm font-semibold text-white mb-1">Patient Outcomes Over Time</h3>
            <p className="text-xs text-gray-500 mb-4">Vitality, adherence, and constitutional balance trends</p>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={outcomesData}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis {...axisProps} domain={[30, 100]} />
                <RTooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12, color: "#9CA3AF" }} />
                <Line type="monotone" dataKey="vitality" name="Vitality Score" stroke="#76866F" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="adherence" name="Adherence Rate" stroke="#A78BFA" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="constitutional" name="Constitutional Balance" stroke="#22D3EE" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Chart 2 - Botanical Protocol Adherence */}
          <Card hover={false} className="p-5">
            <h3 className="text-sm font-semibold text-white mb-1">Botanical Protocol Adherence</h3>
            <p className="text-xs text-gray-500 mb-4">Adherence % by herb/formulation</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={botanicalProtocols}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="protocol" {...axisProps} angle={-25} textAnchor="end" height={60} />
                <YAxis {...axisProps} domain={[0, 100]} />
                <RTooltip {...tooltipStyle} />
                <Bar dataKey="adherence" name="Adherence %" fill="#76866F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Chart 3 - Constitutional Type Distribution */}
          <Card hover={false} className="p-5">
            <h3 className="text-sm font-semibold text-white mb-1">Constitutional Type Distribution</h3>
            <p className="text-xs text-gray-500 mb-4">Dosha classification across patient base</p>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={constitutionalDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={50}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }: { name?: string; value?: number }) => `${name ?? ""} ${value ?? 0}%`}
                  labelLine={{ stroke: "#6B7280" }}
                  fontSize={11}
                >
                  {constitutionalDistribution.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <RTooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12, color: "#9CA3AF" }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* Chart 4 - Symptom Improvement Radar */}
          <Card hover={false} className="p-5">
            <h3 className="text-sm font-semibold text-white mb-1">Symptom Improvement by Category</h3>
            <p className="text-xs text-gray-500 mb-4">Average improvement score across patient base (0-100)</p>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={symptomCategories}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="category" tick={{ fill: "#9CA3AF", fontSize: 11 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#6B7280", fontSize: 10 }} />
                <Radar name="Improvement %" dataKey="score" stroke="#76866F" fill="#76866F" fillOpacity={0.3} />
                <RTooltip {...tooltipStyle} />
              </RadarChart>
            </ResponsiveContainer>
          </Card>

          {/* Chart 5 - Top Formulations Prescribed */}
          <Card hover={false} className="p-5">
            <h3 className="text-sm font-semibold text-white mb-1">Top Formulations Prescribed</h3>
            <p className="text-xs text-gray-500 mb-4">Total prescriptions across all patients</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topFormulations} layout="vertical">
                <CartesianGrid {...gridProps} />
                <XAxis type="number" {...axisProps} />
                <YAxis type="category" dataKey="name" {...axisProps} width={110} />
                <RTooltip {...tooltipStyle} />
                <Bar dataKey="count" name="Prescriptions" fill="#76866F" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Chart 6 - Herb-Drug Interaction Alerts */}
          <Card hover={false} className="p-5">
            <h3 className="text-sm font-semibold text-white mb-1">Herb-Drug Interaction Alerts</h3>
            <p className="text-xs text-gray-500 mb-4">Monthly interaction flags by severity</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={herbInteractionAlerts}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis {...axisProps} />
                <RTooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12, color: "#9CA3AF" }} />
                <Bar dataKey="critical" name="Critical" stackId="a" fill="#EF4444" radius={[0, 0, 0, 0]} />
                <Bar dataKey="major" name="Major" stackId="a" fill="#B75F19" radius={[0, 0, 0, 0]} />
                <Bar dataKey="moderate" name="Moderate" stackId="a" fill="#FBBF24" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Chart 7 - New Patients Per Month (full width) */}
          <Card hover={false} className="p-5 lg:col-span-2">
            <h3 className="text-sm font-semibold text-white mb-1">New Patients Per Month</h3>
            <p className="text-xs text-gray-500 mb-4">Practice growth trend</p>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={newPatientsData}>
                <defs>
                  <linearGradient id="sageGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#76866F" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#76866F" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis {...axisProps} />
                <RTooltip {...tooltipStyle} />
                <Area type="monotone" dataKey="patients" name="New Patients" stroke="#76866F" strokeWidth={2} fill="url(#sageGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </StaggerChild>
      </div>
    </PageTransition>
  );
}
