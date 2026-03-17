'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

/* -------------------------------------------------------------------------- */
/*  Data                                                                      */
/* -------------------------------------------------------------------------- */

const tabs = ['My Protocol ★', 'All Products', 'By Goal', 'By Gene', 'Subscriptions'] as const;

interface Product {
  id: number;
  name: string;
  subtitle: string;
  capsules: string;
  dosage: string;
  price: string;
  originalPrice?: string;
  rationale: string;
  rating: number;
  reviews: number;
  geneticMatch: boolean;
  subscription: boolean;
  image: string;
  variant: 'gold' | 'silver' | 'red' | 'green' | 'pink' | 'navy' | 'pouch';
  brand?: string;
}

const products: Product[] = [
  {
    id: 1,
    name: 'ACAT Support +',
    subtitle: 'Optimal Mitochondrial Function and Metabolic Health',
    capsules: '60 Capsules',
    dosage: '888 mg',
    price: '$89.88/mo',
    originalPrice: '$112.35',
    rationale: 'Matched to your ACAT SNP status',
    rating: 4.8,
    reviews: 127,
    geneticMatch: true,
    subscription: true,
    image: '/products/acat-support.png',
    variant: 'gold',
  },
  {
    id: 2,
    name: 'ACHY Support +',
    subtitle: 'Precision Support for Optimal Methylation and Genetic Wellness',
    capsules: '60 Capsules',
    dosage: '825 mg',
    price: '$79.88/mo',
    originalPrice: '$99.85',
    rationale: 'Matched to your ACHY SNP status',
    rating: 4.7,
    reviews: 89,
    geneticMatch: true,
    subscription: true,
    image: '/products/achy-support.png',
    variant: 'gold',
  },
  {
    id: 3,
    name: 'ADO Support +',
    subtitle: 'Precision Support for Optimal Methylation and Neurological Health',
    capsules: '60 Capsules',
    dosage: '550 mg',
    price: '$69.99/mo',
    rationale: 'Matched to your ADO SNP status',
    rating: 4.9,
    reviews: 203,
    geneticMatch: true,
    subscription: false,
    image: '/products/ado-support.png',
    variant: 'gold',
  },
  {
    id: 4,
    name: 'Balance +',
    subtitle: 'Gut Health | Leaky Gut Repair | Immune',
    capsules: '60 Capsules',
    dosage: '330 mg',
    price: '$59.99/mo',
    rationale: 'Advanced gut health & immune support',
    rating: 4.6,
    reviews: 156,
    geneticMatch: false,
    subscription: false,
    image: '/products/balance.png',
    variant: 'silver',
  },
  {
    id: 5,
    name: 'BHMT Support +',
    subtitle: 'Precision Support for Optimal Methylation and Genetic Wellness',
    capsules: '60 Capsules',
    dosage: '1120 mg',
    price: '$84.99/mo',
    originalPrice: '$106.24',
    rationale: 'Matched to your BHMT SNP status',
    rating: 4.8,
    reviews: 92,
    geneticMatch: true,
    subscription: true,
    image: '/products/bhmt-support.png',
    variant: 'gold',
  },
  {
    id: 6,
    name: 'Blast +',
    subtitle: 'Nitric Oxide Support for Peak Performance',
    capsules: '60 Capsules',
    dosage: '625 mg',
    price: '$74.99/mo',
    rationale: 'Enhanced Blood Flow | Clean Energy | Rapid Recovery',
    rating: 4.9,
    reviews: 214,
    geneticMatch: false,
    subscription: false,
    image: '/products/blast.png',
    variant: 'red',
  },
  {
    id: 7,
    name: 'Calm+ Adaptogen Complex',
    subtitle: 'Cellular Vitality | Recovery | Stress Resilience | Longevity',
    capsules: '60 Capsules',
    dosage: '325 mg',
    price: '$54.99/mo',
    rationale: 'Adaptogen-powered stress resilience',
    rating: 4.7,
    reviews: 178,
    geneticMatch: false,
    subscription: false,
    image: '/products/calm.png',
    variant: 'green',
  },
  {
    id: 8,
    name: 'Catalyst+',
    subtitle: 'Vitamin B and Magnesium Blend',
    capsules: '60 Capsules',
    dosage: '325 mg',
    price: '$49.99/mo',
    rationale: 'Cellular Vitality | Recovery | Stress Resilience | Longevity',
    rating: 4.8,
    reviews: 143,
    geneticMatch: false,
    subscription: false,
    image: '/products/catalyst.png',
    variant: 'green',
  },
  {
    id: 9,
    name: 'CBS Support +',
    subtitle: 'Precision Support for Optimal Methylation and Genetic Wellness',
    capsules: '60 Capsules',
    dosage: '975 mg',
    price: '$82.99/mo',
    originalPrice: '$103.74',
    rationale: 'Matched to your CBS SNP status',
    rating: 4.7,
    reviews: 108,
    geneticMatch: true,
    subscription: true,
    image: '/products/cbs-support.png',
    variant: 'gold',
  },
  {
    id: 10,
    name: 'Chaga',
    subtitle: 'Liposomal Bioavailable Delivery Technology',
    capsules: '60 Capsules',
    dosage: '500 mg',
    price: '$39.99/mo',
    rationale: 'Immune support & antioxidant defense',
    rating: 4.9,
    reviews: 267,
    geneticMatch: false,
    subscription: false,
    image: '/products/chaga.png',
    variant: 'pouch',
    brand: 'ViaCura',
  },
  {
    id: 11,
    name: 'Clean+',
    subtitle: 'Advanced Daily Cleanse | Liver | Gut Defense',
    capsules: '60 Capsules',
    dosage: '550 mg',
    price: '$64.99/mo',
    rationale: 'Cellular renewal for optimal health',
    rating: 4.7,
    reviews: 134,
    geneticMatch: false,
    subscription: false,
    image: '/products/clean.png',
    variant: 'red',
  },
  {
    id: 12,
    name: 'COMT Support +',
    subtitle: 'Calm, Clear, and Genetically Aligned',
    capsules: '60 Capsules',
    dosage: '980 mg',
    price: '$86.99/mo',
    originalPrice: '$108.74',
    rationale: 'Matched to your COMT SNP status',
    rating: 4.8,
    reviews: 189,
    geneticMatch: true,
    subscription: true,
    image: '/products/comt-support.png',
    variant: 'gold',
  },
  {
    id: 13,
    name: 'Cordycep',
    subtitle: 'Liposomal Bioavailable Delivery Technology',
    capsules: '60 Capsules',
    dosage: '500 mg',
    price: '$39.99/mo',
    rationale: 'Energy, endurance & respiratory support',
    rating: 4.9,
    reviews: 231,
    geneticMatch: false,
    subscription: false,
    image: '/products/cordycep.png',
    variant: 'pouch',
    brand: 'ViaCura',
  },
  {
    id: 14,
    name: 'Creatine HCL+',
    subtitle: 'Dual Delivery Performance Capsules',
    capsules: '60 Capsules',
    dosage: '1250 mg',
    price: '$44.99/mo',
    rationale: 'Explosive Strength | Endurance | Muscle Recovery',
    rating: 4.8,
    reviews: 312,
    geneticMatch: false,
    subscription: false,
    image: '/products/creatine-hcl.png',
    variant: 'green',
  },
  {
    id: 15,
    name: 'CycleSync+',
    subtitle: 'PMS Relief | Cycle Regulation | Estrogen',
    capsules: '60 Capsules',
    dosage: '1200 mg',
    price: '$59.99/mo',
    rationale: 'Hormonal balance & cycle support',
    rating: 4.6,
    reviews: 97,
    geneticMatch: false,
    subscription: false,
    image: '/products/cyclesync.png',
    variant: 'pink',
  },
  {
    id: 16,
    name: 'DAO Support +',
    subtitle: 'Precision Support for Optimal Detoxification and Genetic Wellness',
    capsules: '60 Capsules',
    dosage: '600 mg',
    price: '$79.99/mo',
    originalPrice: '$99.99',
    rationale: 'Matched to your DAO SNP status',
    rating: 4.8,
    reviews: 145,
    geneticMatch: true,
    subscription: true,
    image: '/products/dao-support.png',
    variant: 'gold',
  },
  {
    id: 17,
    name: 'Desire+',
    subtitle: 'Female Libido, Hormonal Balance & Vitality Liposomal Capsules',
    capsules: '60 Capsules',
    dosage: '215 mg',
    price: '$54.99/mo',
    rationale: 'Hormonal vitality & wellness support',
    rating: 4.7,
    reviews: 86,
    geneticMatch: false,
    subscription: false,
    image: '/products/desire.png',
    variant: 'pink',
  },
  {
    id: 18,
    name: 'DigestiZorb+ Enzyme Complex',
    subtitle: 'Advanced Bioavailable Nutraceuticals for Peak Wellness',
    capsules: '60 Capsules',
    dosage: '550 mg',
    price: '$49.99/mo',
    rationale: 'Digestive enzyme support & nutrient absorption',
    rating: 4.6,
    reviews: 203,
    geneticMatch: false,
    subscription: false,
    image: '/products/digestizorb.png',
    variant: 'red',
  },
  {
    id: 19,
    name: 'Flex+',
    subtitle: 'Inflammation Support',
    capsules: '60 Capsules',
    dosage: '1300 mg',
    price: '$59.99/mo',
    rationale: 'Recovery | Joint Mobility | Tissue Repair',
    rating: 4.8,
    reviews: 276,
    geneticMatch: false,
    subscription: false,
    image: '/products/flex.png',
    variant: 'green',
  },
  {
    id: 20,
    name: 'Focus +',
    subtitle: 'Advanced Nootropic Formula',
    capsules: '60 Capsules',
    dosage: '575 mg',
    price: '$64.99/mo',
    rationale: 'Cognitive Clarity | Clean Energy | Peak Mental Performance',
    rating: 4.9,
    reviews: 341,
    geneticMatch: false,
    subscription: false,
    image: '/products/focus.png',
    variant: 'navy',
  },
  {
    id: 21,
    name: 'Detox & Methylation Reset Kit +',
    subtitle: 'Epigenetic Wellness Protocol for Cellular Integrity & Genetic Optimization',
    capsules: '30 + 30 Capsules (AM/PM)',
    dosage: '765 mg / 1575 mg',
    price: '$124.99/mo',
    originalPrice: '$156.24',
    rationale: 'Liver Detox | Methylation Support | DNA Repair & Resilience',
    rating: 4.9,
    reviews: 187,
    geneticMatch: true,
    subscription: true,
    image: '/products/detox-methylation-kit.png',
    variant: 'gold',
  },
  {
    id: 22,
    name: 'Grow+',
    subtitle: 'Prenatal Methylated Liposomal Capsules',
    capsules: '60 Capsules',
    dosage: '225 mg',
    price: '$59.99/mo',
    rationale: 'Prenatal nutrition & methylation support',
    rating: 4.8,
    reviews: 142,
    geneticMatch: false,
    subscription: false,
    image: '/products/grow.png',
    variant: 'pink',
  },
  {
    id: 23,
    name: 'GST Support +',
    subtitle: 'Calm, Clear, and Genetically Aligned',
    capsules: '60 Capsules',
    dosage: '565 mg',
    price: '$79.99/mo',
    originalPrice: '$99.99',
    rationale: 'Matched to your GST SNP status',
    rating: 4.7,
    reviews: 113,
    geneticMatch: true,
    subscription: true,
    image: '/products/gst-support.png',
    variant: 'gold',
  },
  {
    id: 24,
    name: 'Histamine Relief Protocol +',
    subtitle: 'Breathe Easier React Less Live Fully',
    capsules: '60 Capsules',
    dosage: '1375 mg',
    price: '$89.99/mo',
    originalPrice: '$112.49',
    rationale: 'Advanced histamine management & immune balance',
    rating: 4.8,
    reviews: 198,
    geneticMatch: true,
    subscription: true,
    image: '/products/histamine-relief.png',
    variant: 'gold',
  },
  {
    id: 25,
    name: 'Iron+',
    subtitle: 'Targeted Support for Iron Deficiency',
    capsules: '60 Capsules',
    dosage: '850 mg',
    price: '$44.99/mo',
    rationale: 'Red Blood Cell Support | Brain Fog | Fatigue Recovery',
    rating: 4.7,
    reviews: 234,
    geneticMatch: false,
    subscription: false,
    image: '/products/iron.png',
    variant: 'red',
  },
  {
    id: 26,
    name: 'Lions Mane',
    subtitle: 'Liposomal Bioavailable Delivery Technology',
    capsules: '60 Capsules',
    dosage: '500 mg',
    price: '$39.99/mo',
    rationale: 'Cognitive support & nerve growth factor',
    rating: 4.9,
    reviews: 389,
    geneticMatch: false,
    subscription: false,
    image: '/products/lions-mane.png',
    variant: 'pouch',
    brand: 'ViaCura',
  },
  {
    id: 27,
    name: 'Magnesium Synergy Matrix',
    subtitle: 'Cellular Vitality | Recovery | Stress Resilience | Longevity',
    capsules: '60 Capsules',
    dosage: '325 mg',
    price: '$44.99/mo',
    rationale: 'Multi-form magnesium for total body support',
    rating: 4.8,
    reviews: 256,
    geneticMatch: false,
    subscription: false,
    image: '/products/magnesium-synergy.png',
    variant: 'green',
  },
  {
    id: 28,
    name: 'MAOA Support +',
    subtitle: 'Precision Support for Optimal Emotional and Cognitive Health',
    capsules: '60 Capsules',
    dosage: '525 mg',
    price: '$82.99/mo',
    originalPrice: '$103.74',
    rationale: 'Matched to your MAOA SNP status',
    rating: 4.8,
    reviews: 121,
    geneticMatch: true,
    subscription: true,
    image: '/products/maoa-support.png',
    variant: 'gold',
  },
  {
    id: 29,
    name: 'MenoBalance+',
    subtitle: 'Advanced Hormonal Support for Perimenopause & Menopause Transition',
    capsules: '60 Capsules',
    dosage: '1575 mg',
    price: '$69.99/mo',
    rationale: 'Hormonal balance during menopause transition',
    rating: 4.7,
    reviews: 164,
    geneticMatch: false,
    subscription: false,
    image: '/products/menobalance.png',
    variant: 'pink',
  },
  {
    id: 30,
    name: 'MethylB Complete+',
    subtitle: 'Vitamin B Complex',
    capsules: '60 Capsules',
    dosage: '325 mg',
    price: '$49.99/mo',
    rationale: 'Cellular Vitality | Recovery | Stress Resilience | Longevity',
    rating: 4.8,
    reviews: 287,
    geneticMatch: false,
    subscription: false,
    image: '/products/methylb-complete.png',
    variant: 'green',
  },
  {
    id: 31,
    name: 'MTHFR Support +',
    subtitle: 'Empower Your Genetics. Energize Your Life',
    capsules: '60 Capsules',
    dosage: '650 mg',
    price: '$84.99/mo',
    originalPrice: '$106.24',
    rationale: 'Matched to your MTHFR SNP status',
    rating: 4.9,
    reviews: 342,
    geneticMatch: true,
    subscription: true,
    image: '/products/mthfr-support.png',
    variant: 'gold',
  },
  {
    id: 32,
    name: 'MTRR Support +',
    subtitle: 'Your Blueprint for Energy, Clarity, and Genetic Resilience',
    capsules: '60 Capsules',
    dosage: '450 mg',
    price: '$79.99/mo',
    originalPrice: '$99.99',
    rationale: 'Matched to your MTRR SNP status',
    rating: 4.8,
    reviews: 118,
    geneticMatch: true,
    subscription: true,
    image: '/products/mtrr-support.png',
    variant: 'gold',
  },
  {
    id: 33,
    name: 'NAT Support +',
    subtitle: 'Precision Support for Optimal Detoxification and Cellular Health',
    capsules: '60 Capsules',
    dosage: '925 mg',
    price: '$82.99/mo',
    originalPrice: '$103.74',
    rationale: 'Matched to your NAT SNP status',
    rating: 4.7,
    reviews: 97,
    geneticMatch: true,
    subscription: true,
    image: '/products/nat-support.png',
    variant: 'gold',
  },
  {
    id: 34,
    name: 'NeuroAxis+',
    subtitle: 'CNS-Targeted Nutraceutical Formulation',
    capsules: '60 Capsules',
    dosage: '700 mg',
    price: '$69.99/mo',
    rationale: 'Cognition | Mood | Neuroprotection',
    rating: 4.9,
    reviews: 267,
    geneticMatch: false,
    subscription: false,
    image: '/products/neuroaxis.png',
    variant: 'navy',
  },
  {
    id: 35,
    name: 'NeuroCalm BH4 Complex',
    subtitle: 'Cellular Vitality | Recovery | Stress Resilience | Longevity',
    capsules: '60 Capsules',
    dosage: '325 mg',
    price: '$54.99/mo',
    rationale: 'BH4 pathway support for calm & clarity',
    rating: 4.8,
    reviews: 178,
    geneticMatch: false,
    subscription: false,
    image: '/products/neurocalm-bh4.png',
    variant: 'green',
  },
];

/* -------------------------------------------------------------------------- */
/*  Animations                                                                */
/* -------------------------------------------------------------------------- */

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

/* -------------------------------------------------------------------------- */
/*  Star Rating                                                               */
/* -------------------------------------------------------------------------- */

function StarRating({ rating, reviews }: { rating: number; reviews: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`material-symbols-outlined text-[16px] ${
              star <= Math.floor(rating)
                ? 'text-amber-400'
                : star - 0.5 <= rating
                ? 'text-amber-400/50'
                : 'text-slate-600'
            }`}
          >
            star
          </span>
        ))}
      </div>
      <span className="text-xs text-slate-400">{rating}</span>
      <span className="text-xs text-slate-500">({reviews})</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export default function ShopPage() {
  const [activeTab, setActiveTab] = useState<string>('All Products');

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6 pb-28">
      {/* ---- Header ---- */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center gap-3">
          <h1 className="text-[28px] font-[Syne] font-bold text-white">Farmceutica</h1>
          <span className="text-xs text-amber-400/70 font-medium tracking-wider uppercase mt-1">Plant Based Science</span>
        </div>
        <p className="mt-1 text-slate-400">Advanced bioavailable nutraceuticals for genetic SNP support</p>
      </motion.div>

      {/* ---- Filter Tabs ---- */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap gap-2"
      >
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
              activeTab === tab
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                : 'bg-white/5 text-slate-400 border-white/10 hover:text-slate-200 hover:bg-white/10'
            }`}
          >
            {tab}
          </button>
        ))}
      </motion.div>

      {/* ---- Product Grid ---- */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
      >
        {products.map((p) => (
          <motion.div
            key={p.id}
            variants={cardVariants}
            className="rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 overflow-hidden flex flex-col hover:border-violet-500/30 transition-colors"
          >
            {/* Product Image */}
            <div className={`relative h-52 flex items-center justify-center ${
              {
                gold:   'bg-gradient-to-b from-amber-950/30 to-slate-950/60',
                silver: 'bg-gradient-to-b from-slate-400/20 to-slate-950/60',
                red:    'bg-gradient-to-b from-rose-950/30 to-slate-950/60',
                green:  'bg-gradient-to-b from-emerald-950/30 to-slate-950/60',
                pink:   'bg-gradient-to-b from-pink-950/30 to-slate-950/60',
                navy:   'bg-gradient-to-b from-blue-950/40 to-slate-950/60',
                pouch:  'bg-gradient-to-b from-slate-200/15 to-slate-950/60',
              }[p.variant]
            }`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.image}
                alt={p.name}
                className={`${p.variant === 'pouch' ? 'h-48 w-auto' : 'h-44 w-auto'} object-contain drop-shadow-2xl`}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const iconColor = { gold: 'text-amber-500/40', silver: 'text-slate-400/40', red: 'text-rose-400/40', green: 'text-emerald-500/40', pink: 'text-pink-400/40', navy: 'text-blue-400/40', pouch: 'text-slate-400/40' }[p.variant];
                  const labelColor = { gold: 'text-amber-500/50', silver: 'text-slate-400/50', red: 'text-rose-400/50', green: 'text-emerald-500/50', pink: 'text-pink-400/50', navy: 'text-blue-400/50', pouch: 'text-slate-400/50' }[p.variant];
                  target.parentElement!.innerHTML = `<div class="flex flex-col items-center gap-2"><span class="material-symbols-outlined text-[48px] ${iconColor}">medication</span><span class="text-xs ${labelColor} font-[Syne]">${p.brand || 'FARMCEUTICA'}</span></div>`;
                }}
              />
              {/* Certification badges overlay */}
              <div className="absolute bottom-2 left-3 flex items-center gap-1.5">
                {(() => {
                  const badgeClass = {
                    gold:   'text-amber-400/70 border-amber-500/20 bg-amber-500/10',
                    silver: 'text-slate-400/70 border-slate-400/20 bg-slate-400/10',
                    red:    'text-rose-400/70 border-rose-500/20 bg-rose-500/10',
                    green:  'text-emerald-400/70 border-emerald-500/20 bg-emerald-500/10',
                    pink:   'text-pink-400/70 border-pink-500/20 bg-pink-500/10',
                    navy:   'text-blue-400/70 border-blue-500/20 bg-blue-500/10',
                    pouch:  'text-slate-400/70 border-slate-400/20 bg-slate-400/10',
                  }[p.variant];
                  return ['100% Organic', 'GMP', p.variant === 'pouch' ? 'ISO 9001' : 'Lab Tested'].map((label) => (
                    <span key={label} className={`text-[8px] font-medium px-1.5 py-0.5 rounded border ${badgeClass}`}>{label}</span>
                  ));
                })()}
              </div>
            </div>

            <div className="p-5 flex flex-col gap-3 flex-1">
              {/* Top badges */}
              <div className="flex items-center gap-2 flex-wrap">
                {p.geneticMatch && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/20">
                    <span className="material-symbols-outlined text-[12px]">genetics</span>
                    Genetic Match
                  </span>
                )}
                {p.subscription && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                    Subscribe &amp; Save 20%
                  </span>
                )}
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 ml-auto">
                  HSA/FSA Eligible
                </span>
              </div>

              {/* Product name */}
              <div>
                {p.brand && (
                  <span className="text-[10px] font-medium tracking-wider uppercase text-slate-500">{p.brand}</span>
                )}
                <h3 className="text-base font-bold text-white leading-tight">{p.name}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">{p.subtitle}</p>
              </div>

              {/* Dosage info */}
              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">capsule</span>
                  {p.capsules}
                </span>
                <span className="text-slate-600">·</span>
                <span>{p.dosage}</span>
                <span className="text-slate-600">·</span>
                <span className="text-amber-400/70">Dual Delivery</span>
              </div>

              {/* Rationale */}
              <p className="text-xs text-slate-400">{p.rationale}</p>

              {/* Rating */}
              <StarRating rating={p.rating} reviews={p.reviews} />

              {/* Price */}
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-white font-mono">{p.price}</span>
                {p.originalPrice && (
                  <span className="text-sm text-slate-500 line-through">{p.originalPrice}</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-auto pt-2">
                <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-white/20 text-slate-300 hover:bg-white/5 transition-colors">
                  Add to Cart
                </button>
                <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-cyan-600 text-white hover:from-violet-500 hover:to-cyan-500 shadow-lg shadow-violet-500/20 transition-all">
                  Subscribe
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ---- Cart Slide-up Bar ---- */}
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="fixed bottom-0 left-0 right-0 z-50"
      >
        <div className="backdrop-blur-xl bg-slate-950/90 border-t border-white/10">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-cyan-400">shopping_cart</span>
              <span className="text-sm text-slate-300">
                <span className="font-semibold text-white">3 items</span> in cart ·{' '}
                <span className="font-mono font-semibold text-white">$247.64/month</span>
              </span>
            </div>
            <button className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-cyan-600 text-white hover:from-violet-500 hover:to-cyan-500 shadow-lg shadow-violet-500/25 transition-all flex items-center gap-2">
              View Cart &amp; Checkout
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
