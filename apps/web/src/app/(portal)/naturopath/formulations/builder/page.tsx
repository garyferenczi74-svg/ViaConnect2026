'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, Badge, Button, glassClasses } from '@genex360/ui';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FormType = 'tincture' | 'capsule' | 'tea' | 'powder' | 'topical';

type HerbCategory =
  | 'Adaptogens'
  | 'Nervines'
  | 'Hepatoprotective'
  | 'Anti-inflammatory'
  | 'Immune'
  | 'Digestive'
  | 'Cardiovascular'
  | 'Hormonal';

interface HerbData {
  id: string;
  commonName: string;
  scientificName: string;
  categories: HerbCategory[];
  costPerGram: number;
  contraindications: string[];
  interactions: string[];
}

interface SelectedHerb extends HerbData {
  amount: number;
  extractRatio?: '1:2' | '1:3' | '1:5';
  parts?: number;
  concentration?: number;
}

interface InteractionWarning {
  severity: 'safe' | 'caution' | 'contraindicated';
  herbs: string[];
  message: string;
}

interface DispensingRecord {
  id: string;
  date: string;
  patient: string;
  formulation: string;
  amount: string;
  refills: number;
}

// ---------------------------------------------------------------------------
// Static Data
// ---------------------------------------------------------------------------

const FORM_TYPES: { key: FormType; label: string; description: string }[] = [
  { key: 'tincture', label: 'Tincture', description: 'Liquid herbal extract' },
  { key: 'capsule', label: 'Capsule', description: 'Encapsulated powder' },
  { key: 'tea', label: 'Tea Blend', description: 'Loose leaf mix' },
  { key: 'powder', label: 'Powder', description: 'Ground herb blend' },
  { key: 'topical', label: 'Topical', description: 'External application' },
];

const HERBS_DATABASE: HerbData[] = [
  { id: 'ashwagandha', commonName: 'Ashwagandha', scientificName: 'Withania somnifera', categories: ['Adaptogens', 'Nervines'], costPerGram: 0.12, contraindications: ['Pregnancy', 'Thyroid medication'], interactions: ['Sedatives', 'Immunosuppressants'] },
  { id: 'turmeric', commonName: 'Turmeric', scientificName: 'Curcuma longa', categories: ['Anti-inflammatory', 'Hepatoprotective'], costPerGram: 0.08, contraindications: ['Gallstones'], interactions: ['Warfarin', 'Anticoagulants'] },
  { id: 'echinacea', commonName: 'Echinacea', scientificName: 'Echinacea purpurea', categories: ['Immune'], costPerGram: 0.15, contraindications: ['Autoimmune disorders'], interactions: ['Immunosuppressants'] },
  { id: 'valerian', commonName: 'Valerian', scientificName: 'Valeriana officinalis', categories: ['Nervines'], costPerGram: 0.10, contraindications: ['Liver disease'], interactions: ['Sedatives', 'Benzodiazepines'] },
  { id: 'milkthistle', commonName: 'Milk Thistle', scientificName: 'Silybum marianum', categories: ['Hepatoprotective'], costPerGram: 0.09, contraindications: [], interactions: ['CYP3A4 substrates'] },
  { id: 'ginkgo', commonName: 'Ginkgo', scientificName: 'Ginkgo biloba', categories: ['Cardiovascular', 'Nervines'], costPerGram: 0.14, contraindications: ['Bleeding disorders'], interactions: ['Warfarin', 'Anticoagulants', 'NSAIDs'] },
  { id: 'rhodiola', commonName: 'Rhodiola', scientificName: 'Rhodiola rosea', categories: ['Adaptogens'], costPerGram: 0.18, contraindications: ['Bipolar disorder'], interactions: ['SSRIs', 'MAOIs'] },
  { id: 'passionflower', commonName: 'Passionflower', scientificName: 'Passiflora incarnata', categories: ['Nervines'], costPerGram: 0.11, contraindications: ['Pregnancy'], interactions: ['Sedatives', 'MAOIs'] },
  { id: 'holybasil', commonName: 'Holy Basil', scientificName: 'Ocimum tenuiflorum', categories: ['Adaptogens', 'Immune'], costPerGram: 0.07, contraindications: ['Pregnancy'], interactions: ['Anticoagulants'] },
  { id: 'ginger', commonName: 'Ginger', scientificName: 'Zingiber officinale', categories: ['Digestive', 'Anti-inflammatory'], costPerGram: 0.06, contraindications: ['Gallstones'], interactions: ['Warfarin', 'Anticoagulants'] },
  { id: 'licorice', commonName: 'Licorice', scientificName: 'Glycyrrhiza glabra', categories: ['Digestive', 'Adaptogens'], costPerGram: 0.08, contraindications: ['Hypertension', 'Kidney disease'], interactions: ['Diuretics', 'Corticosteroids', 'Warfarin'] },
  { id: 'chamomile', commonName: 'Chamomile', scientificName: 'Matricaria chamomilla', categories: ['Nervines', 'Digestive'], costPerGram: 0.09, contraindications: ['Ragweed allergy'], interactions: ['Warfarin', 'Sedatives'] },
  { id: 'hawthorn', commonName: 'Hawthorn', scientificName: 'Crataegus monogyna', categories: ['Cardiovascular'], costPerGram: 0.13, contraindications: [], interactions: ['Beta-blockers', 'Digoxin'] },
  { id: 'nettle', commonName: 'Nettle', scientificName: 'Urtica dioica', categories: ['Anti-inflammatory', 'Hormonal'], costPerGram: 0.06, contraindications: ['Kidney disease'], interactions: ['Diuretics', 'Lithium'] },
  { id: 'dandelion', commonName: 'Dandelion', scientificName: 'Taraxacum officinale', categories: ['Hepatoprotective', 'Digestive'], costPerGram: 0.05, contraindications: ['Bile duct obstruction'], interactions: ['Diuretics', 'Lithium'] },
  { id: 'lemonbalm', commonName: 'Lemon Balm', scientificName: 'Melissa officinalis', categories: ['Nervines', 'Digestive'], costPerGram: 0.08, contraindications: ['Thyroid medication'], interactions: ['Sedatives', 'Thyroid drugs'] },
  { id: 'schisandra', commonName: 'Schisandra', scientificName: 'Schisandra chinensis', categories: ['Adaptogens', 'Hepatoprotective'], costPerGram: 0.16, contraindications: ['Pregnancy', 'Epilepsy'], interactions: ['CYP3A4 substrates'] },
  { id: 'reishi', commonName: 'Reishi', scientificName: 'Ganoderma lucidum', categories: ['Immune', 'Adaptogens'], costPerGram: 0.22, contraindications: ['Bleeding disorders'], interactions: ['Anticoagulants', 'Immunosuppressants'] },
  { id: 'lionsmane', commonName: "Lion's Mane", scientificName: 'Hericium erinaceus', categories: ['Nervines', 'Immune'], costPerGram: 0.25, contraindications: [], interactions: ['Anticoagulants'] },
  { id: 'berberine', commonName: 'Berberine', scientificName: 'Berberis vulgaris', categories: ['Digestive', 'Anti-inflammatory'], costPerGram: 0.20, contraindications: ['Pregnancy', 'Neonates'], interactions: ['Metformin', 'CYP3A4 substrates', 'Anticoagulants'] },
];

const CATEGORIES: HerbCategory[] = [
  'Adaptogens', 'Nervines', 'Hepatoprotective', 'Anti-inflammatory',
  'Immune', 'Digestive', 'Cardiovascular', 'Hormonal',
];

const MOCK_PATIENTS = [
  { id: 'p1', name: 'Sarah Mitchell', dob: '1985-04-12' },
  { id: 'p2', name: 'James Thornton', dob: '1978-09-23' },
  { id: 'p3', name: 'Emily Rodriguez', dob: '1992-01-07' },
  { id: 'p4', name: 'David Chen', dob: '1968-11-30' },
  { id: 'p5', name: 'Lisa Nakamura', dob: '1990-06-18' },
  { id: 'p6', name: 'Robert Blackwell', dob: '1955-03-04' },
];

const INITIAL_DISPENSING: DispensingRecord[] = [
  { id: 'd1', date: '2026-03-10', patient: 'Sarah Mitchell', formulation: 'Adrenal Support Tincture', amount: '100ml', refills: 2 },
  { id: 'd2', date: '2026-03-08', patient: 'James Thornton', formulation: 'Liver Cleanse Capsules', amount: '60 caps', refills: 1 },
  { id: 'd3', date: '2026-03-05', patient: 'Emily Rodriguez', formulation: 'Calm & Sleep Tea Blend', amount: '200g', refills: 3 },
  { id: 'd4', date: '2026-02-28', patient: 'David Chen', formulation: 'Joint Support Powder', amount: '150g', refills: 0 },
  { id: 'd5', date: '2026-02-25', patient: 'Lisa Nakamura', formulation: 'Hormone Balance Tincture', amount: '50ml', refills: 1 },
];

const INTERACTION_RULES: { herbs: [string, string]; severity: 'caution' | 'contraindicated'; message: string }[] = [
  { herbs: ['valerian', 'passionflower'], severity: 'caution', message: 'Combined sedative effect may be excessive. Monitor for drowsiness.' },
  { herbs: ['ginkgo', 'turmeric'], severity: 'caution', message: 'Both have anticoagulant properties. Increased bleeding risk.' },
  { herbs: ['licorice', 'hawthorn'], severity: 'caution', message: 'Licorice may counteract hawthorn cardiovascular benefits via potassium depletion.' },
  { herbs: ['ashwagandha', 'lemonbalm'], severity: 'caution', message: 'Both affect thyroid function. Monitor thyroid levels closely.' },
  { herbs: ['berberine', 'milkthistle'], severity: 'caution', message: 'Both affect CYP3A4 metabolism. May alter bioavailability.' },
  { herbs: ['rhodiola', 'holybasil'], severity: 'safe' as 'caution', message: '' },
  { herbs: ['ginkgo', 'ginger'], severity: 'contraindicated', message: 'Significant bleeding risk. Avoid concurrent use in patients on anticoagulants.' },
  { herbs: ['reishi', 'ginkgo'], severity: 'caution', message: 'Additive anticoagulant effects. Use caution in patients with bleeding disorders.' },
];

// ---------------------------------------------------------------------------
// Icon components (inline SVG for portability)
// ---------------------------------------------------------------------------

function DropletIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25c0 0-7.5 8.25-7.5 13.5a7.5 7.5 0 1015 0C19.5 10.5 12 2.25 12 2.25z" />
    </svg>
  );
}

function PillIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5m-9.25-11.396c.251.023.501.05.75.082M4.5 15.5l3-3m7.5 3l3-3" />
    </svg>
  );
}

function CupIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6.75h1.5a2.25 2.25 0 012.25 2.25v0a2.25 2.25 0 01-2.25 2.25h-1.5M4.5 6.75h11.25v8.25a3 3 0 01-3 3H7.5a3 3 0 01-3-3V6.75zM6 3v3m4.5-3v3m4.5-3v3" />
    </svg>
  );
}

function ScoopIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  );
}

function HandIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.05 4.575a1.575 1.575 0 10-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 013.15 0v1.5m-3.15 0l-.075 5.925m3.225-5.925a1.575 1.575 0 013.15 0v3.4m0 0a1.575 1.575 0 013.15 0V15a6 6 0 01-6 6H8.084a6 6 0 01-4.632-2.18l-2.394-2.933A1.575 1.575 0 012.634 13.5v0a1.575 1.575 0 011.78-.363l2.36.942" />
    </svg>
  );
}

function SearchIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function CheckCircleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function WarningIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function XMarkIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ChevronDownIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function PrinterIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659" />
    </svg>
  );
}

function ClipboardIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
    </svg>
  );
}

const FORM_ICONS: Record<FormType, React.FC<{ className?: string }>> = {
  tincture: DropletIcon,
  capsule: PillIcon,
  tea: CupIcon,
  powder: ScoopIcon,
  topical: HandIcon,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getUnitLabel(form: FormType): string {
  switch (form) {
    case 'tincture': return 'ml';
    case 'capsule': return 'mg';
    case 'tea': return 'parts';
    case 'powder': return 'g';
    case 'topical': return '%';
  }
}

function getDefaultAmount(form: FormType): number {
  switch (form) {
    case 'tincture': return 20;
    case 'capsule': return 250;
    case 'tea': return 2;
    case 'powder': return 5;
    case 'topical': return 5;
  }
}

function getShelfLife(form: FormType): { label: string; months: number; storage: string } {
  switch (form) {
    case 'tincture': return { label: '3-5 years', months: 36, storage: 'Store in a cool, dark place. Keep tightly sealed.' };
    case 'capsule': return { label: '2 years', months: 24, storage: 'Store below 25 C in a dry environment. Keep in airtight container.' };
    case 'tea': return { label: '1 year (dry) / 3 days (brewed)', months: 12, storage: 'Store in airtight container away from light and moisture.' };
    case 'powder': return { label: '2 years', months: 24, storage: 'Store in a cool, dry place. Keep sealed to prevent moisture absorption.' };
    case 'topical': return { label: '6-12 months', months: 9, storage: 'Store below 25 C. Avoid direct sunlight. Discard if colour or odour changes.' };
  }
}

function generateBatchNumber(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `NP-${y}${m}${d}-${seq}`;
}

function getExpirationDate(form: FormType): string {
  const shelf = getShelfLife(form);
  const exp = new Date();
  exp.setMonth(exp.getMonth() + shelf.months);
  return exp.toISOString().split('T')[0];
}

function getDosageInstructions(form: FormType): string {
  switch (form) {
    case 'tincture': return 'Take 2-5 ml (40-100 drops) in a small amount of water, 2-3 times daily before meals. Shake well before use.';
    case 'capsule': return 'Take 1-2 capsules, 2 times daily with meals and a full glass of water.';
    case 'tea': return 'Steep 1-2 teaspoons in 250 ml freshly boiled water for 5-10 minutes. Strain and drink 2-3 cups daily.';
    case 'powder': return 'Mix 1/2 to 1 teaspoon (2-5 g) into warm water, smoothie, or food. Take 1-2 times daily.';
    case 'topical': return 'Apply a thin layer to affected area 2-3 times daily. For external use only. Perform a patch test before first use.';
  }
}

const TOPICAL_BASES = ['Coconut Oil', 'Shea Butter', 'Beeswax Balm', 'Aloe Vera Gel', 'Jojoba Oil', 'Olive Oil'];

// ---------------------------------------------------------------------------
// Stagger animation variants
// ---------------------------------------------------------------------------

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
};

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function FormulationBuilderPage() {
  // ----- state -----
  const [selectedForm, setSelectedForm] = useState<FormType>('tincture');
  const [formulationName, setFormulationName] = useState('');
  const [selectedHerbs, setSelectedHerbs] = useState<SelectedHerb[]>([]);
  const [herbSearch, setHerbSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<HerbCategory | 'All'>('All');
  const [showLabel, setShowLabel] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [dispensingHistory, setDispensingHistory] = useState<DispensingRecord[]>(INITIAL_DISPENSING);
  const [assignPatient, setAssignPatient] = useState('');
  const [assignSchedule, setAssignSchedule] = useState({ morning: true, afternoon: false, evening: true });
  const [assignDuration, setAssignDuration] = useState<number>(4);
  const [showAssignConfirm, setShowAssignConfirm] = useState(false);
  const [alcoholContent, setAlcoholContent] = useState(45);
  const [topicalBase, setTopicalBase] = useState(TOPICAL_BASES[0]);
  const [refillDate, setRefillDate] = useState('');
  const [refillReminder, setRefillReminder] = useState(true);
  const [saveDraftLoading, setSaveDraftLoading] = useState(false);
  const [dispenseLoading, setDispenseLoading] = useState(false);
  const [batchNumber] = useState(generateBatchNumber);

  // ----- derived -----
  const filteredHerbs = useMemo(() => {
    return HERBS_DATABASE.filter((h) => {
      const matchesSearch =
        h.commonName.toLowerCase().includes(herbSearch.toLowerCase()) ||
        h.scientificName.toLowerCase().includes(herbSearch.toLowerCase());
      const matchesCategory = activeCategory === 'All' || h.categories.includes(activeCategory);
      const notSelected = !selectedHerbs.some((s) => s.id === h.id);
      return matchesSearch && matchesCategory && notSelected;
    });
  }, [herbSearch, activeCategory, selectedHerbs]);

  const interactions: InteractionWarning[] = useMemo(() => {
    const warnings: InteractionWarning[] = [];
    const ids = selectedHerbs.map((h) => h.id);
    for (const rule of INTERACTION_RULES) {
      if (ids.includes(rule.herbs[0]) && ids.includes(rule.herbs[1])) {
        const h1 = selectedHerbs.find((h) => h.id === rule.herbs[0])!;
        const h2 = selectedHerbs.find((h) => h.id === rule.herbs[1])!;
        warnings.push({
          severity: rule.severity,
          herbs: [h1.commonName, h2.commonName],
          message: rule.message,
        });
      }
    }
    // Warfarin drug-interaction example
    const warfarinHerbs = selectedHerbs.filter((h) => h.interactions.includes('Warfarin'));
    if (warfarinHerbs.length > 0) {
      warnings.push({
        severity: 'contraindicated',
        herbs: warfarinHerbs.map((h) => h.commonName),
        message: `Patient is on Warfarin. ${warfarinHerbs.map((h) => h.commonName).join(', ')} may potentiate anticoagulant effects and increase bleeding risk.`,
      });
    }
    return warnings;
  }, [selectedHerbs]);

  const totalAmount = useMemo(() => {
    return selectedHerbs.reduce((sum, h) => sum + h.amount, 0);
  }, [selectedHerbs]);

  const costData = useMemo(() => {
    const lines = selectedHerbs.map((h) => {
      let qty = h.amount;
      if (selectedForm === 'capsule') qty = h.amount / 1000; // mg -> g
      if (selectedForm === 'topical') qty = (h.amount / 100) * 50; // % of 50g base
      if (selectedForm === 'tea') qty = h.amount * 10; // parts -> approx grams
      const lineTotal = qty * h.costPerGram;
      return { name: h.commonName, amount: h.amount, unit: getUnitLabel(selectedForm), costPerUnit: h.costPerGram, lineTotal };
    });
    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
    const overhead = subtotal * 0.15;
    const total = subtotal + overhead;
    const retail = total * 2.5;
    return { lines, subtotal, overhead, total, retail };
  }, [selectedHerbs, selectedForm]);

  // ----- callbacks -----
  const addHerb = useCallback((herb: HerbData) => {
    setSelectedHerbs((prev) => [
      ...prev,
      {
        ...herb,
        amount: getDefaultAmount(selectedForm),
        extractRatio: '1:3',
        parts: 2,
        concentration: 5,
      },
    ]);
  }, [selectedForm]);

  const removeHerb = useCallback((id: string) => {
    setSelectedHerbs((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const updateHerbAmount = useCallback((id: string, amount: number) => {
    setSelectedHerbs((prev) => prev.map((h) => (h.id === id ? { ...h, amount } : h)));
  }, []);

  const updateHerbExtractRatio = useCallback((id: string, ratio: '1:2' | '1:3' | '1:5') => {
    setSelectedHerbs((prev) => prev.map((h) => (h.id === id ? { ...h, extractRatio: ratio } : h)));
  }, []);

  const handleSaveDraft = useCallback(() => {
    setSaveDraftLoading(true);
    setTimeout(() => setSaveDraftLoading(false), 1200);
  }, []);

  const handleDispense = useCallback(() => {
    if (!selectedPatient || selectedHerbs.length === 0) return;
    setDispenseLoading(true);
    setTimeout(() => {
      const patient = MOCK_PATIENTS.find((p) => p.id === selectedPatient);
      setDispensingHistory((prev) => [
        {
          id: `d${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          patient: patient?.name ?? 'Unknown',
          formulation: formulationName || 'Untitled Formulation',
          amount: `${totalAmount}${getUnitLabel(selectedForm)}`,
          refills: 0,
        },
        ...prev,
      ]);
      setDispenseLoading(false);
    }, 1000);
  }, [selectedPatient, selectedHerbs, formulationName, totalAmount, selectedForm]);

  const handleAssignFormulation = useCallback(() => {
    setShowAssignConfirm(true);
    setTimeout(() => setShowAssignConfirm(false), 3000);
  }, []);

  const generateLabelText = useCallback(() => {
    const ingredientsList = selectedHerbs
      .map((h) => `${h.commonName} (${h.scientificName}) - ${h.amount}${getUnitLabel(selectedForm)}`)
      .join('\n');
    const shelf = getShelfLife(selectedForm);
    return `${formulationName || 'Untitled Formulation'}\n\nIngredients:\n${ingredientsList}\n\nDosage: ${getDosageInstructions(selectedForm)}\n\nWarnings: ${interactions.length > 0 ? interactions.map((i) => i.message).join('; ') : 'No known contraindications.'}\n\nStorage: ${shelf.storage}\nExpires: ${getExpirationDate(selectedForm)}\nBatch: ${batchNumber}`;
  }, [selectedHerbs, selectedForm, formulationName, interactions, batchNumber]);

  const handleCopyLabel = useCallback(() => {
    navigator.clipboard?.writeText(generateLabelText());
  }, [generateLabelText]);

  // ----- render -----
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <motion.div
        className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* ================================================================
            1. HEADER
        ================================================================ */}
        <motion.div variants={itemVariants} className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/naturopath" className="text-sm text-amber-400 hover:text-amber-300 transition-colors">
              &larr; Back to Portal
            </Link>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">Formulation Builder</h1>
            <p className="mt-1 text-slate-400">Design, validate and dispense custom botanical formulations</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="md" loading={saveDraftLoading} onClick={handleSaveDraft} className="!border-amber-500/50 !text-amber-400 hover:!bg-amber-500/10">
              Save Draft
            </Button>
            <Button variant="primary" size="md" loading={dispenseLoading} onClick={handleDispense} className="!bg-amber-500 hover:!bg-amber-600 !text-slate-950 font-semibold">
              Dispense
            </Button>
          </div>
        </motion.div>

        {/* ================================================================
            2. FORM TYPE SELECTOR
        ================================================================ */}
        <motion.div variants={itemVariants} className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Preparation Form</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {FORM_TYPES.map((ft) => {
              const Icon = FORM_ICONS[ft.key];
              const active = selectedForm === ft.key;
              return (
                <motion.button
                  key={ft.key}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedForm(ft.key)}
                  className={`relative flex flex-col items-center gap-2 rounded-xl p-4 text-center transition-all ${
                    active
                      ? 'border-2 border-amber-500 bg-amber-500/10 text-amber-400 shadow-lg shadow-amber-500/10'
                      : `${glassClasses.dark} text-slate-300 hover:border-white/20`
                  }`}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-sm font-medium">{ft.label}</span>
                  <span className="text-xs text-slate-500">{ft.description}</span>
                  {active && (
                    <motion.div layoutId="formSelector" className="absolute inset-0 rounded-xl border-2 border-amber-500" transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }} />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Form-specific controls */}
          <AnimatePresence mode="wait">
            <motion.div key={selectedForm} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="mt-4 overflow-hidden">
              {selectedForm === 'tincture' && (
                <div className={`rounded-xl p-4 ${glassClasses.dark}`}>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Alcohol Content: {alcoholContent}%</label>
                  <input
                    type="range"
                    min={25}
                    max={90}
                    value={alcoholContent}
                    onChange={(e) => setAlcoholContent(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                  <div className="mt-1 flex justify-between text-xs text-slate-500"><span>25%</span><span>90%</span></div>
                </div>
              )}
              {selectedForm === 'topical' && (
                <div className={`rounded-xl p-4 ${glassClasses.dark}`}>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Base / Carrier</label>
                  <div className="flex flex-wrap gap-2">
                    {TOPICAL_BASES.map((base) => (
                      <button
                        key={base}
                        onClick={() => setTopicalBase(base)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                          topicalBase === base ? 'bg-amber-500 text-slate-950' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                        }`}
                      >
                        {base}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {selectedForm === 'capsule' && (
                <div className={`rounded-xl p-4 ${glassClasses.dark}`}>
                  <p className="text-sm text-slate-400">Configure mg per capsule for each herb below. Standard capsule size: 500 mg total fill weight.</p>
                </div>
              )}
              {selectedForm === 'tea' && (
                <div className={`rounded-xl p-4 ${glassClasses.dark}`}>
                  <p className="text-sm text-slate-400">Set parts ratio for each herb below. Total parts will determine proportional mixing.</p>
                </div>
              )}
              {selectedForm === 'powder' && (
                <div className={`rounded-xl p-4 ${glassClasses.dark}`}>
                  <p className="text-sm text-slate-400">Specify gram measurements for each herb. Total weight shown in formulation summary.</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* ================================================================
            3. FORMULATION BUILDER - 2 Column Layout
        ================================================================ */}
        <motion.div variants={itemVariants} className="mb-8 grid gap-6 lg:grid-cols-5">
          {/* --- Left: Herb Selection Panel --- */}
          <div className="lg:col-span-2">
            <div className={`rounded-xl ${glassClasses.dark} p-5`}>
              <h3 className="mb-4 text-lg font-semibold text-white">Herb Selection</h3>

              {/* Search */}
              <div className="relative mb-4">
                <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search herbs..."
                  value={herbSearch}
                  onChange={(e) => setHerbSearch(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30"
                />
              </div>

              {/* Category filters */}
              <div className="mb-4 flex flex-wrap gap-1.5">
                <button
                  onClick={() => setActiveCategory('All')}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    activeCategory === 'All' ? 'bg-amber-500 text-slate-950' : 'bg-white/10 text-slate-400 hover:bg-white/20'
                  }`}
                >
                  All
                </button>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                      activeCategory === cat ? 'bg-amber-500 text-slate-950' : 'bg-white/10 text-slate-400 hover:bg-white/20'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Herbs list */}
              <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
                <AnimatePresence>
                  {filteredHerbs.map((herb) => (
                    <motion.div
                      key={herb.id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.03] p-3 hover:border-amber-500/30 hover:bg-white/[0.06] transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white">{herb.commonName}</p>
                        <p className="text-xs italic text-slate-500">{herb.scientificName}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {herb.categories.map((cat) => (
                            <Badge key={cat} variant="warning" className="!text-[10px] !px-1.5 !py-0">
                              {cat}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => addHerb(herb)}
                        className="ml-3 shrink-0 rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-400 transition-colors hover:bg-amber-500/30"
                      >
                        + Add
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {filteredHerbs.length === 0 && (
                  <p className="py-8 text-center text-sm text-slate-600">No herbs match your search.</p>
                )}
              </div>
            </div>
          </div>

          {/* --- Right: Current Formulation --- */}
          <div className="lg:col-span-3">
            <div className={`rounded-xl ${glassClasses.dark} p-5`}>
              <h3 className="mb-4 text-lg font-semibold text-white">Current Formulation</h3>

              {/* Formulation name */}
              <input
                type="text"
                placeholder="Formulation name (e.g., Adrenal Recovery Blend)"
                value={formulationName}
                onChange={(e) => setFormulationName(e.target.value)}
                className="mb-5 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30"
              />

              {selectedHerbs.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/10 py-16 text-center">
                  <DropletIcon className="mb-3 h-10 w-10 text-slate-700" />
                  <p className="text-sm text-slate-500">No herbs added yet.</p>
                  <p className="text-xs text-slate-600">Select herbs from the panel on the left.</p>
                </div>
              ) : (
                <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-3">
                  <AnimatePresence>
                    {selectedHerbs.map((herb) => {
                      const herbInteractions = interactions.filter((i) => i.herbs.includes(herb.commonName));
                      const worstSeverity = herbInteractions.reduce<InteractionWarning['severity']>((worst, i) => {
                        if (i.severity === 'contraindicated') return 'contraindicated';
                        if (i.severity === 'caution' && worst !== 'contraindicated') return 'caution';
                        return worst;
                      }, 'safe');

                      return (
                        <motion.div
                          key={herb.id}
                          variants={itemVariants}
                          exit={{ opacity: 0, x: 30 }}
                          className={`relative rounded-lg border p-4 transition-colors ${
                            worstSeverity === 'contraindicated'
                              ? 'border-red-500/40 bg-red-500/5'
                              : worstSeverity === 'caution'
                              ? 'border-amber-500/30 bg-amber-500/5'
                              : 'border-white/10 bg-white/[0.03]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-white">{herb.commonName}</p>
                                {worstSeverity === 'safe' && <CheckCircleIcon className="h-4 w-4 text-green-400" />}
                                {worstSeverity === 'caution' && <WarningIcon className="h-4 w-4 text-amber-400" />}
                                {worstSeverity === 'contraindicated' && <WarningIcon className="h-4 w-4 text-red-400" />}
                              </div>
                              <p className="text-xs italic text-slate-500">{herb.scientificName}</p>
                            </div>
                            <button onClick={() => removeHerb(herb.id)} className="shrink-0 rounded p-1 text-slate-500 hover:bg-white/10 hover:text-red-400 transition-colors">
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Amount controls -- vary by form type */}
                          <div className="mt-3 flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-slate-400">Amount:</label>
                              <input
                                type="number"
                                min={0}
                                value={herb.amount}
                                onChange={(e) => updateHerbAmount(herb.id, Math.max(0, Number(e.target.value)))}
                                className="w-20 rounded border border-white/10 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-amber-500"
                              />
                              <span className="text-xs text-slate-500">{getUnitLabel(selectedForm)}</span>
                            </div>

                            {selectedForm === 'tincture' && (
                              <div className="flex items-center gap-2">
                                <label className="text-xs text-slate-400">Ratio:</label>
                                {(['1:2', '1:3', '1:5'] as const).map((r) => (
                                  <button
                                    key={r}
                                    onClick={() => updateHerbExtractRatio(herb.id, r)}
                                    className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                                      herb.extractRatio === r ? 'bg-amber-500 text-slate-950' : 'bg-white/10 text-slate-400 hover:bg-white/20'
                                    }`}
                                  >
                                    {r}
                                  </button>
                                ))}
                              </div>
                            )}

                            {selectedForm === 'tea' && (
                              <div className="flex items-center gap-2">
                                <label className="text-xs text-slate-400">Parts:</label>
                                {[1, 2, 3, 4, 5].map((p) => (
                                  <button
                                    key={p}
                                    onClick={() => updateHerbAmount(herb.id, p)}
                                    className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                                      herb.amount === p ? 'bg-amber-500 text-slate-950' : 'bg-white/10 text-slate-400 hover:bg-white/20'
                                    }`}
                                  >
                                    {p}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {/* Total */}
                  <div className="mt-4 flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                    <span className="text-sm font-medium text-amber-300">Total</span>
                    <span className="text-lg font-bold text-amber-400">
                      {totalAmount} {getUnitLabel(selectedForm)}
                      {selectedForm === 'tea' && <span className="ml-1 text-xs font-normal text-amber-300/60">parts</span>}
                    </span>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ================================================================
            4. REAL-TIME SAFETY PANEL
        ================================================================ */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className={`rounded-xl ${glassClasses.dark} p-5`}>
            <h3 className="mb-4 text-lg font-semibold text-white">Safety Analysis</h3>
            {selectedHerbs.length === 0 ? (
              <p className="text-sm text-slate-500">Add herbs to your formulation to run real-time safety checks.</p>
            ) : interactions.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3">
                <CheckCircleIcon className="h-5 w-5 text-green-400" />
                <span className="text-sm text-green-300">No interactions or contraindications detected. Formulation appears safe.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {interactions.map((warning, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.08 }}
                    className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
                      warning.severity === 'contraindicated'
                        ? 'border-red-500/30 bg-red-500/10'
                        : warning.severity === 'caution'
                        ? 'border-amber-500/30 bg-amber-500/10'
                        : 'border-green-500/30 bg-green-500/10'
                    }`}
                  >
                    {warning.severity === 'contraindicated' && <WarningIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />}
                    {warning.severity === 'caution' && <WarningIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />}
                    {warning.severity === 'safe' && <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-green-400" />}
                    <div>
                      <p className={`text-sm font-medium ${
                        warning.severity === 'contraindicated' ? 'text-red-300' : warning.severity === 'caution' ? 'text-amber-300' : 'text-green-300'
                      }`}>
                        {warning.herbs.join(' + ')} &mdash;{' '}
                        {warning.severity === 'contraindicated' ? 'CONTRAINDICATED' : warning.severity === 'caution' ? 'CAUTION' : 'SAFE'}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">{warning.message}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* ================================================================
            5. LABEL GENERATOR (collapsible)
        ================================================================ */}
        <motion.div variants={itemVariants} className="mb-8">
          <button
            onClick={() => setShowLabel(!showLabel)}
            className={`w-full flex items-center justify-between rounded-xl ${glassClasses.dark} p-5 transition-colors hover:border-amber-500/30`}
          >
            <h3 className="text-lg font-semibold text-white">Label Generator</h3>
            <motion.div animate={{ rotate: showLabel ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDownIcon className="h-5 w-5 text-slate-400" />
            </motion.div>
          </button>

          <AnimatePresence>
            {showLabel && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className={`mt-2 rounded-xl ${glassClasses.dark} p-5`}>
                  {/* Label Preview */}
                  <div className="rounded-lg border border-white/20 bg-white/[0.02] p-6">
                    <div className="border-b border-white/10 pb-4 mb-4">
                      <h4 className="text-xl font-bold text-amber-400">{formulationName || 'Untitled Formulation'}</h4>
                      <p className="text-xs text-slate-500 mt-1">Batch: {batchNumber}</p>
                    </div>

                    <div className="mb-4">
                      <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Ingredients</h5>
                      {selectedHerbs.length === 0 ? (
                        <p className="text-sm text-slate-600 italic">No ingredients added.</p>
                      ) : (
                        <ul className="space-y-1">
                          {selectedHerbs.map((h) => (
                            <li key={h.id} className="text-sm text-slate-300">
                              {h.commonName} ({h.scientificName}) &mdash; {h.amount}{getUnitLabel(selectedForm)}
                              {selectedForm === 'tincture' && ` (${h.extractRatio})`}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="mb-4">
                      <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Dosage Instructions</h5>
                      <p className="text-sm text-slate-300">{getDosageInstructions(selectedForm)}</p>
                    </div>

                    <div className="mb-4">
                      <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Warnings</h5>
                      {interactions.length > 0 ? (
                        <ul className="space-y-1">
                          {interactions.map((w, i) => (
                            <li key={i} className="text-sm text-red-400">{w.message}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-slate-300">No known contraindications.</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Storage</h5>
                        <p className="text-slate-300">{getShelfLife(selectedForm).storage}</p>
                      </div>
                      <div>
                        <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Expiration</h5>
                        <p className="text-slate-300">{getExpirationDate(selectedForm)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Label actions */}
                  <div className="mt-4 flex gap-3">
                    <Button variant="outline" size="sm" className="!border-amber-500/50 !text-amber-400 hover:!bg-amber-500/10" onClick={() => window.print?.()}>
                      <PrinterIcon className="mr-2 h-4 w-4" />
                      Print Label
                    </Button>
                    <Button variant="ghost" size="sm" className="!text-slate-400 hover:!text-white" onClick={handleCopyLabel}>
                      <ClipboardIcon className="mr-2 h-4 w-4" />
                      Copy to Clipboard
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ================================================================
            6. COST ESTIMATION PANEL
        ================================================================ */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className={`rounded-xl ${glassClasses.dark} p-5`}>
            <h3 className="mb-4 text-lg font-semibold text-white">Cost Estimation</h3>

            {selectedHerbs.length === 0 ? (
              <p className="text-sm text-slate-500">Add herbs to calculate costs.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-slate-500">
                        <th className="pb-2 pr-4">Herb</th>
                        <th className="pb-2 pr-4">Amount</th>
                        <th className="pb-2 pr-4">Cost/g</th>
                        <th className="pb-2 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {costData.lines.map((line, idx) => (
                        <tr key={idx} className="border-b border-white/5">
                          <td className="py-2 pr-4 text-slate-300">{line.name}</td>
                          <td className="py-2 pr-4 text-slate-400">{line.amount} {line.unit}</td>
                          <td className="py-2 pr-4 text-slate-400">${line.costPerUnit.toFixed(2)}</td>
                          <td className="py-2 text-right text-slate-300">${line.lineTotal.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Subtotal</span>
                    <span className="text-slate-300">${costData.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Overhead (15%)</span>
                    <span className="text-slate-300">${costData.overhead.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/10 pt-2 font-semibold">
                    <span className="text-white">Total Cost</span>
                    <span className="text-amber-400">${costData.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Suggested Retail (2.5x)</span>
                    <span className="text-amber-300 font-medium">${costData.retail.toFixed(2)}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                    <Badge variant="warning">CAQ Ref</Badge>
                    <span className="text-xs text-amber-300/80">Patient budget from CAQ Section 8: $150/month</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>

        {/* ================================================================
            7. SHELF LIFE CALCULATOR
        ================================================================ */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className={`rounded-xl ${glassClasses.dark} p-5`}>
            <h3 className="mb-4 text-lg font-semibold text-white">Shelf Life Calculator</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Preparation Form</p>
                <p className="text-sm font-medium text-white capitalize">{selectedForm}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Shelf Life</p>
                <p className="text-sm font-medium text-amber-400">{getShelfLife(selectedForm).label}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Expiration Date</p>
                <p className="text-sm font-medium text-white">{getExpirationDate(selectedForm)}</p>
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Storage Requirements</p>
              <p className="text-sm text-slate-300">{getShelfLife(selectedForm).storage}</p>
            </div>
          </div>
        </motion.div>

        {/* ================================================================
            8. DISPENSING & REFILL TRACKING
        ================================================================ */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className={`rounded-xl ${glassClasses.dark} p-5`}>
            <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-semibold text-white">Dispensing &amp; Refill Tracking</h3>
              <div className="flex items-center gap-3">
                <select
                  value={selectedPatient}
                  onChange={(e) => setSelectedPatient(e.target.value)}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                >
                  <option value="" className="bg-slate-900">Select Patient</option>
                  {MOCK_PATIENTS.map((p) => (
                    <option key={p.id} value={p.id} className="bg-slate-900">{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dispensing history table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2 pr-4">Patient</th>
                    <th className="pb-2 pr-4">Formulation</th>
                    <th className="pb-2 pr-4">Amount</th>
                    <th className="pb-2 text-right">Refills</th>
                  </tr>
                </thead>
                <tbody>
                  {dispensingHistory.map((record) => (
                    <tr key={record.id} className="border-b border-white/5">
                      <td className="py-2.5 pr-4 text-slate-400">{record.date}</td>
                      <td className="py-2.5 pr-4 text-slate-300">{record.patient}</td>
                      <td className="py-2.5 pr-4 text-white">{record.formulation}</td>
                      <td className="py-2.5 pr-4 text-slate-400">{record.amount}</td>
                      <td className="py-2.5 text-right">
                        <Badge variant={record.refills > 0 ? 'success' : 'default'}>{record.refills} remaining</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Schedule refill */}
            <div className="mt-5 flex flex-col gap-4 rounded-lg border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-slate-400">Schedule Refill Date</label>
                <input
                  type="date"
                  value={refillDate}
                  onChange={(e) => setRefillDate(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-400">
                  <input
                    type="checkbox"
                    checked={refillReminder}
                    onChange={(e) => setRefillReminder(e.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-white/5 accent-amber-500"
                  />
                  Reminder
                </label>
                <Button variant="primary" size="sm" className="!bg-amber-500 hover:!bg-amber-600 !text-slate-950 font-semibold">
                  Schedule Refill
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ================================================================
            9. ASSIGN TO PATIENT
        ================================================================ */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className={`rounded-xl ${glassClasses.dark} p-5`}>
            <h3 className="mb-4 text-lg font-semibold text-white">Assign to Patient</h3>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {/* Patient */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Patient</label>
                <select
                  value={assignPatient}
                  onChange={(e) => setAssignPatient(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                >
                  <option value="" className="bg-slate-900">Select Patient</option>
                  {MOCK_PATIENTS.map((p) => (
                    <option key={p.id} value={p.id} className="bg-slate-900">{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Dosage Schedule */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Dosage Schedule</label>
                <div className="flex flex-wrap gap-3 pt-1">
                  {(['morning', 'afternoon', 'evening'] as const).map((time) => (
                    <label key={time} className="flex items-center gap-1.5 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={assignSchedule[time]}
                        onChange={(e) => setAssignSchedule((prev) => ({ ...prev, [time]: e.target.checked }))}
                        className="h-4 w-4 rounded border-white/20 bg-white/5 accent-amber-500"
                      />
                      <span className="capitalize">{time}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Duration</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {[2, 4, 8, 12].map((weeks) => (
                    <button
                      key={weeks}
                      onClick={() => setAssignDuration(weeks)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        assignDuration === weeks ? 'bg-amber-500 text-slate-950' : 'bg-white/10 text-slate-400 hover:bg-white/20'
                      }`}
                    >
                      {weeks}w
                    </button>
                  ))}
                </div>
              </div>

              {/* Assign button */}
              <div className="flex items-end">
                <Button
                  variant="primary"
                  size="md"
                  className="w-full !bg-amber-500 hover:!bg-amber-600 !text-slate-950 font-semibold"
                  onClick={handleAssignFormulation}
                  disabled={!assignPatient || selectedHerbs.length === 0}
                >
                  Assign Formulation
                </Button>
              </div>
            </div>

            {/* Confirmation */}
            <AnimatePresence>
              {showAssignConfirm && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mt-4 flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3"
                >
                  <CheckCircleIcon className="h-5 w-5 text-green-400" />
                  <span className="text-sm text-green-300">
                    Formulation assigned to {MOCK_PATIENTS.find((p) => p.id === assignPatient)?.name ?? 'patient'} for {assignDuration} weeks.
                    Schedule: {Object.entries(assignSchedule).filter(([, v]) => v).map(([k]) => k).join(', ')}.
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
