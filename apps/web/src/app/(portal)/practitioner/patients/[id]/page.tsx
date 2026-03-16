'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, glassClasses } from '@genex360/ui';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

/* -------------------------------------------------------------------------- */
/*  Animation helpers                                                         */
/* -------------------------------------------------------------------------- */

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: 'easeOut' },
  }),
};

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

type TabKey = 'clinical' | 'genetic' | 'treatment' | 'progress' | 'history' | 'labs' | 'documents';

interface Tab {
  key: TabKey;
  label: string;
}

/* -------------------------------------------------------------------------- */
/*  Static data                                                               */
/* -------------------------------------------------------------------------- */

const TABS: Tab[] = [
  { key: 'clinical', label: 'Clinical Overview' },
  { key: 'genetic', label: 'Genetic Profile' },
  { key: 'treatment', label: 'Treatment Plans' },
  { key: 'progress', label: 'Progress' },
  { key: 'history', label: 'Medical History' },
  { key: 'labs', label: 'Labs' },
  { key: 'documents', label: 'Documents' },
];

const MEDICATIONS = [
  { name: 'Levothyroxine 50mcg', dosage: 'Once daily, morning', status: 'Active' },
  { name: 'Metformin 500mg', dosage: 'Twice daily with meals', status: 'Active' },
  { name: 'Lisinopril 10mg', dosage: 'Once daily', status: 'Active' },
  { name: 'Sertraline 50mg', dosage: 'Once daily, evening', status: 'Under Review' },
];

const SUPPLEMENTS = [
  { name: 'Methylated B-Complex', dosage: '1 cap morning', source: 'Protocol A' },
  { name: 'Vitamin D3 5000 IU', dosage: '1 softgel morning', source: 'Protocol A' },
  { name: 'Magnesium Glycinate 400mg', dosage: '1 cap evening', source: 'Protocol A' },
  { name: 'CoQ10 200mg', dosage: '1 cap afternoon', source: 'Protocol B' },
  { name: 'Omega-3 DHA 1000mg', dosage: '2 softgels morning', source: 'Protocol B' },
  { name: 'NAC 600mg', dosage: '1 cap morning', source: 'Protocol B' },
];

const GENETIC_VARIANTS = [
  { gene: 'MTHFR', variant: 'C677T', zygosity: 'Heterozygous', impact: 'Moderate', status: 'warning' as const },
  { gene: 'COMT', variant: 'Val158Met', zygosity: 'Homozygous', impact: 'High', status: 'error' as const },
  { gene: 'VDR', variant: 'Bsm1', zygosity: 'Wild Type', impact: 'Normal', status: 'success' as const },
  { gene: 'CYP1A2', variant: '*1F/*1F', zygosity: 'Slow Metabolizer', impact: 'High', status: 'error' as const },
  { gene: 'APOE', variant: 'E3/E4', zygosity: 'Heterozygous', impact: 'Elevated Risk', status: 'error' as const },
  { gene: 'TNF-alpha', variant: 'G308A', zygosity: 'G/A', impact: 'Moderate', status: 'warning' as const },
  { gene: 'SOD2', variant: 'Ala16Val', zygosity: 'CT', impact: 'Moderate', status: 'warning' as const },
  { gene: 'BDNF', variant: 'Val66Met', zygosity: 'Val/Met', impact: 'Moderate', status: 'warning' as const },
];

const PROTOCOLS = [
  {
    name: 'Methylation Support Protocol',
    startDate: 'Jan 30, 2026',
    adherence: 96,
    supplements: ['Methylated B-Complex', 'Magnesium Glycinate 400mg', 'NAC 600mg'],
    status: 'Active',
  },
  {
    name: 'Cardiovascular Optimization',
    startDate: 'Feb 14, 2026',
    adherence: 93,
    supplements: ['CoQ10 200mg', 'Omega-3 DHA 1000mg', 'Vitamin D3 5000 IU'],
    status: 'Active',
  },
];

const COMPLIANCE_DATA = [
  { week: 'W1', compliance: 78 },
  { week: 'W2', compliance: 82 },
  { week: 'W3', compliance: 85 },
  { week: 'W4', compliance: 80 },
  { week: 'W5', compliance: 88 },
  { week: 'W6', compliance: 91 },
  { week: 'W7', compliance: 89 },
  { week: 'W8', compliance: 93 },
  { week: 'W9', compliance: 90 },
  { week: 'W10', compliance: 95 },
  { week: 'W11', compliance: 94 },
  { week: 'W12', compliance: 95 },
];

const SIDE_EFFECTS = [
  { date: 'Mar 10, 2026', effect: 'Mild nausea after B-Complex', severity: 'Low', resolved: true },
  { date: 'Feb 28, 2026', effect: 'Headache during first week of NAC', severity: 'Moderate', resolved: true },
  { date: 'Feb 18, 2026', effect: 'Loose stools with Magnesium increase', severity: 'Low', resolved: false },
];

const MEDICAL_TIMELINE = [
  { date: '2024', event: 'Diagnosed with Hashimoto\'s Thyroiditis', type: 'Condition' },
  { date: '2022', event: 'Appendectomy', type: 'Surgery' },
  { date: '2020', event: 'Pre-diabetes diagnosis (HbA1c 5.9%)', type: 'Condition' },
  { date: '2018', event: 'Hypertension diagnosed', type: 'Condition' },
  { date: '2015', event: 'Tonsillectomy', type: 'Surgery' },
];

const FAMILY_HISTORY = [
  { relation: 'Father', condition: 'Type 2 Diabetes, Cardiovascular Disease' },
  { relation: 'Mother', condition: 'Hypothyroidism, Osteoporosis' },
  { relation: 'Maternal Grandmother', condition: 'Alzheimer\'s Disease' },
];

const LAB_RESULTS = [
  { test: 'TSH', value: '3.2', unit: 'mIU/L', range: '0.4 - 4.0', status: 'normal' as const },
  { test: 'Free T4', value: '1.1', unit: 'ng/dL', range: '0.8 - 1.8', status: 'normal' as const },
  { test: 'HbA1c', value: '5.8', unit: '%', range: '< 5.7', status: 'high' as const },
  { test: 'Vitamin D', value: '28', unit: 'ng/mL', range: '30 - 80', status: 'low' as const },
  { test: 'Homocysteine', value: '11.2', unit: 'umol/L', range: '5 - 15', status: 'normal' as const },
  { test: 'Ferritin', value: '22', unit: 'ng/mL', range: '20 - 200', status: 'low' as const },
  { test: 'hs-CRP', value: '1.8', unit: 'mg/L', range: '< 1.0', status: 'high' as const },
  { test: 'Magnesium (RBC)', value: '5.2', unit: 'mg/dL', range: '4.2 - 6.8', status: 'normal' as const },
];

const DOCUMENTS = [
  { name: 'Genetic Report - GeneX360', date: 'Jan 25, 2026', type: 'Genomics', size: '2.4 MB' },
  { name: 'Lab Results - Quest Diagnostics', date: 'Mar 01, 2026', type: 'Lab Report', size: '890 KB' },
  { name: 'CAQ Comprehensive Assessment', date: 'Jan 28, 2026', type: 'Assessment', size: '156 KB' },
  { name: 'Insurance Pre-Authorization', date: 'Feb 05, 2026', type: 'Admin', size: '340 KB' },
  { name: 'Previous Provider Records', date: 'Jan 20, 2026', type: 'Medical Records', size: '5.1 MB' },
];

/* -------------------------------------------------------------------------- */
/*  Small sub-components                                                      */
/* -------------------------------------------------------------------------- */

function PersonalizationGaugeMini({ score }: { score: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-24 h-24">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <motion.circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#10B981"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-white">{score}</span>
        <span className="text-[9px] text-slate-500">SCORE</span>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-3 rounded-lg bg-white/5 border border-white/5">
      <span className="text-lg font-bold text-white">{value}</span>
      <span className="text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Tab Content Components                                                    */
/* -------------------------------------------------------------------------- */

function ClinicalOverviewTab() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Current Medications */}
      <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
        <Card variant="flat" padding="md" className={`!bg-white/5 backdrop-blur-xl !border-white/10 h-full`}>
          <CardHeader>
            <CardTitle className="!text-white !text-base flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5" />
              </svg>
              Current Medications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {MEDICATIONS.map((med) => (
                <div key={med.name} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-200">{med.name}</p>
                    <p className="text-xs text-slate-500">{med.dosage}</p>
                  </div>
                  <Badge variant={med.status === 'Active' ? 'success' : 'warning'}>{med.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Active Supplements */}
      <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible">
        <Card variant="flat" padding="md" className={`!bg-white/5 backdrop-blur-xl !border-white/10 h-full`}>
          <CardHeader>
            <CardTitle className="!text-white !text-base flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
              </svg>
              Active Supplements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {SUPPLEMENTS.map((supp) => (
                <div key={supp.name} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-200">{supp.name}</p>
                    <p className="text-xs text-slate-500">{supp.dosage}</p>
                  </div>
                  <Badge variant="primary" className="!bg-emerald-500/15 !text-emerald-300">{supp.source}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Interaction Alerts */}
      <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible">
        <Card variant="flat" padding="md" className={`!bg-white/5 backdrop-blur-xl !border-amber-500/20 h-full`}>
          <CardHeader>
            <CardTitle className="!text-white !text-base flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              Interaction Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-300">Moderate Interaction Detected</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Sertraline may reduce the effectiveness of CoQ10 absorption. Consider spacing doses by 4+ hours.
                    CYP1A2 slow metabolizer status may increase Sertraline levels.
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant="warning">Review Required</Badge>
                    <span className="text-xs text-slate-500">Flagged Mar 8, 2026</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Notes */}
      <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible">
        <Card variant="flat" padding="md" className={`!bg-white/5 backdrop-blur-xl !border-white/10 h-full`}>
          <CardHeader>
            <CardTitle className="!text-white !text-base flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              Practitioner Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="border-l-2 border-emerald-500 pl-3">
                <p className="text-xs text-slate-500">Mar 14, 2026 - Dr. Thompson</p>
                <p className="text-sm text-slate-300 mt-1">
                  Patient responding well to methylation support protocol. Homocysteine levels improved from 14.8 to 11.2.
                  Will continue current protocol and recheck in 4 weeks.
                </p>
              </div>
              <div className="border-l-2 border-slate-600 pl-3">
                <p className="text-xs text-slate-500">Feb 28, 2026 - Dr. Thompson</p>
                <p className="text-sm text-slate-300 mt-1">
                  Added cardiovascular optimization protocol based on APOE E3/E4 variant. Patient education on dietary modifications completed.
                </p>
              </div>
              <div className="border-l-2 border-slate-600 pl-3">
                <p className="text-xs text-slate-500">Jan 30, 2026 - Dr. Thompson</p>
                <p className="text-sm text-slate-300 mt-1">
                  Initial genomic review completed. Starting with methylation support as primary protocol given MTHFR and COMT variants.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function GeneticProfileTab() {
  return (
    <div className="flex flex-col gap-4">
      {/* Variants Table */}
      <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
        <Card variant="flat" padding="md" className={`!bg-white/5 backdrop-blur-xl !border-white/10`}>
          <CardHeader>
            <CardTitle className="!text-white !text-base">Key Genetic Variants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 pb-3 pr-4">Gene</th>
                    <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 pb-3 pr-4">Variant</th>
                    <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 pb-3 pr-4">Zygosity</th>
                    <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 pb-3 pr-4">Impact</th>
                    <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 pb-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {GENETIC_VARIANTS.map((v, i) => (
                    <motion.tr
                      key={v.gene}
                      custom={i}
                      variants={fadeUp}
                      initial="hidden"
                      animate="visible"
                      className="border-b border-white/5 last:border-0"
                    >
                      <td className="py-3 pr-4">
                        <span className="text-sm font-semibold text-emerald-400">{v.gene}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-sm text-slate-300 font-mono">{v.variant}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-sm text-slate-400">{v.zygosity}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-sm text-slate-300">{v.impact}</span>
                      </td>
                      <td className="py-3">
                        <Badge variant={v.status}>{v.impact}</Badge>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Risk Summary */}
      <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible">
        <Card variant="flat" padding="md" className={`!bg-white/5 backdrop-blur-xl !border-white/10`}>
          <CardHeader>
            <CardTitle className="!text-white !text-base">Risk Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Badge variant="error" dot>High Impact: COMT, CYP1A2, APOE</Badge>
              <Badge variant="warning" dot>Moderate Impact: MTHFR, TNF-alpha, SOD2, BDNF</Badge>
              <Badge variant="success" dot>Normal: VDR</Badge>
            </div>
            <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-xs text-emerald-300">
                3 high-impact variants identified. Protocols have been adjusted to account for slow CYP1A2 metabolism and COMT homozygous status.
                APOE E3/E4 warrants cardiovascular monitoring.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function TreatmentPlansTab() {
  return (
    <div className="flex flex-col gap-4">
      {PROTOCOLS.map((protocol, i) => (
        <motion.div key={protocol.name} custom={i} variants={fadeUp} initial="hidden" animate="visible">
          <Card variant="flat" padding="md" className={`!bg-white/5 backdrop-blur-xl !border-white/10`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="!text-white !text-base">{protocol.name}</CardTitle>
                <Badge variant="success" dot>{protocol.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <span className="text-slate-500">Started:</span>{' '}
                    <span className="text-slate-300">{protocol.startDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Adherence:</span>
                    <span className="text-emerald-400 font-semibold">{protocol.adherence}%</span>
                    <div className="w-24 h-1.5 rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${protocol.adherence}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Supplements</p>
                  <div className="flex flex-wrap gap-2">
                    {protocol.supplements.map((s) => (
                      <Badge key={s} variant="primary" className="!bg-emerald-500/10 !text-emerald-300">{s}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}

      <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible">
        <Button variant="outline" size="md" className="w-full sm:w-auto">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create New Plan
        </Button>
      </motion.div>
    </div>
  );
}

function ProgressTab() {
  return (
    <div className="flex flex-col gap-4">
      {/* Compliance Chart */}
      <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
        <Card variant="flat" padding="md" className={`!bg-white/5 backdrop-blur-xl !border-white/10`}>
          <CardHeader>
            <CardTitle className="!text-white !text-base">Compliance Over 12 Weeks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={COMPLIANCE_DATA}>
                  <defs>
                    <linearGradient id="complianceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="week"
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[60, 100]}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15,23,42,0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#e2e8f0',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [`${value}%`, 'Compliance']}
                  />
                  <Area
                    type="monotone"
                    dataKey="compliance"
                    stroke="#10B981"
                    strokeWidth={2}
                    fill="url(#complianceGradient)"
                    dot={{ r: 3, fill: '#10B981', stroke: '#10B981' }}
                    activeDot={{ r: 5, stroke: '#10B981', strokeWidth: 2, fill: '#0f172a' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Side Effects Log */}
      <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible">
        <Card variant="flat" padding="md" className={`!bg-white/5 backdrop-blur-xl !border-white/10`}>
          <CardHeader>
            <CardTitle className="!text-white !text-base">Side Effects Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {SIDE_EFFECTS.map((se) => (
                <div key={se.date + se.effect} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${se.resolved ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <div>
                      <p className="text-sm text-slate-300">{se.effect}</p>
                      <p className="text-xs text-slate-500">{se.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={se.severity === 'Low' ? 'default' : 'warning'}>{se.severity}</Badge>
                    <Badge variant={se.resolved ? 'success' : 'warning'}>{se.resolved ? 'Resolved' : 'Active'}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Outcome Metrics */}
      <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible">
        <Card variant="flat" padding="md" className={`!bg-white/5 backdrop-blur-xl !border-white/10`}>
          <CardHeader>
            <CardTitle className="!text-white !text-base">Outcome Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Energy Level', before: '4/10', after: '7/10', trend: 'up' },
                { label: 'Sleep Quality', before: '5/10', after: '8/10', trend: 'up' },
                { label: 'Brain Fog', before: '7/10', after: '3/10', trend: 'down' },
                { label: 'Joint Pain', before: '6/10', after: '4/10', trend: 'down' },
              ].map((metric) => (
                <div key={metric.label} className="text-center p-3 rounded-lg bg-white/5 border border-white/5">
                  <p className="text-xs text-slate-500 mb-2">{metric.label}</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm text-slate-500">{metric.before}</span>
                    <svg className={`w-4 h-4 ${metric.trend === 'up' ? 'text-emerald-400' : 'text-emerald-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                    <span className="text-sm font-semibold text-emerald-400">{metric.after}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function MedicalHistoryTab() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Timeline */}
      <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
        <Card variant="flat" padding="md" className={`!bg-white/5 backdrop-blur-xl !border-white/10 h-full`}>
          <CardHeader>
            <CardTitle className="!text-white !text-base">Medical Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative pl-6">
              <div className="absolute left-2 top-0 bottom-0 w-px bg-white/10" />
              <div className="flex flex-col gap-6">
                {MEDICAL_TIMELINE.map((item) => (
                  <div key={item.event} className="relative">
                    <span className="absolute -left-[18px] top-1.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-slate-950" />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-emerald-400">{item.date}</span>
                        <Badge variant={item.type === 'Condition' ? 'warning' : 'info'} className="text-[10px]">{item.type}</Badge>
                      </div>
                      <p className="text-sm text-slate-300">{item.event}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="flex flex-col gap-4">
        {/* Family History */}
        <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible">
          <Card variant="flat" padding="md" className={`!bg-white/5 backdrop-blur-xl !border-white/10`}>
            <CardHeader>
              <CardTitle className="!text-white !text-base">Family History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {FAMILY_HISTORY.map((fh) => (
                  <div key={fh.relation} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                    <span className="text-sm font-medium text-emerald-400 w-40 shrink-0">{fh.relation}</span>
                    <span className="text-sm text-slate-300">{fh.condition}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* CAQ Status */}
        <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible">
          <Card variant="flat" padding="md" className={`!bg-white/5 backdrop-blur-xl !border-white/10`}>
            <CardHeader>
              <CardTitle className="!text-white !text-base">CAQ Completion Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Overall Completion</span>
                  <span className="text-sm font-semibold text-emerald-400">100%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: '100%' }} />
                </div>

                {/* Red-flag detection */}
                <div className="mt-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-xs font-semibold text-red-400 mb-2">Red-Flag Detection Panel</p>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      <span className="text-xs text-slate-400">Family history of Alzheimer&apos;s - correlates with APOE E3/E4</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span className="text-xs text-slate-400">Pre-diabetes with elevated hs-CRP - monitor inflammatory markers</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span className="text-xs text-slate-400">Low ferritin with Hashimoto&apos;s - assess iron absorption</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function LabsTab() {
  return (
    <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
      <Card variant="flat" padding="md" className={`!bg-white/5 backdrop-blur-xl !border-white/10`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="!text-white !text-base">Recent Lab Results</CardTitle>
            <span className="text-xs text-slate-500">Drawn: Mar 1, 2026</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 pb-3 pr-4">Test</th>
                  <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 pb-3 pr-4">Value</th>
                  <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 pb-3 pr-4">Unit</th>
                  <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 pb-3 pr-4">Reference Range</th>
                  <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 pb-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {LAB_RESULTS.map((lab, i) => (
                  <motion.tr
                    key={lab.test}
                    custom={i}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    className="border-b border-white/5 last:border-0"
                  >
                    <td className="py-3 pr-4">
                      <span className="text-sm font-medium text-slate-200">{lab.test}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`text-sm font-semibold ${
                        lab.status === 'normal' ? 'text-slate-200' :
                        lab.status === 'high' ? 'text-red-400' : 'text-amber-400'
                      }`}>
                        {lab.value}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-sm text-slate-500">{lab.unit}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-sm text-slate-500">{lab.range}</span>
                    </td>
                    <td className="py-3">
                      <Badge variant={
                        lab.status === 'normal' ? 'success' :
                        lab.status === 'high' ? 'error' : 'warning'
                      }>
                        {lab.status === 'normal' ? 'Normal' : lab.status === 'high' ? 'High' : 'Low'}
                      </Badge>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function DocumentsTab() {
  return (
    <div className="flex flex-col gap-4">
      <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
        <Card variant="flat" padding="md" className={`!bg-white/5 backdrop-blur-xl !border-white/10`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="!text-white !text-base">Patient Documents</CardTitle>
              <Button variant="outline" size="sm">
                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Upload
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {DOCUMENTS.map((doc, i) => (
                <motion.div
                  key={doc.name}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-white/5 transition-colors group border-b border-white/5 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">{doc.name}</p>
                      <p className="text-xs text-slate-500">{doc.date} &middot; {doc.size}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="default" className="text-[10px]">{doc.type}</Badge>
                    <button className="text-slate-500 hover:text-emerald-400 transition-colors opacity-0 group-hover:opacity-100">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main page component                                                       */
/* -------------------------------------------------------------------------- */

export default function PatientDetailPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('clinical');

  const tabContent: Record<TabKey, React.ReactNode> = {
    clinical: <ClinicalOverviewTab />,
    genetic: <GeneticProfileTab />,
    treatment: <TreatmentPlansTab />,
    progress: <ProgressTab />,
    history: <MedicalHistoryTab />,
    labs: <LabsTab />,
    documents: <DocumentsTab />,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
      {/* Back link */}
      <Link href="/practitioner/patients" className="flex items-center gap-1 text-sm text-slate-500 hover:text-emerald-400 transition-colors w-fit">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to Patients
      </Link>

      {/* ------------------------------------------------------------------ */}
      {/*  Patient Header                                                    */}
      {/* ------------------------------------------------------------------ */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card variant="flat" padding="lg" className={`!bg-white/5 backdrop-blur-xl !border-white/10 relative overflow-hidden`}>
          {/* Glow */}
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <CardContent>
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border-2 border-emerald-500/30 flex items-center justify-center text-2xl font-bold text-emerald-300 shrink-0">
                MS
              </div>

              {/* Info */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                  <h1 className="text-xl font-bold text-white">Maria Santos</h1>
                  <Badge variant="success" dot>Active</Badge>
                </div>
                <p className="text-sm text-slate-400">Age 42 &middot; Female &middot; ID: P-1001</p>
              </div>

              {/* Gauge */}
              <PersonalizationGaugeMini score={87} />

              {/* Quick Stats */}
              <div className="flex items-center gap-3">
                <StatBox label="Compliance" value="95%" />
                <StatBox label="Protocols" value="3" />
                <StatBox label="Days" value="45" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/*  Tab Navigation                                                    */}
      {/* ------------------------------------------------------------------ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-700"
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/*  Tab Content                                                       */}
      {/* ------------------------------------------------------------------ */}
      <div>{tabContent[activeTab]}</div>
    </div>
  );
}
