'use client';

import { useState } from 'react';
import { Pill, Trash2, ChevronDown, ChevronUp, Building2 } from 'lucide-react';

interface SupplementEntry {
  name: string;
  brand: string;
  source: string;
  deliveryMethod: string;
  dosage: string;
  unit: string;
  frequency: string;
  reason: string;
  ingredientBreakdown?: { name: string; amount: number; unit: string; category?: string; dailyValuePercent?: number | null }[];
}

interface WhatYouAreTakingProps {
  entries: SupplementEntry[];
  onRemove: (index: number) => void;
  darkMode?: boolean;
}

export default function WhatYouAreTaking({ entries, onRemove, darkMode = false }: WhatYouAreTakingProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  if (entries.length === 0) {
    return (
      <div className="py-6 text-center">
        <Pill className={`w-8 h-8 mx-auto mb-2 ${darkMode ? 'text-white/20' : 'text-gray-300'}`} strokeWidth={1.5} />
        <p className={`text-sm ${darkMode ? 'text-white/40' : 'text-gray-500'}`}>No supplements added yet.</p>
        <p className={`text-xs mt-1 ${darkMode ? 'text-white/25' : 'text-gray-400'}`}>Use the search bar above to find what you&apos;re taking.</p>
      </div>
    );
  }

  const textPrimary = darkMode ? 'text-white/90' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-white/40' : 'text-gray-500';
  const cardBg = darkMode ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-white border-gray-200';
  const expandBg = darkMode ? 'bg-white/[0.02] border-white/5' : 'bg-gray-50 border-gray-100';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <span className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-[#1A2744]'}`}>
          {entries.length} supplement{entries.length !== 1 ? 's' : ''} logged
        </span>
      </div>

      {entries.map((entry, idx) => (
        <div key={`${entry.name}-${idx}`} className={`rounded-xl border overflow-hidden ${cardBg}`}>
          <div className="flex items-center gap-3 px-4 py-3">
            <Pill className={`w-4 h-4 flex-shrink-0 ${entry.source === 'farmceutica' ? 'text-[#2DA5A0]' : darkMode ? 'text-white/30' : 'text-gray-400'}`} strokeWidth={1.5} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${textPrimary}`}>{entry.name}</p>
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                {entry.brand && (
                  <span className={`text-xs flex items-center gap-1 ${textSecondary}`}>
                    <Building2 className="w-3 h-3" strokeWidth={1.5} /> {entry.brand}
                  </span>
                )}
                {entry.deliveryMethod && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${darkMode ? 'bg-teal-400/10 text-teal-400/60' : 'bg-[#2DA5A0]/10 text-[#2DA5A0]'}`}>
                    {entry.deliveryMethod.replace(/_/g, ' ')}
                  </span>
                )}
                {entry.dosage && entry.unit && (
                  <span className={`text-xs ${textSecondary}`}>{entry.dosage}{entry.unit}</span>
                )}
                {entry.frequency && (
                  <span className={`text-xs ${textSecondary}`}>· {entry.frequency.replace(/_/g, ' ')}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {entry.ingredientBreakdown && entry.ingredientBreakdown.length > 0 && (
                <button onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                  className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'text-white/30 hover:text-white/60 hover:bg-white/5' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
                  {expandedIdx === idx ? <ChevronUp className="w-4 h-4" strokeWidth={1.5} /> : <ChevronDown className="w-4 h-4" strokeWidth={1.5} />}
                </button>
              )}
              <button onClick={() => onRemove(idx)}
                className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'text-white/30 hover:text-red-400 hover:bg-red-400/10' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}>
                <Trash2 className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {expandedIdx === idx && entry.ingredientBreakdown && entry.ingredientBreakdown.length > 0 && (
            <div className={`border-t px-4 py-3 ${expandBg}`}>
              <p className={`text-[10px] uppercase tracking-wider font-semibold mb-2 ${textSecondary}`}>Ingredients</p>
              <div className="grid grid-cols-2 gap-1.5">
                {entry.ingredientBreakdown.map((ing, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className={textPrimary}>{ing.name}</span>
                    <span className={textSecondary}>{ing.amount}{ing.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
