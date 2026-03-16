'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card, CardContent, Badge, glassClasses } from '@genex360/ui';

/* ------------------------------------------------------------------ */
/*  Mock herb data (mirrors botanical-intelligence service)            */
/* ------------------------------------------------------------------ */

const HERBS = [
  { id: 'ashwagandha', common: 'Ashwagandha', sci: 'Withania somnifera', family: 'Solanaceae', props: ['adaptogen', 'anxiolytic', 'anti-inflammatory', 'immunomodulatory'], evidence: 'strong', sustainability: 'abundant' },
  { id: 'turmeric', common: 'Turmeric', sci: 'Curcuma longa', family: 'Zingiberaceae', props: ['anti-inflammatory', 'antioxidant', 'hepatoprotective', 'neuroprotective'], evidence: 'strong', sustainability: 'abundant' },
  { id: 'echinacea', common: 'Echinacea', sci: 'Echinacea purpurea', family: 'Asteraceae', props: ['immunostimulant', 'anti-inflammatory', 'antimicrobial'], evidence: 'moderate', sustainability: 'abundant' },
  { id: 'valerian', common: 'Valerian', sci: 'Valeriana officinalis', family: 'Caprifoliaceae', props: ['sedative', 'anxiolytic', 'spasmolytic', 'nervine'], evidence: 'moderate', sustainability: 'abundant' },
  { id: 'st-johns-wort', common: "St. John's Wort", sci: 'Hypericum perforatum', family: 'Hypericaceae', props: ['antidepressant', 'nervine', 'anti-inflammatory', 'antiviral'], evidence: 'strong', sustainability: 'abundant' },
  { id: 'milk-thistle', common: 'Milk Thistle', sci: 'Silybum marianum', family: 'Asteraceae', props: ['hepatoprotective', 'antioxidant', 'anti-inflammatory'], evidence: 'strong', sustainability: 'abundant' },
  { id: 'ginkgo', common: 'Ginkgo', sci: 'Ginkgo biloba', family: 'Ginkgoaceae', props: ['circulatory stimulant', 'antioxidant', 'neuroprotective', 'nootropic'], evidence: 'strong', sustainability: 'sustainable' },
  { id: 'rhodiola', common: 'Rhodiola', sci: 'Rhodiola rosea', family: 'Crassulaceae', props: ['adaptogen', 'nootropic', 'antidepressant', 'anxiolytic'], evidence: 'moderate', sustainability: 'at_risk' },
  { id: 'passionflower', common: 'Passionflower', sci: 'Passiflora incarnata', family: 'Passifloraceae', props: ['anxiolytic', 'sedative', 'spasmolytic', 'nervine'], evidence: 'moderate', sustainability: 'abundant' },
  { id: 'black-cohosh', common: 'Black Cohosh', sci: 'Actaea racemosa', family: 'Ranunculaceae', props: ['hormonal modulator', 'anti-inflammatory', 'spasmolytic'], evidence: 'moderate', sustainability: 'at_risk' },
  { id: 'saw-palmetto', common: 'Saw Palmetto', sci: 'Serenoa repens', family: 'Arecaceae', props: ['anti-androgenic', 'anti-inflammatory', 'diuretic'], evidence: 'moderate', sustainability: 'sustainable' },
  { id: 'elderberry', common: 'Elderberry', sci: 'Sambucus nigra', family: 'Adoxaceae', props: ['antiviral', 'immunostimulant', 'antioxidant'], evidence: 'moderate', sustainability: 'abundant' },
  { id: 'ginger', common: 'Ginger', sci: 'Zingiber officinale', family: 'Zingiberaceae', props: ['carminative', 'antiemetic', 'anti-inflammatory', 'circulatory stimulant'], evidence: 'strong', sustainability: 'abundant' },
  { id: 'licorice', common: 'Licorice', sci: 'Glycyrrhiza glabra', family: 'Fabaceae', props: ['adaptogen', 'demulcent', 'expectorant', 'adrenal tonic'], evidence: 'moderate', sustainability: 'sustainable' },
  { id: 'kava', common: 'Kava', sci: 'Piper methysticum', family: 'Piperaceae', props: ['anxiolytic', 'sedative', 'muscle relaxant', 'analgesic'], evidence: 'strong', sustainability: 'sustainable' },
  { id: 'berberine', common: 'Barberry', sci: 'Berberis vulgaris', family: 'Berberidaceae', props: ['antimicrobial', 'hypoglycemic', 'hepatoprotective', 'bitter tonic'], evidence: 'strong', sustainability: 'sustainable' },
  { id: 'green-tea', common: 'Green Tea', sci: 'Camellia sinensis', family: 'Theaceae', props: ['antioxidant', 'thermogenic', 'neuroprotective', 'cardioprotective'], evidence: 'strong', sustainability: 'abundant' },
  { id: 'holy-basil', common: 'Holy Basil', sci: 'Ocimum tenuiflorum', family: 'Lamiaceae', props: ['adaptogen', 'anti-inflammatory', 'immunomodulatory', 'anxiolytic'], evidence: 'moderate', sustainability: 'abundant' },
  { id: 'reishi', common: 'Reishi', sci: 'Ganoderma lucidum', family: 'Ganodermataceae', props: ['immunomodulatory', 'adaptogen', 'hepatoprotective', 'anxiolytic'], evidence: 'moderate', sustainability: 'sustainable' },
  { id: 'lions-mane', common: "Lion's Mane", sci: 'Hericium erinaceus', family: 'Hericiaceae', props: ['nootropic', 'neuroprotective', 'neurotrophic', 'immunomodulatory'], evidence: 'moderate', sustainability: 'sustainable' },
  { id: 'chamomile', common: 'Chamomile', sci: 'Matricaria chamomilla', family: 'Asteraceae', props: ['anxiolytic', 'carminative', 'anti-inflammatory', 'spasmolytic'], evidence: 'moderate', sustainability: 'abundant' },
  { id: 'peppermint', common: 'Peppermint', sci: 'Mentha x piperita', family: 'Lamiaceae', props: ['carminative', 'spasmolytic', 'analgesic', 'decongestant'], evidence: 'strong', sustainability: 'abundant' },
  { id: 'lavender', common: 'Lavender', sci: 'Lavandula angustifolia', family: 'Lamiaceae', props: ['anxiolytic', 'sedative', 'analgesic', 'antimicrobial'], evidence: 'moderate', sustainability: 'abundant' },
  { id: 'hawthorn', common: 'Hawthorn', sci: 'Crataegus monogyna', family: 'Rosaceae', props: ['cardiotonic', 'hypotensive', 'antioxidant'], evidence: 'strong', sustainability: 'abundant' },
  { id: 'garlic', common: 'Garlic', sci: 'Allium sativum', family: 'Amaryllidaceae', props: ['antimicrobial', 'hypotensive', 'hypolipidemic', 'antiplatelet'], evidence: 'strong', sustainability: 'abundant' },
  { id: 'nettle', common: 'Nettle', sci: 'Urtica dioica', family: 'Urticaceae', props: ['nutritive', 'diuretic', 'anti-inflammatory', 'antiallergic'], evidence: 'moderate', sustainability: 'abundant' },
  { id: 'dandelion', common: 'Dandelion', sci: 'Taraxacum officinale', family: 'Asteraceae', props: ['hepatoprotective', 'diuretic', 'cholagogue', 'bitter tonic'], evidence: 'preliminary', sustainability: 'abundant' },
  { id: 'boswellia', common: 'Boswellia', sci: 'Boswellia serrata', family: 'Burseraceae', props: ['anti-inflammatory', 'analgesic', 'antiarthritic'], evidence: 'strong', sustainability: 'at_risk' },
  { id: 'astragalus', common: 'Astragalus', sci: 'Astragalus membranaceus', family: 'Fabaceae', props: ['immunomodulatory', 'adaptogen', 'cardioprotective'], evidence: 'moderate', sustainability: 'sustainable' },
  { id: 'schisandra', common: 'Schisandra', sci: 'Schisandra chinensis', family: 'Schisandraceae', props: ['adaptogen', 'hepatoprotective', 'nootropic'], evidence: 'moderate', sustainability: 'sustainable' },
];

const PROPERTY_FILTERS = [
  'adaptogen', 'nervine', 'hepatoprotective', 'anti-inflammatory', 'immunostimulant',
  'carminative', 'cardiotonic', 'nootropic', 'anxiolytic', 'sedative', 'antimicrobial', 'antioxidant',
];

const EVIDENCE_LEVELS = ['strong', 'moderate', 'preliminary', 'traditional'] as const;

const SAFETY_FILTERS = [
  { label: 'Pregnancy Safe', key: 'pregnancy' },
  { label: 'Pediatric Safe', key: 'pediatric' },
];

const sustainabilityIcons: Record<string, { color: string; label: string }> = {
  abundant: { color: 'text-emerald-400', label: 'Abundant' },
  sustainable: { color: 'text-green-400', label: 'Sustainable' },
  at_risk: { color: 'text-amber-400', label: 'At Risk' },
  endangered: { color: 'text-red-400', label: 'Endangered' },
};

const evidenceColors: Record<string, string> = {
  strong: 'bg-emerald-500/20 text-emerald-300',
  moderate: 'bg-amber-500/20 text-amber-300',
  preliminary: 'bg-blue-500/20 text-blue-300',
  traditional: 'bg-purple-500/20 text-purple-300',
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.04, duration: 0.4, ease: 'easeOut' },
  }),
};

export default function HerbsBrowserPage() {
  const [search, setSearch] = useState('');
  const [selectedProps, setSelectedProps] = useState<string[]>([]);
  const [selectedEvidence, setSelectedEvidence] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(18);

  const filtered = useMemo(() => {
    return HERBS.filter((h) => {
      const q = search.toLowerCase();
      const matchesSearch = !q || h.common.toLowerCase().includes(q) || h.sci.toLowerCase().includes(q) || h.family.toLowerCase().includes(q);
      const matchesProps = selectedProps.length === 0 || selectedProps.some((p) => h.props.includes(p));
      const matchesEvidence = !selectedEvidence || h.evidence === selectedEvidence;
      return matchesSearch && matchesProps && matchesEvidence;
    });
  }, [search, selectedProps, selectedEvidence]);

  const toggleProp = (p: string) => {
    setSelectedProps((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Botanical Database</h1>
          <p className="text-sm text-slate-400 mt-1">Comprehensive monographs with genomic cross-references</p>
        </div>
        <Badge variant="info" className="!bg-amber-500/20 !text-amber-300 text-sm px-3 py-1">500+ Herbs</Badge>
      </motion.div>

      {/* Search */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <input
          type="text"
          placeholder="Search by name, scientific name, or family..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 rounded-xl text-sm text-slate-200 placeholder-slate-500 bg-white/5 backdrop-blur-xl border border-white/10 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/25 transition-colors"
        />
      </motion.div>

      {/* Property Filters */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="flex flex-wrap gap-2">
        {PROPERTY_FILTERS.map((p) => (
          <button
            key={p}
            onClick={() => toggleProp(p)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              selectedProps.includes(p)
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-white/5 border-white/10 text-slate-400 hover:border-amber-500/30 hover:text-slate-300'
            }`}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </motion.div>

      {/* Evidence Filters */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex items-center gap-2">
        <span className="text-xs text-slate-500 mr-1">Evidence:</span>
        {EVIDENCE_LEVELS.map((lvl) => (
          <button
            key={lvl}
            onClick={() => setSelectedEvidence(selectedEvidence === lvl ? null : lvl)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              selectedEvidence === lvl
                ? evidenceColors[lvl] + ' border border-current/20'
                : 'bg-white/5 border border-white/10 text-slate-400 hover:text-slate-300'
            }`}
          >
            {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
          </button>
        ))}
      </motion.div>

      {/* Results count */}
      <p className="text-xs text-slate-500">{filtered.length} herbs found</p>

      {/* Herb Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.slice(0, visibleCount).map((herb, i) => {
          const sust = sustainabilityIcons[herb.sustainability] || sustainabilityIcons.sustainable;
          return (
            <motion.div key={herb.id} custom={i} variants={fadeUp} initial="hidden" animate="visible">
              <Link href={`/naturopath/herbs/${herb.id}`}>
                <Card
                  variant="flat"
                  padding="md"
                  className={`!bg-white/5 backdrop-blur-xl !border-white/10 hover:!border-amber-500/30 transition-all cursor-pointer h-full`}
                >
                  <CardContent>
                    <div className="flex flex-col gap-3">
                      {/* Name row */}
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-white">{herb.common}</h3>
                          <p className="text-xs italic text-slate-400">{herb.sci}</p>
                        </div>
                        <span className={`text-xs ${sust.color}`}>
                          <svg className="w-4 h-4 inline mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 003 12c0-1.605.42-3.113 1.157-4.418" />
                          </svg>
                          {sust.label}
                        </span>
                      </div>

                      {/* Family */}
                      <p className="text-[11px] text-slate-500">{herb.family}</p>

                      {/* Properties */}
                      <div className="flex flex-wrap gap-1.5">
                        {herb.props.slice(0, 4).map((p) => (
                          <span key={p} className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-slate-400">
                            {p}
                          </span>
                        ))}
                      </div>

                      {/* Evidence + View */}
                      <div className="flex items-center justify-between mt-1">
                        <Badge variant="info" className={`!text-[10px] ${evidenceColors[herb.evidence]}`}>
                          {herb.evidence} evidence
                        </Badge>
                        <span className="text-xs text-amber-400 hover:text-amber-300">View Details →</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Load More */}
      {visibleCount < filtered.length && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center">
          <button
            onClick={() => setVisibleCount((prev) => prev + 12)}
            className="px-6 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm font-medium hover:bg-amber-500/20 transition-colors"
          >
            Load More ({filtered.length - visibleCount} remaining)
          </button>
        </motion.div>
      )}
    </div>
  );
}
