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
  variant: 'gold' | 'silver';
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
              p.variant === 'gold'
                ? 'bg-gradient-to-b from-amber-950/30 to-slate-950/60'
                : 'bg-gradient-to-b from-slate-400/20 to-slate-950/60'
            }`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.image}
                alt={p.name}
                className="h-44 w-auto object-contain drop-shadow-2xl"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.parentElement!.innerHTML = `<div class="flex flex-col items-center gap-2"><span class="material-symbols-outlined text-[48px] ${p.variant === 'gold' ? 'text-amber-500/40' : 'text-slate-400/40'}">medication</span><span class="text-xs ${p.variant === 'gold' ? 'text-amber-500/50' : 'text-slate-400/50'} font-[Syne]">FARMCEUTICA</span></div>`;
                }}
              />
              {/* Certification badges overlay */}
              <div className="absolute bottom-2 left-3 flex items-center gap-1.5">
                <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded border ${
                  p.variant === 'gold'
                    ? 'text-amber-400/70 border-amber-500/20 bg-amber-500/10'
                    : 'text-slate-400/70 border-slate-400/20 bg-slate-400/10'
                }`}>100% Organic</span>
                <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded border ${
                  p.variant === 'gold'
                    ? 'text-amber-400/70 border-amber-500/20 bg-amber-500/10'
                    : 'text-slate-400/70 border-slate-400/20 bg-slate-400/10'
                }`}>GMP</span>
                <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded border ${
                  p.variant === 'gold'
                    ? 'text-amber-400/70 border-amber-500/20 bg-amber-500/10'
                    : 'text-slate-400/70 border-slate-400/20 bg-slate-400/10'
                }`}>Lab Tested</span>
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
