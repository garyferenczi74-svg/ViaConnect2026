'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  Dna,
  FlaskConical,
  Pill,
  Watch,
  BarChart3,
  StickyNote,
  Sparkles,
  Download,
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  Plus,
  Send,
  FileText,
  Flame,
  Clock,
  Check,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

type Tab = 'genetics' | 'labs' | 'protocol' | 'wearable' | 'compliance' | 'notes' | 'ai';

// ─── Mock Data ──────────────────────────────────────────────────────────────

const geneticRows = [
  { gene: 'MTHFR', variant: 'C677T', rsId: 'rs1801133', genotype: 'CT', impact: 'Moderate' as const, significance: 'Heterozygous — ~35% reduced methylfolate conversion' },
  { gene: 'COMT', variant: 'Val158Met', rsId: 'rs4680', genotype: 'AG', impact: 'Moderate' as const, significance: 'Intermediate catecholamine metabolism' },
  { gene: 'APOE', variant: 'E3/E4', rsId: 'rs429358', genotype: 'CT', impact: 'High' as const, significance: 'Elevated cardiovascular and neurological risk' },
  { gene: 'CYP1A2', variant: '*1F', rsId: 'rs762551', genotype: 'AA', impact: 'Low' as const, significance: 'Fast caffeine metabolizer' },
  { gene: 'VDR', variant: 'BsmI', rsId: 'rs1544410', genotype: 'CT', impact: 'Moderate' as const, significance: 'Reduced vitamin D receptor sensitivity' },
  { gene: 'MAOA', variant: '3R/4R', rsId: 'rs6323', genotype: 'AG', impact: 'Moderate' as const, significance: 'Intermediate MAO-A activity' },
  { gene: 'FTO', variant: 'rs9939609', rsId: 'rs9939609', genotype: 'AT', impact: 'Moderate' as const, significance: 'Increased obesity susceptibility' },
  { gene: 'BDNF', variant: 'Val66Met', rsId: 'rs6265', genotype: 'AG', impact: 'Moderate' as const, significance: 'Reduced BDNF secretion — affects mood and cognition' },
];

const labRows = [
  { biomarker: 'Homocysteine', value: '14.2 μmol/L', range: '5-15', geneticOptimal: '7-10 (based on MTHFR CT)', status: 'warn' as const },
  { biomarker: 'Vitamin D (25-OH)', value: '38 ng/mL', range: '30-100', geneticOptimal: '60-80 (based on VDR CT)', status: 'warn' as const },
  { biomarker: 'Folate', value: '12.4 ng/mL', range: '3.0-17.0', geneticOptimal: '15-20 (based on MTHFR CT)', status: 'warn' as const },
  { biomarker: 'B12', value: '542 pg/mL', range: '200-900', geneticOptimal: '500-800', status: 'ok' as const },
  { biomarker: 'CRP', value: '2.1 mg/L', range: '0-3', geneticOptimal: '0-1 (based on IL-6 GG)', status: 'warn' as const },
];

const protocolItems = [
  { time: 'Morning', items: [{ name: 'MTHFR+ 1000mcg', taken: true }, { name: 'NAD+ 250mg', taken: false }] },
  { time: 'Evening', items: [{ name: 'RELAX+', taken: false }, { name: 'APOE+', taken: false }] },
];

const complianceDays = ['green', 'green', 'green', 'green', 'amber', 'green', 'amber'] as const;

const wearableCards = [
  { label: 'HRV', value: '42ms avg', trend: -12, unit: '%' },
  { label: 'Resting HR', value: '62 bpm avg', trend: 0, unit: '' },
  { label: 'Sleep Score', value: '74/100 avg', trend: 5, unit: '%' },
  { label: 'Recovery', value: '58/100 avg', trend: -8, unit: '%' },
];

const complianceProducts = [
  { name: 'MTHFR+', pct: 92, color: 'bg-green-500' },
  { name: 'NAD+', pct: 78, color: 'bg-amber-500' },
  { name: 'RELAX+', pct: 65, color: 'bg-amber-500' },
  { name: 'APOE+', pct: 54, color: 'bg-red-500' },
];

const clinicalNotes = [
  { type: 'Genetic Interpretation', title: 'Genetic Interpretation — MTHFR C677T', date: 'Mar 24, 2026', preview: 'Patient heterozygous for C677T. Recommend active methylfolate (MTHFR+) at 1000mcg daily. Monitor homocysteine levels at 6-week intervals.' },
  { type: 'Lab Review', title: 'Lab Review — Homocysteine Elevated', date: 'Mar 20, 2026', preview: 'Homocysteine 14.2 — above genetic optimal of 7-10. Current MTHFR+ dose may be insufficient given heterozygous status.' },
  { type: 'Assessment', title: 'Initial Assessment', date: 'Mar 15, 2026', preview: '45yo male, family history CVD, presenting for genomic wellness optimization. GENEX360 panel ordered.' },
];

const aiRecommendations = [
  'Increase MTHFR+ from 1000mcg to 1500mcg and retest homocysteine in 6 weeks.',
  'Add adaptogenic protocol (RELAX+) to address HRV decline — COMT AG may benefit from catechol support.',
  'Schedule lipid panel and ApoB test within 30 days — APOE E4 carrier status requires proactive monitoring.',
];

// ─── Tab Config ─────────────────────────────────────────────────────────────

const tabs: { key: Tab; label: string; icon: typeof Dna }[] = [
  { key: 'genetics', label: 'Genetic Profile', icon: Dna },
  { key: 'labs', label: 'Lab Results', icon: FlaskConical },
  { key: 'protocol', label: 'Protocol', icon: Pill },
  { key: 'wearable', label: 'Wearable Data', icon: Watch },
  { key: 'compliance', label: 'Compliance', icon: BarChart3 },
  { key: 'notes', label: 'Clinical Notes', icon: StickyNote },
  { key: 'ai', label: 'AI Insights', icon: Sparkles },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function impactBadge(impact: 'Low' | 'Moderate' | 'High') {
  const cls = {
    Low: 'bg-green-500/15 text-green-400',
    Moderate: 'bg-amber-500/15 text-amber-400',
    High: 'bg-red-500/15 text-red-400',
  }[impact];
  return <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${cls}`}>{impact}</span>;
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function LegacyPatientDetailView() {
  const params = useParams();
  void params.id;
  const [activeTab, setActiveTab] = useState<Tab>('genetics');

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-gray-500">
          <Link href="/practitioner/patients" className="hover:text-white transition-colors">Patients</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-white font-medium">John Davis</span>
        </nav>

        {/* ── Patient Header Card ───────────────────────────────────────── */}
        <div className="glass-v2 rounded-2xl p-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-navy-600 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-white">JD</span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-heading-3 text-white font-bold">John Davis</h1>
                <span className="text-xs text-secondary">45 years</span>
                <span className="text-xs text-secondary">Male</span>
              </div>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-xs text-secondary">Compliance: <span className="text-amber-400 font-semibold">78%</span></span>
                <span className="text-xs text-tertiary">Last visit: Mar 24, 2026</span>
              </div>
            </div>

            {/* Genetic Badges */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              {['MTHFR CT', 'COMT AG', 'APOE E3/E4'].map((v) => (
                <span key={v} className="inline-block px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[11px] font-mono font-medium">
                  {v}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Tab Bar ───────────────────────────────────────────────────── */}
        <div className="flex gap-1 overflow-x-auto border-b border-white/[0.06] pb-0">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                activeTab === t.key
                  ? 'text-blue-500 border-blue-500'
                  : 'text-tertiary border-transparent hover:text-gray-300'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB 1: Genetic Profile ────────────────────────────────────── */}
        {activeTab === 'genetics' && (
          <div className="space-y-4">
            <div className="glass-v2 rounded-2xl p-0 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                    {['Gene', 'Variant', 'rs ID', 'Genotype', 'Impact', 'Clinical Significance'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#B75E18] uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {geneticRows.map((row, idx) => (
                    <tr key={row.gene} className={`${idx < geneticRows.length - 1 ? 'border-b border-white/[0.04]' : ''} hover:bg-white/[0.02] transition-colors`}>
                      <td className="px-4 py-2.5 font-semibold text-white">{row.gene}</td>
                      <td className="px-4 py-2.5 text-gray-300">{row.variant}</td>
                      <td className="px-4 py-2.5 font-mono text-teal-300">{row.rsId}</td>
                      <td className="px-4 py-2.5 font-mono font-bold text-white">{row.genotype}</td>
                      <td className="px-4 py-2.5">{impactBadge(row.impact)}</td>
                      <td className="px-4 py-2.5 text-gray-400 max-w-xs">{row.significance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-3">
              <button className="px-4 py-2 rounded-lg border border-blue-500/40 text-blue-400 text-xs font-medium hover:bg-blue-500/10 transition-colors">
                View Methylation Pathway
              </button>
              <button className="px-4 py-2 rounded-lg text-gray-400 text-xs font-medium hover:text-gray-200 hover:bg-white/[0.04] transition-colors">
                <Download className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                Download PDF Report
              </button>
            </div>
          </div>
        )}

        {/* ── TAB 2: Lab Results ────────────────────────────────────────── */}
        {activeTab === 'labs' && (
          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#B75E18]">Biomarkers</p>
            <div className="glass-v2 rounded-2xl p-0 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                    {['Biomarker', 'Value', 'Standard Range', 'Genetic Optimal', 'Status'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#B75E18] uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {labRows.map((row, idx) => (
                    <tr key={row.biomarker} className={`${idx < labRows.length - 1 ? 'border-b border-white/[0.04]' : ''} hover:bg-white/[0.02] transition-colors`}>
                      <td className="px-4 py-2.5 font-semibold text-white">{row.biomarker}</td>
                      <td className="px-4 py-2.5 text-gray-300">{row.value}</td>
                      <td className="px-4 py-2.5 text-gray-400">{row.range}</td>
                      <td className="px-4 py-2.5 font-semibold text-teal-400">{row.geneticOptimal}</td>
                      <td className="px-4 py-2.5">
                        {row.status === 'ok' ? (
                          <span className="text-green-400 text-[11px] font-medium inline-flex items-center gap-1"><CheckCircle className="w-3 h-3" strokeWidth={1.5} /> Within range</span>
                        ) : (
                          <span className="text-amber-400 text-[11px] font-medium inline-flex items-center gap-1"><AlertTriangle className="w-3 h-3" strokeWidth={1.5} /> Above genetic optimal</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 3: Protocol ───────────────────────────────────────────── */}
        {activeTab === 'protocol' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-[#B75E18]">Active Protocol</h2>
            <div className="glass-v2 rounded-2xl p-4 space-y-4">
              {protocolItems.map((block) => (
                <div key={block.time}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-2">{block.time}</p>
                  <div className="space-y-1.5">
                    {block.items.map((item) => (
                      <div key={item.name} className="flex items-center gap-2 text-xs">
                        {item.taken ? (
                          <span className="w-5 h-5 rounded bg-green-500/20 text-green-400 flex items-center justify-center"><Check className="w-3 h-3" strokeWidth={1.5} /></span>
                        ) : (
                          <span className="w-5 h-5 rounded bg-white/[0.06] text-gray-500 flex items-center justify-center">
                            <Clock className="w-3 h-3" />
                          </span>
                        )}
                        <span className={item.taken ? 'text-white' : 'text-gray-400'}>{item.name}</span>
                        <span className="text-[10px] text-gray-600">{item.taken ? 'taken today' : 'pending'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* 7-day mini calendar */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-2">7-Day Compliance</p>
                <div className="flex gap-1.5">
                  {complianceDays.map((c, i) => (
                    <div
                      key={i}
                      className={`w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold ${
                        c === 'green' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {c === 'green' ? <Check className="w-3.5 h-3.5" strokeWidth={1.5} /> : <AlertTriangle className="w-3.5 h-3.5" strokeWidth={1.5} />}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button className="px-4 py-2 rounded-lg border border-blue-500/40 text-blue-400 text-xs font-medium hover:bg-blue-500/10 transition-colors">
                  Edit Protocol
                </button>
                <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#4A90D9] to-blue-600 text-white text-xs font-medium hover:brightness-110 transition-all">
                  <Send className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                  Send Updated Protocol
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 4: Wearable Data ──────────────────────────────────────── */}
        {activeTab === 'wearable' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-[#B75E18]">7-Day Biometric Summary</h2>
            <div className="grid grid-cols-2 gap-3">
              {wearableCards.map((card) => (
                <div key={card.label} className="glass-v2 rounded-2xl p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-1">{card.label}</p>
                  <p className="text-lg font-bold text-white">{card.value}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {card.trend < 0 ? (
                      <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />
                    ) : card.trend > 0 ? (
                      <ArrowUpRight className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <Minus className="w-3.5 h-3.5 text-gray-400" />
                    )}
                    <span className={`text-xs font-medium ${card.trend < 0 ? 'text-red-400' : card.trend > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                      {card.trend === 0 ? 'Stable' : `${Math.abs(card.trend)}${card.unit}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-tertiary">Data from Oura Ring · Last sync: 5 min ago</p>
          </div>
        )}

        {/* ── TAB 5: Compliance ─────────────────────────────────────────── */}
        {activeTab === 'compliance' && (
          <div className="space-y-4">
            <div className="glass-v2 rounded-2xl p-4 space-y-4">
              {complianceProducts.map((prod) => (
                <div key={prod.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white font-medium">{prod.name}</span>
                    <span className={`font-semibold ${prod.pct >= 80 ? 'text-green-400' : prod.pct >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                      {prod.pct}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/[0.06]">
                    <div className={`h-full rounded-full ${prod.color} transition-all`} style={{ width: `${prod.pct}%` }} />
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-xs text-gray-300">30-Day Streak: <span className="text-white font-semibold">12 days</span></span>
                <Flame className="w-4 h-4 text-orange-400" strokeWidth={1.5} />
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 6: Clinical Notes ─────────────────────────────────────── */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#B75E18]">Notes</h2>
              <button className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#4A90D9] to-blue-600 text-white text-xs font-medium hover:brightness-110 transition-all flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                New Note
              </button>
            </div>
            <div className="space-y-3">
              {clinicalNotes.map((note, idx) => (
                <div key={idx} className="glass-v2 rounded-2xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/15 text-blue-400">{note.type}</span>
                    <span className="text-[10px] text-tertiary">{note.date}</span>
                  </div>
                  <p className="text-xs text-white font-medium">{note.title}</p>
                  <p className="text-xs text-gray-400 line-clamp-2">{note.preview}</p>
                  <button className="text-[11px] text-blue-400 hover:text-blue-300 font-medium">View Full Note →</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 7: AI Insights ────────────────────────────────────────── */}
        {activeTab === 'ai' && (
          <div className="space-y-4">
            <div className="glass-v2-insight rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-400" />
                <h2 className="text-sm font-bold text-white">AI Clinical Analysis for John Davis</h2>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">
                Based on John&apos;s MTHFR CT + COMT AG + APOE E3/E4 genetic profile and recent biometric data, three areas require attention:
                <span className="block mt-2"><strong className="text-white">1)</strong> Homocysteine remains above genetic optimal despite MTHFR+ supplementation — consider increasing to 1500mcg.</span>
                <span className="block mt-1"><strong className="text-white">2)</strong> HRV trending down 12% over 7 days — COMT intermediate metabolism may be amplifying stress response.</span>
                <span className="block mt-1"><strong className="text-white">3)</strong> APOE E4 carrier status warrants lipid monitoring every 6 months.</span>
              </p>
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#B75E18]">Recommendations</p>
            <div className="space-y-2">
              {aiRecommendations.map((rec, idx) => (
                <div key={idx} className="glass-v2 rounded-xl p-3 flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-xs text-gray-300">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
