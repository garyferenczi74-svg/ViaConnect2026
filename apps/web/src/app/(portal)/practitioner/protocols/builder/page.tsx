'use client';

import { useState, useMemo } from 'react';
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

interface Supplement {
  id: string;
  name: string;
  category: Category;
  dosageOptions: string[];
  form: 'Capsule' | 'Powder' | 'Liquid' | 'Softgel' | 'Tablet';
  geneticRelevance: number; // 0-100
}

interface ProtocolSupplement extends Supplement {
  dosage: string;
  frequency: '1x' | '2x' | '3x';
  timeOfDay: 'Morning' | 'Afternoon' | 'Evening';
}

interface Interaction {
  between: [string, string];
  severity: 'synergistic' | 'monitor' | 'avoid';
  description: string;
}

interface ProtocolTemplate {
  id: string;
  name: string;
  icon: React.ReactNode;
  borderColor: string;
  bgColor: string;
  description: string;
  supplementCount: number;
  defaultSupplementIds: string[];
}

type Category = 'Vitamins' | 'Minerals' | 'Amino Acids' | 'Herbals' | 'Specialty';
type Duration = '4 weeks' | '8 weeks' | '12 weeks' | 'Ongoing';

/* ------------------------------------------------------------------ */
/*  Icons (inline SVG)                                                 */
/* ------------------------------------------------------------------ */

const HeartIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
);

const MoonIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
  </svg>
);

const FlameIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1.001A3.75 3.75 0 0012 18z" />
  </svg>
);

const BoneIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
  </svg>
);

const BrainIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
  </svg>
);

const StomachIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const XIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const WarningIcon = () => (
  <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
  </svg>
);

const BellIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const SUPPLEMENTS: Supplement[] = [
  { id: 'methylb', name: 'Methylated B-Complex', category: 'Vitamins', dosageOptions: ['1 cap', '2 caps'], form: 'Capsule', geneticRelevance: 95 },
  { id: 'vitd3', name: 'Vitamin D3 5000IU', category: 'Vitamins', dosageOptions: ['5000 IU', '10000 IU'], form: 'Softgel', geneticRelevance: 88 },
  { id: 'omega3', name: 'Omega-3 DHA', category: 'Specialty', dosageOptions: ['1000 mg', '2000 mg'], form: 'Softgel', geneticRelevance: 82 },
  { id: 'maggl', name: 'Magnesium Glycinate', category: 'Minerals', dosageOptions: ['200 mg', '400 mg', '600 mg'], form: 'Capsule', geneticRelevance: 91 },
  { id: 'coq10', name: 'CoQ10 200mg', category: 'Specialty', dosageOptions: ['100 mg', '200 mg', '300 mg'], form: 'Softgel', geneticRelevance: 78 },
  { id: 'ashwa', name: 'Ashwagandha KSM-66', category: 'Herbals', dosageOptions: ['300 mg', '600 mg'], form: 'Capsule', geneticRelevance: 72 },
  { id: 'nac', name: 'NAC 600mg', category: 'Amino Acids', dosageOptions: ['600 mg', '1200 mg'], form: 'Capsule', geneticRelevance: 85 },
  { id: 'curcum', name: 'Curcumin BCM-95', category: 'Herbals', dosageOptions: ['500 mg', '1000 mg'], form: 'Capsule', geneticRelevance: 76 },
  { id: 'zinc', name: 'Zinc Picolinate', category: 'Minerals', dosageOptions: ['15 mg', '30 mg', '50 mg'], form: 'Capsule', geneticRelevance: 80 },
  { id: 'probio', name: 'Probiotics 50B', category: 'Specialty', dosageOptions: ['25B CFU', '50B CFU'], form: 'Capsule', geneticRelevance: 70 },
  { id: 'vitc', name: 'Vitamin C 1000mg', category: 'Vitamins', dosageOptions: ['500 mg', '1000 mg', '2000 mg'], form: 'Tablet', geneticRelevance: 65 },
  { id: 'iron', name: 'Iron Bisglycinate', category: 'Minerals', dosageOptions: ['18 mg', '25 mg', '36 mg'], form: 'Capsule', geneticRelevance: 74 },
  { id: 'ala', name: 'Alpha Lipoic Acid', category: 'Specialty', dosageOptions: ['300 mg', '600 mg'], form: 'Capsule', geneticRelevance: 68 },
  { id: 'lthean', name: 'L-Theanine', category: 'Amino Acids', dosageOptions: ['100 mg', '200 mg', '400 mg'], form: 'Capsule', geneticRelevance: 77 },
  { id: 'berb', name: 'Berberine 500mg', category: 'Herbals', dosageOptions: ['500 mg', '1000 mg', '1500 mg'], form: 'Capsule', geneticRelevance: 83 },
  { id: 'resv', name: 'Resveratrol', category: 'Herbals', dosageOptions: ['250 mg', '500 mg'], form: 'Capsule', geneticRelevance: 62 },
  { id: 'querc', name: 'Quercetin', category: 'Herbals', dosageOptions: ['500 mg', '1000 mg'], form: 'Capsule', geneticRelevance: 71 },
];

const INTERACTIONS: Interaction[] = [
  { between: ['iron', 'zinc'], severity: 'monitor', description: 'Iron and Zinc compete for absorption. Take at least 2 hours apart.' },
  { between: ['iron', 'vitc'], severity: 'synergistic', description: 'Vitamin C enhances non-heme iron absorption by up to 67%.' },
  { between: ['maggl', 'vitd3'], severity: 'synergistic', description: 'Magnesium is required for Vitamin D metabolism and activation.' },
  { between: ['curcum', 'berb'], severity: 'monitor', description: 'Both may lower blood sugar; monitor glucose levels closely.' },
  { between: ['nac', 'vitc'], severity: 'synergistic', description: 'NAC and Vitamin C synergistically support glutathione recycling.' },
  { between: ['iron', 'curcum'], severity: 'avoid', description: 'Curcumin may chelate iron and reduce absorption significantly.' },
  { between: ['coq10', 'omega3'], severity: 'synergistic', description: 'Fat-soluble CoQ10 absorption is enhanced with omega-3 fatty acids.' },
  { between: ['lthean', 'ashwa'], severity: 'synergistic', description: 'Synergistic anxiolytic effect; both support GABA pathways.' },
  { between: ['berb', 'probio'], severity: 'monitor', description: 'Berberine has antimicrobial properties that may affect probiotic viability.' },
];

const TEMPLATES: ProtocolTemplate[] = [
  {
    id: 'cardio',
    name: 'Cardiovascular',
    icon: <HeartIcon />,
    borderColor: 'border-emerald-500/50',
    bgColor: 'bg-emerald-500/10',
    description: 'Heart health and vascular support',
    supplementCount: 5,
    defaultSupplementIds: ['coq10', 'omega3', 'maggl', 'vitd3', 'resv'],
  },
  {
    id: 'immune',
    name: 'Immune Support',
    icon: <ShieldIcon />,
    borderColor: 'border-blue-500/50',
    bgColor: 'bg-blue-500/10',
    description: 'Comprehensive immune fortification',
    supplementCount: 5,
    defaultSupplementIds: ['vitc', 'vitd3', 'zinc', 'querc', 'probio'],
  },
  {
    id: 'sleep',
    name: 'Sleep Optimization',
    icon: <MoonIcon />,
    borderColor: 'border-indigo-500/50',
    bgColor: 'bg-indigo-500/10',
    description: 'Deep restorative sleep protocol',
    supplementCount: 4,
    defaultSupplementIds: ['maggl', 'lthean', 'ashwa', 'methylb'],
  },
  {
    id: 'metabolic',
    name: 'Metabolic Health',
    icon: <FlameIcon />,
    borderColor: 'border-orange-500/50',
    bgColor: 'bg-orange-500/10',
    description: 'Blood sugar and metabolic optimization',
    supplementCount: 5,
    defaultSupplementIds: ['berb', 'ala', 'maggl', 'coq10', 'omega3'],
  },
  {
    id: 'joint',
    name: 'Joint & Inflammation',
    icon: <BoneIcon />,
    borderColor: 'border-amber-500/50',
    bgColor: 'bg-amber-500/10',
    description: 'Anti-inflammatory joint support',
    supplementCount: 4,
    defaultSupplementIds: ['curcum', 'omega3', 'querc', 'vitd3'],
  },
  {
    id: 'cognitive',
    name: 'Cognitive Enhancement',
    icon: <BrainIcon />,
    borderColor: 'border-purple-500/50',
    bgColor: 'bg-purple-500/10',
    description: 'Mental clarity and neuroprotection',
    supplementCount: 5,
    defaultSupplementIds: ['omega3', 'lthean', 'methylb', 'nac', 'resv'],
  },
  {
    id: 'gi',
    name: 'GI Health',
    icon: <StomachIcon />,
    borderColor: 'border-green-500/50',
    bgColor: 'bg-green-500/10',
    description: 'Gut microbiome and digestive wellness',
    supplementCount: 4,
    defaultSupplementIds: ['probio', 'lthean', 'zinc', 'querc'],
  },
];

const MOCK_PATIENTS = [
  { id: 'p1', name: 'Sarah Mitchell', age: 42, condition: 'MTHFR C677T' },
  { id: 'p2', name: 'James Chen', age: 55, condition: 'APOE e4 carrier' },
  { id: 'p3', name: 'Maria Rodriguez', age: 38, condition: 'CYP1A2 slow metabolizer' },
  { id: 'p4', name: 'David Okonkwo', age: 47, condition: 'COMT Val/Met' },
  { id: 'p5', name: 'Emily Larsson', age: 31, condition: 'VDR Taq polymorphism' },
  { id: 'p6', name: 'Robert Kim', age: 60, condition: 'FUT2 non-secretor' },
];

const CATEGORIES: Category[] = ['Vitamins', 'Minerals', 'Amino Acids', 'Herbals', 'Specialty'];

const DURATIONS: Duration[] = ['4 weeks', '8 weeks', '12 weeks', 'Ongoing'];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const stagger = {
  container: { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } },
  item: { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } },
};

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { type: 'spring', stiffness: 260, damping: 20 },
};

function getRelevanceColor(score: number) {
  if (score >= 85) return 'text-emerald-400';
  if (score >= 70) return 'text-amber-400';
  return 'text-slate-400';
}

function getInteractionIcon(severity: Interaction['severity']) {
  switch (severity) {
    case 'synergistic': return <CheckCircleIcon />;
    case 'monitor': return <WarningIcon />;
    case 'avoid': return <AlertIcon />;
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ProtocolBuilderPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [protocolSupplements, setProtocolSupplements] = useState<ProtocolSupplement[]>([]);
  const [protocolName, setProtocolName] = useState('');
  const [duration, setDuration] = useState<Duration>('8 weeks');
  const [selectedPatient, setSelectedPatient] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category | 'All'>('All');
  const [saveDraftStatus, setSaveDraftStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [assignStatus, setAssignStatus] = useState<'idle' | 'assigned'>('idle');

  /* -- Derived state ------------------------------------------------ */

  const filteredSupplements = useMemo(() => {
    return SUPPLEMENTS.filter((s) => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'All' || s.category === activeCategory;
      const notAlreadyAdded = !protocolSupplements.some((ps) => ps.id === s.id);
      return matchesSearch && matchesCategory && notAlreadyAdded;
    });
  }, [searchQuery, activeCategory, protocolSupplements]);

  const activeInteractions = useMemo(() => {
    const ids = protocolSupplements.map((s) => s.id);
    return INTERACTIONS.filter(
      (i) => ids.includes(i.between[0]) && ids.includes(i.between[1]),
    );
  }, [protocolSupplements]);

  const interactionCounts = useMemo(() => {
    const counts = { avoid: 0, monitor: 0, synergistic: 0 };
    activeInteractions.forEach((i) => { counts[i.severity]++; });
    return counts;
  }, [activeInteractions]);

  const hasAvoidInteraction = interactionCounts.avoid > 0;

  function getSupplementInteractionStatus(supId: string): 'green' | 'yellow' | 'red' {
    const relevant = activeInteractions.filter(
      (i) => i.between.includes(supId),
    );
    if (relevant.some((i) => i.severity === 'avoid')) return 'red';
    if (relevant.some((i) => i.severity === 'monitor')) return 'yellow';
    return 'green';
  }

  /* -- Actions ------------------------------------------------------ */

  function addSupplement(supplement: Supplement) {
    const protocolSup: ProtocolSupplement = {
      ...supplement,
      dosage: supplement.dosageOptions[0],
      frequency: '1x',
      timeOfDay: 'Morning',
    };
    setProtocolSupplements((prev) => [...prev, protocolSup]);
  }

  function removeSupplement(id: string) {
    setProtocolSupplements((prev) => prev.filter((s) => s.id !== id));
  }

  function updateSupplement(id: string, field: keyof Pick<ProtocolSupplement, 'dosage' | 'frequency' | 'timeOfDay'>, value: string) {
    setProtocolSupplements((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    );
  }

  function selectTemplate(templateId: string) {
    const template = TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    setSelectedTemplate(templateId);
    setProtocolName(`${template.name} Protocol`);

    const newSupplements: ProtocolSupplement[] = template.defaultSupplementIds
      .map((sid) => SUPPLEMENTS.find((s) => s.id === sid))
      .filter(Boolean)
      .map((s) => ({
        ...s!,
        dosage: s!.dosageOptions[0],
        frequency: '2x' as const,
        timeOfDay: 'Morning' as const,
      }));
    setProtocolSupplements(newSupplements);
  }

  function handleSaveDraft() {
    setSaveDraftStatus('saving');
    setTimeout(() => setSaveDraftStatus('saved'), 1200);
    setTimeout(() => setSaveDraftStatus('idle'), 3000);
  }

  function assignProtocol() {
    if (!selectedPatient) return;
    setAssignStatus('assigned');
    setShowAssignModal(false);
    setTimeout(() => setAssignStatus('idle'), 4000);
  }

  /* -- Calendar grid for adherence preview -------------------------- */
  const calendarDays = useMemo(() => {
    const weeks = duration === '4 weeks' ? 4 : duration === '8 weeks' ? 8 : duration === '12 weeks' ? 12 : 8;
    const totalDays = weeks * 7;
    return Array.from({ length: Math.min(totalDays, 56) }, (_, i) => ({
      day: i + 1,
      filled: Math.random() > 0.15, // simulated adherence
    }));
  }, [duration]);

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">

        {/* ===== HEADER ===== */}
        <motion.div {...fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/practitioner" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-emerald-400 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Clinical Protocol Builder
            </h1>
            <p className="mt-1 text-slate-400">
              Design, validate, and assign supplement protocols powered by genomic insights
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="md"
              onClick={handleSaveDraft}
              loading={saveDraftStatus === 'saving'}
            >
              {saveDraftStatus === 'saved' ? 'Draft Saved' : 'Save Draft'}
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => setShowAssignModal(true)}
              disabled={protocolSupplements.length === 0}
            >
              Assign to Patient
            </Button>
          </div>
        </motion.div>

        {/* ===== TEMPLATE SELECTOR ===== */}
        <motion.section {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }}>
          <h2 className="mb-4 text-lg font-semibold text-white">Quick Start Templates</h2>
          <motion.div
            variants={stagger.container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7"
          >
            {TEMPLATES.map((t) => (
              <motion.div key={t.id} variants={stagger.item}>
                <button
                  onClick={() => selectTemplate(t.id)}
                  className={`group w-full rounded-xl border p-3 text-left transition-all ${
                    selectedTemplate === t.id
                      ? `${t.borderColor} ${t.bgColor} ring-1 ring-white/20`
                      : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                  } backdrop-blur-xl`}
                >
                  <div className={`mb-2 ${selectedTemplate === t.id ? 'text-white' : 'text-slate-400 group-hover:text-white'} transition-colors`}>
                    {t.icon}
                  </div>
                  <p className="text-sm font-medium text-white">{t.name}</p>
                  <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">{t.description}</p>
                  <p className="mt-1 text-xs text-slate-500">{t.supplementCount} supplements</p>
                </button>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        {/* ===== RED INTERACTION ALERT ===== */}
        <AnimatePresence>
          {hasAvoidInteraction && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 backdrop-blur-xl">
                <AlertIcon />
                <div>
                  <p className="font-medium text-red-300">Interaction Alert</p>
                  <p className="text-sm text-red-400/80">
                    {interactionCounts.avoid} supplement combination{interactionCounts.avoid > 1 ? 's' : ''} should be avoided. Review the interaction panel below.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== PROTOCOL BUILDER AREA (2-col) ===== */}
        <div className="grid gap-6 lg:grid-cols-5">

          {/* -- Left Column: Available Supplements (3/5) -- */}
          <motion.div
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.15 }}
            className="lg:col-span-2 space-y-4"
          >
            <div className={`rounded-xl ${glassClasses.dark} p-5`}>
              <h3 className="mb-4 text-lg font-semibold text-white">Available Supplements</h3>

              {/* Search */}
              <div className="relative mb-4">
                <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                  <SearchIcon />
                </div>
                <input
                  type="text"
                  placeholder="Search supplements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
                />
              </div>

              {/* Category Filters */}
              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveCategory('All')}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    activeCategory === 'All'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  All
                </button>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      activeCategory === cat
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Supplement List */}
              <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                <AnimatePresence mode="popLayout">
                  {filteredSupplements.map((sup) => (
                    <motion.div
                      key={sup.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    >
                      <button
                        onClick={() => addSupplement(sup)}
                        className="group flex w-full items-center justify-between rounded-lg border border-white/5 bg-white/[0.03] p-3 text-left transition-all hover:border-emerald-500/30 hover:bg-emerald-500/5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white group-hover:text-emerald-300 transition-colors truncate">
                            {sup.name}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-xs text-slate-500">{sup.form}</span>
                            <span className="text-slate-600">|</span>
                            <span className="text-xs text-slate-500">{sup.category}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className={`text-xs font-medium ${getRelevanceColor(sup.geneticRelevance)}`}>
                              {sup.geneticRelevance}%
                            </p>
                            <p className="text-[10px] text-slate-500">relevance</p>
                          </div>
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            <PlusIcon />
                          </div>
                        </div>
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {filteredSupplements.length === 0 && (
                  <p className="py-8 text-center text-sm text-slate-500">
                    {protocolSupplements.length === SUPPLEMENTS.length
                      ? 'All supplements have been added to the protocol.'
                      : 'No supplements match your search.'}
                  </p>
                )}
              </div>
            </div>
          </motion.div>

          {/* -- Right Column: Current Protocol (2/5) -- */}
          <motion.div
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.2 }}
            className="lg:col-span-3 space-y-4"
          >
            <div className={`rounded-xl ${glassClasses.dark} p-5`}>
              <h3 className="mb-4 text-lg font-semibold text-white">Current Protocol</h3>

              {/* Protocol Name */}
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Protocol Name</label>
                <input
                  type="text"
                  value={protocolName}
                  onChange={(e) => setProtocolName(e.target.value)}
                  placeholder="e.g., Cardiovascular Wellness Protocol"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
                />
              </div>

              {/* Duration Selector */}
              <div className="mb-5">
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Duration</label>
                <div className="flex gap-2">
                  {DURATIONS.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                        duration === d
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Added Supplements */}
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                <AnimatePresence mode="popLayout">
                  {protocolSupplements.map((sup) => {
                    const status = getSupplementInteractionStatus(sup.id);
                    return (
                      <motion.div
                        key={sup.id}
                        layout
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -30 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        className={`rounded-lg border p-3 ${
                          status === 'red'
                            ? 'border-red-500/30 bg-red-500/5'
                            : status === 'yellow'
                            ? 'border-amber-500/20 bg-amber-500/5'
                            : 'border-white/5 bg-white/[0.03]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            {status === 'green' && <CheckCircleIcon />}
                            {status === 'yellow' && <WarningIcon />}
                            {status === 'red' && <AlertIcon />}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-white truncate">{sup.name}</p>
                              <p className="text-xs text-slate-500">{sup.form}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => removeSupplement(sup.id)}
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                          >
                            <XIcon />
                          </button>
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-2">
                          {/* Dosage */}
                          <div>
                            <label className="mb-1 block text-[10px] font-medium text-slate-500 uppercase tracking-wider">Dosage</label>
                            <select
                              value={sup.dosage}
                              onChange={(e) => updateSupplement(sup.id, 'dosage', e.target.value)}
                              className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white outline-none focus:border-emerald-500/50"
                            >
                              {sup.dosageOptions.map((opt) => (
                                <option key={opt} value={opt} className="bg-slate-800">{opt}</option>
                              ))}
                            </select>
                          </div>
                          {/* Frequency */}
                          <div>
                            <label className="mb-1 block text-[10px] font-medium text-slate-500 uppercase tracking-wider">Frequency</label>
                            <select
                              value={sup.frequency}
                              onChange={(e) => updateSupplement(sup.id, 'frequency', e.target.value)}
                              className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white outline-none focus:border-emerald-500/50"
                            >
                              <option value="1x" className="bg-slate-800">1x daily</option>
                              <option value="2x" className="bg-slate-800">2x daily</option>
                              <option value="3x" className="bg-slate-800">3x daily</option>
                            </select>
                          </div>
                          {/* Time of Day */}
                          <div>
                            <label className="mb-1 block text-[10px] font-medium text-slate-500 uppercase tracking-wider">Time</label>
                            <select
                              value={sup.timeOfDay}
                              onChange={(e) => updateSupplement(sup.id, 'timeOfDay', e.target.value)}
                              className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white outline-none focus:border-emerald-500/50"
                            >
                              <option value="Morning" className="bg-slate-800">Morning</option>
                              <option value="Afternoon" className="bg-slate-800">Afternoon</option>
                              <option value="Evening" className="bg-slate-800">Evening</option>
                            </select>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {protocolSupplements.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-slate-500">
                      <PlusIcon />
                    </div>
                    <p className="text-sm text-slate-400">No supplements added yet</p>
                    <p className="text-xs text-slate-500">Select a template or add supplements from the left panel</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* ===== INTERACTION CHECK PANEL ===== */}
        <motion.section {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.25 }}>
          <div className={`rounded-xl ${glassClasses.dark} p-5`}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Interaction Check</h3>
              {activeInteractions.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-400">
                    {activeInteractions.length} interaction{activeInteractions.length !== 1 ? 's' : ''} found:
                  </span>
                  {interactionCounts.avoid > 0 && (
                    <Badge variant="error">{interactionCounts.avoid} Avoid</Badge>
                  )}
                  {interactionCounts.monitor > 0 && (
                    <Badge variant="warning">{interactionCounts.monitor} Monitor</Badge>
                  )}
                  {interactionCounts.synergistic > 0 && (
                    <Badge variant="success">{interactionCounts.synergistic} Synergistic</Badge>
                  )}
                </div>
              )}
            </div>

            {activeInteractions.length > 0 ? (
              <motion.div
                variants={stagger.container}
                initial="hidden"
                animate="show"
                className="space-y-2"
              >
                {activeInteractions.map((interaction, idx) => {
                  const sup1 = SUPPLEMENTS.find((s) => s.id === interaction.between[0]);
                  const sup2 = SUPPLEMENTS.find((s) => s.id === interaction.between[1]);
                  return (
                    <motion.div
                      key={idx}
                      variants={stagger.item}
                      className={`flex items-start gap-3 rounded-lg border p-3 ${
                        interaction.severity === 'avoid'
                          ? 'border-red-500/20 bg-red-500/5'
                          : interaction.severity === 'monitor'
                          ? 'border-amber-500/20 bg-amber-500/5'
                          : 'border-emerald-500/20 bg-emerald-500/5'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">{getInteractionIcon(interaction.severity)}</div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white">
                          {sup1?.name} + {sup2?.name}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">{interaction.description}</p>
                      </div>
                      <Badge
                        variant={
                          interaction.severity === 'avoid'
                            ? 'error'
                            : interaction.severity === 'monitor'
                            ? 'warning'
                            : 'success'
                        }
                        className="shrink-0"
                      >
                        {interaction.severity === 'synergistic' ? 'Synergistic' : interaction.severity === 'monitor' ? 'Monitor' : 'Avoid'}
                      </Badge>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              <p className="py-6 text-center text-sm text-slate-500">
                {protocolSupplements.length < 2
                  ? 'Add at least 2 supplements to check for interactions.'
                  : 'No known interactions between current supplements.'}
              </p>
            )}
          </div>
        </motion.section>

        {/* ===== PATIENT ASSIGNMENT ===== */}
        <motion.section {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.3 }}>
          <div className={`rounded-xl ${glassClasses.dark} p-5`}>
            <h3 className="mb-4 text-lg font-semibold text-white">Patient Assignment</h3>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Assignment Controls */}
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">Select Patient</label>
                  <select
                    value={selectedPatient}
                    onChange={(e) => setSelectedPatient(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                  >
                    <option value="" className="bg-slate-800">Choose a patient...</option>
                    {MOCK_PATIENTS.map((p) => (
                      <option key={p.id} value={p.id} className="bg-slate-800">
                        {p.name} - {p.condition}
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  variant="primary"
                  size="md"
                  onClick={assignProtocol}
                  disabled={!selectedPatient || protocolSupplements.length === 0}
                  className="w-full"
                >
                  Assign Protocol
                </Button>

                <p className="text-xs text-slate-500">
                  Protocol will be sent to patient for accept/decline. Patient will receive an in-app notification and email.
                </p>

                <AnimatePresence>
                  {assignStatus === 'assigned' && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3"
                    >
                      <CheckCircleIcon />
                      <p className="text-sm text-emerald-300">
                        Protocol assigned to {MOCK_PATIENTS.find((p) => p.id === selectedPatient)?.name}!
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Notification Preview */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Notification Preview</label>
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                      <BellIcon />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">New Protocol Assigned</p>
                      <p className="text-xs text-slate-500">Just now</p>
                    </div>
                  </div>
                  <div className="rounded-md border border-white/5 bg-white/[0.02] p-3">
                    <p className="text-sm text-slate-300">
                      Dr. ViaConnect has assigned you a new protocol: <span className="font-medium text-emerald-400">{protocolName || 'Untitled Protocol'}</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {protocolSupplements.length} supplement{protocolSupplements.length !== 1 ? 's' : ''} | {duration}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <span className="rounded-md bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-400">
                        Accept
                      </span>
                      <span className="rounded-md bg-white/5 px-3 py-1 text-xs font-medium text-slate-400">
                        Decline
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ===== ADHERENCE TRACKING PREVIEW ===== */}
        <motion.section {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.35 }}>
          <div className={`rounded-xl ${glassClasses.dark} p-5`}>
            <div className="flex items-center gap-2 mb-4">
              <CalendarIcon />
              <h3 className="text-lg font-semibold text-white">Adherence Tracking Preview</h3>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Calendar Grid */}
              <div>
                <p className="mb-3 text-xs font-medium text-slate-400">Projected Protocol Schedule ({duration})</p>
                <div className="grid grid-cols-7 gap-1">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                    <div key={i} className="flex h-7 items-center justify-center text-[10px] font-medium text-slate-500">
                      {day}
                    </div>
                  ))}
                  {calendarDays.map((d, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.008, type: 'spring', stiffness: 400, damping: 20 }}
                      className={`flex h-7 items-center justify-center rounded-md text-[10px] font-medium ${
                        d.filled
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                          : 'bg-white/5 text-slate-600 border border-white/5'
                      }`}
                    >
                      {d.day}
                    </motion.div>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-sm bg-emerald-500/30 border border-emerald-500/30" />
                    Adherent
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-sm bg-white/5 border border-white/10" />
                    Missed
                  </div>
                </div>
              </div>

              {/* Expected Outcomes */}
              <div>
                <p className="mb-3 text-xs font-medium text-slate-400">Expected Outcomes</p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.03] p-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Biomarker Improvement</p>
                      <p className="text-xs text-slate-400">Expected 15-25% improvement in targeted biomarkers within {duration === 'Ongoing' ? '12 weeks' : duration}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.03] p-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Symptom Resolution</p>
                      <p className="text-xs text-slate-400">Patients typically report noticeable symptom relief within the first 2-4 weeks of consistent adherence</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.03] p-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Genetic Pathway Optimization</p>
                      <p className="text-xs text-slate-400">Protocol is tailored to address identified SNP variants, supporting optimal methylation and detox pathways</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ===== ASSIGN MODAL ===== */}
        <AnimatePresence>
          {showAssignModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
              onClick={() => setShowAssignModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className={`w-full max-w-md rounded-2xl ${glassClasses.dark} p-6`}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-semibold text-white mb-1">Assign Protocol</h3>
                <p className="text-sm text-slate-400 mb-5">
                  Send &quot;{protocolName || 'Untitled Protocol'}&quot; ({protocolSupplements.length} supplements, {duration}) to a patient.
                </p>

                <div className="mb-5">
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">Patient</label>
                  <select
                    value={selectedPatient}
                    onChange={(e) => setSelectedPatient(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500/50"
                  >
                    <option value="" className="bg-slate-800">Choose a patient...</option>
                    {MOCK_PATIENTS.map((p) => (
                      <option key={p.id} value={p.id} className="bg-slate-800">
                        {p.name} (Age {p.age}) - {p.condition}
                      </option>
                    ))}
                  </select>
                </div>

                {hasAvoidInteraction && (
                  <div className="mb-5 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                    <AlertIcon />
                    Warning: This protocol contains {interactionCounts.avoid} supplement combination{interactionCounts.avoid > 1 ? 's' : ''} that should be avoided.
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="ghost" size="md" onClick={() => setShowAssignModal(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={assignProtocol}
                    disabled={!selectedPatient}
                    className="flex-1"
                  >
                    Confirm & Send
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
