'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DosingRow {
  herb: string;
  form: string;
  dose: string;
  frequency: string;
  timing: string;
}

interface Protocol {
  id: string;
  name: string;
  target: string;
  pathway: string;
  botanicals: string[];
  avoid?: string[];
  rationale: string;
  fullRationale: string;
  duration: string;
  evidence: 'Preliminary' | 'Moderate' | 'Strong';
  dosing: DosingRow[];
  monitoring: string[];
  contraindications: string[];
  pmids: string[];
}

interface CommunityProtocol {
  id: string;
  name: string;
  author: string;
  rating: number;
  timesUsed: number;
  target: string;
  pathway: string;
  herbs: string[];
}

/* ------------------------------------------------------------------ */
/*  Static Data                                                        */
/* ------------------------------------------------------------------ */

const PATHWAYS = [
  'All',
  'Methylation',
  'Detox',
  'Inflammation',
  'Cognitive',
  'Cardiovascular',
  'Immune',
  'Hormonal',
  'Oxidative Stress',
  'GABA Synthesis',
] as const;

const EVIDENCE_LEVELS = ['All', 'Preliminary', 'Moderate', 'Strong'] as const;

const TARGET_GENES = [
  'MTHFR C677T',
  'MTHFR A1298C',
  'CYP1A2 *1F/*1F',
  'COMT Val158Met',
  'VDR Bsm1',
  'VDR Taq1',
  'APOE E3/E4',
  'APOE E4/E4',
  'SOD2 Ala16Val',
  'GAD1 variants',
  'TNF-alpha G308A',
  'CYP2D6',
  'MTRR A66G',
  'CBS C699T',
];

const HERB_OPTIONS = [
  'Ashwagandha',
  'Astragalus',
  'Boswellia',
  "Cat's Claw",
  'Dandelion Root',
  'Elderberry',
  'Garlic',
  'Ginger',
  'Green Tea',
  'Hawthorn',
  'Holy Basil',
  'Lemon Balm',
  'Milk Thistle',
  'Nettle',
  'Passionflower',
  'Reishi',
  'Rhodiola',
  'Rosemary',
  'Schisandra',
  'Skullcap',
  'Turmeric',
  'Valerian',
];

const protocols: Protocol[] = [
  {
    id: 'mthfr-support',
    name: 'MTHFR Support Protocol',
    target: 'MTHFR C677T / A1298C',
    pathway: 'Methylation',
    botanicals: ['Ashwagandha', 'Holy Basil', 'Rosemary', 'Nettle'],
    rationale:
      'Supports impaired methylation via botanical cofactors and methyl donors',
    fullRationale:
      'Individuals carrying MTHFR C677T or A1298C variants exhibit reduced methylenetetrahydrofolate reductase activity, leading to impaired conversion of homocysteine to methionine. This protocol leverages adaptogenic herbs with demonstrated methylation-support properties: Ashwagandha modulates SAMe-dependent pathways, Holy Basil provides bioavailable folate analogs, Rosemary contains carnosic acid which supports methyl-transfer reactions, and Nettle leaf serves as a rich source of naturally occurring folate and supporting minerals.',
    duration: '12 weeks',
    evidence: 'Moderate',
    dosing: [
      { herb: 'Ashwagandha', form: 'Standardized extract', dose: '300 mg', frequency: 'Twice daily', timing: 'Morning & evening with food' },
      { herb: 'Holy Basil', form: 'Leaf extract', dose: '500 mg', frequency: 'Twice daily', timing: 'Morning & afternoon' },
      { herb: 'Rosemary', form: 'Standardized extract', dose: '200 mg', frequency: 'Once daily', timing: 'Morning with food' },
      { herb: 'Nettle', form: 'Dried leaf tea/capsule', dose: '400 mg', frequency: 'Twice daily', timing: 'With meals' },
    ],
    monitoring: [
      'Homocysteine levels at baseline, 6 weeks, and 12 weeks',
      'Serum folate and B12 at baseline and 12 weeks',
      'Subjective energy and cognitive function assessment biweekly',
      'SAMe/SAH ratio if available',
    ],
    contraindications: [
      'Pregnancy (Rosemary in therapeutic doses)',
      'Concurrent anticoagulant therapy',
      'Thyroid disorders (Ashwagandha may affect thyroid hormones)',
      'Autoimmune conditions (Holy Basil immune-modulating effects)',
    ],
    pmids: ['PMID: 28471731', 'PMID: 31728244', 'PMID: 26609282', 'PMID: 30963714'],
  },
  {
    id: 'cyp1a2-slow',
    name: 'CYP1A2 Slow Metabolizer Protocol',
    target: 'CYP1A2 *1F/*1F',
    pathway: 'Detox',
    botanicals: ['Milk Thistle', 'Dandelion Root', 'Schisandra'],
    avoid: ['Concentrated Green Tea', 'Echinacea'],
    rationale:
      'Supports Phase I detox without overloading slow CYP1A2',
    fullRationale:
      'CYP1A2 *1F/*1F homozygotes display significantly reduced Phase I hepatic enzyme activity, impacting metabolism of caffeine, estrogens, and numerous xenobiotics. This protocol supports gentle detoxification using hepatoprotective botanicals: Milk Thistle (silymarin) stabilizes hepatocyte membranes without inducing CYP1A2, Dandelion Root promotes bile flow to support Phase II conjugation, and Schisandra enhances overall liver resilience through its lignans. Concentrated Green Tea and Echinacea are avoided due to their CYP1A2 inhibitory potential, which could further compromise already-slow metabolism.',
    duration: '8 weeks',
    evidence: 'Moderate',
    dosing: [
      { herb: 'Milk Thistle', form: 'Silymarin extract (80%)', dose: '150 mg', frequency: 'Three times daily', timing: 'Before meals' },
      { herb: 'Dandelion Root', form: 'Dried root decoction', dose: '500 mg', frequency: 'Twice daily', timing: 'Morning & evening' },
      { herb: 'Schisandra', form: 'Berry extract', dose: '500 mg', frequency: 'Twice daily', timing: 'Morning & afternoon' },
    ],
    monitoring: [
      'Liver function panel at baseline and 8 weeks',
      'Caffeine clearance test at baseline and 8 weeks',
      'GI symptom tracking weekly',
      'Subjective energy and detox symptom assessment',
    ],
    contraindications: [
      'Biliary obstruction (Dandelion Root is cholagogue)',
      'Allergies to Asteraceae family',
      'Concurrent use of drugs metabolized by CYP1A2',
      'Pregnancy and lactation',
    ],
    pmids: ['PMID: 27517806', 'PMID: 29227604', 'PMID: 30783539', 'PMID: 26561078'],
  },
  {
    id: 'comt-slow',
    name: 'COMT Slow Metabolizer Protocol',
    target: 'COMT Val158Met (Met/Met)',
    pathway: 'Cognitive',
    botanicals: ['Passionflower', 'Lemon Balm', 'Magnesium'],
    avoid: ['Green Tea (high-catechol)', 'Rhodiola'],
    rationale:
      'Calming nervines to support slow catecholamine clearance',
    fullRationale:
      'COMT Met/Met homozygotes have 3-4x reduced catechol-O-methyltransferase activity, resulting in elevated dopamine, norepinephrine, and estrogen catechol levels. This leads to heightened stress sensitivity and anxiety. Passionflower (Passiflora incarnata) acts via GABAergic modulation to reduce catecholamine-driven anxiety, Lemon Balm (Melissa officinalis) inhibits GABA-transaminase enhancing calming GABA tone, and Magnesium serves as an essential COMT cofactor. High-catechol herbs like concentrated Green Tea and Rhodiola are avoided as they add catechol burden to an already-saturated system.',
    duration: '8 weeks',
    evidence: 'Moderate',
    dosing: [
      { herb: 'Passionflower', form: 'Standardized extract', dose: '250 mg', frequency: 'Three times daily', timing: 'Morning, afternoon & evening' },
      { herb: 'Lemon Balm', form: 'Leaf extract', dose: '300 mg', frequency: 'Twice daily', timing: 'Afternoon & evening' },
      { herb: 'Magnesium', form: 'Glycinate', dose: '200 mg', frequency: 'Twice daily', timing: 'With meals' },
    ],
    monitoring: [
      'Anxiety and mood scales (GAD-7, PHQ-9) biweekly',
      'Sleep quality assessment weekly',
      'Urinary catecholamine metabolites at baseline and 8 weeks',
      'Blood pressure monitoring weekly',
    ],
    contraindications: [
      'Concurrent sedative or anxiolytic medication',
      'Scheduled surgery (Passionflower sedative effects)',
      'Renal insufficiency (Magnesium clearance)',
      'Pregnancy and lactation',
    ],
    pmids: ['PMID: 32210397', 'PMID: 29044824', 'PMID: 24930699', 'PMID: 31305907'],
  },
  {
    id: 'vdr-immune',
    name: 'VDR/Immune Support Protocol',
    target: 'VDR Bsm1, VDR Taq1',
    pathway: 'Immune',
    botanicals: ['Reishi', 'Astragalus', 'Elderberry', 'Vitamin D cofactors'],
    rationale:
      'Supports vitamin D receptor variants with immune-modulating botanicals',
    fullRationale:
      'VDR polymorphisms (Bsm1, Taq1) reduce vitamin D receptor sensitivity, compromising innate and adaptive immune function, calcium metabolism, and antimicrobial peptide expression. This protocol pairs immune-modulating fungi and herbs with vitamin D cofactors: Reishi (Ganoderma lucidum) provides beta-glucans for immune priming, Astragalus (Astragalus membranaceus) enhances T-cell function and NK cell activity, Elderberry (Sambucus nigra) provides anthocyanins supporting mucosal immunity, and Vitamin D cofactors (K2, Magnesium) ensure optimal vitamin D utilization despite reduced receptor affinity.',
    duration: '12 weeks',
    evidence: 'Moderate',
    dosing: [
      { herb: 'Reishi', form: 'Dual extract (fruiting body)', dose: '1000 mg', frequency: 'Twice daily', timing: 'Morning & evening' },
      { herb: 'Astragalus', form: 'Root extract', dose: '500 mg', frequency: 'Twice daily', timing: 'Morning & afternoon' },
      { herb: 'Elderberry', form: 'Standardized extract', dose: '500 mg', frequency: 'Once daily', timing: 'Morning' },
      { herb: 'Vitamin D cofactors', form: 'K2 + Mg complex', dose: '100 mcg K2 / 200 mg Mg', frequency: 'Once daily', timing: 'With fatty meal' },
    ],
    monitoring: [
      '25-OH Vitamin D levels at baseline, 6 weeks, and 12 weeks',
      'Complete blood count with differential at baseline and 12 weeks',
      'Infection frequency tracking',
      'Parathyroid hormone levels at baseline and 12 weeks',
    ],
    contraindications: [
      'Organ transplant recipients (immune stimulation risk)',
      'Active autoimmune flare',
      'Concurrent immunosuppressive therapy',
      'Hypercalcemia',
    ],
    pmids: ['PMID: 28981903', 'PMID: 30002416', 'PMID: 31159027', 'PMID: 29413366'],
  },
  {
    id: 'apoe4-cardio',
    name: 'APOE4 Cardiovascular Protocol',
    target: 'APOE E3/E4 or E4/E4',
    pathway: 'Cardiovascular',
    botanicals: ['Hawthorn', 'Garlic', 'Turmeric', 'Omega-3 support'],
    rationale:
      'Targets lipid metabolism and cardiovascular risk in APOE4 carriers',
    fullRationale:
      'APOE4 carriers face elevated cardiovascular risk due to impaired lipid clearance, increased LDL oxidation, and pro-inflammatory vascular changes. Hawthorn (Crataegus spp.) provides oligomeric proanthocyanidins that strengthen vascular endothelium and modulate lipid oxidation. Aged Garlic extract reduces arterial calcification and modestly lowers LDL-C. Turmeric (curcumin) combats the chronic low-grade inflammation characteristic of APOE4 carriers. Omega-3 fatty acid cofactors support the triglyceride-lowering pathway that APOE4 carriers particularly benefit from. This is an ongoing protocol given the persistent genetic risk.',
    duration: 'Ongoing',
    evidence: 'Strong',
    dosing: [
      { herb: 'Hawthorn', form: 'Berry/leaf extract', dose: '450 mg', frequency: 'Twice daily', timing: 'Morning & evening' },
      { herb: 'Garlic', form: 'Aged extract (Kyolic)', dose: '600 mg', frequency: 'Twice daily', timing: 'With meals' },
      { herb: 'Turmeric', form: 'Curcumin + piperine', dose: '500 mg', frequency: 'Twice daily', timing: 'With fatty meals' },
      { herb: 'Omega-3 support', form: 'EPA/DHA concentrate', dose: '1000 mg EPA + 500 mg DHA', frequency: 'Once daily', timing: 'With largest meal' },
    ],
    monitoring: [
      'Advanced lipid panel (LDL-P, ApoB) every 3 months',
      'hs-CRP at baseline and quarterly',
      'Coronary artery calcium score annually',
      'Blood pressure monitoring weekly',
    ],
    contraindications: [
      'Active bleeding disorders',
      'Concurrent anticoagulant therapy (Garlic interaction)',
      'Scheduled surgery within 2 weeks',
      'Hypotension (Hawthorn potentiates antihypertensives)',
    ],
    pmids: ['PMID: 31198890', 'PMID: 29729461', 'PMID: 28967368', 'PMID: 30674467'],
  },
  {
    id: 'sod2-antioxidant',
    name: 'SOD2/Antioxidant Protocol',
    target: 'SOD2 Ala16Val',
    pathway: 'Oxidative Stress',
    botanicals: ['Turmeric', 'Green Tea (if CYP1A2 normal)', 'Schisandra', 'Rosemary'],
    rationale:
      'Compensates for reduced mitochondrial antioxidant capacity',
    fullRationale:
      'SOD2 Ala16Val variants reduce mitochondrial superoxide dismutase efficiency, leading to increased mitochondrial oxidative stress and downstream cellular damage. This protocol provides exogenous antioxidant support: Turmeric (curcumin) scavenges reactive oxygen species and upregulates Nrf2-dependent antioxidant genes, Green Tea (EGCG) provides potent polyphenol protection (only if CYP1A2 is functional to metabolize catechins), Schisandra lignans protect mitochondrial membranes, and Rosemary (carnosic acid) activates endogenous antioxidant pathways. Genetic cross-referencing with CYP1A2 status is essential before including Green Tea.',
    duration: '12 weeks',
    evidence: 'Preliminary',
    dosing: [
      { herb: 'Turmeric', form: 'Curcumin phytosome', dose: '500 mg', frequency: 'Twice daily', timing: 'With meals' },
      { herb: 'Green Tea', form: 'EGCG extract', dose: '200 mg', frequency: 'Once daily', timing: 'Morning (if CYP1A2 normal)' },
      { herb: 'Schisandra', form: 'Berry extract', dose: '500 mg', frequency: 'Twice daily', timing: 'Morning & afternoon' },
      { herb: 'Rosemary', form: 'Standardized extract', dose: '200 mg', frequency: 'Once daily', timing: 'Morning with food' },
    ],
    monitoring: [
      '8-OHdG (oxidative DNA damage marker) at baseline and 12 weeks',
      'Glutathione (GSH/GSSG ratio) at baseline and 12 weeks',
      'Mitochondrial function markers if available',
      'Subjective energy and fatigue assessment biweekly',
    ],
    contraindications: [
      'Iron deficiency (Green Tea inhibits iron absorption)',
      'Liver disease (high-dose EGCG hepatotoxicity risk)',
      'CYP1A2 slow metabolizers (omit Green Tea)',
      'Pregnancy and lactation',
    ],
    pmids: ['PMID: 30402990', 'PMID: 28528684', 'PMID: 31614843', 'PMID: 29206080'],
  },
  {
    id: 'gad1-gaba',
    name: 'GAD1/GABA Support Protocol',
    target: 'GAD1 variants',
    pathway: 'GABA Synthesis',
    botanicals: ['Passionflower', 'Valerian', 'Lemon Balm', 'Skullcap'],
    rationale:
      'Enhances GABAergic tone to compensate for impaired GABA synthesis',
    fullRationale:
      'GAD1 polymorphisms reduce glutamic acid decarboxylase activity, impairing conversion of glutamate to GABA and creating an excitatory/inhibitory neurotransmitter imbalance. This protocol uses established GABAergic botanicals: Passionflower contains chrysin and other flavonoids that bind GABA-A receptors, Valerian modulates GABA reuptake and degradation, Lemon Balm inhibits GABA-transaminase to prolong GABA activity, and Skullcap (Scutellaria lateriflora) provides baicalin for additional GABA-A receptor support. Together these herbs address multiple points in the GABA pathway.',
    duration: '8 weeks',
    evidence: 'Moderate',
    dosing: [
      { herb: 'Passionflower', form: 'Standardized extract', dose: '250 mg', frequency: 'Three times daily', timing: 'Spread throughout day' },
      { herb: 'Valerian', form: 'Root extract (0.8% valerenic acid)', dose: '300 mg', frequency: 'Twice daily', timing: 'Afternoon & 1hr before bed' },
      { herb: 'Lemon Balm', form: 'Leaf extract', dose: '300 mg', frequency: 'Twice daily', timing: 'Morning & evening' },
      { herb: 'Skullcap', form: 'Tincture (1:2)', dose: '2 mL', frequency: 'Three times daily', timing: 'Between meals' },
    ],
    monitoring: [
      'GAD-7 anxiety scale weekly',
      'Sleep quality (PSQI) at baseline, 4 weeks, and 8 weeks',
      'Neurotransmitter metabolites (urinary) at baseline and 8 weeks',
      'Seizure threshold awareness in susceptible individuals',
    ],
    contraindications: [
      'Concurrent benzodiazepine or barbiturate use',
      'Hepatic impairment (Valerian metabolism)',
      'Operating heavy machinery (combined sedative effects)',
      'Children under 12',
    ],
    pmids: ['PMID: 31002770', 'PMID: 28899506', 'PMID: 30338990', 'PMID: 29413519'],
  },
  {
    id: 'tnf-inflammation',
    name: 'TNF-alpha/Inflammation Protocol',
    target: 'TNF-alpha G308A',
    pathway: 'Inflammation',
    botanicals: ['Turmeric/Curcumin', 'Boswellia', 'Ginger', "Cat's Claw"],
    rationale:
      'Targets NF-kB mediated inflammation in TNF-alpha high-producers',
    fullRationale:
      'The TNF-alpha G308A polymorphism increases transcription of tumor necrosis factor alpha, creating a pro-inflammatory phenotype with elevated baseline inflammation. This protocol targets multiple points in the NF-kB inflammatory cascade: Curcumin directly inhibits NF-kB translocation and reduces TNF-alpha expression, Boswellia (boswellic acids) inhibits 5-lipoxygenase and reduces leukotriene synthesis, Ginger (gingerols and shogaols) suppresses prostaglandin synthesis via COX-2 modulation, and Cat\'s Claw (Uncaria tomentosa) provides pentacyclic oxindole alkaloids that modulate TNF-alpha production at the transcriptional level.',
    duration: '12 weeks',
    evidence: 'Strong',
    dosing: [
      { herb: 'Turmeric/Curcumin', form: 'Meriva phytosome', dose: '500 mg', frequency: 'Twice daily', timing: 'With meals' },
      { herb: 'Boswellia', form: 'AKBA standardized (30%)', dose: '300 mg', frequency: 'Three times daily', timing: 'With meals' },
      { herb: 'Ginger', form: 'Supercritical extract', dose: '250 mg', frequency: 'Twice daily', timing: 'Morning & evening' },
      { herb: "Cat's Claw", form: 'Inner bark extract', dose: '350 mg', frequency: 'Twice daily', timing: 'Between meals' },
    ],
    monitoring: [
      'hs-CRP at baseline, 6 weeks, and 12 weeks',
      'TNF-alpha levels at baseline and 12 weeks',
      'ESR at baseline and 12 weeks',
      'Joint/pain symptom tracking weekly (VAS scale)',
    ],
    contraindications: [
      'Concurrent immunosuppressive therapy',
      'Active bleeding or anticoagulant use',
      'Gallbladder disease (Turmeric cholagogue effect)',
      'Pregnancy and lactation',
    ],
    pmids: ['PMID: 31279955', 'PMID: 30308675', 'PMID: 29480918', 'PMID: 31193550'],
  },
];

const communityProtocols: CommunityProtocol[] = [
  {
    id: 'comm-1',
    name: 'CBS Upregulation / Sulfur Sensitivity Protocol',
    author: 'Dr. Amelia Voss, ND',
    rating: 4.7,
    timesUsed: 184,
    target: 'CBS C699T',
    pathway: 'Methylation',
    herbs: ['Molybdenum cofactors', 'Dandelion Root', 'Milk Thistle', 'Low-sulfur Turmeric'],
  },
  {
    id: 'comm-2',
    name: 'MTRR / B12 Recycling Support',
    author: 'Dr. Jonas Ekberg, ND',
    rating: 4.5,
    timesUsed: 132,
    target: 'MTRR A66G',
    pathway: 'Methylation',
    herbs: ['Chlorella', 'Nettle', 'Ashwagandha', 'Spirulina'],
  },
  {
    id: 'comm-3',
    name: 'CYP2D6 Poor Metabolizer Adaptogen Stack',
    author: 'Dr. Suki Patel, ND',
    rating: 4.3,
    timesUsed: 97,
    target: 'CYP2D6 *4/*4',
    pathway: 'Detox',
    herbs: ['Schisandra', 'Milk Thistle', 'Reishi', 'Astragalus'],
  },
  {
    id: 'comm-4',
    name: 'HPA Axis / NR3C1 Stress Resilience Protocol',
    author: 'Dr. Fiona Greenwald, ND',
    rating: 4.6,
    timesUsed: 215,
    target: 'NR3C1 BclI polymorphism',
    pathway: 'Hormonal',
    herbs: ['Ashwagandha', 'Rhodiola', 'Holy Basil', 'Eleuthero'],
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const evidenceColor = (level: string) => {
  switch (level) {
    case 'Strong':
      return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30';
    case 'Moderate':
      return 'text-amber-400 bg-amber-400/10 border-amber-400/30';
    case 'Preliminary':
      return 'text-slate-400 bg-slate-400/10 border-slate-400/30';
    default:
      return 'text-slate-400 bg-slate-400/10 border-slate-400/30';
  }
};

const StarRating = ({ rating }: { rating: number }) => {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.3;
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-400">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className="h-4 w-4" fill={i < full ? 'currentColor' : 'none'} viewBox="0 0 20 20" stroke="currentColor" strokeWidth={1.5}>
          {i === full && hasHalf ? (
            <>
              <defs>
                <linearGradient id={`half-${rating}`}>
                  <stop offset="50%" stopColor="currentColor" />
                  <stop offset="50%" stopColor="transparent" />
                </linearGradient>
              </defs>
              <path fill={`url(#half-${rating})`} d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </>
          ) : (
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          )}
        </svg>
      ))}
      <span className="ml-1 text-xs text-slate-400">{rating}</span>
    </span>
  );
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function GeneticProtocolsPage() {
  const [expandedProtocol, setExpandedProtocol] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedPathway, setSelectedPathway] = useState<string>('All');
  const [selectedEvidence, setSelectedEvidence] = useState<string>('All');
  const [herbSearch, setHerbSearch] = useState('');
  const [selectedHerbs, setSelectedHerbs] = useState<string[]>([]);
  const [publishToCommunity, setPublishToCommunity] = useState(false);

  const filteredProtocols = protocols.filter((p) => {
    const pathwayMatch = selectedPathway === 'All' || p.pathway === selectedPathway;
    const evidenceMatch = selectedEvidence === 'All' || p.evidence === selectedEvidence;
    return pathwayMatch && evidenceMatch;
  });

  const filteredHerbs = HERB_OPTIONS.filter(
    (h) => h.toLowerCase().includes(herbSearch.toLowerCase()) && !selectedHerbs.includes(h)
  );

  const toggleProtocol = (id: string) => {
    setExpandedProtocol(expandedProtocol === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Back nav */}
        <Link
          href="/naturopath"
          className="inline-flex items-center text-sm text-slate-400 hover:text-amber-400 transition-colors mb-8"
        >
          <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Naturopath Portal
        </Link>

        {/* -------- HEADER -------- */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent"
            >
              Genetic-Botanical Protocols
            </motion.h1>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="mt-2"
            >
              <Badge className="bg-amber-400/10 text-amber-400 border border-amber-400/30 text-xs px-3 py-1">
                Published: 12 protocols shared with community
              </Badge>
            </motion.div>
          </div>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <Button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-6 py-2.5 rounded-xl transition-colors"
            >
              {showCreateForm ? 'Close Form' : '+ Create New Protocol'}
            </Button>
          </motion.div>
        </div>

        {/* -------- FILTERS -------- */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="flex flex-wrap gap-3 mb-8"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Pathway:</span>
            {PATHWAYS.map((pw) => (
              <button
                key={pw}
                onClick={() => setSelectedPathway(pw)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  selectedPathway === pw
                    ? 'bg-amber-400/20 text-amber-400 border-amber-400/40'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:border-amber-400/30 hover:text-amber-300'
                }`}
              >
                {pw}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Evidence:</span>
            {EVIDENCE_LEVELS.map((el) => (
              <button
                key={el}
                onClick={() => setSelectedEvidence(el)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  selectedEvidence === el
                    ? 'bg-amber-400/20 text-amber-400 border-amber-400/40'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:border-amber-400/30 hover:text-amber-300'
                }`}
              >
                {el}
              </button>
            ))}
          </div>
        </motion.div>

        {/* -------- CREATE PROTOCOL FORM -------- */}
        <AnimatePresence>
          {showCreateForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden mb-10"
            >
              <div className="rounded-2xl border border-amber-400/20 bg-white/5 backdrop-blur-xl p-6 sm:p-8">
                <h2 className="text-xl font-semibold text-amber-400 mb-6">Create New Protocol</h2>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1.5">Protocol Name</label>
                    <input
                      type="text"
                      placeholder="e.g., Custom Methylation Support"
                      className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-amber-400/50 focus:outline-none focus:ring-1 focus:ring-amber-400/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Target Gene / SNP</label>
                    <select className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white focus:border-amber-400/50 focus:outline-none focus:ring-1 focus:ring-amber-400/30 appearance-none">
                      <option value="" className="bg-slate-900">Select gene variant...</option>
                      {TARGET_GENES.map((g) => (
                        <option key={g} value={g} className="bg-slate-900">{g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Pathway</label>
                    <select className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white focus:border-amber-400/50 focus:outline-none focus:ring-1 focus:ring-amber-400/30 appearance-none">
                      <option value="" className="bg-slate-900">Select pathway...</option>
                      {PATHWAYS.filter((p) => p !== 'All').map((p) => (
                        <option key={p} value={p} className="bg-slate-900">{p}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1.5">Herb Selection</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {selectedHerbs.map((h) => (
                        <span
                          key={h}
                          className="inline-flex items-center gap-1 bg-amber-400/15 text-amber-400 border border-amber-400/30 text-xs px-2.5 py-1 rounded-lg"
                        >
                          {h}
                          <button
                            onClick={() => setSelectedHerbs(selectedHerbs.filter((sh) => sh !== h))}
                            className="hover:text-amber-200"
                          >
                            x
                          </button>
                        </span>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={herbSearch}
                      onChange={(e) => setHerbSearch(e.target.value)}
                      placeholder="Search herbs..."
                      className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-amber-400/50 focus:outline-none focus:ring-1 focus:ring-amber-400/30"
                    />
                    {herbSearch && (
                      <div className="mt-1 rounded-xl bg-slate-900 border border-white/10 max-h-40 overflow-y-auto">
                        {filteredHerbs.map((h) => (
                          <button
                            key={h}
                            onClick={() => {
                              setSelectedHerbs([...selectedHerbs, h]);
                              setHerbSearch('');
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-amber-400/10 hover:text-amber-400"
                          >
                            {h}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1.5">Rationale</label>
                    <textarea
                      rows={3}
                      placeholder="Explain the genetic-botanical connection and therapeutic rationale..."
                      className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-amber-400/50 focus:outline-none focus:ring-1 focus:ring-amber-400/30 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Duration</label>
                    <select className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white focus:border-amber-400/50 focus:outline-none focus:ring-1 focus:ring-amber-400/30 appearance-none">
                      <option value="" className="bg-slate-900">Select duration...</option>
                      <option value="4" className="bg-slate-900">4 weeks</option>
                      <option value="8" className="bg-slate-900">8 weeks</option>
                      <option value="12" className="bg-slate-900">12 weeks</option>
                      <option value="16" className="bg-slate-900">16 weeks</option>
                      <option value="ongoing" className="bg-slate-900">Ongoing</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Dosing Guidelines</label>
                    <input
                      type="text"
                      placeholder="e.g., 300mg twice daily with food"
                      className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-amber-400/50 focus:outline-none focus:ring-1 focus:ring-amber-400/30"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1.5">Monitoring Parameters</label>
                    <textarea
                      rows={2}
                      placeholder="Lab markers, subjective assessments, reassessment timeline..."
                      className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-amber-400/50 focus:outline-none focus:ring-1 focus:ring-amber-400/30 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Contraindications</label>
                    <textarea
                      rows={2}
                      placeholder="Known contraindications and cautions..."
                      className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-amber-400/50 focus:outline-none focus:ring-1 focus:ring-amber-400/30 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Evidence / References</label>
                    <textarea
                      rows={2}
                      placeholder="PubMed IDs, clinical references..."
                      className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-amber-400/50 focus:outline-none focus:ring-1 focus:ring-amber-400/30 resize-none"
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-center justify-between pt-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div
                        onClick={() => setPublishToCommunity(!publishToCommunity)}
                        className={`relative h-6 w-11 rounded-full transition-colors ${
                          publishToCommunity ? 'bg-amber-500' : 'bg-white/10'
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                            publishToCommunity ? 'translate-x-5' : ''
                          }`}
                        />
                      </div>
                      <span className="text-sm text-slate-300">Publish to Community</span>
                    </label>
                    <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-8 py-2.5 rounded-xl transition-colors">
                      Save Protocol
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* -------- PROTOCOL TEMPLATES GRID -------- */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-14">
          {filteredProtocols.map((protocol, index) => (
            <motion.div
              key={protocol.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index, duration: 0.35 }}
              layout
            >
              <Card
                className={`group cursor-pointer rounded-2xl border bg-white/5 backdrop-blur-xl transition-all hover:border-amber-400/40 ${
                  expandedProtocol === protocol.id
                    ? 'border-amber-400/50 bg-amber-400/5 col-span-full'
                    : 'border-white/10'
                }`}
                onClick={() => toggleProtocol(protocol.id)}
              >
                <CardHeader className="pb-2 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm font-semibold text-white leading-snug">
                      {protocol.name}
                    </CardTitle>
                    <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border ${evidenceColor(protocol.evidence)}`}>
                      {protocol.evidence}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-3">
                  <div className="space-y-2">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-500">Target</span>
                      <p className="text-xs text-amber-400/90 font-medium">{protocol.target}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-500">Pathway</span>
                      <p className="text-xs text-slate-300">{protocol.pathway}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-500">Botanicals</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {protocol.botanicals.map((b) => (
                          <span key={b} className="text-[10px] bg-amber-400/10 text-amber-300 px-1.5 py-0.5 rounded">
                            {b}
                          </span>
                        ))}
                      </div>
                      {protocol.avoid && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {protocol.avoid.map((a) => (
                            <span key={a} className="text-[10px] bg-red-400/10 text-red-400 px-1.5 py-0.5 rounded">
                              Avoid: {a}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 italic leading-relaxed">&ldquo;{protocol.rationale}&rdquo;</p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-500">{protocol.duration}</span>
                      <svg
                        className={`h-4 w-4 text-slate-500 transition-transform ${expandedProtocol === protocol.id ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* -------- EXPANDED DETAIL VIEW -------- */}
              <AnimatePresence>
                {expandedProtocol === protocol.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 rounded-2xl border border-amber-400/20 bg-white/[0.03] backdrop-blur-xl p-5 space-y-5">
                      {/* Full Rationale */}
                      <div>
                        <h4 className="text-xs uppercase tracking-wider text-amber-400 mb-2">Full Rationale</h4>
                        <p className="text-xs text-slate-300 leading-relaxed">{protocol.fullRationale}</p>
                      </div>

                      {/* Dosing Table */}
                      <div>
                        <h4 className="text-xs uppercase tracking-wider text-amber-400 mb-2">Dosing Guidelines</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-white/10">
                                <th className="text-left py-2 pr-3 text-slate-500 font-medium">Herb</th>
                                <th className="text-left py-2 pr-3 text-slate-500 font-medium">Form</th>
                                <th className="text-left py-2 pr-3 text-slate-500 font-medium">Dose</th>
                                <th className="text-left py-2 pr-3 text-slate-500 font-medium">Frequency</th>
                                <th className="text-left py-2 text-slate-500 font-medium">Timing</th>
                              </tr>
                            </thead>
                            <tbody>
                              {protocol.dosing.map((row, i) => (
                                <tr key={i} className="border-b border-white/5">
                                  <td className="py-2 pr-3 text-amber-300 font-medium">{row.herb}</td>
                                  <td className="py-2 pr-3 text-slate-300">{row.form}</td>
                                  <td className="py-2 pr-3 text-white font-medium">{row.dose}</td>
                                  <td className="py-2 pr-3 text-slate-300">{row.frequency}</td>
                                  <td className="py-2 text-slate-400">{row.timing}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Duration & Monitoring */}
                      <div>
                        <h4 className="text-xs uppercase tracking-wider text-amber-400 mb-2">
                          Duration &amp; Monitoring ({protocol.duration})
                        </h4>
                        <ul className="space-y-1">
                          {protocol.monitoring.map((m, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-amber-400" />
                              {m}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Contraindications */}
                      <div>
                        <h4 className="text-xs uppercase tracking-wider text-red-400 mb-2">Contraindications</h4>
                        <ul className="space-y-1">
                          {protocol.contraindications.map((c, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-red-300/80">
                              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-red-400" />
                              {c}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Evidence / PubMed */}
                      <div>
                        <h4 className="text-xs uppercase tracking-wider text-amber-400 mb-2">Evidence Summary</h4>
                        <div className="flex flex-wrap gap-2">
                          {protocol.pmids.map((pmid) => (
                            <span
                              key={pmid}
                              className="text-[10px] bg-white/5 border border-white/10 text-cyan-400 px-2 py-1 rounded-lg font-mono"
                            >
                              {pmid}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-3 pt-2">
                        <Button className="bg-amber-500 hover:bg-amber-600 text-black text-xs font-semibold px-5 py-2 rounded-xl transition-colors">
                          Assign to Patient
                        </Button>
                        <Button className="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-medium px-5 py-2 rounded-xl transition-colors">
                          Customize Protocol
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* -------- COMMUNITY PROTOCOLS -------- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-xl font-semibold text-white">Shared by Community</h2>
            <Badge className="bg-white/5 text-slate-400 border border-white/10 text-[10px]">
              {communityProtocols.length} protocols
            </Badge>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {communityProtocols.map((cp, index) => (
              <motion.div
                key={cp.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 + index * 0.08, duration: 0.35 }}
              >
                <Card className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl hover:border-amber-400/30 transition-all">
                  <CardHeader className="pb-2 p-5">
                    <CardTitle className="text-sm font-semibold text-white leading-snug">
                      {cp.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">{cp.author}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <StarRating rating={cp.rating} />
                      <span className="text-[10px] text-slate-500">{cp.timesUsed} uses</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-500">Target</span>
                      <p className="text-xs text-amber-400/90">{cp.target}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-500">Pathway</span>
                      <p className="text-xs text-slate-300">{cp.pathway}</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {cp.herbs.map((h) => (
                        <span key={h} className="text-[10px] bg-amber-400/10 text-amber-300 px-1.5 py-0.5 rounded">
                          {h}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="px-5 pb-5 pt-0">
                    <Button className="w-full bg-white/5 hover:bg-amber-400/10 border border-white/10 hover:border-amber-400/30 text-slate-300 hover:text-amber-400 text-xs font-medium py-2 rounded-xl transition-all">
                      Import to My Protocols
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
