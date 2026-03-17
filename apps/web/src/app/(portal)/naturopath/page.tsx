'use client';

import Link from 'next/link';

/* ─── Data ────────────────────────────────────────────────────────────────── */

const stats = [
  { label: 'Active Patients', value: '83', change: '↑9%', icon: 'group' },
  { label: 'Formulations', value: '42 active', change: '↑15%', icon: 'science' },
  { label: 'Avg Adherence', value: '81%', change: '↑7%', icon: 'vitals' },
  { label: 'This Week', value: '18 appointments', change: '', icon: 'calendar_month' },
];

const patients = [
  { name: 'Anita Sharma', initials: 'AS', score: 92, compliance: 94, lastActivity: '2h ago', alert: 'On track', alertColor: 'green' as const, constitution: 'Vata-Pitta', phase: 'Phase 3' },
  { name: 'Marcus Lee', initials: 'ML', score: 78, compliance: 67, lastActivity: '5h ago', alert: 'Low compliance', alertColor: 'amber' as const, constitution: 'Pitta-Kapha', phase: 'Phase 2' },
  { name: 'Sarah Jennings', initials: 'SJ', score: 85, compliance: 88, lastActivity: '1d ago', alert: 'On track', alertColor: 'green' as const, constitution: 'Kapha-Vata', phase: 'Phase 4' },
  { name: 'David Okonkwo', initials: 'DO', score: 71, compliance: 45, lastActivity: '3h ago', alert: 'Herb interaction', alertColor: 'red' as const, constitution: 'Pitta', phase: 'Phase 1' },
  { name: 'Elena Vasquez', initials: 'EV', score: 89, compliance: 91, lastActivity: '6h ago', alert: 'On track', alertColor: 'green' as const, constitution: 'Vata', phase: 'Phase 3' },
];

const alertColorMap = {
  green: { dot: 'bg-emerald-500', text: 'text-emerald-400' },
  amber: { dot: 'bg-amber-500', text: 'text-amber-400' },
  red: { dot: 'bg-red-500', text: 'text-red-400' },
};

const scoreColor = (s: number) =>
  s >= 85 ? 'bg-emerald-500/15 text-emerald-300' :
  s >= 70 ? 'bg-amber-500/15 text-amber-300' :
  'bg-red-500/15 text-red-300';

const complianceBarColor = (c: number) =>
  c >= 80 ? 'bg-emerald-500' : c >= 60 ? 'bg-amber-500' : 'bg-red-500';

const therapeuticPhases = [
  { phase: 1, name: 'Remove Obstacles', status: 'complete' as const },
  { phase: 2, name: 'Stimulate Healing', status: 'complete' as const },
  { phase: 3, name: 'Support Systems', status: 'in-progress' as const },
  { phase: 4, name: 'Correct Structural', status: 'upcoming' as const },
  { phase: 5, name: 'Natural Substance', status: 'upcoming' as const },
  { phase: 6, name: 'Pharmacologic', status: 'upcoming' as const },
];

const formulations = [
  { name: 'Constitutional Liver Support', form: 'Tincture', practitioner: 'Dr. Chen', herbs: 'Milk Thistle + Artichoke + Turmeric', amount: '100ml' },
  { name: 'Adrenal Restore Protocol', form: 'Capsule', practitioner: 'Dr. Patel', herbs: 'Rhodiola + Ashwagandha + B5', amount: '60 caps' },
  { name: 'Sleep Harmony Blend', form: 'Tea', practitioner: 'Dr. Chen', herbs: 'Valerian + Passionflower + Chamomile', amount: '100g' },
];

const herbGeneAlerts = [
  { herb: "St. John's Wort", gene: 'CYP3A4', severity: 'MAJOR', color: 'red' as const },
  { herb: 'Green tea', gene: 'CYP1A2', severity: 'MODERATE', color: 'amber' as const },
];

const researchItems = [
  { title: 'Ashwagandha root extract in stress management: A double-blind RCT', source: 'PubMed', date: 'Mar 2026' },
  { title: 'Curcumin bioavailability enhanced by piperine co-administration', source: 'OpenEvidence', date: 'Feb 2026' },
];

/* ─── Component ───────────────────────────────────────────────────────────── */

export default function NaturopathDashboard() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* ── Row 1: Stat Cards ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white/5 rounded-xl p-5 border border-white/10"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-400">{s.label}</p>
                <p className="text-2xl font-bold font-mono text-white mt-1">{s.value}</p>
                {s.change && (
                  <span className="text-xs font-medium text-amber-400">{s.change}</span>
                )}
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-500/15 text-amber-400">
                <span className="material-symbols-outlined text-xl">{s.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Row 2: Two Columns ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT — Patient Overview (2/3) */}
        <div className="lg:col-span-2 bg-white/5 rounded-xl border border-white/10">
          <div className="flex items-center justify-between p-5 border-b border-white/10">
            <h2 className="text-lg font-[Syne] font-bold text-white">Patient Overview</h2>
            <select className="text-sm bg-white/10 border-0 rounded-lg px-3 py-1.5 text-slate-300 focus:ring-2 focus:ring-amber-500 outline-none">
              <option>All Patients</option>
              <option>Active</option>
              <option>Needs Attention</option>
            </select>
          </div>

          {/* Header Row */}
          <div className="hidden md:grid grid-cols-12 gap-2 px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider border-b border-white/5">
            <div className="col-span-3">Patient</div>
            <div className="col-span-1 text-center">Score</div>
            <div className="col-span-2">Compliance</div>
            <div className="col-span-1">Activity</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Type / Phase</div>
            <div className="col-span-1"></div>
          </div>

          {/* Patient Rows */}
          <div className="divide-y divide-white/5">
            {patients.map((p) => {
              const ac = alertColorMap[p.alertColor];
              return (
                <div
                  key={p.name}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center px-5 py-4 hover:bg-white/5 transition-colors"
                >
                  {/* Avatar + Name */}
                  <div className="col-span-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-amber-500/15 flex items-center justify-center text-xs font-bold text-amber-300 flex-shrink-0">
                      {p.initials}
                    </div>
                    <span className="text-sm font-medium text-white">{p.name}</span>
                  </div>

                  {/* Score Badge */}
                  <div className="col-span-1 flex justify-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${scoreColor(p.score)}`}>
                      {p.score}
                    </span>
                  </div>

                  {/* Compliance Bar */}
                  <div className="col-span-2 flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${complianceBarColor(p.compliance)} transition-all`}
                        style={{ width: `${p.compliance}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono font-medium text-slate-300 w-8 text-right">{p.compliance}%</span>
                  </div>

                  {/* Last Activity */}
                  <div className="col-span-1">
                    <span className="text-xs text-slate-400">{p.lastActivity}</span>
                  </div>

                  {/* Alert */}
                  <div className="col-span-2 flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${ac.dot}`} />
                    <span className={`text-xs font-medium ${ac.text}`}>{p.alert}</span>
                  </div>

                  {/* Constitution + Phase */}
                  <div className="col-span-2 flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-300">
                      {p.constitution}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-slate-300">
                      {p.phase}
                    </span>
                  </div>

                  {/* View Button */}
                  <div className="col-span-1 flex justify-end">
                    <button className="text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors">
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
          {/* Card 1 — Therapeutic Order Tracker */}
          <div className="bg-white/5 rounded-xl p-5 border border-white/10">
            <h3 className="text-sm font-[Syne] font-bold text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-amber-400">timeline</span>
              Therapeutic Order Tracker
            </h3>
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-white/10" />

              <div className="space-y-3">
                {therapeuticPhases.map((tp) => {
                  const isComplete = tp.status === 'complete';
                  const isActive = tp.status === 'in-progress';
                  return (
                    <div key={tp.phase} className="relative flex items-center gap-3">
                      {/* Dot */}
                      <div
                        className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isComplete
                            ? 'bg-emerald-500/20 border-2 border-emerald-500'
                            : isActive
                              ? 'bg-amber-500/20 border-2 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                              : 'bg-white/5 border-2 border-white/20'
                        }`}
                      >
                        {isComplete ? (
                          <span className="material-symbols-outlined text-sm text-emerald-500">check</span>
                        ) : isActive ? (
                          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        ) : null}
                      </div>

                      {/* Label */}
                      <div className={`flex-1 flex items-center justify-between py-1.5 px-3 rounded-lg ${
                        isActive ? 'bg-amber-500/10 border border-amber-500/20' : ''
                      }`}>
                        <div>
                          <span className="text-[10px] text-slate-500">Phase {tp.phase}</span>
                          <p className={`text-sm font-medium ${
                            isComplete ? 'text-emerald-400' : isActive ? 'text-amber-400' : 'text-slate-500'
                          }`}>
                            {tp.name}
                          </p>
                        </div>
                        <span className={`text-[10px] font-medium ${
                          isComplete ? 'text-emerald-400' : isActive ? 'text-amber-400' : 'text-slate-500'
                        }`}>
                          {isComplete ? 'Complete' : isActive ? 'In Progress' : 'Upcoming'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3">3 patients in Phase 3 this week</p>
          </div>

          {/* Card 2 — Recent Formulations */}
          <div className="bg-white/5 rounded-xl p-5 border border-white/10">
            <h3 className="text-sm font-[Syne] font-bold text-white mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-amber-400">science</span>
              Recent Formulations
            </h3>
            <div className="space-y-3">
              {formulations.map((f, i) => (
                <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/5">
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-sm font-medium text-white">{f.name}</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-300">
                      {f.form}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{f.practitioner}</p>
                  <p className="text-xs text-slate-500 mt-1">{f.herbs} &middot; {f.amount}</p>
                </div>
              ))}
            </div>
            <Link href="/naturopath/formulations/builder" className="block mt-3 text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors">
              View All Formulations →
            </Link>
          </div>

          {/* Card 3 — Herb-Gene Alerts */}
          <div className="bg-white/5 rounded-xl p-5 border border-white/10">
            <h3 className="text-sm font-[Syne] font-bold text-white mb-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-red-400">warning</span>
              Herb-Gene Alerts
            </h3>
            <p className="text-xs text-slate-400 mb-3">2 herb-gene interactions detected this week</p>
            <div className="space-y-2.5">
              {herbGeneAlerts.map((a, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${a.color === 'red' ? 'bg-red-500' : 'bg-amber-500'}`} />
                  <div className="flex-1">
                    <p className="text-sm text-white">
                      {a.herb} + <span className="font-mono text-xs">{a.gene}</span>
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    a.color === 'red' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'
                  }`}>
                    {a.severity}
                  </span>
                </div>
              ))}
            </div>
            <button className="mt-3 text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors">
              Review Interactions →
            </button>
          </div>

          {/* Card 4 — Research Digest */}
          <div className="bg-white/5 rounded-xl p-5 border border-white/10">
            <h3 className="text-sm font-[Syne] font-bold text-white mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-amber-400">menu_book</span>
              Research Digest
            </h3>
            <div className="space-y-3">
              {researchItems.map((r, i) => (
                <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/5">
                  <p className="text-sm text-white leading-snug mb-1.5">{r.title}</p>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                      r.source === 'PubMed' ? 'bg-blue-500/15 text-blue-400' : 'bg-emerald-500/15 text-emerald-400'
                    }`}>
                      {r.source}
                    </span>
                    <span className="text-[10px] text-slate-500">{r.date}</span>
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-3 text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors">
              View Research Feed →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
