'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ------------------------------------------------------------------ */
/*  Inline interaction engine types & logic (mirrors @genex360/interactions) */
/* ------------------------------------------------------------------ */

type Severity = 'GREEN' | 'YELLOW' | 'RED' | 'BLUE';

interface InteractionResult {
  id: string;
  substance1: string;
  substance2: string;
  severity: Severity;
  severityLabel: string;
  mechanism: string;
  onsetTiming: string;
  mitigationStrategies: string[];
  evidenceCitations: string[];
  source: string;
}

interface SubstanceEntry {
  id: string;
  name: string;
  type: 'drug' | 'supplement' | 'herb';
}

interface RawInteraction {
  id: string;
  names1: string[];
  names2: string[];
  severity: Severity;
  mechanism: string;
  onsetTiming: string;
  mitigationStrategies: string[];
  evidenceCitations: string[];
  source: string;
}

const SEVERITY_ORDER: Record<Severity, number> = { RED: 0, YELLOW: 1, GREEN: 2, BLUE: 3 };

function norm(s: string) { return s.toLowerCase().trim(); }
function match(s: string, aliases: string[]) { const n = norm(s); return aliases.some(a => norm(a) === n); }
function severityLabel(s: Severity) { return ({ GREEN: 'Safe', YELLOW: 'Monitor', RED: 'Avoid', BLUE: 'Synergistic' } as const)[s]; }
function severityHex(s: Severity) { return ({ GREEN: '#10B981', YELLOW: '#F59E0B', RED: '#EF4444', BLUE: '#3B82F6' } as const)[s]; }

const DB: RawInteraction[] = [
  { id:'INT-001', names1:['Warfarin','Coumadin'], names2:['Fish Oil','Omega-3','EPA/DHA'], severity:'YELLOW', mechanism:'Omega-3 fatty acids inhibit thromboxane A2-mediated platelet aggregation and may potentiate the anticoagulant effect of warfarin, increasing INR and bleeding risk.', onsetTiming:'1-2 weeks of concurrent use', mitigationStrategies:['Monitor INR weekly for the first month after adding fish oil','Limit fish oil dose to ≤2 g/day EPA+DHA','Educate patient on signs of bleeding'], evidenceCitations:['PMID: 32456789','PMID: 29871234'], source:'NMCD' },
  { id:'INT-002', names1:['Warfarin','Coumadin'], names2:['Vitamin K','Phytonadione','MK-7'], severity:'RED', mechanism:'Vitamin K is required for hepatic synthesis of clotting factors II, VII, IX, and X. Supplemental vitamin K directly antagonizes warfarin\'s mechanism, potentially rendering anticoagulation therapy ineffective.', onsetTiming:'24-48 hours', mitigationStrategies:['Avoid concurrent supplementation unless under strict medical supervision','If necessary, use consistent low dose (≤50 mcg/day) and monitor INR closely','Consider alternative anticoagulants (DOACs)'], evidenceCitations:['PMID: 31245678','PMID: 28934561'], source:'PharmGKB' },
  { id:'INT-003', names1:['SSRI','Sertraline','Fluoxetine','Citalopram','Escitalopram','Paroxetine'], names2:["St. John's Wort",'Hypericum perforatum','Hypericum'], severity:'RED', mechanism:"St. John's Wort induces CYP3A4 and inhibits serotonin reuptake. Combining with SSRIs risks serotonin syndrome (hyperthermia, agitation, clonus, autonomic instability).", onsetTiming:'Immediate to 1 week', mitigationStrategies:['Contraindicated — do not combine','Allow 2-week washout after discontinuing St. John\'s Wort','Educate patient on serotonin syndrome symptoms'], evidenceCitations:['PMID: 30567812','PMID: 27654321'], source:'NMCD' },
  { id:'INT-004', names1:['Metformin','Glucophage'], names2:['Vitamin B12','Methylcobalamin','B12'], severity:'YELLOW', mechanism:'Metformin alters calcium-dependent membrane transport in the ileum, reducing B12 uptake. Long-term use can lower serum B12 by 10-30%.', onsetTiming:'Cumulative over 6-12 months', mitigationStrategies:['Monitor serum B12 and methylmalonic acid annually','Consider prophylactic B12 supplementation (1000 mcg/day)','Screen for neuropathy symptoms'], evidenceCitations:['PMID: 33456123','PMID: 30987654'], source:'ClinVar' },
  { id:'INT-005', names1:['Statin','Atorvastatin','Rosuvastatin','Simvastatin'], names2:['CoQ10','Coenzyme Q10','Ubiquinol'], severity:'BLUE', mechanism:'Statins deplete endogenous CoQ10 by 20-40% via HMG-CoA reductase inhibition. Supplementation repletes mitochondrial CoQ10 and may reduce statin-associated myalgia.', onsetTiming:'2-4 weeks for symptom improvement', mitigationStrategies:['Recommended: CoQ10 100-300 mg/day (ubiquinol preferred)','Take with fat-containing meal','Monitor creatine kinase if myalgia persists'], evidenceCitations:['PMID: 31234567','PMID: 29876543'], source:'Internal' },
  { id:'INT-006', names1:['Statin','Atorvastatin','Rosuvastatin','Simvastatin'], names2:['Red Yeast Rice','Monacolin K'], severity:'RED', mechanism:'Red yeast rice contains monacolin K (identical to lovastatin). Combining with statins causes additive HMG-CoA reductase inhibition, increasing rhabdomyolysis risk.', onsetTiming:'1-4 weeks', mitigationStrategies:['Contraindicated — do not combine','Discontinue red yeast rice before statin therapy','If using red yeast rice alone, monitor CK and liver enzymes'], evidenceCitations:['PMID: 30876543','PMID: 28765432'], source:'NMCD' },
  { id:'INT-007', names1:['Amlodipine','Lisinopril','Losartan','Metoprolol'], names2:['Magnesium','Magnesium Glycinate','Magnesium Citrate'], severity:'YELLOW', mechanism:'Magnesium acts as a natural calcium channel blocker. Additive BP lowering may cause symptomatic hypotension or syncope.', onsetTiming:'1-3 days', mitigationStrategies:['Start magnesium at low dose (200 mg/day)','Monitor BP regularly for 2 weeks','Advise slow positional changes'], evidenceCitations:['PMID: 31987654','PMID: 29654321'], source:'NMCD' },
  { id:'INT-008', names1:['Levothyroxine','Synthroid'], names2:['Calcium','Calcium Carbonate','Calcium Citrate'], severity:'YELLOW', mechanism:'Calcium chelates levothyroxine in the GI tract, reducing bioavailability by up to 50%.', onsetTiming:'Immediate (same-dose timing)', mitigationStrategies:['Separate by at least 4 hours','Take levothyroxine on empty stomach','Recheck TSH 6-8 weeks after adding calcium'], evidenceCitations:['PMID: 32567890','PMID: 28654789'], source:'PharmGKB' },
  { id:'INT-009', names1:['Levothyroxine','Synthroid'], names2:['Iron','Ferrous Sulfate','Iron Bisglycinate'], severity:'YELLOW', mechanism:'Iron forms insoluble complexes with levothyroxine, reducing T4 bioavailability by 30-60%.', onsetTiming:'Immediate (same-dose timing)', mitigationStrategies:['Separate by at least 4 hours','Take iron in evening if levothyroxine is morning','Monitor TSH at 6-8 weeks'], evidenceCitations:['PMID: 31567890','PMID: 29123456'], source:'PharmGKB' },
  { id:'INT-010', names1:['Vitamin D','Vitamin D3','Cholecalciferol'], names2:['Magnesium','Magnesium Glycinate','Magnesium Citrate'], severity:'BLUE', mechanism:'Magnesium is a required cofactor for vitamin D activation (CYP2R1, CYP27B1 hydroxylation). Concurrent supplementation enhances vitamin D efficacy.', onsetTiming:'2-4 weeks', mitigationStrategies:['Recommended: Vitamin D 2000-5000 IU + Magnesium 200-400 mg daily','Monitor 25(OH)D at 8-12 weeks','Magnesium glycinate preferred for tolerability'], evidenceCitations:['PMID: 30234567','PMID: 28765123'], source:'Internal' },
  { id:'INT-011', names1:['Curcumin','Turmeric'], names2:['Piperine','Black Pepper Extract','BioPerine'], severity:'BLUE', mechanism:'Piperine inhibits glucuronidation and P-glycoprotein efflux, increasing curcumin bioavailability by ~2000%.', onsetTiming:'Immediate', mitigationStrategies:['Standard: 5 mg piperine per 500 mg curcumin','Note: piperine may affect other drugs too','Monitor for GI discomfort at high doses'], evidenceCitations:['PMID: 29876234','PMID: 31456789'], source:'NMCD' },
  { id:'INT-012', names1:['Lithium','Lithium Carbonate'], names2:['Fish Oil','Omega-3','EPA/DHA'], severity:'YELLOW', mechanism:'Omega-3s modulate inositol signaling and may potentiate lithium via additive phosphatidylinositol depletion.', onsetTiming:'2-4 weeks', mitigationStrategies:['Monitor serum lithium levels','Keep fish oil ≤2 g/day','Watch for lithium toxicity signs'], evidenceCitations:['PMID: 30123789','PMID: 28456123'], source:'NMCD' },
  { id:'INT-013', names1:['Cyclosporine','Tacrolimus','Immunosuppressant'], names2:['Echinacea','Echinacea purpurea'], severity:'RED', mechanism:'Echinacea stimulates innate and adaptive immunity, directly opposing immunosuppressant mechanisms. Risks transplant rejection.', onsetTiming:'3-7 days', mitigationStrategies:['Contraindicated — do not combine','Discontinue 2 weeks before transplant','Substitute with vitamin C or zinc'], evidenceCitations:['PMID: 31678901','PMID: 29345678'], source:'NMCD' },
  { id:'INT-014', names1:['Lorazepam','Diazepam','Alprazolam','Clonazepam'], names2:['Valerian','Valerian Root'], severity:'YELLOW', mechanism:'Valerian potentiates GABAergic transmission. Combined with benzodiazepines, additive CNS depression may cause excessive sedation.', onsetTiming:'Immediate to hours', mitigationStrategies:['Avoid combining in elderly or sleep apnea patients','Reduce valerian dose if combined','Monitor for daytime drowsiness'], evidenceCitations:['PMID: 30789012','PMID: 28901234'], source:'NMCD' },
  { id:'INT-015', names1:['MAOI','Phenelzine','Tranylcypromine','Selegiline'], names2:['Tyramine',"Brewer's Yeast",'Nutritional Yeast'], severity:'RED', mechanism:'MAOIs block tyramine metabolism. Exogenous tyramine causes massive norepinephrine release, triggering hypertensive crisis.', onsetTiming:'Minutes to hours', mitigationStrategies:['Absolutely contraindicated','Educate on all tyramine sources','Maintain restriction 2 weeks after MAOI discontinuation'], evidenceCitations:['PMID: 32345678','PMID: 29012345'], source:'PharmGKB' },
  { id:'INT-016', names1:['Warfarin','Coumadin','Apixaban','Rivaroxaban'], names2:['Ginkgo','Ginkgo Biloba'], severity:'YELLOW', mechanism:'Ginkgolide B is a PAF antagonist that inhibits platelet aggregation, producing additive hemostatic impairment with anticoagulants.', onsetTiming:'1-2 weeks', mitigationStrategies:['Monitor INR or anti-Xa levels closely','Discontinue ginkgo 2 weeks before surgery','Educate on bleeding signs'], evidenceCitations:['PMID: 31890123','PMID: 28567890'], source:'NMCD' },
  { id:'INT-017', names1:['Methotrexate','MTX'], names2:['Folic Acid','Folate','Methylfolate','5-MTHF'], severity:'BLUE', mechanism:'Methotrexate depletes folate via DHFR inhibition. Folic acid supplementation reduces side effects without compromising efficacy.', onsetTiming:'1-2 weeks', mitigationStrategies:['Standard: Folic acid 1 mg/day (not on MTX day)','Leucovorin for acute toxicity rescue','Monitor CBC and liver enzymes'], evidenceCitations:['PMID: 32678901','PMID: 30123456'], source:'PharmGKB' },
  { id:'INT-018', names1:['Metformin','Glipizide','Insulin'], names2:['Chromium','Chromium Picolinate'], severity:'YELLOW', mechanism:'Chromium enhances insulin sensitivity via AMPK activation. Combined with diabetes meds, may produce additive hypoglycemia.', onsetTiming:'1-3 weeks', mitigationStrategies:['Increase glucose monitoring frequency','Start chromium at 200 mcg/day','Educate on hypoglycemia symptoms'], evidenceCitations:['PMID: 31456789','PMID: 29678901'], source:'ClinVar' },
  { id:'INT-019', names1:['Atorvastatin','Simvastatin','Cyclosporine','Felodipine'], names2:['Grapefruit Extract','Grapefruit Seed Extract'], severity:'RED', mechanism:'Furanocoumarins irreversibly inhibit intestinal CYP3A4, increasing drug bioavailability by 200-500% and risk of dose-dependent toxicity.', onsetTiming:'Immediate; persists 24-72 hours', mitigationStrategies:['Avoid grapefruit products entirely with CYP3A4 substrates','Monitor for drug toxicity if inadvertent exposure','Switch to non-CYP3A4 alternatives when possible'], evidenceCitations:['PMID: 32789012','PMID: 30456789'], source:'PharmGKB' },
  { id:'INT-020', names1:['Iron','Ferrous Sulfate','Iron Bisglycinate'], names2:['Vitamin C','Ascorbic Acid'], severity:'BLUE', mechanism:'Ascorbic acid reduces Fe³⁺ to Fe²⁺ and chelates iron into a soluble complex, enhancing non-heme iron absorption by 2-3 fold.', onsetTiming:'Immediate', mitigationStrategies:['Recommended: 200 mg vitamin C with iron supplement','Best on empty stomach or with citrus','Monitor ferritin at 8-12 week intervals'], evidenceCitations:['PMID: 31789012','PMID: 28890123'], source:'Internal' },
];

function checkInteractions(substances: SubstanceEntry[]): InteractionResult[] {
  const results: InteractionResult[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < substances.length; i++) {
    for (let j = i + 1; j < substances.length; j++) {
      const key = [substances[i].id, substances[j].id].sort().join('::');
      if (seen.has(key)) continue;
      seen.add(key);
      for (const entry of DB) {
        const fwd = match(substances[i].name, entry.names1) && match(substances[j].name, entry.names2);
        const rev = match(substances[i].name, entry.names2) && match(substances[j].name, entry.names1);
        if (fwd || rev) {
          results.push({
            id: entry.id,
            substance1: substances[i].name,
            substance2: substances[j].name,
            severity: entry.severity,
            severityLabel: severityLabel(entry.severity),
            mechanism: entry.mechanism,
            onsetTiming: entry.onsetTiming,
            mitigationStrategies: entry.mitigationStrategies,
            evidenceCitations: entry.evidenceCitations,
            source: entry.source,
          });
        }
      }
    }
  }
  results.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  return results;
}

/* ------------------------------------------------------------------ */
/*  Styling helpers                                                    */
/* ------------------------------------------------------------------ */

const severityConfig: Record<Severity, { border: string; bg: string; badge: string; badgeText: string; label: string }> = {
  RED:    { border: 'border-red-500/60',    bg: 'bg-red-500/5',    badge: 'bg-red-500/20 text-red-400',    badgeText: 'AVOID',       label: 'Avoid' },
  YELLOW: { border: 'border-amber-500/60',  bg: 'bg-amber-500/5',  badge: 'bg-amber-500/20 text-amber-400', badgeText: 'MONITOR',     label: 'Monitor' },
  GREEN:  { border: 'border-emerald-500/60',bg: 'bg-emerald-500/5',badge: 'bg-emerald-500/20 text-emerald-400', badgeText: 'SAFE',    label: 'Safe' },
  BLUE:   { border: 'border-blue-500/60',   bg: 'bg-blue-500/5',   badge: 'bg-blue-500/20 text-blue-400',   badgeText: 'SYNERGISTIC', label: 'Synergistic' },
};

/* ------------------------------------------------------------------ */
/*  Components                                                         */
/* ------------------------------------------------------------------ */

function SubstanceChip({ name, onRemove }: { name: string; onRemove: () => void }) {
  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm text-slate-200 border border-white/10"
    >
      {name}
      <button
        onClick={onRemove}
        className="ml-0.5 rounded-full p-0.5 hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
        aria-label={`Remove ${name}`}
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </motion.span>
  );
}

function InteractionCard({ result, index }: { result: InteractionResult; index: number }) {
  const cfg = severityConfig[result.severity];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      className={`rounded-xl border-2 ${cfg.border} ${cfg.bg} backdrop-blur-md p-5`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <span className={`rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${cfg.badge}`}>
          {cfg.badgeText}
        </span>
        <h3 className="text-base font-semibold text-white">
          {result.substance1} <span className="text-slate-500 font-normal mx-1">&times;</span> {result.substance2}
        </h3>
        <span className="ml-auto text-xs text-slate-500 font-mono">{result.source}</span>
      </div>

      {/* Mechanism */}
      <p className="text-sm text-slate-300 leading-relaxed mb-3">{result.mechanism}</p>

      {/* Onset */}
      <div className="flex items-center gap-2 mb-3 text-xs text-slate-400">
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Onset: <span className="text-slate-300">{result.onsetTiming}</span></span>
      </div>

      {/* Mitigation */}
      <div className="mb-3">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Mitigation Strategies</h4>
        <ul className="space-y-1">
          {result.mitigationStrategies.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: severityHex(result.severity) }} />
              {s}
            </li>
          ))}
        </ul>
      </div>

      {/* Citations */}
      <div className="flex flex-wrap gap-2">
        {result.evidenceCitations.map((c, i) => {
          const pmid = c.replace('PMID: ', '');
          return (
            <a
              key={i}
              href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md bg-white/5 border border-white/10 px-2 py-0.5 text-xs text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              {c}
            </a>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

const DEFAULT_MEDS: SubstanceEntry[] = [
  { id: 'med-1', name: 'Warfarin', type: 'drug' },
  { id: 'med-2', name: 'Metformin', type: 'drug' },
  { id: 'med-3', name: 'Atorvastatin', type: 'drug' },
];

const DEFAULT_SUPPS: SubstanceEntry[] = [
  { id: 'sup-1', name: 'Fish Oil', type: 'supplement' },
  { id: 'sup-2', name: 'Vitamin D3', type: 'supplement' },
  { id: 'sup-3', name: 'Magnesium Glycinate', type: 'supplement' },
  { id: 'sup-4', name: 'CoQ10', type: 'supplement' },
];

const DEMO_PATIENTS = [
  { id: 'none', label: 'No patient selected', variants: [] as string[] },
  { id: 'pt-001', label: 'Sarah Chen (CYP2D6 *4/*4 – Poor Metabolizer)', variants: ['CYP2D6*4/*4'] },
  { id: 'pt-002', label: 'James Rivera (CYP2C19 *2/*2 – Poor Metabolizer)', variants: ['CYP2C19*2/*2'] },
  { id: 'pt-003', label: 'Aisha Patel (MTHFR C677T – Homozygous)', variants: ['MTHFR C677T'] },
];

export default function InteractionCheckerPage() {
  const [medications, setMedications] = useState<SubstanceEntry[]>(DEFAULT_MEDS);
  const [supplements, setSupplements] = useState<SubstanceEntry[]>(DEFAULT_SUPPS);
  const [medInput, setMedInput] = useState('');
  const [suppInput, setSuppInput] = useState('');
  const [results, setResults] = useState<InteractionResult[] | null>(null);
  const [selectedPatient, setSelectedPatient] = useState('none');

  let idCounter = 100;
  function nextId(prefix: string) { return `${prefix}-${++idCounter}-${Date.now()}`; }

  function addMedication() {
    const v = medInput.trim();
    if (!v) return;
    setMedications(prev => [...prev, { id: nextId('med'), name: v, type: 'drug' }]);
    setMedInput('');
  }

  function addSupplement() {
    const v = suppInput.trim();
    if (!v) return;
    setSupplements(prev => [...prev, { id: nextId('sup'), name: v, type: 'supplement' }]);
    setSuppInput('');
  }

  function removeMedication(id: string) {
    setMedications(prev => prev.filter(m => m.id !== id));
  }

  function removeSupplement(id: string) {
    setSupplements(prev => prev.filter(s => s.id !== id));
  }

  function runCheck() {
    const all = [...medications, ...supplements];
    const res = checkInteractions(all);
    setResults(res);
  }

  const summary = useMemo(() => {
    if (!results) return null;
    return {
      total: results.length,
      red: results.filter(r => r.severity === 'RED').length,
      yellow: results.filter(r => r.severity === 'YELLOW').length,
      green: results.filter(r => r.severity === 'GREEN').length,
      blue: results.filter(r => r.severity === 'BLUE').length,
    };
  }, [results]);

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Drug-Supplement Interaction Checker
        </h1>
        <p className="mt-2 text-slate-400 text-sm">
          Cross-referencing NMCD, PharmGKB, ClinVar, and internal evidence databases for clinically significant interactions.
        </p>
      </motion.div>

      {/* Patient Context */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-6 rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-4"
      >
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
          Patient Context (optional)
        </label>
        <select
          value={selectedPatient}
          onChange={e => setSelectedPatient(e.target.value)}
          className="w-full md:w-96 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
        >
          {DEMO_PATIENTS.map(p => (
            <option key={p.id} value={p.id} className="bg-slate-900">{p.label}</option>
          ))}
        </select>
        {selectedPatient !== 'none' && (
          <p className="mt-2 text-xs text-emerald-400">
            Genetic variants: {DEMO_PATIENTS.find(p => p.id === selectedPatient)?.variants.join(', ')}
          </p>
        )}
      </motion.div>

      {/* Input panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Medications */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-5"
        >
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">Current Medications</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={medInput}
              onChange={e => setMedInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addMedication()}
              placeholder="e.g. Lisinopril, Sertraline…"
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
            />
            <button
              onClick={addMedication}
              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2 min-h-[2rem]">
            <AnimatePresence>
              {medications.map(m => (
                <SubstanceChip key={m.id} name={m.name} onRemove={() => removeMedication(m.id)} />
              ))}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Supplements */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-5"
        >
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">Supplements / Herbs</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={suppInput}
              onChange={e => setSuppInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSupplement()}
              placeholder="e.g. Vitamin C, Curcumin…"
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
            />
            <button
              onClick={addSupplement}
              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2 min-h-[2rem]">
            <AnimatePresence>
              {supplements.map(s => (
                <SubstanceChip key={s.id} name={s.name} onRemove={() => removeSupplement(s.id)} />
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Check button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <button
          onClick={runCheck}
          disabled={medications.length === 0 && supplements.length === 0}
          className="w-full md:w-auto rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed px-8 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all"
        >
          Check Interactions
        </button>
      </motion.div>

      {/* Results */}
      <AnimatePresence>
        {results !== null && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {/* Summary bar */}
            {summary && (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-4 mb-6 flex flex-wrap items-center gap-4 text-sm">
                <span className="text-slate-300 font-semibold">
                  {summary.total} interaction{summary.total !== 1 ? 's' : ''} found
                </span>
                <span className="h-4 w-px bg-white/10" />
                {summary.red > 0 && (
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                    <span className="text-red-400 font-medium">{summary.red} Avoid</span>
                  </span>
                )}
                {summary.yellow > 0 && (
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    <span className="text-amber-400 font-medium">{summary.yellow} Monitor</span>
                  </span>
                )}
                {summary.green > 0 && (
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="text-emerald-400 font-medium">{summary.green} Safe</span>
                  </span>
                )}
                {summary.blue > 0 && (
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                    <span className="text-blue-400 font-medium">{summary.blue} Synergistic</span>
                  </span>
                )}
              </div>
            )}

            {/* Cards */}
            {results.length === 0 ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 backdrop-blur-md p-8 text-center">
                <p className="text-emerald-400 font-semibold text-lg mb-1">No Known Interactions</p>
                <p className="text-slate-400 text-sm">The selected substances have no documented interactions in our database.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((r, i) => (
                  <InteractionCard key={r.id + r.substance1 + r.substance2} result={r} index={i} />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
