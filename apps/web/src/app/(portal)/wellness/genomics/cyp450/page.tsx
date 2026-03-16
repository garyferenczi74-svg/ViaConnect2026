'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

interface EnzymeCard {
  enzyme: string;
  status: string;
  color: string;
  colorHex: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  implication: string;
  drugs: string[];
}

const enzymes: EnzymeCard[] = [
  {
    enzyme: 'CYP2D6',
    status: 'Intermediate Metabolizer',
    color: 'yellow',
    colorHex: '#eab308',
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-amber-500/30',
    textClass: 'text-amber-400',
    implication: 'Adjust SSRI dosing — may need lower doses of fluoxetine, paroxetine. Monitor for side effects.',
    drugs: ['Codeine', 'Tramadol', 'Fluoxetine', 'Paroxetine', 'Tamoxifen'],
  },
  {
    enzyme: 'CYP2C19',
    status: 'Normal Metabolizer',
    color: 'green',
    colorHex: '#22c55e',
    bgClass: 'bg-emerald-500/10',
    borderClass: 'border-emerald-500/30',
    textClass: 'text-emerald-400',
    implication: 'Standard dosing appropriate for proton pump inhibitors and clopidogrel.',
    drugs: ['Omeprazole', 'Clopidogrel', 'Escitalopram', 'Diazepam'],
  },
  {
    enzyme: 'CYP3A4',
    status: 'Normal Metabolizer',
    color: 'green',
    colorHex: '#22c55e',
    bgClass: 'bg-emerald-500/10',
    borderClass: 'border-emerald-500/30',
    textClass: 'text-emerald-400',
    implication: 'Normal metabolism of approximately 50% of all medications. Standard dosing expected.',
    drugs: ['Atorvastatin', 'Midazolam', 'Cyclosporine', 'Tacrolimus'],
  },
  {
    enzyme: 'CYP2C9',
    status: 'Poor Metabolizer',
    color: 'red',
    colorHex: '#ef4444',
    bgClass: 'bg-red-500/10',
    borderClass: 'border-red-500/30',
    textClass: 'text-red-400',
    implication: 'Significantly reduced warfarin clearance — requires ~50% dose reduction. NSAID accumulation risk.',
    drugs: ['Warfarin', 'Phenytoin', 'Ibuprofen', 'Celecoxib', 'Losartan'],
  },
  {
    enzyme: 'CYP1A2',
    status: 'Ultra-rapid Metabolizer',
    color: 'blue',
    colorHex: '#3b82f6',
    bgClass: 'bg-blue-500/10',
    borderClass: 'border-blue-500/30',
    textClass: 'text-blue-400',
    implication: 'Normal caffeine metabolism. Rapid clearance of theophylline — may need higher doses.',
    drugs: ['Caffeine', 'Theophylline', 'Clozapine', 'Melatonin'],
  },
  {
    enzyme: 'CYP2B6',
    status: 'Intermediate Metabolizer',
    color: 'yellow',
    colorHex: '#eab308',
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-amber-500/30',
    textClass: 'text-amber-400',
    implication: 'Monitor bupropion and efavirenz levels. Dose adjustments may be needed.',
    drugs: ['Bupropion', 'Efavirenz', 'Methadone', 'Ketamine'],
  },
];

const drugAlerts = [
  {
    severity: 'high',
    title: 'Warfarin — Dose Reduction Required',
    detail:
      'CYP2C9 poor metabolizer status requires approximately 50% dose reduction from standard. INR monitoring critical during initiation.',
    genes: ['CYP2C9', 'VKORC1'],
  },
  {
    severity: 'moderate',
    title: 'SSRI Dose Adjustment',
    detail:
      'CYP2D6 intermediate metabolizer may lead to elevated plasma levels of fluoxetine and paroxetine. Consider starting at reduced dose.',
    genes: ['CYP2D6'],
  },
  {
    severity: 'low',
    title: 'Caffeine — Rapid Clearance',
    detail:
      'CYP1A2 ultra-rapid metabolizer clears caffeine quickly. Higher intake may be tolerated, but consider cardiovascular monitoring.',
    genes: ['CYP1A2'],
  },
];

const severityStyles: Record<string, { border: string; bg: string; dot: string; title: string }> = {
  high: {
    border: 'border-red-500/30',
    bg: 'bg-red-500/5',
    dot: 'bg-red-400',
    title: 'text-red-300',
  },
  moderate: {
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/5',
    dot: 'bg-amber-400',
    title: 'text-amber-300',
  },
  low: {
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/5',
    dot: 'bg-blue-400',
    title: 'text-blue-300',
  },
};

export default function CYP450Page() {
  return (
    <div className="min-h-screen bg-slate-950 text-white px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl">
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
          CYP450 Drug Metabolism
        </motion.h1>
        <p className="text-slate-400 mb-8">
          Pharmacogenomic profile — how your genes affect drug metabolism and dosing.
        </p>

        {/* Enzyme Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          {enzymes.map((enz, i) => (
            <motion.div
              key={enz.enzyme}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              className={`rounded-2xl border ${enz.borderClass} ${enz.bgClass} backdrop-blur-md p-5`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-white">{enz.enzyme}</h3>
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: enz.colorHex }}
                />
              </div>
              <span className={`inline-block text-sm font-semibold mb-3 ${enz.textClass}`}>
                {enz.status}
              </span>
              <p className="text-sm text-slate-400 leading-relaxed mb-3">{enz.implication}</p>
              <div className="flex flex-wrap gap-1">
                {enz.drugs.map((drug) => (
                  <span
                    key={drug}
                    className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-xs text-slate-300"
                  >
                    {drug}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Drug Interaction Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <h2 className="text-lg font-semibold text-white mb-4">Drug Interaction Alerts</h2>
          <div className="space-y-4">
            {drugAlerts.map((alert, i) => {
              const styles = severityStyles[alert.severity];
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + i * 0.1 }}
                  className={`rounded-2xl border ${styles.border} ${styles.bg} backdrop-blur-md p-5`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${styles.dot}`} />
                    <h3 className={`text-base font-semibold ${styles.title}`}>{alert.title}</h3>
                    <span className="ml-auto rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-xs text-slate-400 capitalize">
                      {alert.severity} priority
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed mb-3">{alert.detail}</p>
                  <div className="flex gap-2">
                    {alert.genes.map((gene) => (
                      <span
                        key={gene}
                        className="rounded-full bg-violet-500/15 border border-violet-500/20 px-2 py-0.5 text-xs text-violet-300"
                      >
                        {gene}
                      </span>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
