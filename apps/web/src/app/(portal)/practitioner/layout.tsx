'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { glassClasses } from '@genex360/ui';
import { PractitionerThemeContext } from './theme-context';
import type { PractitionerTheme } from './theme-context';

const navItems = [
  { label: 'Dashboard', href: '/practitioner', icon: 'dashboard' },
  { label: 'Patients', href: '/practitioner/patients', icon: 'group' },
  { label: 'Interactions', href: '/practitioner/interactions', icon: 'warning' },
  { label: 'Protocols', href: '/practitioner/protocols/builder', icon: 'assignment' },
  { label: 'EHR', href: '/practitioner/ehr', icon: 'inventory_2' },
  { label: 'Analytics', href: '/practitioner/analytics', icon: 'bar_chart' },
  { label: 'Billing', href: '/practitioner/billing', icon: 'payments' },
  { label: 'CME', href: '/practitioner/cme', icon: 'school' },
  { label: 'Settings', href: '/practitioner/settings', icon: 'settings' },
];

export default function PractitionerLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState<PractitionerTheme>('light');
  const pathname = usePathname();

  const isDark = theme === 'dark';
  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <PractitionerThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className={`min-h-screen relative overflow-hidden ${isDark ? 'bg-[#0A0F1C]' : 'bg-[#F9FAFB]'}`}>
        {/* Gradient overlays */}
        <div className="fixed inset-0 pointer-events-none">
          <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full blur-3xl ${isDark ? 'bg-emerald-500/5' : 'bg-emerald-100/40'}`} />
          <div className={`absolute bottom-0 right-0 w-[600px] h-[400px] rounded-full blur-3xl ${isDark ? 'bg-cyan-500/5' : 'bg-cyan-100/30'}`} />
        </div>

        {/* Top Bar */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className={`fixed top-0 left-0 right-0 z-50 h-16 border-b ${
            isDark ? `${glassClasses.dark} border-white/10` : 'bg-white/80 backdrop-blur-xl border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between h-full px-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className={`p-2 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
                aria-label="Toggle sidebar"
              >
                <span className="material-symbols-outlined text-xl">menu</span>
              </button>
              <Link href="/practitioner" className="flex items-center gap-2">
                <span className="font-bold text-lg bg-gradient-to-r from-[#10B981] to-[#06B6D4] bg-clip-text text-transparent">
                  ViaConnect
                </span>
                <span className={`text-xs font-medium tracking-wider uppercase ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  Practitioner
                </span>
              </Link>
            </div>

            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <span className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>search</span>
                <input
                  type="text"
                  placeholder="Search patients, protocols, reports..."
                  className={`w-full pl-10 pr-4 py-2 rounded-xl text-sm transition-colors focus:outline-none ${
                    isDark
                      ? 'text-slate-200 placeholder-slate-500 bg-white/5 border border-white/10 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25'
                      : 'text-slate-800 placeholder-slate-400 bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/25'
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/practitioner/patients"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10B981] text-white text-sm font-medium hover:bg-[#059669] transition-colors"
              >
                <span className="material-symbols-outlined text-base">person_add</span>
                New Patient
              </Link>

              <button className={`relative p-2 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}>
                <span className="material-symbols-outlined text-xl">notifications</span>
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">5</span>
                </span>
              </button>

              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:text-amber-300 hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
                aria-label="Toggle theme"
              >
                <span className="material-symbols-outlined text-xl">{isDark ? 'light_mode' : 'dark_mode'}</span>
              </button>

              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#10B981] to-[#06B6D4] flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-emerald-500/20">
                SC
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
              className={`fixed top-16 left-0 bottom-0 z-40 w-56 border-r ${
                isDark ? `${glassClasses.dark} border-white/10` : 'bg-white/80 backdrop-blur-xl border-slate-200'
              }`}
            >
              <nav className="flex flex-col gap-1 p-3 mt-2">
                {navItems.map((item) => {
                  const isActive =
                    item.href === '/practitioner'
                      ? pathname === '/practitioner'
                      : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? isDark
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : isDark
                            ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
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

              <div className={`absolute bottom-0 left-0 right-0 p-4 border-t ${isDark ? 'border-white/5' : 'border-slate-200'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#10B981] to-[#06B6D4] flex items-center justify-center text-white text-xs font-bold">
                    SC
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>Dr. Sarah Chen</span>
                    <span className="text-[10px] text-emerald-500 font-semibold uppercase">ND, LAc</span>
                  </div>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main content */}
        <main className={`pt-16 transition-all duration-300 ${sidebarOpen ? 'pl-56' : 'pl-0'}`}>
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
    </PractitionerThemeContext.Provider>
  );
}
