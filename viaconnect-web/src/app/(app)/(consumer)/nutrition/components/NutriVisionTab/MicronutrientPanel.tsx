'use client';

// Prompt #170 Phase 1l: collapsible micronutrient panel.
//
// Renders the 12 priority micros pulled from the item's micronutrients map.
// Collapsed by default; tap the header to expand. Per spec §10.5 only the
// top 12 are shown in the consumer surface even if the analyze response
// contains more.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface MicronutrientPanelProps {
  micronutrients?: Record<string, number>;
}

const PRIORITY_KEYS: ReadonlyArray<{ key: string; label: string; unit: string }> = [
  { key: 'vitamin_a',  label: 'Vitamin A',  unit: 'mcg' },
  { key: 'vitamin_c',  label: 'Vitamin C',  unit: 'mg' },
  { key: 'vitamin_d',  label: 'Vitamin D',  unit: 'mcg' },
  { key: 'vitamin_e',  label: 'Vitamin E',  unit: 'mg' },
  { key: 'vitamin_k',  label: 'Vitamin K',  unit: 'mcg' },
  { key: 'folate',     label: 'Folate',     unit: 'mcg' },
  { key: 'vitamin_b12', label: 'Vitamin B12', unit: 'mcg' },
  { key: 'calcium',    label: 'Calcium',    unit: 'mg' },
  { key: 'iron',       label: 'Iron',       unit: 'mg' },
  { key: 'magnesium',  label: 'Magnesium',  unit: 'mg' },
  { key: 'potassium',  label: 'Potassium',  unit: 'mg' },
  { key: 'zinc',       label: 'Zinc',       unit: 'mg' },
];

export function MicronutrientPanel({ micronutrients }: MicronutrientPanelProps) {
  const [open, setOpen] = useState(false);
  if (!micronutrients || Object.keys(micronutrients).length === 0) return null;

  const rows = PRIORITY_KEYS.filter((p) => typeof micronutrients[p.key] === 'number');
  if (rows.length === 0) return null;

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#1A2744]/35">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-[12px] text-white/70 transition-colors hover:bg-white/[0.03]"
      >
        <span>Micronutrients ({rows.length})</span>
        {open
          ? <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.5} />
          : <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} />}
      </button>
      {open && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-white/[0.05] px-3 py-2">
          {rows.map((p) => {
            const v = micronutrients[p.key];
            return (
              <div key={p.key} className="flex items-baseline justify-between text-[11px]">
                <span className="text-white/55">{p.label}</span>
                <span className="font-mono text-white">{v.toFixed(1)} {p.unit}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
