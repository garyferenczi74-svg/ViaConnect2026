'use client';

import Link from 'next/link';
import {
  Users,
  Bell,
  GitBranch,
  CheckCircle2,
  FileText,
  AlertTriangle,
  Info,
} from 'lucide-react';

// ─── Mock Data ───────────────────────────────────────────────────────────────

const stats = [
  { label: 'Health Partners', value: '28', icon: Users, color: '#7BAE7F' },
  { label: 'Wellness Alerts', value: '4', icon: Bell, color: '#C4944A' },
  { label: 'Collaborative Updates', value: '2', icon: GitBranch, color: '#7BAE7F' },
  { label: 'Protocol Adherence', value: '92%', icon: CheckCircle2, color: '#27AE60' },
];

const wellnessAlerts = [
  {
    borderColor: '#C4944A',
    text: 'Emma W. — Methylation pathway bottleneck detected. MTHFR TT homozygous with elevated homocysteine (14.2 μmol/L).',
    badge: 'MTHFR TT',
    buttons: ['View Pathway', 'Update Plan'],
    icon: AlertTriangle,
  },
  {
    borderColor: '#7BAE7F',
    text: 'David L. — Practitioner Dr. Patel added lisinopril to medications. Herbal interaction check recommended.',
    badge: null,
    buttons: ['Check Interactions', 'View Notes'],
    icon: Info,
  },
];

const collaborativeTimeline = [
  {
    text: 'Dr. Patel prescribed MTHFR+ protocol for Emma W.',
    time: '2 hours ago',
    dotColor: '#3B82F6',
  },
  {
    text: 'You added complementary ashwagandha recommendation',
    time: 'Yesterday',
    dotColor: '#7BAE7F',
  },
  {
    text: 'Lab results ready for David L. — homocysteine panel',
    time: '2 days ago',
    dotColor: '#C4944A',
  },
];

const geneticResults = [
  { patient: 'Emma W.', panel: 'GeneX-M', finding: 'MTHFR TT — severe methylation impact', date: 'Mar 24' },
  { patient: 'David L.', panel: 'GeneX360', finding: 'CYP2D6 PM — poor metabolizer', date: 'Mar 22' },
  { patient: 'Sophie R.', panel: 'CannabisIQ', finding: 'CNR1 variant — enhanced response', date: 'Mar 20' },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function NaturopathDashboardPage() {
  return (
    <div
      className="min-h-screen px-4 md:px-6 lg:px-8 py-6 md:py-10"
      style={{ background: 'linear-gradient(180deg, #0D1520 0%, #121E1A 50%, #131D2E 100%)' }}
    >
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-heading-2" style={{ color: '#C4944A' }}>
            Welcome back
          </h1>
          <p className="text-body-sm text-secondary mt-1">
            Naturopathic Wellness Dashboard
          </p>
        </div>

        {/* Top Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="glass-v2 p-4 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${stat.color}15` }}
                  >
                    <Icon className="w-4.5 h-4.5" style={{ color: stat.color }} />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-white">{stat.value}</p>
                    <p className="text-xs text-secondary">{stat.label}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Wellness Alerts */}
        <div className="mb-8">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: '#C4944A' }}
          >
            Wellness Alerts
          </p>
          <div className="space-y-3">
            {wellnessAlerts.map((alert, i) => (
              <div
                key={i}
                className="glass-v2 p-4 rounded-xl"
                style={{ borderLeft: `3px solid ${alert.borderColor}` }}
              >
                <p className="text-body-sm text-secondary mb-2">{alert.text}</p>
                <div className="flex items-center gap-3 flex-wrap">
                  {alert.badge && (
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: '#7BAE7F20', color: '#7BAE7F' }}
                    >
                      {alert.badge}
                    </span>
                  )}
                  {alert.buttons.map((btn) => (
                    <button
                      key={btn}
                      className="text-xs font-medium transition-colors hover:opacity-80 min-h-[44px] sm:min-h-0"
                      style={{ color: '#7BAE7F' }}
                    >
                      {btn}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Collaborative Care */}
        <div className="mb-8">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: '#C4944A' }}
          >
            Collaborative Care
          </p>
          <div className="glass-v2 p-4 rounded-xl">
            <div className="space-y-3">
              {collaborativeTimeline.map((entry, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: entry.dotColor }}
                  />
                  <p className="text-xs text-white flex-1">{entry.text}</p>
                  <span className="text-xs text-secondary whitespace-nowrap">
                    {entry.time}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Genetic Results */}
        <div className="mb-8">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: '#C4944A' }}
          >
            Recent Genetic Results
          </p>
          <div className="glass-v2 rounded-xl overflow-hidden overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left text-xs font-medium text-secondary px-4 py-2.5">Patient</th>
                  <th className="text-left text-xs font-medium text-secondary px-4 py-2.5">Panel</th>
                  <th className="text-left text-xs font-medium text-secondary px-4 py-2.5">Key Finding</th>
                  <th className="text-left text-xs font-medium text-secondary px-4 py-2.5">Date</th>
                </tr>
              </thead>
              <tbody>
                {geneticResults.map((row, i) => (
                  <tr
                    key={i}
                    className={i < geneticResults.length - 1 ? 'border-b border-white/[0.04]' : ''}
                  >
                    <td className="text-sm text-white px-4 py-2.5">{row.patient}</td>
                    <td className="text-sm text-secondary font-mono px-4 py-2.5">{row.panel}</td>
                    <td className="text-sm text-secondary px-4 py-2.5">{row.finding}</td>
                    <td className="text-xs text-secondary px-4 py-2.5">{row.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: '#C4944A' }}
          >
            Quick Actions
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/naturopath/botanical"
              className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #7BAE7F, #5E9462)' }}
            >
              Herbal-Genomic Database
            </Link>
            <button
              className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-lg text-sm font-medium border transition-colors hover:bg-white/[0.04]"
              style={{ borderColor: '#7BAE7F50', color: '#7BAE7F' }}
            >
              Methylation Explorer
            </button>
            <button
              className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-lg text-sm font-medium text-secondary transition-colors hover:bg-white/[0.04]"
            >
              <FileText className="w-4 h-4" />
              New Intake Form
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
