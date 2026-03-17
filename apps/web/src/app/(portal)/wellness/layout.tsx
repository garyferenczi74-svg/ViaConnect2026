'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { glassClasses } from '@genex360/ui';

const navItems = [
  { label: 'Dashboard', href: '/wellness', icon: 'dashboard' },
  { label: 'My Genomics', href: '/wellness/genomics', icon: 'genetics' },
  { label: 'My Protocol', href: '/wellness/protocol', icon: 'medication' },
  { label: 'Shop', href: '/wellness/shop', icon: 'shopping_bag' },
  { label: 'AI Chat', href: '/wellness/chat', icon: 'smart_toy' },
  { label: 'FarmaTokens', href: '/wellness/tokens', icon: 'toll' },
  { label: 'GENEX360™', href: '/onboarding/gateway', icon: 'science' },
];

export default function WellnessLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#0A0F1C] relative overflow-hidden">
      {/* Floating gradient orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-violet-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      {/* Top Bar */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className={`fixed top-0 left-0 right-0 z-50 h-16 ${glassClasses.dark} border-t-0 border-x-0 border-b border-white/10`}
      >
        <div className="flex items-center justify-between h-full px-4">
          {/* Left: Sidebar toggle + Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Toggle sidebar"
            >
              <span className="material-symbols-outlined text-xl">menu</span>
            </button>
            <Link href="/wellness" className="flex items-center gap-2">
              <span className="font-bold text-lg bg-gradient-to-r from-[#06B6D4] to-[#8B5CF6] bg-clip-text text-transparent">
                ViaConnect
              </span>
              <span className="text-xs text-slate-500 font-medium tracking-wider uppercase">Wellness</span>
            </Link>
          </div>

          {/* Center: Search */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">search</span>
              <input
                type="text"
                placeholder="Search supplements, genes, protocols..."
                className="w-full pl-10 pr-4 py-2 rounded-xl text-sm text-slate-200 placeholder-slate-500 bg-white/5 backdrop-blur-xl border border-white/10 focus:outline-none focus:border-[#06B6D4]/50 focus:ring-1 focus:ring-[#06B6D4]/25 transition-colors"
              />
            </div>
          </div>

          {/* Right: Notifications + FarmaTokens + Avatar */}
          <div className="flex items-center gap-4">
            <button className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
              <span className="material-symbols-outlined text-xl">notifications</span>
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  3
                </span>
              </span>
            </button>

            <Link
              href="/wellness/tokens"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 hover:bg-[#8B5CF6]/20 transition-colors"
            >
              <span className="material-symbols-outlined text-[#8B5CF6] text-base">toll</span>
              <span className="text-sm font-semibold text-[#8B5CF6]">1,247 FT</span>
            </Link>

            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#06B6D4] to-[#8B5CF6] flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-[#06B6D4]/20">
              GF
            </div>
          </div>
        </div>
      </motion.header>

      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={`fixed top-16 left-0 bottom-0 z-40 w-56 ${glassClasses.dark} border-t-0 border-l-0 border-b-0 border-r border-white/10`}
          >
            <nav className="flex flex-col gap-1 p-3 mt-2">
              {navItems.map((item) => {
                const isActive =
                  item.href === '/wellness'
                    ? pathname === '/wellness'
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-[#06B6D4]/15 text-[#06B6D4] border border-[#06B6D4]/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <span
                      className="material-symbols-outlined text-xl"
                      style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Bottom: User info */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#06B6D4] to-[#8B5CF6] flex items-center justify-center text-white text-xs font-bold">
                  GF
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-200">Gary F.</span>
                  <span className="text-[10px] text-[#F59E0B] font-semibold uppercase">Gold Member</span>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main
        className={`pt-16 transition-all duration-300 ${
          sidebarOpen ? 'pl-56' : 'pl-0'
        }`}
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="p-6"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
