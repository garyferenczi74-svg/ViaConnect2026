'use client';

// Revised Prompt #91 Phase 5.2: Practitioner portal shell with tab navigation.
//
// Top-of-content tab bar (Practice / Naturopath) + a left sidebar whose
// contents change based on the active tab. The Naturopath tab + its sidebar
// only render for credential types in (nd, dc, lac); all other credentials
// see a single Practice context with no tab UI.
//
// Mobile responsive: at <md the sidebar collapses behind a hamburger that
// toggles a slide-in drawer; the tab bar tightens its horizontal padding.
// At >=md the sidebar is fixed-width and always visible.
//
// This shell is the practitioner-route alternative to the shared AppShell
// sidebar. PortalShellRouter routes here based on pathname.

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Stethoscope, Leaf, Menu, X } from 'lucide-react';
import { PracticeSidebar } from './PracticeSidebar';
import { NaturopathSidebar } from './NaturopathSidebar';

export interface PractitionerShellProfile {
  display_name: string;
  practice_name: string | null;
  credential_type: string;
  default_active_tab: 'practice' | 'naturopath';
}

interface Props {
  practitioner: PractitionerShellProfile;
  showNaturopathTab: boolean;
  children: ReactNode;
}

type TabId = 'practice' | 'naturopath';

export function PractitionerPortalShell({
  practitioner,
  showNaturopathTab,
  children,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const tabFromPath: TabId = pathname.startsWith('/practitioner/naturopath')
    ? 'naturopath'
    : 'practice';

  const [activeTab, setActiveTab] = useState<TabId>(tabFromPath);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => { setActiveTab(tabFromPath); }, [tabFromPath]);

  // Close the mobile drawer whenever the route changes so a tap on a nav
  // item does not leave the drawer covering the new page.
  useEffect(() => { setMobileNavOpen(false); }, [pathname]);

  function switchTab(next: TabId) {
    if (next === activeTab) return;
    setActiveTab(next);
    router.push(
      next === 'practice'
        ? '/practitioner/dashboard'
        : '/practitioner/naturopath/holistic-advisor',
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#0E1A30] text-white">
      {/* ── Sidebar: hidden on mobile, slide-in via drawer; static on >=md ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-white/[0.06] bg-[#0B1424] transition-transform duration-200 ease-out md:static md:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex items-start justify-between gap-2 border-b border-white/[0.06] p-4">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-white">
              {practitioner.display_name}
            </h2>
            {practitioner.practice_name && (
              <p className="mt-0.5 truncate text-xs text-white/55">
                {practitioner.practice_name}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            className="md:hidden flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-white/65 hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-portal-green/40"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          {activeTab === 'naturopath' ? <NaturopathSidebar /> : <PracticeSidebar />}
        </nav>
      </aside>

      {/* Mobile backdrop */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/55 md:hidden"
          aria-hidden
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* ── Mobile top bar: hamburger + active tab label + compact tab switch ── */}
        <div className="flex items-center gap-2 border-b border-white/[0.06] bg-[#0B1424] px-3 py-2 md:hidden">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-portal-green/40"
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <p className="flex-1 truncate text-sm font-medium text-white">
            {activeTab === 'naturopath' ? 'Naturopath' : 'Practice'}
          </p>
          {showNaturopathTab && (
            <div className="flex shrink-0 gap-1">
              <CompactTabButton
                active={activeTab === 'practice'}
                onClick={() => switchTab('practice')}
                Icon={Stethoscope}
                label="Practice"
              />
              <CompactTabButton
                active={activeTab === 'naturopath'}
                onClick={() => switchTab('naturopath')}
                Icon={Leaf}
                label="Naturopath"
                accent="emerald"
              />
            </div>
          )}
        </div>

        {/* ── Desktop tab bar ── */}
        {showNaturopathTab && (
          <div className="hidden border-b border-white/[0.06] bg-[#0B1424] md:block">
            <div className="flex px-6">
              <TabButton
                active={activeTab === 'practice'}
                onClick={() => switchTab('practice')}
                Icon={Stethoscope}
                label="Practice"
              />
              <TabButton
                active={activeTab === 'naturopath'}
                onClick={() => switchTab('naturopath')}
                Icon={Leaf}
                label="Naturopath"
                accent="emerald"
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
}

function TabButton({
  active, onClick, Icon, label, accent = 'teal',
}: {
  active: boolean;
  onClick: () => void;
  Icon: typeof Stethoscope;
  label: string;
  accent?: 'teal' | 'emerald';
}) {
  const accentBorder = accent === 'emerald' ? 'border-emerald-400' : 'border-portal-green';
  const accentText   = accent === 'emerald' ? 'text-emerald-200' : 'text-portal-green';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 border-b-2 px-6 py-4 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-portal-green/40 ${
        active
          ? `${accentBorder} ${accentText}`
          : 'border-transparent text-white/55 hover:border-white/10 hover:text-white'
      }`}
    >
      <Icon className="h-4 w-4" strokeWidth={1.5} />
      {label}
    </button>
  );
}

function CompactTabButton({
  active, onClick, Icon, label, accent = 'teal',
}: {
  active: boolean;
  onClick: () => void;
  Icon: typeof Stethoscope;
  label: string;
  accent?: 'teal' | 'emerald';
}) {
  const tone = accent === 'emerald'
    ? (active ? 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30' : 'border-white/10 text-white/55 hover:bg-white/[0.06]')
    : (active ? 'bg-portal-green/15 text-portal-green border-portal-green/30' : 'border-white/10 text-white/55 hover:bg-white/[0.06]');
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-portal-green/40 ${tone}`}
      aria-label={label}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
    </button>
  );
}
