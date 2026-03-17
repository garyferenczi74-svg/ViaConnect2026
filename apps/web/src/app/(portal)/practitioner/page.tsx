'use client';

import Link from 'next/link';

/* ─── Data ────────────────────────────────────────────────────────────────── */

const stats = [
  { label: 'Active Patients', value: '147', change: '↑12%', icon: 'group', color: 'bg-blue-500/15 text-blue-500 dark:bg-blue-500/20 dark:text-blue-400' },
  { label: 'Treatment Plans', value: '89 active', change: '↑8%', icon: 'assignment', color: 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' },
  { label: 'Avg Adherence', value: '78%', change: '↑5%', icon: 'vitals', color: 'bg-purple-500/15 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400' },
  { label: 'This Week', value: '23 appointments', change: '', icon: 'calendar_month', color: 'bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' },
];

const patients = [
  { name: 'Emma Thompson', initials: 'ET', score: 92, compliance: 94, lastActivity: '2h ago', alert: 'On track', alertColor: 'green' as const },
  { name: 'Michael Rodriguez', initials: 'MR', score: 78, compliance: 67, lastActivity: '5h ago', alert: 'Low compliance', alertColor: 'amber' as const },
  { name: 'Sarah Kim', initials: 'SK', score: 85, compliance: 88, lastActivity: '1d ago', alert: 'On track', alertColor: 'green' as const },
  { name: 'James Wilson', initials: 'JW', score: 71, compliance: 45, lastActivity: '3h ago', alert: 'Drug interaction', alertColor: 'red' as const },
  { name: 'Lisa Chen', initials: 'LC', score: 89, compliance: 91, lastActivity: '6h ago', alert: 'On track', alertColor: 'green' as const },
];

const alertColorMap = {
  green: { dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  amber: { dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  red: { dot: 'bg-red-500', text: 'text-red-600 dark:text-red-400', badge: 'bg-red-500/10 text-red-700 dark:text-red-300' },
};

const scoreColor = (s: number) =>
  s >= 85 ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' :
  s >= 70 ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' :
  'bg-red-500/15 text-red-700 dark:text-red-300';

const complianceBarColor = (c: number) =>
  c >= 80 ? 'bg-emerald-500' : c >= 60 ? 'bg-amber-500' : 'bg-red-500';

const needsAttention = [
  { patient: 'James Wilson', detail: 'Warfarin interaction detected', color: 'red' as const },
  { patient: 'Michael Rodriguez', detail: 'Missed 5 consecutive doses', color: 'amber' as const },
  { patient: 'Emma Thompson', detail: 'GENEX360 results ready', color: 'green' as const },
];

const geneticReports = [
  { patient: 'Emma Thompson', test: 'GENEX360 Complete' },
  { patient: 'David Park', test: 'GENEX-M' },
  { patient: 'Maria Gonzalez', test: 'HormoneIQ' },
];

const monthlyStats = [
  { label: 'New Patients', value: '12' },
  { label: 'Plans Created', value: '8' },
  { label: 'Formulations', value: '15' },
  { label: 'Genetic Analyses', value: '6' },
  { label: 'Revenue', value: '$12,847' },
];

/* ─── Component ───────────────────────────────────────────────────────────── */

export default function PractitionerDashboard() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* ── Row 1: Stat Cards ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white dark:bg-white/5 rounded-xl p-5 border border-slate-200 dark:border-white/10"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
                <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">{s.value}</p>
                {s.change && (
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{s.change}</span>
                )}
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${s.color}`}>
                <span className="material-symbols-outlined text-xl">{s.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Row 2: Two Columns ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT — Patient Overview (2/3) */}
        <div className="lg:col-span-2 bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
          <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-white/10">
            <h2 className="text-lg font-[Syne] font-bold text-slate-900 dark:text-white">Patient Overview</h2>
            <select className="text-sm bg-slate-100 dark:bg-white/10 border-0 rounded-lg px-3 py-1.5 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none">
              <option>All Patients</option>
              <option>Active</option>
              <option>Needs Attention</option>
            </select>
          </div>

          {/* Header Row */}
          <div className="hidden md:grid grid-cols-12 gap-2 px-5 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-white/5">
            <div className="col-span-3">Patient</div>
            <div className="col-span-2 text-center">Score</div>
            <div className="col-span-3">Compliance</div>
            <div className="col-span-1">Activity</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1"></div>
          </div>

          {/* Patient Rows */}
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {patients.map((p) => {
              const ac = alertColorMap[p.alertColor];
              return (
                <div
                  key={p.name}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center px-5 py-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                  {/* Avatar + Name */}
                  <div className="col-span-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-700 dark:text-emerald-300 flex-shrink-0">
                      {p.initials}
                    </div>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{p.name}</span>
                  </div>

                  {/* Score Badge */}
                  <div className="col-span-2 flex justify-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${scoreColor(p.score)}`}>
                      {p.score}
                    </span>
                  </div>

                  {/* Compliance Bar */}
                  <div className="col-span-3 flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${complianceBarColor(p.compliance)} transition-all`}
                        style={{ width: `${p.compliance}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300 w-8 text-right">{p.compliance}%</span>
                  </div>

                  {/* Last Activity */}
                  <div className="col-span-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{p.lastActivity}</span>
                  </div>

                  {/* Alert */}
                  <div className="col-span-2 flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${ac.dot}`} />
                    <span className={`text-xs font-medium ${ac.text}`}>{p.alert}</span>
                  </div>

                  {/* View Button */}
                  <div className="col-span-1 flex justify-end">
                    <button className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors">
                      View →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT — Stacked Cards (1/3) */}
        <div className="space-y-4">
          {/* Card 1 — Needs Attention */}
          <div className="bg-white dark:bg-white/5 rounded-xl p-5 border border-slate-200 dark:border-white/10">
            <h3 className="text-sm font-[Syne] font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-amber-500">warning</span>
              Needs Attention
            </h3>
            <div className="space-y-3">
              {needsAttention.map((a, i) => {
                const ac = alertColorMap[a.color];
                return (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${ac.dot}`} />
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{a.patient}</p>
                      <p className={`text-xs ${ac.text}`}>{a.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 2 — Genetic Reports Ready */}
          <div className="bg-white dark:bg-white/5 rounded-xl p-5 border border-slate-200 dark:border-white/10">
            <h3 className="text-sm font-[Syne] font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-emerald-500">genetics</span>
              Genetic Reports Ready
            </h3>
            <div className="space-y-3">
              {geneticReports.map((r, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{r.patient}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{r.test}</p>
                  </div>
                  <button className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors whitespace-nowrap">
                    Review Report
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3 — Monthly Stats */}
          <div className="bg-white dark:bg-white/5 rounded-xl p-5 border border-slate-200 dark:border-white/10">
            <h3 className="text-sm font-[Syne] font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-emerald-500">bar_chart</span>
              Monthly Stats
            </h3>
            <div className="space-y-2">
              {monthlyStats.map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">{s.label}</span>
                  <span className="text-sm font-mono font-bold text-slate-900 dark:text-white">{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 4 — CME Progress */}
          <div className="bg-white dark:bg-white/5 rounded-xl p-5 border border-slate-200 dark:border-white/10">
            <h3 className="text-sm font-[Syne] font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-emerald-500">school</span>
              CME Progress
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              3 of 5 AMA PRA Category 1 Credits&trade; earned
            </p>
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-500 dark:text-slate-400">Progress</span>
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">60%</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-white/10">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: '60%' }} />
              </div>
            </div>
            <button className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors">
              Continue Training →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
