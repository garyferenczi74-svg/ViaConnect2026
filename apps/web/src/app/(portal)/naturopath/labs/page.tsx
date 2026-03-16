'use client';

import { useState } from 'react';
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
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

// ─── Animation Variants ──────────────────────────────────────
const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

// ─── Mock Data ───────────────────────────────────────────────
const labTypes = [
  {
    id: 'dutch',
    name: 'DUTCH Complete',
    subtitle: 'Hormone Panel',
    status: 'connected' as const,
    description: 'Comprehensive hormone metabolite testing',
    markers: ['Cortisol Pattern', 'Estrogen Metabolites', 'Androgen Metabolites', 'Melatonin', 'Organic Acids'],
    lastImport: 'March 10, 2026',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 5.88c.068.285-.032.58-.247.778a.776.776 0 01-.543.194h-2.796" />
      </svg>
    ),
  },
  {
    id: 'gimap',
    name: 'GI-MAP',
    subtitle: 'Microbiome',
    status: 'connected' as const,
    description: 'GI microbial assay plus pathogen detection',
    markers: ['H. pylori', 'Parasites', 'Bacterial Pathogens', 'Opportunistic Bacteria', 'Intestinal Health'],
    lastImport: 'March 5, 2026',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
      </svg>
    ),
  },
  {
    id: 'htma',
    name: 'HTMA',
    subtitle: 'Hair Tissue Mineral Analysis',
    status: 'pending' as const,
    description: 'Mineral ratios and toxic metal screening',
    markers: ['Calcium', 'Magnesium', 'Sodium', 'Potassium', 'Toxic Metals (Hg, Pb, As, Cd)'],
    lastImport: null,
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
      </svg>
    ),
  },
  {
    id: 'oat',
    name: 'OAT',
    subtitle: 'Organic Acids Test',
    status: 'connected' as const,
    description: 'Metabolic and nutritional marker analysis',
    markers: ['Krebs Cycle', 'Neurotransmitter Metabolites', 'Oxalates', 'Yeast/Fungal Markers', 'Nutritional Markers'],
    lastImport: 'February 28, 2026',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3" />
      </svg>
    ),
  },
];

const cortisolCurveData = [
  { time: 'Morning', value: 23.4, rangeLow: 12, rangeHigh: 20 },
  { time: 'Noon', value: 8.2, rangeLow: 5, rangeHigh: 10 },
  { time: 'Evening', value: 6.8, rangeLow: 2, rangeHigh: 6 },
  { time: 'Night', value: 3.1, rangeLow: 0.5, rangeHigh: 3 },
];

const cortisolTable = [
  { time: 'Morning (Waking)', value: '23.4 ng/mg', range: '12-20 ng/mg', status: 'high' },
  { time: 'Noon', value: '8.2 ng/mg', range: '5-10 ng/mg', status: 'normal' },
  { time: 'Evening', value: '6.8 ng/mg', range: '2-6 ng/mg', status: 'high' },
  { time: 'Night', value: '3.1 ng/mg', range: '0.5-3 ng/mg', status: 'borderline' },
];

const estrogenData = [
  { marker: 'E1 (Estrone)', value: '12.4', range: '5-15 ng/mg', status: 'normal' },
  { marker: 'E2 (Estradiol)', value: '3.8', range: '1.5-5 ng/mg', status: 'normal' },
  { marker: 'E3 (Estriol)', value: '8.2', range: '4-12 ng/mg', status: 'normal' },
  { marker: '2-OH-E1', value: '5.1', range: '3-10 ng/mg', status: 'normal' },
  { marker: '4-OH-E1', value: '3.9', range: '0.5-2.5 ng/mg', status: 'high' },
  { marker: '16-OH-E1', value: '6.3', range: '2-8 ng/mg', status: 'normal' },
];

const androgenData = [
  { marker: 'Testosterone', value: '42.1 pg/mg', range: '20-60 pg/mg', status: 'normal' },
  { marker: 'DHT', value: '18.3 pg/mg', range: '5-25 pg/mg', status: 'normal' },
  { marker: 'DHEA-S', value: '185 ug/dL', range: '100-400 ug/dL', status: 'normal' },
];

const gimapPathogens = [
  { organism: 'H. pylori', result: 'Detected (2.4e3)', reference: '< DL', status: 'high' },
  { organism: 'C. difficile Toxin A', result: 'Not Detected', reference: '< DL', status: 'normal' },
  { organism: 'C. difficile Toxin B', result: 'Not Detected', reference: '< DL', status: 'normal' },
  { organism: 'Enterococcus faecalis', result: '3.1e5', reference: '< 1.5e5', status: 'high' },
  { organism: 'Giardia lamblia', result: 'Not Detected', reference: '< DL', status: 'normal' },
  { organism: 'Cryptosporidium', result: 'Not Detected', reference: '< DL', status: 'normal' },
  { organism: 'Blastocystis hominis', result: 'Detected', reference: '< DL', status: 'borderline' },
  { organism: 'Candida albicans', result: '1.2e4', reference: '< 1.0e4', status: 'borderline' },
];

const gimapBeneficial = [
  { organism: 'Lactobacillus spp.', level: '2.1e6', reference: '> 5.0e6', status: 'low' },
  { organism: 'Bifidobacterium spp.', level: '8.4e5', reference: '> 2.0e6', status: 'low' },
  { organism: 'E. coli (beneficial)', level: '4.2e7', reference: '> 1.0e7', status: 'normal' },
];

const gimapDigestive = [
  { marker: 'Pancreatic Elastase', value: '285 ug/g', reference: '> 200 ug/g', status: 'normal' },
  { marker: 'Steatocrit', value: '18%', reference: '< 15%', status: 'borderline' },
  { marker: 'Beta-glucuronidase', value: '2,840 U/mL', reference: '< 2,000 U/mL', status: 'high' },
];

const gimapImmune = [
  { marker: 'sIgA', value: '480 ug/mL', reference: '510-2,010 ug/mL', status: 'low' },
  { marker: 'Anti-gliadin IgA', value: '18 U/mL', reference: '< 20 U/mL', status: 'borderline' },
  { marker: 'Calprotectin', value: '52 ug/g', reference: '< 50 ug/g', status: 'borderline' },
];

const mineralRatiosData = [
  { ratio: 'Ca/Mg', value: 6.2, optimal: 7.0 },
  { ratio: 'Na/K', value: 1.8, optimal: 2.4 },
  { ratio: 'Ca/K', value: 3.1, optimal: 4.2 },
  { ratio: 'Zn/Cu', value: 5.8, optimal: 8.0 },
];

const essentialMinerals = [
  { mineral: 'Calcium', level: '168 mg%', range: '40-80 mg%', status: 'high' },
  { mineral: 'Magnesium', level: '27 mg%', range: '4-8 mg%', status: 'high' },
  { mineral: 'Sodium', level: '14 mg%', range: '20-35 mg%', status: 'low' },
  { mineral: 'Potassium', level: '8 mg%', range: '7-15 mg%', status: 'normal' },
  { mineral: 'Iron', level: '1.8 mg%', range: '1.2-2.0 mg%', status: 'normal' },
  { mineral: 'Zinc', level: '14.5 mg%', range: '15-23 mg%', status: 'low' },
];

const toxicMetals = [
  { metal: 'Mercury (Hg)', level: '0.058 mg%', acceptable: '< 0.04 mg%', status: 'high' },
  { metal: 'Lead (Pb)', level: '0.021 mg%', acceptable: '< 0.06 mg%', status: 'normal' },
  { metal: 'Arsenic (As)', level: '0.012 mg%', acceptable: '< 0.06 mg%', status: 'normal' },
  { metal: 'Cadmium (Cd)', level: '0.003 mg%', acceptable: '< 0.006 mg%', status: 'normal' },
];

const krebsMarkers = [
  { marker: 'Citric Acid', value: '142 mmol/mol', range: '90-280', status: 'normal' },
  { marker: 'Succinic Acid', value: '18.3 mmol/mol', range: '5-25', status: 'normal' },
  { marker: 'Fumaric Acid', value: '0.42 mmol/mol', range: '0.1-0.8', status: 'normal' },
  { marker: 'Malic Acid', value: '3.8 mmol/mol', range: '0.5-4.5', status: 'normal' },
  { marker: 'Alpha-Ketoglutaric', value: '52 mmol/mol', range: '20-80', status: 'normal' },
];

const neuroMarkers = [
  { marker: 'HVA (Dopamine)', value: '2.1 mmol/mol', range: '3.5-8.5', status: 'low' },
  { marker: 'VMA (Norepinephrine)', value: '1.8 mmol/mol', range: '1.5-4.5', status: 'normal' },
  { marker: '5-HIAA (Serotonin)', value: '4.2 mmol/mol', range: '1.0-6.5', status: 'normal' },
  { marker: 'Quinolinic Acid', value: '8.4 mmol/mol', range: '1.0-6.0', status: 'high' },
];

const yeastMarkers = [
  { marker: 'Arabinose', value: '68 mmol/mol', range: '< 45', status: 'high' },
  { marker: 'Tartaric Acid', value: '12.4 mmol/mol', range: '< 8.5', status: 'high' },
];

const nutritionalMarkers = [
  { marker: 'Methylmalonic Acid', value: '4.8 mmol/mol', range: '< 3.8', status: 'high' },
  { marker: 'Formiminoglutamic Acid (FIGLU)', value: '3.2 mmol/mol', range: '< 2.0', status: 'high' },
];

const crossReferences = [
  {
    gene: 'MTHFR C677T',
    geneColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    labMarker: 'Elevated FIGLU',
    labColor: 'bg-red-500/20 text-red-300 border-red-500/30',
    conclusion: 'Confirms impaired folate metabolism',
    protocol: 'Methylated B-vitamin protocol with 5-MTHF and folinic acid',
    protocolHref: '/naturopath/formulations/builder',
  },
  {
    gene: 'CYP1A2 Slow',
    geneColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    labMarker: 'Elevated Cortisol',
    labColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    conclusion: 'Caffeine may be exacerbating cortisol pattern',
    protocol: 'Adaptogenic blend: Ashwagandha, Holy Basil, Rhodiola',
    protocolHref: '/naturopath/herbs',
  },
  {
    gene: 'COMT Val158Met',
    geneColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    labMarker: 'Low HVA',
    labColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    conclusion: 'Supports catecholamine metabolism findings',
    protocol: 'Dopamine support: Mucuna pruriens, L-Tyrosine, B6 (P5P)',
    protocolHref: '/naturopath/formulations/builder',
  },
  {
    gene: 'VDR Bsm1',
    geneColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    labMarker: 'Low Vitamin D Metabolites',
    labColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    conclusion: 'Genetic susceptibility to deficiency confirmed',
    protocol: 'High-dose D3/K2 protocol with emulsified delivery',
    protocolHref: '/naturopath/genetic-protocols',
  },
  {
    gene: 'SOD2 CT',
    geneColor: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    labMarker: 'Elevated Oxidative Stress',
    labColor: 'bg-red-500/20 text-red-300 border-red-500/30',
    conclusion: 'Antioxidant protocol recommended',
    protocol: 'MitoRestore: CoQ10, PQQ, NAC, Alpha-lipoic acid',
    protocolHref: '/naturopath/formulations/builder',
  },
];

const trendData = [
  {
    marker: 'Cortisol (AM)',
    unit: 'ng/mg',
    data: [
      { date: 'Oct 2025', value: 26.1 },
      { date: 'Jan 2026', value: 24.8 },
      { date: 'Mar 2026', value: 23.4 },
    ],
    color: '#F59E0B',
  },
  {
    marker: 'sIgA',
    unit: 'ug/mL',
    data: [
      { date: 'Oct 2025', value: 320 },
      { date: 'Jan 2026', value: 410 },
      { date: 'Mar 2026', value: 480 },
    ],
    color: '#10B981',
  },
  {
    marker: 'Mercury',
    unit: 'mg%',
    data: [
      { date: 'Oct 2025', value: 0.072 },
      { date: 'Jan 2026', value: 0.065 },
      { date: 'Mar 2026', value: 0.058 },
    ],
    color: '#EF4444',
  },
  {
    marker: 'HVA',
    unit: 'mmol/mol',
    data: [
      { date: 'Oct 2025', value: 1.6 },
      { date: 'Jan 2026', value: 1.9 },
      { date: 'Mar 2026', value: 2.1 },
    ],
    color: '#8B5CF6',
  },
];

// ─── Helper Components ───────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    normal: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    high: 'bg-red-500/20 text-red-300 border-red-500/30',
    low: 'bg-red-500/20 text-red-300 border-red-500/30',
    borderline: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  };
  const labels: Record<string, string> = {
    normal: 'Normal',
    high: 'High',
    low: 'Low',
    borderline: 'Borderline',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors[status] || colors.normal}`}>
      {labels[status] || status}
    </span>
  );
}

function DataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: { cells: string[]; status: string }[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            {columns.map((col) => (
              <th key={col} className="text-left py-2.5 px-3 text-slate-400 font-medium text-xs uppercase tracking-wider">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
              {row.cells.map((cell, j) => (
                <td key={j} className="py-2.5 px-3 text-slate-300">
                  {cell}
                </td>
              ))}
              <td className="py-2.5 px-3">
                <StatusBadge status={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Tab Definitions ─────────────────────────────────────────
const tabs = [
  { id: 'dutch', label: 'DUTCH' },
  { id: 'gimap', label: 'GI-MAP' },
  { id: 'htma', label: 'HTMA' },
  { id: 'oat', label: 'OAT' },
  { id: 'integrated', label: 'Integrated Summary' },
] as const;

// ─── Custom Tooltip ──────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className={`${glassClasses.dark} rounded-lg px-3 py-2 text-xs`}>
      <p className="text-slate-300 font-medium">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }} className="font-semibold">
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main Page Component
// ═══════════════════════════════════════════════════════════════
export default function LabsPage() {
  const [selectedPatient, setSelectedPatient] = useState('maria-santos');
  const [activeTab, setActiveTab] = useState<string>('dutch');
  const [importStatus, setImportStatus] = useState<Record<string, 'idle' | 'importing' | 'done'>>({
    dutch: 'idle',
    gimap: 'idle',
    htma: 'idle',
    oat: 'idle',
  });
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedLabType, setSelectedLabType] = useState<string | null>(null);

  const handleImport = (labId: string) => {
    setImportStatus((prev) => ({ ...prev, [labId]: 'importing' }));
    setTimeout(() => {
      setImportStatus((prev) => ({ ...prev, [labId]: 'done' }));
      setTimeout(() => {
        setImportStatus((prev) => ({ ...prev, [labId]: 'idle' }));
      }, 2000);
    }, 1500);
  };

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-12"
    >
      {/* ─── Section 1: Header ───────────────────────────────── */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Functional Lab Integration
          </h1>
          <p className="mt-1 text-slate-400">
            Import, analyze, and cross-reference functional lab results with genomic data
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="border-amber-500/30 text-amber-300 bg-amber-500/10 text-xs">
              DUTCH
            </Badge>
            <Badge variant="outline" className="border-amber-500/30 text-amber-300 bg-amber-500/10 text-xs">
              GI-MAP
            </Badge>
            <Badge variant="outline" className="border-amber-500/30 text-amber-300 bg-amber-500/10 text-xs">
              HTMA
            </Badge>
            <Badge variant="outline" className="border-amber-500/30 text-amber-300 bg-amber-500/10 text-xs">
              OAT
            </Badge>
          </div>
          <Button
            onClick={() => setShowImportModal(!showImportModal)}
            className="bg-amber-500 hover:bg-amber-600 text-white font-medium px-4 py-2 rounded-xl shadow-lg shadow-amber-500/20"
          >
            <svg className="w-4 h-4 mr-2 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Import New Lab
          </Button>
        </div>
      </motion.div>

      {/* ─── Section 2: Lab Import Panel ─────────────────────── */}
      <motion.div variants={fadeUp}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {labTypes.map((lab) => (
            <Card
              key={lab.id}
              className={`${glassClasses.dark} rounded-2xl overflow-hidden hover:border-amber-500/20 transition-all duration-300`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                    {lab.icon}
                  </div>
                  {lab.status === 'connected' ? (
                    <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs">
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-xs">
                      Pending Setup
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-white text-base mt-3">{lab.name}</CardTitle>
                <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">{lab.subtitle}</p>
              </CardHeader>
              <CardContent className="pt-0 pb-3">
                <p className="text-slate-400 text-sm mb-3">{lab.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {lab.markers.map((marker) => (
                    <span
                      key={marker}
                      className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/5"
                    >
                      {marker}
                    </span>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="border-t border-white/5 pt-3 flex items-center justify-between">
                {lab.lastImport ? (
                  <span className="text-xs text-slate-500">Last: {lab.lastImport}</span>
                ) : (
                  <span className="text-xs text-slate-500">No imports yet</span>
                )}
                {lab.status === 'connected' ? (
                  <button
                    onClick={() => handleImport(lab.id)}
                    disabled={importStatus[lab.id] === 'importing'}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                      importStatus[lab.id] === 'importing'
                        ? 'bg-amber-500/20 text-amber-300 cursor-wait'
                        : importStatus[lab.id] === 'done'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25'
                    }`}
                  >
                    {importStatus[lab.id] === 'importing'
                      ? 'Importing...'
                      : importStatus[lab.id] === 'done'
                        ? 'Imported!'
                        : 'Import Latest'}
                  </button>
                ) : (
                  <button className="text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-colors">
                    Configure Connection
                  </button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* ─── Section 3: Patient Lab Results View ─────────────── */}
      <motion.div variants={fadeUp}>
        <Card className={`${glassClasses.dark} rounded-2xl overflow-hidden`}>
          <CardHeader className="border-b border-white/5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-white text-lg">Patient Lab Results</CardTitle>
              <div className="flex items-center gap-3">
                <label className="text-xs text-slate-500 uppercase tracking-wider">Patient</label>
                <select
                  value={selectedPatient}
                  onChange={(e) => setSelectedPatient(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500/50 min-w-[200px]"
                >
                  <option value="maria-santos">Maria Santos</option>
                  <option value="james-chen">James Chen</option>
                  <option value="sarah-johnson">Sarah Johnson</option>
                </select>
              </div>
            </div>
            {/* Tab Navigation */}
            <div className="flex gap-1 mt-4 overflow-x-auto pb-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/25'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {/* ── DUTCH Tab ─────────────────────────────────── */}
            {activeTab === 'dutch' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                {/* Cortisol Curve */}
                <div>
                  <h3 className="text-base font-semibold text-white mb-1">Cortisol Diurnal Pattern</h3>
                  <p className="text-xs text-slate-500 mb-4">Free cortisol (creatinine-corrected)</p>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cortisolCurveData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="cortisolGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="rangeGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                        <Tooltip content={<ChartTooltip />} />
                        <Area type="monotone" dataKey="rangeHigh" stroke="none" fill="url(#rangeGradient)" name="Range High" />
                        <Area type="monotone" dataKey="rangeLow" stroke="none" fill="transparent" name="Range Low" />
                        <Line type="monotone" dataKey="value" stroke="#F59E0B" strokeWidth={2.5} dot={{ fill: '#F59E0B', r: 5, strokeWidth: 2, stroke: '#1e293b' }} name="Cortisol" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Cortisol Values Table */}
                <div>
                  <h3 className="text-sm font-semibold text-white mb-3">Cortisol Values</h3>
                  <DataTable
                    columns={['Time Point', 'Value', 'Reference Range', 'Status']}
                    rows={cortisolTable.map((r) => ({
                      cells: [r.time, r.value, r.range],
                      status: r.status,
                    }))}
                  />
                </div>

                {/* Estrogen Metabolites */}
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">Estrogen Metabolites</h3>
                  <p className="text-xs text-slate-500 mb-3">
                    2-OH:16-OH ratio: <span className="text-amber-400 font-medium">0.81</span> (optimal: {'>'}2.0)
                    &nbsp;&middot;&nbsp;
                    4-OH-E1: <span className="text-red-400 font-medium">Elevated</span> — consider DIM / I3C support
                  </p>
                  <DataTable
                    columns={['Marker', 'Value', 'Reference Range', 'Status']}
                    rows={estrogenData.map((r) => ({
                      cells: [r.marker, r.value, r.range],
                      status: r.status,
                    }))}
                  />
                </div>

                {/* Androgen Panel */}
                <div>
                  <h3 className="text-sm font-semibold text-white mb-3">Androgen Panel</h3>
                  <DataTable
                    columns={['Marker', 'Value', 'Reference Range', 'Status']}
                    rows={androgenData.map((r) => ({
                      cells: [r.marker, r.value, r.range],
                      status: r.status,
                    }))}
                  />
                </div>

                {/* Melatonin */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="p-2 rounded-lg bg-indigo-500/15">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">6-OH-Melatonin Sulfate</p>
                    <p className="text-xs text-slate-400">Value: <span className="text-amber-400 font-medium">18.2 ng/mg</span> &middot; Range: 20-65 ng/mg &middot; <StatusBadge status="low" /></p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── GI-MAP Tab ────────────────────────────────── */}
            {activeTab === 'gimap' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div>
                  <h3 className="text-base font-semibold text-white mb-1">Pathogen Detection</h3>
                  <p className="text-xs text-slate-500 mb-3">qPCR-based microbial analysis</p>
                  <DataTable
                    columns={['Organism', 'Result', 'Reference', 'Status']}
                    rows={gimapPathogens.map((r) => ({
                      cells: [r.organism, r.result, r.reference],
                      status: r.status,
                    }))}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-white mb-3">Beneficial Bacteria</h3>
                  <DataTable
                    columns={['Organism', 'Level', 'Reference', 'Status']}
                    rows={gimapBeneficial.map((r) => ({
                      cells: [r.organism, r.level, r.reference],
                      status: r.status,
                    }))}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-white mb-3">Digestive Markers</h3>
                  <DataTable
                    columns={['Marker', 'Value', 'Reference', 'Status']}
                    rows={gimapDigestive.map((r) => ({
                      cells: [r.marker, r.value, r.reference],
                      status: r.status,
                    }))}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-white mb-3">Immune Markers</h3>
                  <DataTable
                    columns={['Marker', 'Value', 'Reference', 'Status']}
                    rows={gimapImmune.map((r) => ({
                      cells: [r.marker, r.value, r.reference],
                      status: r.status,
                    }))}
                  />
                </div>
              </motion.div>
            )}

            {/* ── HTMA Tab ──────────────────────────────────── */}
            {activeTab === 'htma' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                {/* Mineral Ratios Chart */}
                <div>
                  <h3 className="text-base font-semibold text-white mb-1">Mineral Ratios</h3>
                  <p className="text-xs text-slate-500 mb-4">Current vs. optimal ratios</p>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={mineralRatiosData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="ratio" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="value" name="Current" fill="#F59E0B" radius={[4, 4, 0, 0]} barSize={28} />
                        <Bar dataKey="optimal" name="Optimal" fill="rgba(245,158,11,0.25)" radius={[4, 4, 0, 0]} barSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-white mb-3">Essential Minerals</h3>
                  <DataTable
                    columns={['Mineral', 'Level', 'Reference Range', 'Status']}
                    rows={essentialMinerals.map((r) => ({
                      cells: [r.mineral, r.level, r.range],
                      status: r.status,
                    }))}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">Toxic Metals</h3>
                  <p className="text-xs text-slate-500 mb-3">
                    <svg className="w-3.5 h-3.5 inline text-red-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    Mercury slightly elevated — consider chelation support
                  </p>
                  <DataTable
                    columns={['Metal', 'Level', 'Acceptable Limit', 'Status']}
                    rows={toxicMetals.map((r) => ({
                      cells: [r.metal, r.level, r.acceptable],
                      status: r.status,
                    }))}
                  />
                </div>
              </motion.div>
            )}

            {/* ── OAT Tab ───────────────────────────────────── */}
            {activeTab === 'oat' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div>
                  <h3 className="text-base font-semibold text-white mb-1">Krebs Cycle Markers</h3>
                  <p className="text-xs text-slate-500 mb-3">Mitochondrial energy production</p>
                  <DataTable
                    columns={['Marker', 'Value', 'Range', 'Status']}
                    rows={krebsMarkers.map((r) => ({
                      cells: [r.marker, r.value, r.range],
                      status: r.status,
                    }))}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">Neurotransmitter Metabolites</h3>
                  <p className="text-xs text-slate-500 mb-3">Dopamine, norepinephrine, serotonin pathway markers</p>
                  <DataTable
                    columns={['Marker', 'Value', 'Range', 'Status']}
                    rows={neuroMarkers.map((r) => ({
                      cells: [r.marker, r.value, r.range],
                      status: r.status,
                    }))}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">Yeast / Fungal Markers</h3>
                  <p className="text-xs text-red-400 mb-3">Both markers elevated — fungal overgrowth likely</p>
                  <DataTable
                    columns={['Marker', 'Value', 'Range', 'Status']}
                    rows={yeastMarkers.map((r) => ({
                      cells: [r.marker, r.value, r.range],
                      status: r.status,
                    }))}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">Nutritional Markers</h3>
                  <p className="text-xs text-amber-400 mb-3">B12 and folate insufficiency indicated</p>
                  <DataTable
                    columns={['Marker', 'Value', 'Range', 'Status']}
                    rows={nutritionalMarkers.map((r) => ({
                      cells: [r.marker, r.value, r.range],
                      status: r.status,
                    }))}
                  />
                </div>
              </motion.div>
            )}

            {/* ── Integrated Summary Tab ────────────────────── */}
            {activeTab === 'integrated' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <p className="text-sm text-slate-400">
                  Combined analysis across all functional labs, genomics, and clinical assessment for <span className="text-amber-400 font-medium">Maria Santos</span>.
                </p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Genomics Summary */}
                  <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-400" />
                      <h4 className="text-sm font-semibold text-white">Genomics Summary</h4>
                    </div>
                    <ul className="space-y-2 text-sm text-slate-300">
                      <li className="flex items-start gap-2">
                        <span className="text-purple-400 mt-0.5">&#8227;</span>
                        MTHFR C677T heterozygous — reduced methylation capacity (~60% enzyme activity)
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-400 mt-0.5">&#8227;</span>
                        COMT Val158Met — fast COMT, rapid catecholamine clearance
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-400 mt-0.5">&#8227;</span>
                        CYP1A2 slow metabolizer — caffeine, estrogen metabolism impacts
                      </li>
                    </ul>
                  </div>

                  {/* Lab Findings */}
                  <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-400" />
                      <h4 className="text-sm font-semibold text-white">Lab Findings</h4>
                    </div>
                    <ul className="space-y-2 text-sm text-slate-300">
                      <li className="flex items-start gap-2">
                        <span className="text-amber-400 mt-0.5">&#8227;</span>
                        Elevated morning cortisol with flattened diurnal curve (DUTCH)
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-400 mt-0.5">&#8227;</span>
                        H. pylori positive with low beneficial bacteria (GI-MAP)
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-400 mt-0.5">&#8227;</span>
                        Mercury slightly elevated, zinc deficiency (HTMA)
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-400 mt-0.5">&#8227;</span>
                        Yeast overgrowth markers elevated, low dopamine (OAT)
                      </li>
                    </ul>
                  </div>

                  {/* CAQ Highlights */}
                  <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-cyan-400" />
                      <h4 className="text-sm font-semibold text-white">CAQ Highlights</h4>
                    </div>
                    <ul className="space-y-2 text-sm text-slate-300">
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-400 mt-0.5">&#8227;</span>
                        Reports chronic fatigue, brain fog, and poor sleep quality
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-400 mt-0.5">&#8227;</span>
                        High stress occupation, 3+ cups coffee daily
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-400 mt-0.5">&#8227;</span>
                        History of antibiotic use (3 courses in past 18 months)
                      </li>
                    </ul>
                  </div>

                  {/* Botanical Recommendations */}
                  <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      <h4 className="text-sm font-semibold text-white">Botanical Recommendations</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { name: 'Ashwagandha', reason: 'HPA axis / cortisol' },
                        { name: 'Berberine', reason: 'H. pylori / GI' },
                        { name: 'Chlorella', reason: 'Mercury chelation' },
                        { name: 'Saccharomyces boulardii', reason: 'Microbiome' },
                        { name: 'Mucuna pruriens', reason: 'Dopamine support' },
                      ].map((herb) => (
                        <div
                          key={herb.name}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
                        >
                          <span className="text-sm font-medium text-emerald-300">{herb.name}</span>
                          <span className="text-xs text-slate-500">({herb.reason})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Therapeutic Order Phase */}
                <div className="rounded-xl bg-amber-500/5 border border-amber-500/15 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <h4 className="text-sm font-semibold text-white">Therapeutic Order: Phase 2 — Stimulate the Healing Power of Nature</h4>
                  </div>
                  <p className="text-sm text-slate-400">
                    Based on lab findings and genomic profile, the patient is best served by addressing foundational
                    GI health and HPA axis dysregulation before advancing to more targeted interventions. The Vis
                    Medicatrix Naturae approach is indicated given the self-healing capacity observed in trend data.
                  </p>
                </div>

                {/* Priority Actions */}
                <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
                  <h4 className="text-sm font-semibold text-white mb-3">Priority Actions</h4>
                  <ol className="space-y-2 text-sm text-slate-300">
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">1</span>
                      <span>Initiate H. pylori eradication protocol — Mastic gum, Berberine, Bismuth, targeted probiotics</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">2</span>
                      <span>Begin adaptogenic cortisol support — Ashwagandha 600mg, Phosphatidylserine 400mg nightly</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">3</span>
                      <span>Methylation support — 5-MTHF 1mg, Methylcobalamin 2mg, P5P 50mg (per MTHFR status)</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">4</span>
                      <span>Mercury chelation — Chlorella 3g/day, Modified citrus pectin, retest HTMA at 90 days</span>
                    </li>
                  </ol>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <Button className="bg-amber-500 hover:bg-amber-600 text-white font-medium px-5 py-2.5 rounded-xl shadow-lg shadow-amber-500/20">
                    Generate Full Report
                  </Button>
                  <Button className="bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 font-medium px-5 py-2.5 rounded-xl">
                    Share with Patient
                  </Button>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Section 4: Genomic Cross-Reference Panel ────────── */}
      <motion.div variants={fadeUp}>
        <Card className={`${glassClasses.dark} rounded-2xl overflow-hidden`}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/10">
                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                </svg>
              </div>
              <div>
                <CardTitle className="text-white text-lg">Genomic Cross-Reference</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">Lab results correlated with patient genetic variants</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {crossReferences.map((ref, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08, duration: 0.3 }}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors"
              >
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${ref.geneColor}`}>
                    {ref.gene}
                  </span>
                  <span className="text-slate-600">+</span>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${ref.labColor}`}>
                    {ref.labMarker}
                  </span>
                  <svg className="w-4 h-4 text-slate-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 font-medium">{ref.conclusion}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Protocol:{' '}
                    <Link href={ref.protocolHref} className="text-amber-400 hover:text-amber-300 underline underline-offset-2">
                      {ref.protocol}
                    </Link>
                  </p>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Section 5: Integrated Clinical Summary ──────────── */}
      {/* (Rendered inside the Integrated tab above — Section 3) */}

      {/* ─── Section 6: Lab Trends ───────────────────────────── */}
      <motion.div variants={fadeUp}>
        <Card className={`${glassClasses.dark} rounded-2xl overflow-hidden`}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10">
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                </svg>
              </div>
              <div>
                <CardTitle className="text-white text-lg">Lab Trends</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">Key marker trajectories across 3 test periods</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {trendData.map((trend) => (
                <div
                  key={trend.marker}
                  className="rounded-xl bg-white/[0.03] border border-white/5 p-4"
                >
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-medium text-white">{trend.marker}</h4>
                    <span className="text-xs text-slate-500">{trend.unit}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg font-bold" style={{ color: trend.color }}>
                      {trend.data[trend.data.length - 1].value}
                    </span>
                    {trend.data[trend.data.length - 1].value < trend.data[0].value ? (
                      <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                      </svg>
                    )}
                  </div>
                  <div className="h-16 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trend.data} margin={{ top: 2, right: 4, left: 4, bottom: 2 }}>
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke={trend.color}
                          strokeWidth={2}
                          dot={{ fill: trend.color, r: 3, strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-between mt-1">
                    {trend.data.map((d) => (
                      <span key={d.date} className="text-[10px] text-slate-600">{d.date.split(' ')[0]}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
