'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface GeneNode {
  id: string;
  label: string;
  x: number;
  y: number;
  status: 'normal' | 'heterozygous' | 'homozygous';
  variant: string;
  clinicalSignificance: string;
  supplements: string[];
}

const geneNodes: GeneNode[] = [
  {
    id: 'MTHFR',
    label: 'MTHFR',
    x: 100,
    y: 200,
    status: 'heterozygous',
    variant: 'C677T — Heterozygous (CT)',
    clinicalSignificance:
      'Reduced enzyme activity (~35%). Impaired conversion of folate to 5-MTHF. Elevated homocysteine risk.',
    supplements: ['L-Methylfolate 1000 mcg', 'Riboflavin (B2) 25 mg', 'Betaine (TMG) 500 mg'],
  },
  {
    id: '5-MTHF',
    label: '5-MTHF',
    x: 250,
    y: 100,
    status: 'normal',
    variant: 'Metabolite — downstream of MTHFR',
    clinicalSignificance: 'Active folate form. Levels may be reduced due to MTHFR heterozygosity.',
    supplements: ['L-Methylfolate supplementation recommended'],
  },
  {
    id: 'MTR',
    label: 'MTR',
    x: 420,
    y: 100,
    status: 'normal',
    variant: 'A2756G — Normal (AA)',
    clinicalSignificance: 'Normal methionine synthase activity. Adequate B12-dependent remethylation.',
    supplements: ['Methylcobalamin 1000 mcg (maintenance)'],
  },
  {
    id: 'MTRR',
    label: 'MTRR',
    x: 420,
    y: 260,
    status: 'homozygous',
    variant: 'A66G — Homozygous (GG)',
    clinicalSignificance:
      'Significantly reduced methionine synthase reductase activity. Impaired B12 regeneration. Monitor B12 and homocysteine.',
    supplements: [
      'Methylcobalamin 5000 mcg',
      'Hydroxocobalamin injections (consider)',
      'L-Methylfolate 1000 mcg',
    ],
  },
  {
    id: 'Methionine',
    label: 'Methionine',
    x: 570,
    y: 100,
    status: 'normal',
    variant: 'Essential amino acid',
    clinicalSignificance: 'Precursor to SAMe. Adequate dietary intake important for methylation cycle.',
    supplements: ['Ensure adequate protein intake'],
  },
  {
    id: 'SAMe',
    label: 'SAMe',
    x: 700,
    y: 150,
    status: 'normal',
    variant: 'Universal methyl donor',
    clinicalSignificance:
      'Primary methyl donor for DNA, neurotransmitters, and phospholipids. Levels may be suboptimal with MTHFR variants.',
    supplements: ['SAMe 200–400 mg (if clinically indicated)'],
  },
  {
    id: 'SAH',
    label: 'SAH',
    x: 700,
    y: 290,
    status: 'normal',
    variant: 'S-Adenosylhomocysteine',
    clinicalSignificance: 'Byproduct of methylation. Elevated SAH inhibits methyltransferases.',
    supplements: [],
  },
  {
    id: 'Homocysteine',
    label: 'Homocysteine',
    x: 550,
    y: 350,
    status: 'normal',
    variant: 'Amino acid intermediate',
    clinicalSignificance:
      'Elevated levels (>12 µmol/L) associated with cardiovascular risk. Monitor regularly with MTHFR/MTRR variants.',
    supplements: ['B-complex with active forms', 'Betaine (TMG) 500–1000 mg'],
  },
  {
    id: 'CBS',
    label: 'CBS',
    x: 380,
    y: 350,
    status: 'normal',
    variant: 'C699T — Normal (CC)',
    clinicalSignificance:
      'Normal cystathionine beta-synthase activity. Adequate transsulfuration pathway function.',
    supplements: ['P5P (active B6) 25 mg (supportive)'],
  },
  {
    id: 'COMT',
    label: 'COMT',
    x: 250,
    y: 350,
    status: 'heterozygous',
    variant: 'Val158Met — Heterozygous (Val/Met)',
    clinicalSignificance:
      'Intermediate COMT activity. Moderate dopamine/norepinephrine clearance. SAMe consumption is moderate.',
    supplements: ['Magnesium glycinate 200 mg', 'Avoid excess methyl donors'],
  },
  {
    id: 'Glutathione',
    label: 'Glutathione',
    x: 200,
    y: 440,
    status: 'normal',
    variant: 'Master antioxidant',
    clinicalSignificance:
      'Downstream product of transsulfuration. Critical for detoxification and oxidative stress defense.',
    supplements: ['NAC 600 mg', 'Liposomal Glutathione 250 mg', 'Selenium 200 mcg'],
  },
];

const connections: [string, string][] = [
  ['MTHFR', '5-MTHF'],
  ['5-MTHF', 'MTR'],
  ['MTR', 'Methionine'],
  ['MTRR', 'MTR'],
  ['Methionine', 'SAMe'],
  ['SAMe', 'SAH'],
  ['SAH', 'Homocysteine'],
  ['Homocysteine', 'CBS'],
  ['CBS', 'Glutathione'],
  ['Homocysteine', 'COMT'],
  ['COMT', 'MTHFR'],
];

const statusColor: Record<string, string> = {
  normal: '#22c55e',
  heterozygous: '#eab308',
  homozygous: '#ef4444',
};

const statusLabel: Record<string, string> = {
  normal: 'Normal',
  heterozygous: 'Heterozygous',
  homozygous: 'Homozygous Variant',
};

export default function MethylationPage() {
  const [selectedGene, setSelectedGene] = useState<GeneNode | null>(null);

  const getNode = (id: string) => geneNodes.find((n) => n.id === id)!;

  return (
    <div className="min-h-screen bg-slate-950 text-white px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Back link */}
        <Link
          href="/wellness/genomics"
          className="inline-flex items-center text-sm text-slate-400 hover:text-cyan-400 transition-colors mb-8"
        >
          <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Genomic Dashboard
        </Link>

        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent mb-2"
        >
          Methylation Pathway Map
        </motion.h1>
        <p className="text-slate-400 mb-8">
          Interactive visualization of your methylation cycle genes and metabolites.
          Click a node to view details.
        </p>

        {/* Legend */}
        <div className="flex gap-6 mb-6 text-sm">
          {Object.entries(statusColor).map(([status, color]) => (
            <div key={status} className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-slate-300 capitalize">{statusLabel[status]}</span>
            </div>
          ))}
        </div>

        {/* SVG Pathway */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md p-4 overflow-x-auto"
        >
          <svg viewBox="0 0 900 520" className="w-full h-auto min-w-[700px]">
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <marker
                id="arrowhead"
                markerWidth="8"
                markerHeight="6"
                refX="8"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#64748b" />
              </marker>
            </defs>

            {/* Connections */}
            {connections.map(([fromId, toId]) => {
              const from = getNode(fromId);
              const to = getNode(toId);
              return (
                <line
                  key={`${fromId}-${toId}`}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="#475569"
                  strokeWidth={1.5}
                  markerEnd="url(#arrowhead)"
                  opacity={0.6}
                />
              );
            })}

            {/* Gene Nodes */}
            {geneNodes.map((node) => {
              const color = statusColor[node.status];
              const isSelected = selectedGene?.id === node.id;
              return (
                <g
                  key={node.id}
                  onClick={() => setSelectedGene(isSelected ? null : node)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isSelected ? 32 : 28}
                    fill={`${color}22`}
                    stroke={color}
                    strokeWidth={isSelected ? 3 : 2}
                    filter="url(#glow)"
                  />
                  <text
                    x={node.x}
                    y={node.y + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize={node.label.length > 8 ? 8 : 10}
                    fontWeight="600"
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </motion.div>

        {/* Detail Panel */}
        <AnimatePresence>
          {selectedGene && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
              className="mt-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: statusColor[selectedGene.status] }}
                  />
                  <h2 className="text-xl font-bold text-white">{selectedGene.label}</h2>
                  <span
                    className="rounded-full px-3 py-0.5 text-xs font-semibold border"
                    style={{
                      borderColor: `${statusColor[selectedGene.status]}66`,
                      color: statusColor[selectedGene.status],
                      backgroundColor: `${statusColor[selectedGene.status]}15`,
                    }}
                  >
                    {statusLabel[selectedGene.status]}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedGene(null)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-white/5 p-4">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Variant Info
                  </h3>
                  <p className="text-sm text-slate-200">{selectedGene.variant}</p>
                </div>
                <div className="rounded-xl bg-white/5 p-4">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Clinical Significance
                  </h3>
                  <p className="text-sm text-slate-200">{selectedGene.clinicalSignificance}</p>
                </div>
                <div className="rounded-xl bg-white/5 p-4">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Supplement Recommendations
                  </h3>
                  {selectedGene.supplements.length > 0 ? (
                    <ul className="space-y-1">
                      {selectedGene.supplements.map((s, i) => (
                        <li key={i} className="text-sm text-cyan-300 flex items-start gap-1">
                          <span className="text-cyan-500 mt-0.5">+</span> {s}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500">No specific supplements indicated.</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
