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
  price: string;
  originalPrice?: string;
  rationale: string;
  rating: number;
  reviews: number;
  geneticMatch: boolean;
  subscription: boolean;
}

const products: Product[] = [
  {
    id: 1,
    name: 'MTHFR+ Methylation Support',
    price: '$89.88/mo',
    originalPrice: '$112.35',
    rationale: 'Matched to your MTHFR status',
    rating: 4.8,
    reviews: 127,
    geneticMatch: true,
    subscription: true,
  },
  {
    id: 2,
    name: 'COMT+ Catechol Balance',
    price: '$79.88/mo',
    originalPrice: '$99.85',
    rationale: 'Matched to your COMT status',
    rating: 4.7,
    reviews: 89,
    geneticMatch: true,
    subscription: true,
  },
  {
    id: 3,
    name: 'NAD+ Complex',
    price: '$69.99/mo',
    rationale: 'Cellular energy support',
    rating: 4.9,
    reviews: 203,
    geneticMatch: false,
    subscription: false,
  },
  {
    id: 4,
    name: 'RELAX+ Evening Formula',
    price: '$59.99/mo',
    rationale: 'Matched to your MAOA status',
    rating: 4.6,
    reviews: 156,
    geneticMatch: true,
    subscription: false,
  },
  {
    id: 5,
    name: 'FOCUS+ Cognitive Support',
    price: '$49.99/mo',
    rationale: 'Matched to DRD2/BDNF',
    rating: 4.8,
    reviews: 92,
    geneticMatch: true,
    subscription: false,
  },
  {
    id: 6,
    name: 'Vitamin D3 + K2',
    price: '$29.99/mo',
    rationale: 'Matched to your VDR status',
    rating: 4.9,
    reviews: 341,
    geneticMatch: true,
    subscription: false,
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
        <h1 className="text-[28px] font-[Syne] font-bold text-white">Supplement Shop</h1>
        <p className="mt-1 text-slate-400">Clinical-grade supplements matched to your genome</p>
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
            className="rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 p-5 flex flex-col gap-3 hover:border-violet-500/30 transition-colors"
          >
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
            <h3 className="text-base font-bold text-white leading-tight">{p.name}</h3>

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
