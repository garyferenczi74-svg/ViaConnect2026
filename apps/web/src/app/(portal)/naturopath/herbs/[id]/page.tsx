'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent, Badge, glassClasses } from '@genex360/ui';

/* ------------------------------------------------------------------ */
/*  Mock herb detail data                                              */
/* ------------------------------------------------------------------ */

const HERB_DETAILS: Record<string, {
  commonName: string;
  scientificName: string;
  family: string;
  properties: string[];
  evidenceLevel: string;
  sustainability: string;
  partsUsed: string[];
  overview: string;
  constituents: { name: string; category: string; concentration?: string }[];
  traditionalUses: { system: string; uses: string[] }[];
  modernApplications: string[];
  dosageRanges: { form: string; low: string; high: string; frequency: string }[];
  preparationMethods: { method: string; ratio?: string; solvent?: string; notes?: string }[];
  contraindications: string[];
  pregnancySafety: string;
  lactationSafety: string;
  pediatricUse: string;
  qualityMarkers: { marker: string; specification: string }[];
  genomicCrossRef: { gene: string; variant: string; effect: string; recommendation: string }[];
}> = {
  ashwagandha: {
    commonName: 'Ashwagandha', scientificName: 'Withania somnifera', family: 'Solanaceae',
    properties: ['adaptogen', 'anxiolytic', 'anti-inflammatory', 'immunomodulatory', 'neuroprotective'],
    evidenceLevel: 'strong', sustainability: 'abundant', partsUsed: ['Root', 'Leaf'],
    overview: 'Ashwagandha is a premier Ayurvedic rasayana (rejuvenating) herb with over 3,000 years of traditional use. Modern research confirms its adaptogenic properties, demonstrating significant cortisol reduction, anxiety relief, and thyroid-modulating effects. The root is rich in withanolides, which mediate most of its pharmacological actions.',
    constituents: [
      { name: 'Withanolides', category: 'Steroidal Lactones', concentration: '2.5-5%' },
      { name: 'Withaferin A', category: 'Steroidal Lactone' },
      { name: 'Sitoindosides VII-X', category: 'Glycowithanolides' },
      { name: 'Alkaloids (Isopelletierine)', category: 'Alkaloid', concentration: '0.13-0.31%' },
      { name: 'Iron', category: 'Mineral' },
    ],
    traditionalUses: [
      { system: 'Ayurveda', uses: ['Rasayana (rejuvenation)', 'Balya (strength-promoting)', 'Vata-Kapha balancing', 'Shukrala (reproductive tonic)'] },
      { system: 'Western', uses: ['Stress adaptation', 'Adrenal support', 'Thyroid modulation', 'Sleep quality'] },
      { system: 'TCM', uses: ['Tonifies kidney yang', 'Calms shen'] },
    ],
    modernApplications: ['Cortisol reduction (avg -30%)', 'Anxiety management (GAD-7 improvement)', 'Thyroid support (TSH normalization)', 'Athletic performance (VO2 max)', 'Sleep quality (onset latency)'],
    dosageRanges: [
      { form: 'Root powder', low: '3g', high: '6g', frequency: 'twice daily with warm milk' },
      { form: 'KSM-66 extract', low: '300mg', high: '600mg', frequency: 'twice daily' },
      { form: 'Sensoril extract', low: '125mg', high: '250mg', frequency: 'twice daily' },
      { form: 'Tincture (1:3)', low: '2ml', high: '4ml', frequency: 'three times daily' },
    ],
    preparationMethods: [
      { method: 'Churna (powder)', notes: 'Mixed with warm milk and ghee for traditional preparation' },
      { method: 'Decoction', notes: 'Simmer root 15-20 min in water or milk' },
      { method: 'Tincture', ratio: '1:3', solvent: '45% ethanol' },
      { method: 'Capsule', notes: 'Standardized to 5% withanolides (KSM-66)' },
    ],
    contraindications: ['Nightshade sensitivity', 'Hyperthyroidism', 'Autoimmune thyroid (monitor)', 'Pregnancy', 'Concurrent barbiturates/benzodiazepines'],
    pregnancySafety: 'avoid', lactationSafety: 'caution', pediatricUse: 'caution',
    qualityMarkers: [
      { marker: 'Withanolide content', specification: '≥2.5% (root), ≥5% (KSM-66)' },
      { marker: 'Withaferin A', specification: '≤0.1% (root extract) — higher in leaf' },
      { marker: 'Heavy metals', specification: 'Below USP <2232> limits' },
      { marker: 'Microbial limits', specification: 'Per USP <2021>/<2022>' },
    ],
    genomicCrossRef: [
      { gene: 'COMT', variant: 'Val158Met (Met/Met)', effect: 'May affect catecholamine modulation in slow COMT; ashwagandha modulates dopamine pathways', recommendation: 'Start low dose (300mg KSM-66); monitor for overstimulation' },
      { gene: 'CYP2D6', variant: 'Poor metabolizer', effect: 'Potential altered metabolism of alkaloid constituents', recommendation: 'Standard dosing generally safe; monitor if combining with CYP2D6 substrates' },
      { gene: 'HPA axis', variant: 'FKBP5 variants', effect: 'Cortisol regulation variants may alter adaptogenic response', recommendation: 'May be especially beneficial for FKBP5 risk allele carriers' },
      { gene: 'Thyroid (DIO2)', variant: 'Thr92Ala', effect: 'Impaired T4→T3 conversion; ashwagandha may support thyroid function', recommendation: 'Monitor TSH/T3/T4 every 8 weeks' },
    ],
  },
};

// Default/fallback for herbs not in the detailed map
function getDefaultHerb(id: string) {
  return {
    commonName: id.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    scientificName: 'See botanical database',
    family: 'Various',
    properties: ['adaptogen', 'anti-inflammatory'],
    evidenceLevel: 'moderate',
    sustainability: 'sustainable',
    partsUsed: ['Root'],
    overview: 'Detailed monograph available in the full botanical database. This herb has documented traditional and modern applications with active research ongoing.',
    constituents: [{ name: 'See full monograph', category: 'Various' }],
    traditionalUses: [
      { system: 'Western', uses: ['Traditional applications documented'] },
      { system: 'TCM', uses: ['Classical usage recorded'] },
    ],
    modernApplications: ['Modern research ongoing', 'See database for current evidence'],
    dosageRanges: [
      { form: 'Tincture (1:5)', low: '2ml', high: '4ml', frequency: 'three times daily' },
      { form: 'Dried herb capsule', low: '500mg', high: '1500mg', frequency: 'twice daily' },
    ],
    preparationMethods: [
      { method: 'Tincture', ratio: '1:5', solvent: '45-60% ethanol' },
      { method: 'Infusion/Decoction', notes: 'Standard preparation' },
    ],
    contraindications: ['See full monograph'],
    pregnancySafety: 'insufficient_data', lactationSafety: 'insufficient_data', pediatricUse: 'insufficient_data',
    qualityMarkers: [{ marker: 'Identity', specification: 'TLC/HPLC confirmed' }],
    genomicCrossRef: [],
  };
}

/* ------------------------------------------------------------------ */
/*  Tab definitions                                                    */
/* ------------------------------------------------------------------ */

const TABS = ['Overview', 'Phytochemistry', 'Actions & Uses', 'Dosage', 'Safety', 'Genomics'] as const;
type TabName = (typeof TABS)[number];

const safetyColors: Record<string, { bg: string; text: string; label: string }> = {
  safe: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', label: 'Safe' },
  caution: { bg: 'bg-amber-500/20', text: 'text-amber-300', label: 'Caution' },
  avoid: { bg: 'bg-red-500/20', text: 'text-red-300', label: 'Avoid' },
  insufficient_data: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Insufficient Data' },
};

export default function HerbDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const herb = HERB_DETAILS[id] || getDefaultHerb(id);
  const [activeTab, setActiveTab] = useState<TabName>('Overview');

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      {/* Back link */}
      <Link href="/naturopath/herbs" className="text-sm text-amber-400 hover:text-amber-300 flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back to Botanical Database
      </Link>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Card variant="flat" padding="lg" className="!bg-white/5 backdrop-blur-xl !border-amber-500/20">
          <CardContent>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white">{herb.commonName}</h1>
                <p className="text-base italic text-amber-400/80 mt-1">{herb.scientificName}</p>
                <p className="text-sm text-slate-500 mt-0.5">Family: {herb.family}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {herb.properties.map((p) => (
                  <Badge key={p} variant="info" className="!bg-amber-500/15 !text-amber-300 text-xs">{p}</Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
              <span>Parts used: {herb.partsUsed.join(', ')}</span>
              <span>|</span>
              <span className="capitalize">Evidence: {herb.evidenceLevel}</span>
              <span>|</span>
              <span className="capitalize">Sustainability: {herb.sustainability}</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/20'
                : 'text-slate-400 hover:text-slate-300 hover:bg-white/5 border border-transparent'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {activeTab === 'Overview' && (
          <div className="flex flex-col gap-6">
            <Card variant="flat" padding="md" className="!bg-white/5 backdrop-blur-xl !border-white/10">
              <CardContent>
                <p className="text-sm text-slate-300 leading-relaxed">{herb.overview}</p>
              </CardContent>
            </Card>
            {herb.traditionalUses.map((tu) => (
              <Card key={tu.system} variant="flat" padding="md" className="!bg-white/5 backdrop-blur-xl !border-white/10">
                <CardHeader><CardTitle className="!text-white !text-base">{tu.system}</CardTitle></CardHeader>
                <CardContent>
                  <ul className="flex flex-col gap-1.5">
                    {tu.uses.map((u) => (
                      <li key={u} className="text-sm text-slate-400 flex items-start gap-2">
                        <span className="text-amber-400 mt-1">•</span>{u}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
            <Card variant="flat" padding="md" className="!bg-white/5 backdrop-blur-xl !border-white/10">
              <CardHeader><CardTitle className="!text-white !text-base">Modern Applications</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {herb.modernApplications.map((app) => (
                    <span key={app} className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">{app}</span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'Phytochemistry' && (
          <Card variant="flat" padding="md" className="!bg-white/5 backdrop-blur-xl !border-white/10">
            <CardHeader><CardTitle className="!text-white !text-base">Active Constituents</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 text-slate-400 font-medium">Constituent</th>
                      <th className="text-left py-2 text-slate-400 font-medium">Category</th>
                      <th className="text-left py-2 text-slate-400 font-medium">Concentration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {herb.constituents.map((c, i) => (
                      <tr key={i} className="border-b border-white/5">
                        <td className="py-2.5 text-slate-200 font-medium">{c.name}</td>
                        <td className="py-2.5 text-slate-400">{c.category}</td>
                        <td className="py-2.5 text-amber-300">{c.concentration || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'Actions & Uses' && (
          <div className="flex flex-col gap-6">
            <Card variant="flat" padding="md" className="!bg-white/5 backdrop-blur-xl !border-white/10">
              <CardHeader><CardTitle className="!text-white !text-base">Pharmacological Properties</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {herb.properties.map((p) => (
                    <span key={p} className="px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">{p}</span>
                  ))}
                </div>
              </CardContent>
            </Card>
            {herb.traditionalUses.map((tu) => (
              <Card key={tu.system} variant="flat" padding="md" className="!bg-white/5 backdrop-blur-xl !border-white/10">
                <CardHeader><CardTitle className="!text-white !text-sm">{tu.system} Uses</CardTitle></CardHeader>
                <CardContent>
                  <ul className="flex flex-col gap-1">
                    {tu.uses.map((u) => (
                      <li key={u} className="text-sm text-slate-400">• {u}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'Dosage' && (
          <div className="flex flex-col gap-6">
            <Card variant="flat" padding="md" className="!bg-white/5 backdrop-blur-xl !border-white/10">
              <CardHeader><CardTitle className="!text-white !text-base">Dosage Ranges</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 text-slate-400 font-medium">Form</th>
                      <th className="text-left py-2 text-slate-400 font-medium">Low</th>
                      <th className="text-left py-2 text-slate-400 font-medium">High</th>
                      <th className="text-left py-2 text-slate-400 font-medium">Frequency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {herb.dosageRanges.map((d, i) => (
                      <tr key={i} className="border-b border-white/5">
                        <td className="py-2.5 text-slate-200">{d.form}</td>
                        <td className="py-2.5 text-emerald-300">{d.low}</td>
                        <td className="py-2.5 text-amber-300">{d.high}</td>
                        <td className="py-2.5 text-slate-400">{d.frequency}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
            <Card variant="flat" padding="md" className="!bg-white/5 backdrop-blur-xl !border-white/10">
              <CardHeader><CardTitle className="!text-white !text-base">Preparation Methods</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3">
                  {herb.preparationMethods.map((pm, i) => (
                    <div key={i} className="flex flex-col gap-1 p-3 rounded-lg bg-white/[0.03] border border-white/5">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-amber-300">{pm.method}</span>
                        {pm.ratio && <Badge variant="info" className="!bg-white/10 !text-slate-400 text-[10px]">{pm.ratio}</Badge>}
                        {pm.solvent && <Badge variant="info" className="!bg-white/10 !text-slate-400 text-[10px]">{pm.solvent}</Badge>}
                      </div>
                      {pm.notes && <p className="text-xs text-slate-500">{pm.notes}</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'Safety' && (
          <div className="flex flex-col gap-6">
            <Card variant="flat" padding="md" className="!bg-white/5 backdrop-blur-xl !border-white/10">
              <CardHeader><CardTitle className="!text-white !text-base">Safety Profile</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  {[
                    { label: 'Pregnancy', value: herb.pregnancySafety },
                    { label: 'Lactation', value: herb.lactationSafety },
                    { label: 'Pediatric', value: herb.pediatricUse },
                  ].map((s) => {
                    const sc = safetyColors[s.value] || safetyColors.insufficient_data;
                    return (
                      <div key={s.label} className={`p-3 rounded-lg ${sc.bg} border border-current/10`}>
                        <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                        <p className={`text-sm font-medium ${sc.text}`}>{sc.label}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            <Card variant="flat" padding="md" className="!bg-white/5 backdrop-blur-xl !border-white/10">
              <CardHeader><CardTitle className="!text-white !text-base">Contraindications</CardTitle></CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2">
                  {herb.contraindications.map((c) => (
                    <li key={c} className="flex items-start gap-2 text-sm text-slate-300">
                      <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                      {c}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card variant="flat" padding="md" className="!bg-white/5 backdrop-blur-xl !border-white/10">
              <CardHeader><CardTitle className="!text-white !text-base">Quality Markers</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 text-slate-400 font-medium">Marker</th>
                      <th className="text-left py-2 text-slate-400 font-medium">Specification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {herb.qualityMarkers.map((qm, i) => (
                      <tr key={i} className="border-b border-white/5">
                        <td className="py-2.5 text-slate-200">{qm.marker}</td>
                        <td className="py-2.5 text-amber-300">{qm.specification}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'Genomics' && (
          <div className="flex flex-col gap-6">
            {herb.genomicCrossRef.length > 0 ? (
              <>
                <p className="text-sm text-slate-400">Genomic cross-references link genetic variants to herb response and safety considerations.</p>
                {herb.genomicCrossRef.map((g, i) => (
                  <Card key={i} variant="flat" padding="md" className="!bg-white/5 backdrop-blur-xl !border-white/10">
                    <CardContent>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                          <Badge variant="info" className="!bg-violet-500/20 !text-violet-300">{g.gene}</Badge>
                          <Badge variant="info" className="!bg-amber-500/20 !text-amber-300">{g.variant}</Badge>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Effect</p>
                          <p className="text-sm text-slate-300">{g.effect}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                          <p className="text-xs text-amber-400 mb-1">Clinical Recommendation</p>
                          <p className="text-sm text-amber-200">{g.recommendation}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : (
              <Card variant="flat" padding="lg" className="!bg-white/5 backdrop-blur-xl !border-white/10">
                <CardContent>
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 mx-auto text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5" />
                    </svg>
                    <p className="text-slate-400 text-sm">No genomic cross-references available for this herb.</p>
                    <p className="text-slate-500 text-xs mt-1">Research is ongoing. Check back for updates.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
