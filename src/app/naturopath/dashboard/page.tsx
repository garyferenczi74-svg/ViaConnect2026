"use client";

import {
  Users,
  ClipboardList,
  TrendingUp,
  AlertCircle,
  UserPlus,
  ClipboardPlus,
  Zap,
  BarChart3,
  Dna,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useState } from "react";

/* ───────── Mock Data ───────── */

const kpiCards = [
  {
    icon: Users,
    value: "147",
    label: "ACTIVE PATIENTS",
    delta: "+8 this month",
    valueColor: "text-green-400",
    deltaColor: "text-green-400",
  },
  {
    icon: ClipboardList,
    value: "89",
    label: "PROTOCOLS RUNNING",
    delta: "+12 this month",
    valueColor: "text-green-400",
    deltaColor: "text-green-400",
  },
  {
    icon: TrendingUp,
    value: "7.4",
    label: "AVG OUTCOME SCORE",
    delta: "+12%",
    deltaColor: "text-green-400",
    valueColor: "text-green-400",
    deltaBadge: true,
  },
  {
    icon: AlertCircle,
    value: "12",
    label: "PENDING REVIEWS",
    delta: "3 urgent",
    valueColor: "text-yellow-400",
    deltaColor: "text-red-400",
  },
];

const attentionQueue = [
  { name: "J. Smith", reason: "Overdue follow-up", days: "12 days", priority: "red" },
  { name: "M. Chen", reason: "Declining outcome score", days: "5 days", priority: "red" },
  { name: "R. Patel", reason: "CYP2D6 interaction alert", days: "3 days", priority: "yellow" },
  { name: "A. Lee", reason: "Pending lab review", days: "2 days", priority: "yellow" },
  { name: "K. Brown", reason: "Protocol expiring", days: "7 days", priority: "yellow" },
  { name: "S. Wilson", reason: "Scheduled follow-up", days: "Tomorrow", priority: "green" },
] as const;

const protocolData = [
  { name: "Cardiovascular", value: 87 },
  { name: "Sleep Optimization", value: 78 },
  { name: "Immune Support", value: 72 },
  { name: "GI Restoration", value: 68 },
  { name: "Metabolic Balance", value: 64 },
];

const geneticData = [
  { name: "MTHFR variants", value: 34, color: "#a78bfa" },
  { name: "COMT variants", value: 28, color: "#4ade80" },
  { name: "CYP2D6 variants", value: 18, color: "#f472b6" },
  { name: "Other", value: 20, color: "#374151" },
];

const recentActivity = [
  { time: "10:30 AM", description: "Protocol assigned to J. Smith" },
  { time: "09:15 AM", description: "Lab results received for M. Chen" },
  { time: "08:45 AM", description: "AI recommendation generated" },
  { time: "Yesterday", description: "Outcome assessment completed" },
  { time: "Yesterday", description: "New patient registered" },
  { time: "Mar 16", description: "Interaction alert resolved" },
];

const quickActions = [
  { icon: UserPlus, label: "New Patient" },
  { icon: ClipboardPlus, label: "New Protocol" },
  { icon: Zap, label: "Quick Check" },
  { icon: BarChart3, label: "Analytics" },
];

const priorityColor: Record<string, string> = {
  red: "bg-red-400",
  yellow: "bg-yellow-400",
  green: "bg-green-400",
};

/* ───────── Custom Tooltip ───────── */

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-green-400/15 rounded-lg px-3 py-2 text-sm shadow-lg">
      <p className="text-white/80 font-medium">{label}</p>
      <p className="text-green-400 font-bold">{payload[0].value}%</p>
    </div>
  );
}

/* ───────── Page ───────── */

export default function DashboardPage() {
  const [protocolTab, setProtocolTab] = useState("30d");
  const tabs = ["30d", "90d", "180d"];

  const urgentCount = attentionQueue.filter((r) => r.priority === "red").length;

  return (
    <div className="space-y-8">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Good morning, Dr. Chen
          </h1>
          <p className="text-sm text-white/60">
            Here&apos;s your practice overview for today
          </p>
        </div>
        <span className="text-sm text-white/40">Wednesday, March 18, 2026</span>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="bg-green-400/20 text-green-400 w-10 h-10 rounded-lg flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <p className={`text-4xl font-bold tabular-nums ${card.valueColor}`}>
                {card.value}
              </p>
              <p className="text-xs font-medium text-white/40 uppercase tracking-wider mt-1">
                {card.label}
              </p>
              {card.deltaBadge ? (
                <span className="inline-block mt-2 bg-green-400/10 text-green-400 px-2 py-0.5 rounded-full text-xs font-medium">
                  {card.delta}
                </span>
              ) : (
                <p className={`text-xs mt-2 ${card.deltaColor}`}>{card.delta}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Main Content Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left — Attention Queue */}
        <div className="lg:col-span-3 bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-gray-700/50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Needs Your Attention
            </h2>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
              <span className="text-xs text-white/40 bg-gray-700/50 px-2 py-0.5 rounded-full">
                {urgentCount} urgent
              </span>
            </div>
          </div>
          <div className="divide-y divide-gray-700/30">
            {attentionQueue.map((row) => (
              <div
                key={row.name}
                className="px-5 py-3 flex items-center gap-4 hover:bg-gray-700/20 cursor-pointer transition-colors duration-200"
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${priorityColor[row.priority]}`}
                />
                <span className="text-sm font-medium text-white w-24 shrink-0">
                  {row.name}
                </span>
                <span className="text-sm text-white/60 flex-1">
                  {row.reason}
                </span>
                <span className="text-xs text-white/40 shrink-0">
                  {row.days}
                </span>
                <button className="text-green-400 text-xs hover:underline shrink-0">
                  Review
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Protocol Performance */}
        <div className="lg:col-span-2 bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-gray-700/50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Protocol Performance
            </h2>
            <div className="flex gap-1">
              {tabs.map((t) => (
                <button
                  key={t}
                  onClick={() => setProtocolTab(t)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 ${
                    protocolTab === t
                      ? "bg-green-400 text-gray-900"
                      : "text-white/40 hover:text-white/60"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={protocolData}
                layout="vertical"
                margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
              >
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={120}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#4ade80" />
                    <stop offset="100%" stopColor="#22c55e" />
                  </linearGradient>
                </defs>
                <Bar
                  dataKey="value"
                  fill="url(#barGradient)"
                  radius={[0, 4, 4, 0]}
                  barSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Genetic Insights */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Dna className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">
              Genetic Insights
            </h3>
          </div>
          <div className="flex justify-center mb-4">
            <div className="relative">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie
                    data={geneticData}
                    dataKey="value"
                    innerRadius={40}
                    outerRadius={60}
                    strokeWidth={0}
                  >
                    {geneticData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-white">147</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {geneticData.map((item) => (
              <div key={item.name} className="flex items-center gap-2 text-sm">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-white/60 flex-1">{item.name}</span>
                <span className="text-white/40 text-xs">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4">
            Recent Activity
          </h3>
          <div className="border-l-2 border-green-400/20 ml-3 space-y-4">
            {recentActivity.map((item, i) => (
              <div key={i} className="relative pl-5">
                <span className="absolute -left-[5px] top-1.5 w-2 h-2 bg-green-400 rounded-full" />
                <p className="text-xs text-white/40">{item.time}</p>
                <p className="text-sm text-white/80">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  className="bg-gray-700/30 hover:bg-green-400/10 border border-gray-700/50 hover:border-green-400/30 rounded-xl p-4 flex flex-col items-center gap-2 transition-all duration-200 cursor-pointer"
                >
                  <Icon className="w-6 h-6 text-green-400" />
                  <span className="text-xs text-white/60">{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
