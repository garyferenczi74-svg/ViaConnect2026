'use client';

import { useContext } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
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
import { NaturopathThemeContext } from './theme-context';

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
    value: '89',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    label: 'Active Formulations',
    value: '34',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 5.88c.068.285-.032.58-.247.778a.776.776 0 01-.543.194h-2.796a.543.543 0 01-.536-.464L16.5 18.5m-9 0l-.58 3.187a.543.543 0 01-.536.464H3.588a.776.776 0 01-.543-.194.776.776 0 01-.247-.778L4.2 15.3" />
      </svg>
    ),
  },
  {
    label: 'Herb Library',
    value: '500+',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
      </svg>
    ),
  },
  {
    label: "This Week's Consults",
    value: '8',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
  },
];

const patients = [
  { name: 'Anita Sharma', constitution: 'Vata-Pitta', compliance: 92, lastVisit: 'Mar 14, 2026', status: 'On Track' as const },
  { name: 'Marcus Lee', constitution: 'Pitta-Kapha', compliance: 67, lastVisit: 'Mar 12, 2026', status: 'Needs Attention' as const },
  { name: 'Sarah Jennings', constitution: 'Kapha-Vata', compliance: 88, lastVisit: 'Mar 15, 2026', status: 'On Track' as const },
  { name: 'David Okonkwo', constitution: 'Pitta', compliance: 45, lastVisit: 'Mar 8, 2026', status: 'At Risk' as const },
  { name: 'Elena Vasquez', constitution: 'Vata', compliance: 95, lastVisit: 'Mar 16, 2026', status: 'On Track' as const },
  { name: 'James Mitchell', constitution: 'Kapha-Pitta', compliance: 72, lastVisit: 'Mar 11, 2026', status: 'Needs Attention' as const },
];

const statusConfig = {
  'On Track': { badgeVariant: 'success' as const, borderClass: 'border-emerald-500/20' },
  'Needs Attention': { badgeVariant: 'warning' as const, borderClass: 'border-amber-500/20' },
  'At Risk': { badgeVariant: 'error' as const, borderClass: 'border-red-500/20' },
};

const therapeuticPhases = [
  { phase: 1, name: 'Remove Obstacles to Health', status: 'completed' as const, patients: 24 },
  { phase: 2, name: 'Stimulate the Healing Power', status: 'in-progress' as const, patients: 31 },
  { phase: 3, name: 'Support Weakened Systems', status: 'pending' as const, patients: 18 },
  { phase: 4, name: 'Correct Structural Integrity', status: 'pending' as const, patients: 9 },
  { phase: 5, name: 'Natural Substances', status: 'pending' as const, patients: 5 },
  { phase: 6, name: 'Pharmacologic Substances', status: 'pending' as const, patients: 2 },
];

const quickActions = [
  {
    label: 'New Formulation',
    href: '/naturopath/formulations/builder',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    ),
  },
  {
    label: 'Herb Lookup',
    href: '/naturopath/herbs',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
  },
  {
    label: 'View Interactions',
    href: '/naturopath/interactions',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
  },
  {
    label: 'Import Labs',
    href: '/naturopath/labs',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
    ),
  },
];

const recentFormulations = [
  { name: 'Ashwagandha Calm Blend', form: 'Tincture', herbCount: 5, patient: 'Anita Sharma', date: 'Mar 15, 2026', status: 'Active' as const },
  { name: 'Digestive Support Formula', form: 'Capsule', herbCount: 8, patient: 'Marcus Lee', date: 'Mar 14, 2026', status: 'Dispensed' as const },
  { name: 'Liver Detox Tea', form: 'Tea', herbCount: 6, patient: 'Elena Vasquez', date: 'Mar 13, 2026', status: 'Draft' as const },
];

const formulationStatusConfig = {
  Active: 'success' as const,
  Dispensed: 'default' as const,
  Draft: 'warning' as const,
};

const upcomingConsults = [
  { time: '9:00 AM', patient: 'Anita Sharma', type: 'Follow-up' },
  { time: '10:30 AM', patient: 'James Mitchell', type: 'Lab Review' },
  { time: '1:00 PM', patient: 'New Patient - R. Kline', type: 'Initial' },
  { time: '3:30 PM', patient: 'David Okonkwo', type: 'Follow-up' },
];

// ─── Page Component ──────────────────────────────────────────
export default function NaturopathDashboard() {
  const { theme } = useContext(NaturopathThemeContext);
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
                Welcome back, Dr. Maya Patel, ND
              </h1>
              <p className={`text-sm mt-1 ${subClass}`}>{today}</p>
            </div>
            <Badge variant="warning" className="self-start">
              GeneX360 Naturopath
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
                      ? 'bg-amber-500/15 text-amber-400'
                      : 'bg-amber-50 text-amber-600'
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
            const config = statusConfig[patient.status];
            return (
              <motion.div
                key={patient.name}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={i + 3}
              >
                <Card
                  className={`${cardClass} ${config.borderClass} overflow-hidden`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className={`text-base ${headingClass}`}>
                        {patient.name}
                      </CardTitle>
                      <Badge variant={config.badgeVariant}>{patient.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Constitutional Type */}
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${subClass}`}>Constitutional Type</span>
                      <span className={`text-sm font-semibold text-amber-500`}>
                        {patient.constitution}
                      </span>
                    </div>

                    {/* Protocol Compliance */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
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
                      <div
                        className={`w-full h-2 rounded-full ${
                          isDark ? 'bg-white/10' : 'bg-slate-100'
                        }`}
                      >
                        <div
                          className={`h-2 rounded-full transition-all ${
                            patient.compliance >= 80
                              ? 'bg-emerald-500'
                              : patient.compliance >= 60
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                          }`}
                          style={{ width: `${patient.compliance}%` }}
                        />
                      </div>
                    </div>

                    {/* Last Visit */}
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${subClass}`}>Last Visit</span>
                      <span className={`text-sm ${textClass}`}>
                        {patient.lastVisit}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      {/* ─── 3. Constitutional Assessment + Therapeutic Order ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Constitutional Assessment Widget */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={9}
        >
          <div className={`${cardClass} p-6 h-full`}>
            <h2 className={`text-lg font-semibold mb-4 ${headingClass}`}>
              Constitutional Assessment
            </h2>

            {/* Ayurvedic Dosha Distribution */}
            <div className="mb-6">
              <h3 className={`text-sm font-medium mb-3 ${subClass}`}>
                Ayurvedic Dosha Distribution (Patient Avg)
              </h3>
              <div className="space-y-3">
                {/* Vata */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${textClass}`}>Vata</span>
                    <span className={`text-sm font-semibold text-blue-400`}>35%</span>
                  </div>
                  <div className={`w-full h-3 rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
                    <div className="h-3 rounded-full bg-blue-500 transition-all" style={{ width: '35%' }} />
                  </div>
                </div>
                {/* Pitta */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${textClass}`}>Pitta</span>
                    <span className={`text-sm font-semibold text-red-400`}>45%</span>
                  </div>
                  <div className={`w-full h-3 rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
                    <div className="h-3 rounded-full bg-red-500 transition-all" style={{ width: '45%' }} />
                  </div>
                </div>
                {/* Kapha */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${textClass}`}>Kapha</span>
                    <span className={`text-sm font-semibold text-green-400`}>20%</span>
                  </div>
                  <div className={`w-full h-3 rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
                    <div className="h-3 rounded-full bg-green-500 transition-all" style={{ width: '20%' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* TCM Five Element */}
            <div className="mb-6">
              <h3 className={`text-sm font-medium mb-3 ${subClass}`}>
                TCM Five Element
              </h3>
              <div className={`flex gap-3`}>
                <div
                  className={`flex-1 p-3 rounded-xl text-center ${
                    isDark ? 'bg-white/5 border border-white/10' : 'bg-slate-50 border border-slate-100'
                  }`}
                >
                  <p className={`text-xs ${subClass}`}>Primary</p>
                  <p className={`text-sm font-bold text-emerald-500`}>Wood</p>
                </div>
                <div
                  className={`flex-1 p-3 rounded-xl text-center ${
                    isDark ? 'bg-white/5 border border-white/10' : 'bg-slate-50 border border-slate-100'
                  }`}
                >
                  <p className={`text-xs ${subClass}`}>Secondary</p>
                  <p className={`text-sm font-bold text-red-400`}>Fire</p>
                </div>
              </div>
            </div>

            {/* Patients by Constitution - visual */}
            <div className="mb-4">
              <h3 className={`text-sm font-medium mb-3 ${subClass}`}>
                Current Patients by Constitution
              </h3>
              <div className="flex gap-1 h-8 rounded-lg overflow-hidden">
                <div className="bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white" style={{ width: '35%' }}>
                  Vata 31
                </div>
                <div className="bg-red-500 flex items-center justify-center text-[10px] font-bold text-white" style={{ width: '45%' }}>
                  Pitta 40
                </div>
                <div className="bg-green-500 flex items-center justify-center text-[10px] font-bold text-white" style={{ width: '20%' }}>
                  Kapha 18
                </div>
              </div>
            </div>

            {/* Assessment Completion */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm ${subClass}`}>Assessment Completion Rate</span>
                <span className={`text-sm font-semibold text-amber-500`}>87%</span>
              </div>
              <div className={`w-full h-2 rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
                <div className="h-2 rounded-full bg-amber-500 transition-all" style={{ width: '87%' }} />
              </div>
            </div>
          </div>
        </motion.section>

        {/* Therapeutic Order Progress Tracker */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={10}
        >
          <div className={`${cardClass} p-6 h-full`}>
            <h2 className={`text-lg font-semibold mb-1 ${headingClass}`}>
              Therapeutic Order Progress
            </h2>
            <p className={`text-sm mb-5 ${subClass}`}>
              Patient distribution across the naturopathic therapeutic order
            </p>

            <div className="relative">
              {/* Vertical connection line */}
              <div
                className={`absolute left-[15px] top-3 bottom-3 w-0.5 ${
                  isDark ? 'bg-white/10' : 'bg-slate-200'
                }`}
              />

              <div className="space-y-4">
                {therapeuticPhases.map((phase) => {
                  const isCompleted = phase.status === 'completed';
                  const isInProgress = phase.status === 'in-progress';
                  return (
                    <div key={phase.phase} className="relative flex items-start gap-4">
                      {/* Dot */}
                      <div
                        className={`relative z-10 w-[30px] h-[30px] rounded-full flex items-center justify-center flex-shrink-0 ${
                          isCompleted
                            ? 'bg-emerald-500/20 border-2 border-emerald-500'
                            : isInProgress
                              ? `bg-amber-500/20 border-2 border-amber-500 ${isDark ? 'shadow-[0_0_12px_rgba(245,158,11,0.3)]' : 'shadow-[0_0_12px_rgba(245,158,11,0.2)]'}`
                              : isDark
                                ? 'bg-white/5 border-2 border-white/20'
                                : 'bg-slate-50 border-2 border-slate-300'
                        }`}
                      >
                        {isCompleted ? (
                          <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        ) : isInProgress ? (
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                        ) : (
                          <span className={`text-xs font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            {phase.phase}
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div
                        className={`flex-1 p-3 rounded-xl transition-all ${
                          isInProgress
                            ? isDark
                              ? 'bg-amber-500/10 border border-amber-500/20'
                              : 'bg-amber-50 border border-amber-200'
                            : isDark
                              ? 'bg-white/5 border border-white/10'
                              : 'bg-slate-50 border border-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`text-xs ${subClass}`}>Phase {phase.phase}</p>
                            <p
                              className={`text-sm font-medium ${
                                isInProgress
                                  ? 'text-amber-500'
                                  : isCompleted
                                    ? isDark
                                      ? 'text-emerald-400'
                                      : 'text-emerald-600'
                                    : textClass
                              }`}
                            >
                              {phase.name}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-bold ${headingClass}`}>{phase.patients}</p>
                            <p className={`text-[10px] ${subClass}`}>patients</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.section>
      </div>

      {/* ─── 4. Quick Actions ──────────────────────────────── */}
      <motion.section
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={11}
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
                custom={i + 12}
                className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all ${
                  isDark
                    ? 'bg-white/5 border border-white/10 hover:bg-amber-500/10 hover:border-amber-500/20 text-slate-300 hover:text-amber-300'
                    : 'bg-white border border-slate-200 hover:bg-amber-50 hover:border-amber-200 text-slate-700 hover:text-amber-700 shadow-sm'
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    isDark
                      ? 'bg-amber-500/15 text-amber-400'
                      : 'bg-amber-50 text-amber-600'
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

      {/* ─── Bottom Row: Recent Formulations + Upcoming Consults ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─── 5. Recent Formulations ────────────────────── */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={16}
        >
          <div className={`${cardClass} p-6 h-full`}>
            <h2 className={`text-lg font-semibold mb-4 ${headingClass}`}>
              Recent Formulations
            </h2>
            <div className="space-y-3">
              {recentFormulations.map((formula) => (
                <div
                  key={formula.name}
                  className={`p-4 rounded-xl ${
                    isDark
                      ? 'bg-white/5 border border-white/10'
                      : 'bg-slate-50 border border-slate-100'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className={`text-sm font-semibold ${headingClass}`}>{formula.name}</p>
                      <p className={`text-xs ${subClass}`}>
                        {formula.form} &middot; {formula.herbCount} herbs
                      </p>
                    </div>
                    <Badge variant={formulationStatusConfig[formula.status]}>
                      {formula.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${subClass}`}>
                      For: <span className={textClass}>{formula.patient}</span>
                    </span>
                    <span className={`text-xs ${subClass}`}>{formula.date}</span>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/naturopath/formulations/builder">
              <Button
                variant="primary"
                className="w-full mt-4 bg-amber-600 hover:bg-amber-700"
              >
                View All Formulations
              </Button>
            </Link>
          </div>
        </motion.section>

        {/* ─── 6. Upcoming Consults ──────────────────────── */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={17}
        >
          <div className={`${cardClass} p-6 h-full`}>
            <h2 className={`text-lg font-semibold mb-4 ${headingClass}`}>
              Upcoming Consults
            </h2>
            <div className="space-y-3">
              {upcomingConsults.map((consult, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-4 p-4 rounded-xl ${
                    isDark
                      ? 'bg-white/5 border border-white/10'
                      : 'bg-slate-50 border border-slate-100'
                  }`}
                >
                  {/* Time */}
                  <div
                    className={`flex-shrink-0 w-20 text-center p-2 rounded-lg ${
                      isDark
                        ? 'bg-amber-500/15 text-amber-400'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    <p className="text-sm font-bold">{consult.time}</p>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${headingClass}`}>
                      {consult.patient}
                    </p>
                    <p className={`text-xs ${subClass}`}>{consult.type}</p>
                  </div>

                  {/* Type badge */}
                  <Badge
                    variant={
                      consult.type === 'Initial'
                        ? 'warning'
                        : consult.type === 'Lab Review'
                          ? 'default'
                          : 'success'
                    }
                  >
                    {consult.type}
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
