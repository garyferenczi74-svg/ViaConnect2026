'use client';

// QuickActionsGrid — 6 navigation cards on the dashboard.
// Routes corrected to match the actual codebase: peptide-protocol,
// wellness-analytics, onboarding/i-caq-intro.

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Activity,
  MessageCircleHeart,
  ShoppingBag,
  type LucideIcon,
} from 'lucide-react';

interface QuickAction {
  label: string;
  href: string;
  icon: LucideIcon;
  color: string;
  description: string;
}

const ACTIONS: QuickAction[] = [
  { label: 'Jeffery AI Wellness Assistant', href: '/wellness/advisor', icon: MessageCircleHeart, color: '#2DA5A0', description: 'Chat with your personal AI assistant' },
  { label: 'Wearable Data',             href: '/wearables',        icon: Activity,           color: '#7C6FE0', description: 'Recovery, sleep & strain insights' },
  { label: 'Shop',                      href: '/shop',             icon: ShoppingBag,        color: '#B75E18', description: 'Browse supplements, peptides & tests' },
];

export function QuickActionsGrid() {
  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/50">
        Quick Actions
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <motion.div key={action.href} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
              <Link
                href={action.href}
                className="group flex h-full min-h-[120px] flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition-all hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744]"
                style={{ borderColor: 'rgba(255,255,255,0.10)' }}
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl transition-all"
                  style={{
                    background: `${action.color}22`,
                    border: `1px solid ${action.color}40`,
                  }}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.5} style={{ color: action.color }} />
                </div>
                <p className="text-sm font-semibold text-white">{action.label}</p>
                <p className="text-[11px] leading-snug text-white/45">{action.description}</p>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
