'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ------------------------------------------------------------------ */
/*  Types & Data                                                       */
/* ------------------------------------------------------------------ */

interface Product {
  id: number;
  name: string;
  price: number;
  subPrice: number;
  match: number;
  inProtocol: boolean;
  goal: string;
  gene: string;
  description: string;
}

interface CartItem {
  product: Product;
  quantity: number;
  subscribe: boolean;
}

const products: Product[] = [
  { id: 1, name: 'Methylated B-Complex', price: 34.99, subPrice: 27.99, match: 95, inProtocol: true, goal: 'Methylation', gene: 'MTHFR', description: 'Active methylfolate and methylcobalamin for optimal methylation support.' },
  { id: 2, name: 'Vitamin D3+K2 5000IU', price: 24.99, subPrice: 19.99, match: 88, inProtocol: true, goal: 'Bone Health', gene: 'VDR', description: 'High-potency D3 with K2 MK-7 for calcium metabolism and bone density.' },
  { id: 3, name: 'Omega-3 DHA Ultra', price: 42.99, subPrice: 34.39, match: 72, inProtocol: true, goal: 'Cardiovascular', gene: 'APOE', description: 'Triglyceride-form DHA for cardiovascular and cognitive support.' },
  { id: 4, name: 'Magnesium Glycinate', price: 28.99, subPrice: 23.19, match: 91, inProtocol: true, goal: 'Relaxation', gene: 'COMT', description: 'Highly bioavailable chelated magnesium for relaxation and sleep.' },
  { id: 5, name: 'CoQ10 Ubiquinol 200mg', price: 54.99, subPrice: 43.99, match: 85, inProtocol: true, goal: 'Energy', gene: 'NQO1', description: 'Active ubiquinol form for mitochondrial energy production.' },
  { id: 6, name: 'Ashwagandha KSM-66', price: 32.99, subPrice: 26.39, match: 68, inProtocol: false, goal: 'Stress', gene: 'HPA', description: 'Full-spectrum root extract for cortisol management and resilience.' },
  { id: 7, name: 'Zinc Picolinate 30mg', price: 18.99, subPrice: 15.19, match: 79, inProtocol: true, goal: 'Immune', gene: 'SLC30A', description: 'Highly absorbable zinc picolinate for immune and enzymatic function.' },
  { id: 8, name: 'NAC 600mg', price: 22.99, subPrice: 18.39, match: 82, inProtocol: false, goal: 'Detox', gene: 'GST', description: 'N-Acetyl Cysteine for glutathione synthesis and detoxification.' },
];

const tabs = ['My Protocol', 'All Products', 'By Goal', 'By Gene', 'Subscriptions'] as const;
type Tab = (typeof tabs)[number];

const allGoals = [...new Set(products.map((p) => p.goal))];
const allGenes = [...new Set(products.map((p) => p.gene))];

/* ------------------------------------------------------------------ */
/*  Animations                                                         */
/* ------------------------------------------------------------------ */

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ShopPage() {
  const [activeTab, setActiveTab] = useState<Tab>('All Products');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [goalFilter, setGoalFilter] = useState<string | null>(null);
  const [geneFilter, setGeneFilter] = useState<string | null>(null);

  /* ---- Filtering ---- */
  const filtered = products.filter((p) => {
    if (activeTab === 'My Protocol') return p.inProtocol;
    if (activeTab === 'By Goal') return goalFilter ? p.goal === goalFilter : true;
    if (activeTab === 'By Gene') return geneFilter ? p.gene === geneFilter : true;
    if (activeTab === 'Subscriptions') return cart.some((c) => c.product.id === p.id && c.subscribe);
    return true;
  });

  /* ---- Cart helpers ---- */
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id);
      if (existing) return prev.map((c) => (c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c));
      return [...prev, { product, quantity: 1, subscribe: false }];
    });
  };

  const updateQty = (id: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.product.id === id ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c))
        .filter((c) => c.quantity > 0),
    );
  };

  const toggleSubscription = (id: number) => {
    setCart((prev) => prev.map((c) => (c.product.id === id ? { ...c, subscribe: !c.subscribe } : c)));
  };

  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);
  const subtotal = cart.reduce((sum, c) => sum + c.product.price * c.quantity, 0);
  const discount = cart.reduce((sum, c) => (c.subscribe ? (c.product.price - c.product.subPrice) * c.quantity : 0) + sum, 0);
  const total = subtotal - discount;

  /* ---- Match badge color ---- */
  const matchBadge = (match: number) => {
    if (match >= 80) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20';
    if (match >= 60) return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20';
    return 'bg-slate-500/15 text-slate-400 border-slate-500/20';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-24">
      {/* ---- Header ---- */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-3xl font-bold text-white">Supplement Shop</h1>
        <p className="mt-1 text-slate-400">Clinical-grade supplements matched to your genome</p>
      </motion.div>

      {/* ---- Tabs ---- */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setGoalFilter(null);
              setGeneFilter(null);
            }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
              activeTab === tab
                ? 'bg-violet-500/15 text-violet-300 border-violet-500/20'
                : 'bg-white/5 text-slate-400 border-white/10 hover:text-slate-200 hover:bg-white/10'
            }`}
          >
            {tab}
          </button>
        ))}
      </motion.div>

      {/* ---- Sub-filters ---- */}
      {activeTab === 'By Goal' && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex flex-wrap gap-2">
          {allGoals.map((g) => (
            <button
              key={g}
              onClick={() => setGoalFilter(goalFilter === g ? null : g)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                goalFilter === g ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/20' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
              }`}
            >
              {g}
            </button>
          ))}
        </motion.div>
      )}

      {activeTab === 'By Gene' && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex flex-wrap gap-2">
          {allGenes.map((g) => (
            <button
              key={g}
              onClick={() => setGeneFilter(geneFilter === g ? null : g)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                geneFilter === g ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/20' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
              }`}
            >
              {g}
            </button>
          ))}
        </motion.div>
      )}

      {/* ---- Product Grid ---- */}
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((p) => {
          const inCart = cart.some((c) => c.product.id === p.id);
          return (
            <motion.div
              key={p.id}
              variants={cardVariants}
              className="rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 shadow-xl overflow-hidden flex flex-col hover:border-violet-500/30 transition-colors"
            >
              {/* Image placeholder */}
              <div className="h-40 bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center">
                <svg className="w-12 h-12 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5m-4.75-11.396c.251.023.501.05.75.082M5 14.5l-1.456 1.456a2.25 2.25 0 00-.659 1.591v1.203a2.25 2.25 0 002.25 2.25h1.615m-3.206-5.5h7.711M19 14.5l1.456 1.456a2.25 2.25 0 01.659 1.591v1.203a2.25 2.25 0 01-2.25 2.25h-1.615m3.206-5.5h-7.711m-6.922 5.5h14.172" />
                </svg>
              </div>

              <div className="p-5 flex flex-col flex-1 gap-3">
                {/* Name & brand */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-semibold text-white leading-tight">{p.name}</h3>
                    {p.inProtocol && (
                      <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/20">
                        In Your Protocol
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">FarmCeutica</p>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-400 leading-relaxed">{p.description}</p>

                {/* Price */}
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-white">${p.price.toFixed(2)}/mo</span>
                  <span className="text-xs text-emerald-400 line-through-none">Subscribe &amp; Save 20%</span>
                </div>

                {/* Genetic match */}
                <span className={`self-start inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${matchBadge(p.match)}`}>
                  {p.match}% Genetic Match
                </span>

                {/* Add to cart */}
                <button
                  onClick={() => addToCart(p)}
                  className={`mt-auto w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    inCart
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/20'
                      : 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white hover:from-cyan-500 hover:to-cyan-400 shadow-lg shadow-cyan-500/20'
                  }`}
                >
                  {inCart ? 'Add Another' : 'Add to Cart'}
                </button>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ---- Fixed Cart Bar ---- */}
      {cartCount > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-0 left-0 right-0 z-50"
        >
          <div className="backdrop-blur-xl bg-slate-950/80 border-t border-white/10">
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
              <span className="text-sm text-slate-300">
                <span className="font-semibold text-white">{cartCount} item{cartCount !== 1 ? 's' : ''}</span> &mdash; ${subtotal.toFixed(2)}
              </span>
              <button
                onClick={() => setCartOpen(true)}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-500 hover:to-violet-400 shadow-lg shadow-violet-500/25 transition-all"
              >
                View Cart
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ---- Cart Slide-up Panel ---- */}
      <AnimatePresence>
        {cartOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setCartOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-3xl backdrop-blur-xl bg-slate-950/95 border-t border-x border-white/10 shadow-2xl"
            >
              <div className="max-w-2xl mx-auto p-6 space-y-5">
                {/* Handle */}
                <div className="flex justify-center">
                  <div className="w-12 h-1.5 rounded-full bg-white/20" />
                </div>

                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">Your Cart</h2>
                  <button onClick={() => setCartOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Items */}
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 p-4 flex items-center gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-white truncate">{item.product.name}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          ${item.subscribe ? item.product.subPrice.toFixed(2) : item.product.price.toFixed(2)} each
                        </p>
                      </div>

                      {/* Subscribe toggle */}
                      <button
                        onClick={() => toggleSubscription(item.product.id)}
                        className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${
                          item.subscribe
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                            : 'bg-white/5 text-slate-500 border-white/10 hover:text-slate-300'
                        }`}
                      >
                        {item.subscribe ? 'Subscribed' : 'Subscribe'}
                      </button>

                      {/* Qty controls */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQty(item.product.id, -1)}
                          className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors text-sm"
                        >
                          -
                        </button>
                        <span className="text-sm font-semibold text-white w-5 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQty(item.product.id, 1)}
                          className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors text-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="space-y-2 pt-3 border-t border-white/10">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Subtotal</span>
                    <span className="text-white">${subtotal.toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-400">Subscription Discount</span>
                      <span className="text-emerald-400">-${discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold pt-2 border-t border-white/10">
                    <span className="text-white">Total</span>
                    <span className="text-white">${total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Checkout */}
                <button className="w-full py-3.5 rounded-xl text-sm font-bold bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-500 hover:to-violet-400 shadow-lg shadow-violet-500/25 transition-all">
                  Checkout with Stripe
                </button>

                {/* Payment badges */}
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  {['Stripe', 'Apple Pay', 'Google Pay', 'Truemed HSA/FSA'].map((badge) => (
                    <span
                      key={badge}
                      className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-slate-400 border border-white/10"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
