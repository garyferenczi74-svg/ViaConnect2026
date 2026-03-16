'use client';

import { useContext } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Badge,
  Button,
  glassClasses,
} from '@genex360/ui';
import { PractitionerThemeContext } from './theme-context';

// ─── Animation helpers ───────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: 'easeOut' },
  }),
};

// ─── Mock Data ───────────────────────────────────────────────
const keyMetrics = [
  {
    label: 'Active Patients',
    value: '147',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    label: 'Treatment Plans',
    value: '89',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
      </svg>
    ),
  },
  {
    label: 'Avg Adherence',
    value: '78%',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: "This Week's Appointments",
    value: '12',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
  },
];

const patients = [
  { name: 'Maria Santos', score: 92, compliance: 95, lastActivity: 'Mar 15, 2026', risk: 'green' as const },
  { name: 'James Kim', score: 78, compliance: 62, lastActivity: 'Mar 14, 2026', risk: 'yellow' as const },
  { name: 'Robert Chen', score: 85, compliance: 88, lastActivity: 'Mar 16, 2026', risk: 'green' as const },
  { name: 'Lisa Park', score: 71, compliance: 45, lastActivity: 'Mar 10, 2026', risk: 'red' as const },
  { name: 'David Miller', score: 88, compliance: 91, lastActivity: 'Mar 15, 2026', risk: 'green' as const },
  { name: 'Ana Rodriguez', score: 65, compliance: 38, lastActivity: 'Mar 12, 2026', risk: 'yellow' as const },
];

const riskConfig = {
  green: { label: 'On Track', borderClass: 'border-emerald-500/20', badgeVariant: 'success' as const },
  yellow: { label: 'Low Compliance', borderClass: 'border-amber-500/20', badgeVariant: 'warning' as const },
  red: { label: 'Interaction Alert', borderClass: 'border-red-500/20', badgeVariant: 'error' as const },
};

const complianceData = [
  { month: 'Oct', compliance: 68 },
  { month: 'Nov', compliance: 72 },
  { month: 'Dec', compliance: 74 },
  { month: 'Jan', compliance: 76 },
  { month: 'Feb', compliance: 78 },
  { month: 'Mar', compliance: 82 },
];

const quickActions = [
  {
    label: 'Add Patient',
    href: '/practitioner/patients',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
      </svg>
    ),
  },
  {
    label: 'Generate Report',
    href: '/practitioner/reports',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    label: 'View Interactions',
    href: '/practitioner/interactions',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
  },
  {
    label: 'Order for Patient',
    href: '/practitioner/billing',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
      </svg>
    ),
  },
];

const cmeModules = [
  { title: 'Nutrigenomics Fundamentals', status: 'completed' as const },
  { title: 'Drug-Supplement Interactions', status: 'in-progress' as const },
  { title: 'Pharmacogenomics in Practice', status: 'locked' as const },
];

// ─── Page Component ──────────────────────────────────────────
export default function PractitionerDashboard() {
  const { theme } = useContext(PractitionerThemeContext);
  const isDark = theme === 'dark';

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Reusable style helpers
  const cardClass = isDark
    ? `${glassClasses.dark} rounded-2xl`
    : 'bg-white border border-slate-200 shadow-sm rounded-2xl';

  const headingClass = isDark ? 'text-white' : 'text-slate-900';
  const subClass = isDark ? 'text-slate-400' : 'text-slate-500';
  const textClass = isDark ? 'text-slate-300' : 'text-slate-700';

  return (
    <div className="space-y-8 pb-12">
      {/* ─── 1. Welcome Banner ─────────────────────────────── */}
      <motion.section
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={0}
      >
        <div className={`${cardClass} p-6`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
            <div>
              <h1 className={`text-2xl font-bold ${headingClass}`}>
                Welcome back, Dr. Sarah Chen
              </h1>
              <p className={`text-sm mt-1 ${subClass}`}>{today}</p>
            </div>
            <Badge variant="success" className="self-start">
              GeneX360 Pro
            </Badge>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {keyMetrics.map((metric, i) => (
              <motion.div
                key={metric.label}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={i + 1}
                className={`flex items-center gap-3 p-4 rounded-xl ${
                  isDark
                    ? 'bg-white/5 border border-white/10'
                    : 'bg-slate-50 border border-slate-100'
                }`}
              >
                <div
                  className={`flex-shrink-0 p-2.5 rounded-lg ${
                    isDark
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-emerald-50 text-emerald-600'
                  }`}
                >
                  {metric.icon}
                </div>
                <div>
                  <p className={`text-2xl font-bold ${headingClass}`}>{metric.value}</p>
                  <p className={`text-xs ${subClass}`}>{metric.label}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ─── 2. Patient Overview Grid ──────────────────────── */}
      <motion.section
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={2}
      >
        <h2 className={`text-lg font-semibold mb-4 ${headingClass}`}>
          Patient Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {patients.map((patient, i) => {
            const risk = riskConfig[patient.risk];
            return (
              <motion.div
                key={patient.name}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={i + 3}
              >
                <Card
                  className={`${cardClass} ${risk.borderClass} overflow-hidden`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className={`text-base ${headingClass}`}>
                        {patient.name}
                      </CardTitle>
                      <Badge variant={risk.badgeVariant}>{risk.label}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Personalization Score */}
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${subClass}`}>Personalization Score</span>
                      <span className={`text-sm font-semibold ${headingClass}`}>
                        {patient.score}/100
                      </span>
                    </div>
                    <div
                      className={`w-full h-2 rounded-full ${
                        isDark ? 'bg-white/10' : 'bg-slate-100'
                      }`}
                    >
                      <div
                        className="h-2 rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${patient.score}%` }}
                      />
                    </div>

                    {/* Compliance */}
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${subClass}`}>Protocol Compliance</span>
                      <span
                        className={`text-sm font-semibold ${
                          patient.compliance >= 80
                            ? 'text-emerald-500'
                            : patient.compliance >= 60
                              ? 'text-amber-500'
                              : 'text-red-500'
                        }`}
                      >
                        {patient.compliance}%
                      </span>
                    </div>

                    {/* Last Activity */}
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${subClass}`}>Last Activity</span>
                      <span className={`text-sm ${textClass}`}>
                        {patient.lastActivity}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      {/* ─── 3. Population Health Panel ────────────────────── */}
      <motion.section
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={9}
      >
        <div className={`${cardClass} p-6`}>
          <h2 className={`text-lg font-semibold mb-4 ${headingClass}`}>
            Population Insights
          </h2>

          {/* Mini stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {[
              { label: 'MTHFR Variants', value: '34%', sub: 'of patients' },
              { label: 'Avg Protocol Compliance', value: '78%', sub: 'across cohort' },
              { label: 'Improved Outcomes', value: '89%', sub: 'last quarter' },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`p-4 rounded-xl text-center ${
                  isDark
                    ? 'bg-white/5 border border-white/10'
                    : 'bg-slate-50 border border-slate-100'
                }`}
              >
                <p className={`text-2xl font-bold text-emerald-500`}>{stat.value}</p>
                <p className={`text-sm font-medium ${headingClass}`}>{stat.label}</p>
                <p className={`text-xs ${subClass}`}>{stat.sub}</p>
              </div>
            ))}
          </div>

          {/* Bar chart */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={complianceData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#1e293b' : '#ffffff',
                    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
                    borderRadius: '0.75rem',
                    color: isDark ? '#e2e8f0' : '#1e293b',
                  }}
                  formatter={(value: number) => [`${value}%`, 'Compliance']}
                />
                <Bar
                  dataKey="compliance"
                  fill="#10B981"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.section>

      {/* ─── 4. Quick Actions ──────────────────────────────── */}
      <motion.section
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={10}
      >
        <h2 className={`text-lg font-semibold mb-4 ${headingClass}`}>
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, i) => (
            <Link key={action.label} href={action.href}>
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={i + 11}
                className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all ${
                  isDark
                    ? 'bg-white/5 border border-white/10 hover:bg-emerald-500/10 hover:border-emerald-500/20 text-slate-300 hover:text-emerald-300'
                    : 'bg-white border border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 text-slate-700 hover:text-emerald-700 shadow-sm'
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    isDark
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-emerald-50 text-emerald-600'
                  }`}
                >
                  {action.icon}
                </div>
                <span className="text-sm font-medium">{action.label}</span>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.section>

      {/* ─── Bottom Row: Billing + CME side by side ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─── 5. Billing Summary ────────────────────────── */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={15}
        >
          <div className={`${cardClass} p-6 h-full`}>
            <h2 className={`text-lg font-semibold mb-4 ${headingClass}`}>
              Billing Summary
            </h2>
            <div className="space-y-4">
              {/* Revenue */}
              <div className="flex items-center justify-between">
                <span className={`text-sm ${subClass}`}>Monthly Revenue</span>
                <span className={`text-xl font-bold text-emerald-500`}>$45,230</span>
              </div>

              {/* Wholesale Margin */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm ${subClass}`}>Wholesale Margin</span>
                  <span className={`text-sm font-semibold ${headingClass}`}>35%</span>
                </div>
                <div
                  className={`w-full h-2 rounded-full ${
                    isDark ? 'bg-white/10' : 'bg-slate-100'
                  }`}
                >
                  <div
                    className="h-2 rounded-full bg-emerald-500"
                    style={{ width: '35%' }}
                  />
                </div>
              </div>

              {/* Pending Invoices */}
              <div className="flex items-center justify-between">
                <span className={`text-sm ${subClass}`}>Pending Invoices</span>
                <Badge variant="warning">8</Badge>
              </div>

              {/* Generate Invoice Button */}
              <Link href="/practitioner/billing">
                <Button
                  variant="primary"
                  className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700"
                >
                  Generate Invoice
                </Button>
              </Link>
            </div>
          </div>
        </motion.section>

        {/* ─── 6. CME Module ─────────────────────────────── */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={16}
        >
          <div className={`${cardClass} p-6 h-full`}>
            <h2 className={`text-lg font-semibold mb-1 ${headingClass}`}>
              Continuing Education
            </h2>
            <p className={`text-sm mb-4 ${subClass}`}>
              3/5 AMA PRA Category 1 Credits&trade; completed
            </p>

            {/* Progress bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs ${subClass}`}>Progress</span>
                <span className={`text-xs font-semibold ${headingClass}`}>60%</span>
              </div>
              <div
                className={`w-full h-2.5 rounded-full ${
                  isDark ? 'bg-white/10' : 'bg-slate-100'
                }`}
              >
                <div
                  className="h-2.5 rounded-full bg-emerald-500 transition-all"
                  style={{ width: '60%' }}
                />
              </div>
            </div>

            {/* Module list */}
            <div className="space-y-3">
              {cmeModules.map((mod) => (
                <div
                  key={mod.title}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    isDark
                      ? 'bg-white/5 border border-white/10'
                      : 'bg-slate-50 border border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {mod.status === 'completed' ? (
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      </div>
                    ) : mod.status === 'in-progress' ? (
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      </div>
                    ) : (
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          isDark ? 'bg-white/10' : 'bg-slate-200'
                        }`}
                      >
                        <svg
                          className={`w-3.5 h-3.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                      </div>
                    )}
                    <span
                      className={`text-sm font-medium ${
                        mod.status === 'locked'
                          ? isDark
                            ? 'text-slate-500'
                            : 'text-slate-400'
                          : textClass
                      }`}
                    >
                      {mod.title}
                    </span>
                  </div>
                  <Badge
                    variant={
                      mod.status === 'completed'
                        ? 'success'
                        : mod.status === 'in-progress'
                          ? 'warning'
                          : 'default'
                    }
                  >
                    {mod.status === 'completed'
                      ? 'Completed'
                      : mod.status === 'in-progress'
                        ? 'In Progress'
                        : 'Locked'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
