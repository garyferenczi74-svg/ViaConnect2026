'use client';

import { useState } from 'react';

/* ─── Types ───────────────────────────────────────────────────────────────── */

type FormType = 'Tincture' | 'Capsule' | 'Tea' | 'Powder' | 'Topical';

interface Herb {
  id: string;
  common: string;
  scientific: string;
  properties: string[];
  evidence: number; // 1–3 stars
  evidenceLabel: string;
}

interface FormulaRow {
  herb: string;
  ratio: number;
  volume: string;
  pct: number;
  notes: string;
}

/* ─── Data ────────────────────────────────────────────────────────────────── */

const categories = ['All', 'Adaptogens', 'Nervines', 'Hepatics', 'Carminatives', 'Tonics', 'Anti-inflammatory', 'Immune'];

const herbs: Herb[] = [
  { id: 'ash', common: 'Ashwagandha', scientific: 'Withania somnifera', properties: ['Adaptogen', 'Thyroid'], evidence: 3, evidenceLabel: 'Strong' },
  { id: 'rho', common: 'Rhodiola', scientific: 'Rhodiola rosea', properties: ['Adaptogen', 'Cognitive'], evidence: 3, evidenceLabel: 'Strong' },
  { id: 'mst', common: 'Milk Thistle', scientific: 'Silybum marianum', properties: ['Hepatic', 'Antioxidant'], evidence: 3, evidenceLabel: 'Strong' },
  { id: 'tur', common: 'Turmeric', scientific: 'Curcuma longa', properties: ['Anti-inflammatory'], evidence: 3, evidenceLabel: 'Strong' },
  { id: 'val', common: 'Valerian', scientific: 'Valeriana officinalis', properties: ['Nervine', 'Sedative'], evidence: 3, evidenceLabel: 'Strong' },
  { id: 'pas', common: 'Passionflower', scientific: 'Passiflora incarnata', properties: ['Anxiolytic'], evidence: 2, evidenceLabel: 'Moderate' },
];

const formulaRows: FormulaRow[] = [
  { herb: 'Ashwagandha', ratio: 3, volume: '30ml', pct: 30, notes: 'Root extract 1:3' },
  { herb: 'Rhodiola', ratio: 2, volume: '20ml', pct: 20, notes: 'Root extract 1:5' },
  { herb: 'Licorice', ratio: 1, volume: '10ml', pct: 10, notes: 'Synergist / harmonizer' },
  { herb: 'Holy Basil', ratio: 2, volume: '20ml', pct: 20, notes: 'Leaf extract 1:3' },
  { herb: 'Schisandra', ratio: 2, volume: '20ml', pct: 20, notes: 'Berry extract 1:2' },
];

const safetyChecks = [
  { status: 'pass' as const, text: 'No herb-herb interactions' },
  { status: 'pass' as const, text: 'No herb-drug interactions' },
  { status: 'warn' as const, text: 'Licorice: Monitor blood pressure' },
  { status: 'pass' as const, text: 'No herb-gene conflicts' },
  { status: 'pass' as const, text: 'Not contraindicated' },
];

/* ─── Component ───────────────────────────────────────────────────────────── */

export default function BotanicalProtocolBuilder() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [formType, setFormType] = useState<FormType>('Tincture');

  const filteredHerbs = herbs.filter((h) => {
    const matchesSearch =
      searchQuery === '' ||
      h.common.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.scientific.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      activeCategory === 'All' ||
      h.properties.some((p) => p.toLowerCase().includes(activeCategory.toLowerCase()));
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* ── Split Screen ──────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* ═══ LEFT PANEL — Herb Database ═══════════════════════ */}
        <div className="lg:w-2/5 space-y-4">
          {/* Header + Search */}
          <div className="bg-white/5 rounded-xl p-5 border border-white/10">
            <h2 className="text-lg font-[Syne] font-bold text-white mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-amber-400">local_florist</span>
              Herb Database
            </h2>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
              <input
                type="text"
                placeholder="Search herbs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  activeCategory === cat
                    ? 'bg-amber-500 text-white'
                    : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Herb Cards (scrollable) */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
            {filteredHerbs.map((h) => (
              <div
                key={h.id}
                className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-amber-500/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-bold text-white">{h.common}</p>
                    <p className="text-xs italic text-slate-400">{h.scientific}</p>
                  </div>
                  <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-400 text-xs font-medium hover:bg-amber-500/25 transition-colors">
                    <span className="material-symbols-outlined text-sm">add</span>
                    Add
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  {h.properties.map((prop) => (
                    <span
                      key={prop}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-slate-300"
                    >
                      {prop}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <span
                      key={i}
                      className={`text-sm ${i < h.evidence ? 'text-amber-400' : 'text-white/15'}`}
                    >
                      ★
                    </span>
                  ))}
                  <span className="text-[10px] text-slate-400 ml-1">{h.evidenceLabel}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ RIGHT PANEL — Formula Builder ═══════════════════ */}
        <div className="lg:w-3/5 space-y-4">
          {/* Protocol Header */}
          <div className="bg-white/5 rounded-xl p-5 border border-white/10">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Title */}
              <div className="sm:col-span-3">
                <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Protocol Name</label>
                <input
                  type="text"
                  defaultValue="Adrenal Support Protocol"
                  className="w-full bg-transparent border-b border-white/20 pb-1 text-lg font-[Syne] font-bold text-white focus:border-amber-500 outline-none transition-colors"
                />
              </div>
              {/* Patient */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Patient</label>
                <select className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-amber-500 outline-none">
                  <option>James Wilson</option>
                  <option>Anita Sharma</option>
                  <option>Marcus Lee</option>
                  <option>Elena Vasquez</option>
                </select>
              </div>
              {/* Form Type */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Form Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as FormType)}
                  className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  <option>Tincture</option>
                  <option>Capsule</option>
                  <option>Tea</option>
                  <option>Powder</option>
                  <option>Topical</option>
                </select>
              </div>
              {/* Blank spacer for grid alignment */}
              <div />
            </div>
          </div>

          {/* Formula Table */}
          <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-slate-500 font-medium">Herb</th>
                  <th className="text-center px-3 py-3 text-[10px] uppercase tracking-wider text-slate-500 font-medium">Ratio</th>
                  <th className="text-center px-3 py-3 text-[10px] uppercase tracking-wider text-slate-500 font-medium">Volume</th>
                  <th className="text-center px-3 py-3 text-[10px] uppercase tracking-wider text-slate-500 font-medium">%</th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-slate-500 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {formulaRows.map((row) => (
                  <tr key={row.herb} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{row.herb}</td>
                    <td className="px-3 py-3 text-center font-mono text-amber-400">{row.ratio}</td>
                    <td className="px-3 py-3 text-center font-mono text-slate-300">{row.volume}</td>
                    <td className="px-3 py-3 text-center font-mono text-slate-300">{row.pct}%</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{row.notes}</td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="bg-white/5 border-t border-white/10">
                  <td className="px-4 py-3 font-bold text-white">Total</td>
                  <td className="px-3 py-3 text-center font-mono font-bold text-amber-400">10</td>
                  <td className="px-3 py-3 text-center font-mono font-bold text-white">100ml</td>
                  <td className="px-3 py-3 text-center font-mono font-bold text-white">100%</td>
                  <td className="px-4 py-3"></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Safety Check Panel */}
          <div className="bg-white/5 rounded-xl p-5 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-[Syne] font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-amber-400">verified_user</span>
                Safety Check
              </h3>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                SAFE WITH MONITORING
              </span>
            </div>
            <div className="space-y-2.5">
              {safetyChecks.map((check, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  {check.status === 'pass' ? (
                    <span className="material-symbols-outlined text-lg text-emerald-500">check_circle</span>
                  ) : (
                    <span className="material-symbols-outlined text-lg text-amber-500">warning</span>
                  )}
                  <span className={`text-sm ${check.status === 'pass' ? 'text-slate-300' : 'text-amber-400'}`}>
                    {check.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Dosage & Duration */}
          <div className="bg-white/5 rounded-xl p-5 border border-white/10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Dosage</label>
                <p className="text-sm text-white">30 drops (1.5ml) in warm water, 3x daily before meals</p>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Duration</label>
                <p className="text-sm text-white">8 weeks, then reassess</p>
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-amber-500/30 text-amber-400 text-sm font-medium hover:bg-amber-500/10 transition-colors">
              <span className="material-symbols-outlined text-lg">label</span>
              Generate Label
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-slate-300 text-sm font-medium hover:bg-white/5 transition-colors">
              <span className="material-symbols-outlined text-lg">calculate</span>
              Calculate Cost
              <span className="font-mono text-amber-400 font-bold">$34.50</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-slate-300 text-sm font-medium hover:bg-white/5 transition-colors">
              <span className="material-symbols-outlined text-lg">bookmark</span>
              Save as Template
            </button>
            <button className="flex items-center gap-2 ml-auto px-6 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-white text-sm font-bold shadow-lg shadow-amber-500/20 hover:from-amber-600 hover:to-amber-700 transition-all">
              <span className="material-symbols-outlined text-lg">assignment_ind</span>
              Assign to Patient
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
