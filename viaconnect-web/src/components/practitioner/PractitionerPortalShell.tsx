'use client';

// Revised Prompt #91 Phase 5.2: Practitioner portal shell with tab navigation.
//
// Top-of-content tab bar (Practice / Naturopath) + a left sidebar whose
// contents change based on the active tab. The Naturopath tab + its sidebar
// only render for credential types in (nd, dc, lac); all other credentials
// see a single Practice context with no tab UI.
//
// This shell is the practitioner-route alternative to the shared AppShell
// sidebar. PortalShellRouter routes here based on pathname.

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Stethoscope, Leaf } from 'lucide-react';
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
  useEffect(() => { setActiveTab(tabFromPath); }, [tabFromPath]);

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
      <aside className="flex w-64 shrink-0 flex-col border-r border-white/[0.06] bg-[#0B1424]">
        <div className="border-b border-white/[0.06] p-4">
          <h2 className="text-sm font-semibold text-white">
            {practitioner.display_name}
          </h2>
          {practitioner.practice_name && (
            <p className="mt-0.5 text-xs text-white/55">
              {practitioner.practice_name}
            </p>
          )}
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          {activeTab === 'naturopath' ? <NaturopathSidebar /> : <PracticeSidebar />}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        {showNaturopathTab && (
          <div className="border-b border-white/[0.06] bg-[#0B1424]">
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
