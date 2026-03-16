'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, Badge, Button, glassClasses } from '@genex360/ui';

/* -------------------------------------------------------------------------- */
/*  Animation helpers                                                         */
/* -------------------------------------------------------------------------- */

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.45, ease: 'easeOut' },
  }),
};

const modalOverlay = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalContent = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.15 } },
};

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

type PatientStatus = 'Active' | 'Pending' | 'Inactive';
type RiskLevel = 'red' | 'yellow' | 'green';
type FilterTab = 'All' | 'Active' | 'Pending' | 'Flagged';
type SortField = 'name' | 'lastActivity' | 'compliance' | 'risk';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: PatientStatus;
  personalizationScore: number;
  compliance: number;
  riskFlag: RiskLevel;
  riskLabel: string;
  lastActivity: string;
  lastActivityDate: Date;
}

/* -------------------------------------------------------------------------- */
/*  Mock data                                                                 */
/* -------------------------------------------------------------------------- */

const PATIENTS: Patient[] = [
  { id: 'P-1001', firstName: 'Maria', lastName: 'Santos', email: 'maria.santos@email.com', status: 'Active', personalizationScore: 87, compliance: 95, riskFlag: 'green', riskLabel: 'On Track', lastActivity: '2 hours ago', lastActivityDate: new Date('2026-03-16T10:00:00') },
  { id: 'P-1002', firstName: 'James', lastName: 'Chen', email: 'james.chen@email.com', status: 'Active', personalizationScore: 72, compliance: 82, riskFlag: 'yellow', riskLabel: 'Low Compliance', lastActivity: '1 day ago', lastActivityDate: new Date('2026-03-15T14:00:00') },
  { id: 'P-1003', firstName: 'Sarah', lastName: 'Williams', email: 'sarah.w@email.com', status: 'Active', personalizationScore: 91, compliance: 98, riskFlag: 'green', riskLabel: 'On Track', lastActivity: '3 hours ago', lastActivityDate: new Date('2026-03-16T09:00:00') },
  { id: 'P-1004', firstName: 'David', lastName: 'Kim', email: 'david.kim@email.com', status: 'Pending', personalizationScore: 0, compliance: 0, riskFlag: 'yellow', riskLabel: 'Awaiting Intake', lastActivity: '3 days ago', lastActivityDate: new Date('2026-03-13T08:00:00') },
  { id: 'P-1005', firstName: 'Elena', lastName: 'Rodriguez', email: 'elena.r@email.com', status: 'Active', personalizationScore: 65, compliance: 58, riskFlag: 'red', riskLabel: 'Drug Interaction', lastActivity: '5 hours ago', lastActivityDate: new Date('2026-03-16T07:00:00') },
  { id: 'P-1006', firstName: 'Michael', lastName: 'Thompson', email: 'michael.t@email.com', status: 'Active', personalizationScore: 78, compliance: 74, riskFlag: 'yellow', riskLabel: 'Low Compliance', lastActivity: '2 days ago', lastActivityDate: new Date('2026-03-14T16:00:00') },
  { id: 'P-1007', firstName: 'Aisha', lastName: 'Patel', email: 'aisha.patel@email.com', status: 'Active', personalizationScore: 84, compliance: 91, riskFlag: 'green', riskLabel: 'On Track', lastActivity: '1 hour ago', lastActivityDate: new Date('2026-03-16T11:00:00') },
  { id: 'P-1008', firstName: 'Robert', lastName: 'Garcia', email: 'robert.g@email.com', status: 'Inactive', personalizationScore: 45, compliance: 32, riskFlag: 'red', riskLabel: 'Non-Adherent', lastActivity: '2 weeks ago', lastActivityDate: new Date('2026-03-02T09:00:00') },
  { id: 'P-1009', firstName: 'Lisa', lastName: 'Nakamura', email: 'lisa.n@email.com', status: 'Pending', personalizationScore: 0, compliance: 0, riskFlag: 'yellow', riskLabel: 'Awaiting Intake', lastActivity: '1 day ago', lastActivityDate: new Date('2026-03-15T10:00:00') },
  { id: 'P-1010', firstName: 'Thomas', lastName: 'Anderson', email: 'thomas.a@email.com', status: 'Active', personalizationScore: 93, compliance: 97, riskFlag: 'green', riskLabel: 'On Track', lastActivity: '30 min ago', lastActivityDate: new Date('2026-03-16T11:30:00') },
  { id: 'P-1011', firstName: 'Priya', lastName: 'Sharma', email: 'priya.s@email.com', status: 'Active', personalizationScore: 69, compliance: 63, riskFlag: 'red', riskLabel: 'Drug Interaction', lastActivity: '4 hours ago', lastActivityDate: new Date('2026-03-16T08:00:00') },
  { id: 'P-1012', firstName: 'Kevin', lastName: 'O\'Brien', email: 'kevin.ob@email.com', status: 'Active', personalizationScore: 81, compliance: 88, riskFlag: 'green', riskLabel: 'On Track', lastActivity: '6 hours ago', lastActivityDate: new Date('2026-03-16T06:00:00') },
];

/* -------------------------------------------------------------------------- */
/*  Helper components                                                         */
/* -------------------------------------------------------------------------- */

function getInitials(first: string, last: string) {
  return `${first[0]}${last[0]}`;
}

function StatusBadge({ status }: { status: PatientStatus }) {
  const variant = status === 'Active' ? 'success' : status === 'Pending' ? 'warning' : 'default';
  return <Badge variant={variant} dot>{status}</Badge>;
}

function RiskDot({ flag, label }: { flag: RiskLevel; label: string }) {
  const colors: Record<RiskLevel, string> = {
    red: 'bg-red-500',
    yellow: 'bg-amber-500',
    green: 'bg-emerald-500',
  };
  const textColors: Record<RiskLevel, string> = {
    red: 'text-red-400',
    yellow: 'text-amber-400',
    green: 'text-emerald-400',
  };
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${colors[flag]}`} />
      <span className={`text-xs ${textColors[flag]}`}>{label}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main page component                                                       */
/* -------------------------------------------------------------------------- */

export default function PatientManagementPage() {
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('All');
  const [sortField, setSortField] = useState<SortField>('name');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');

  /* Filtering */
  const filtered = PATIENTS.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q);

    const matchesTab =
      filterTab === 'All' ||
      (filterTab === 'Active' && p.status === 'Active') ||
      (filterTab === 'Pending' && p.status === 'Pending') ||
      (filterTab === 'Flagged' && p.riskFlag === 'red');

    return matchesSearch && matchesTab;
  });

  /* Sorting */
  const sorted = [...filtered].sort((a, b) => {
    switch (sortField) {
      case 'name':
        return `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`);
      case 'lastActivity':
        return b.lastActivityDate.getTime() - a.lastActivityDate.getTime();
      case 'compliance':
        return b.compliance - a.compliance;
      case 'risk': {
        const order: Record<RiskLevel, number> = { red: 0, yellow: 1, green: 2 };
        return order[a.riskFlag] - order[b.riskFlag];
      }
      default:
        return 0;
    }
  });

  /* Invite code generation */
  const handleGenerateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const part = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setGeneratedCode(`VIA-${part()}-${part()}`);
  };

  const tabs: FilterTab[] = ['All', 'Active', 'Pending', 'Flagged'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
      {/* ------------------------------------------------------------------ */}
      {/*  Header                                                            */}
      {/* ------------------------------------------------------------------ */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-white">Patient Management</h1>
          <p className="text-sm text-slate-400 mt-1">{PATIENTS.length} patients total</p>
        </div>
        <Button variant="primary" size="md" onClick={() => setShowInviteModal(true)}>
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Patient
        </Button>
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/*  Search & Filters                                                  */}
      {/* ------------------------------------------------------------------ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className={`rounded-xl p-4 ${glassClasses.dark}`}
      >
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, email, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-colors"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  filterTab === tab
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Sort dropdown */}
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            className="px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
          >
            <option value="name">Sort: Name</option>
            <option value="lastActivity">Sort: Last Activity</option>
            <option value="compliance">Sort: Compliance</option>
            <option value="risk">Sort: Risk</option>
          </select>
        </div>
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/*  Patient Roster Grid                                               */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sorted.map((patient, i) => (
          <motion.div
            key={patient.id}
            custom={i}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
          >
            <Card
              variant="flat"
              padding="none"
              className={`!bg-white/5 backdrop-blur-xl !border-white/10 hover:!border-emerald-500/30 transition-all group`}
            >
              <CardContent className="p-5">
                <div className="flex flex-col gap-4">
                  {/* Top row: avatar + name + status */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center text-sm font-semibold text-emerald-300 shrink-0">
                        {getInitials(patient.firstName, patient.lastName)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {patient.firstName} {patient.lastName}
                        </p>
                        <p className="text-xs text-slate-500">{patient.email}</p>
                      </div>
                    </div>
                    <StatusBadge status={patient.status} />
                  </div>

                  {/* Metrics row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Score</p>
                      <p className="text-sm font-semibold text-white">{patient.personalizationScore}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Compliance</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white">{patient.compliance}%</p>
                        <div className="flex-1 h-1.5 rounded-full bg-white/10">
                          <div
                            className={`h-full rounded-full ${
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
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Risk</p>
                      <RiskDot flag={patient.riskFlag} label={patient.riskLabel} />
                    </div>
                  </div>

                  {/* Footer: last activity + actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <span className="text-xs text-slate-500">Active {patient.lastActivity}</span>
                    <div className="flex items-center gap-2">
                      <Link href={`/practitioner/patients/${patient.id}`}>
                        <Button variant="ghost" size="sm" className="!text-emerald-400 !px-2 !py-1 text-xs">
                          View
                        </Button>
                      </Link>
                      <Button variant="ghost" size="sm" className="!text-slate-400 !px-2 !py-1 text-xs">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                        </svg>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {sorted.length === 0 && (
        <div className="text-center py-16">
          <p className="text-slate-500">No patients match your search criteria.</p>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/*  Patient Invite Modal                                              */}
      {/* ------------------------------------------------------------------ */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            variants={modalOverlay}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => { setShowInviteModal(false); setGeneratedCode(''); setInviteEmail(''); }}
          >
            <motion.div
              variants={modalContent}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-md rounded-2xl p-6 ${glassClasses.dark} !bg-slate-900/95`}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">Invite Patient</h2>
                <button
                  onClick={() => { setShowInviteModal(false); setGeneratedCode(''); setInviteEmail(''); }}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-sm text-slate-400 mb-1.5 block">Patient Email</label>
                  <input
                    type="email"
                    placeholder="patient@email.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  />
                </div>

                <Button
                  variant="outline"
                  size="md"
                  onClick={handleGenerateCode}
                  className="w-full"
                >
                  Generate Invite Code
                </Button>

                {generatedCode && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 text-center"
                  >
                    <p className="text-xs text-slate-400 mb-1">Invite Code</p>
                    <p className="text-xl font-mono font-bold text-emerald-400 tracking-wider">
                      {generatedCode}
                    </p>
                  </motion.div>
                )}

                <Button
                  variant="primary"
                  size="md"
                  disabled={!inviteEmail || !generatedCode}
                  className="w-full"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                  Send Invite
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
