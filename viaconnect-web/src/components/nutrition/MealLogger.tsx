'use client';

import { useState } from 'react';
import { Apple, Camera, PenLine } from 'lucide-react';
import { QuickMealLog } from './QuickMealLog';

const TABS = [
  { id: 'quick', label: 'Quick Log', icon: Apple },
  { id: 'photo', label: 'Photo AI', icon: Camera, disabled: true },
  { id: 'manual', label: 'Manual', icon: PenLine, disabled: true },
] as const;

export function MealLogger() {
  const [tab, setTab] = useState('quick');

  return (
    <div className="rounded-xl border border-white/10 bg-[#1E3054]/60 backdrop-blur-md p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <Apple className="h-4 w-4 text-[#B75E18]" strokeWidth={1.5} />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">
          Meal Logger
        </h3>
        <span className="ml-auto text-xs text-[#2DA5A0]">+10 pts</span>
      </div>

      <div className="mb-4 flex gap-1.5">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          const isDisabled = 'disabled' in t && t.disabled;
          return (
            <button
              key={t.id}
              onClick={() => !isDisabled && setTab(t.id)}
              disabled={isDisabled}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all ${
                isActive
                  ? 'border border-[#B75E18]/40 bg-[#B75E18]/20 text-[#B75E18]'
                  : isDisabled
                    ? 'cursor-not-allowed border border-white/[0.04] text-white/20'
                    : 'border border-white/[0.06] text-white/50 hover:bg-white/[0.06]'
              }`}
            >
              <Icon className="h-3 w-3" strokeWidth={1.5} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'quick' && <QuickMealLog />}
      {tab === 'photo' && (
        <p className="py-6 text-center text-xs text-white/30">Photo AI logging coming soon</p>
      )}
      {tab === 'manual' && (
        <p className="py-6 text-center text-xs text-white/30">Manual entry coming soon</p>
      )}
    </div>
  );
}
