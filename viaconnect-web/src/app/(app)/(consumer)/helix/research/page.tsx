'use client';

import { useState } from 'react';
import { Shield, Lock, UserX, LogOut } from 'lucide-react';

const GLASS =
  'bg-[rgba(26,39,68,0.55)] backdrop-blur-[24px] border border-white/[0.08] rounded-2xl';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const RESEARCH_TOGGLES = [
  {
    id: 'supplement',
    label: 'Supplement Adherence',
    desc: 'Share daily supplement completion data',
  },
  {
    id: 'biomarker',
    label: 'Biomarker Trends',
    desc: 'Share bloodwork & biomarker changes over time',
  },
  {
    id: 'lifestyle',
    label: 'Lifestyle Metrics',
    desc: 'Share steps, sleep, and activity data',
  },
  {
    id: 'genomic',
    label: 'Genomic Outcomes',
    desc: 'Share anonymized genetic health correlations',
  },
];

const PRIVACY_ITEMS = [
  { icon: Shield, text: 'HIPAA-compliant data handling' },
  { icon: Lock, text: 'End-to-end encryption' },
  { icon: UserX, text: 'Data is never sold to third parties' },
  { icon: LogOut, text: 'Withdraw anytime with full data deletion' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function Overline({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-widest text-[#B75E18] mb-3">
      {children}
    </p>
  );
}

function Toggle({
  on,
  onToggle,
}: {
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        on ? 'bg-[#2DA5A0]' : 'bg-[#1A2744]'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
          on ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ResearchPage() {
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    supplement: false,
    biomarker: false,
    lifestyle: false,
    genomic: false,
  });

  const handleToggle = (id: string) => {
    setToggles((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex flex-col gap-5">
      <Overline>Share for Science</Overline>

      {/* Anonymous badge */}
      <span className="inline-flex self-start items-center px-3 py-1 rounded-full text-xs font-bold bg-[#2DA5A0]/20 text-[#2DA5A0] border border-[#2DA5A0]/30">
        100% Anonymous &amp; Encrypted
      </span>

      {/* Toggles */}
      <div className={`${GLASS} p-4 flex flex-col gap-4`}>
        {RESEARCH_TOGGLES.map((item) => (
          <div key={item.id} className="flex items-center gap-3">
            <Toggle on={toggles[item.id]} onToggle={() => handleToggle(item.id)} />
            <div className="flex-1">
              <p className="text-sm text-white font-medium">{item.label}</p>
              <p className="text-xs text-tertiary">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Reward note */}
      <p className="text-sm font-bold text-[#2DA5A0] text-center">
        +200 Helix$/month when enrolled
      </p>

      {/* Enroll button */}
      <button className="w-full py-3 rounded-xl bg-gradient-to-r from-[#2DA5A0] to-[#2DA5A0]/70 text-white text-sm font-bold hover:opacity-90 transition-opacity">
        Enroll in Research
      </button>

      {/* Privacy */}
      <div className={`${GLASS} p-4 flex flex-col gap-3`}>
        {PRIVACY_ITEMS.map((item) => (
          <div key={item.text} className="flex items-center gap-3">
            <item.icon className="w-4 h-4 text-[#2DA5A0] flex-shrink-0" />
            <span className="text-xs text-white/70">{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
