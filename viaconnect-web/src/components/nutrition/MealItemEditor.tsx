'use client';

import { Plus, X } from 'lucide-react';
import type { IdentifiedItem } from '@/lib/nutrition/analyzeMeal';

const CATEGORY_COLORS: Record<string, string> = {
  protein: 'bg-red-400', carb: 'bg-yellow-400', fat: 'bg-orange-400',
  vegetable: 'bg-green-400', fruit: 'bg-purple-400', dairy: 'bg-blue-300',
  grain: 'bg-amber-500', beverage: 'bg-cyan-400', other: 'bg-gray-400',
};

interface MealItemEditorProps {
  items: IdentifiedItem[];
  onChange: (items: IdentifiedItem[]) => void;
}

export function MealItemEditor({ items, onChange }: MealItemEditorProps) {
  const updateItem = (index: number, patch: Partial<IdentifiedItem>) => {
    const updated = items.map((item, i) => (i === index ? { ...item, ...patch } : item));
    onChange(updated);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const addItem = () => {
    const newItem: IdentifiedItem = {
      id: `added_${Date.now()}`,
      name: 'New item',
      portionDescription: '1 serving',
      portionGrams: 100,
      confidence: 1,
      category: 'other',
    };
    onChange([...items, newItem]);
  };

  return (
    <div className="space-y-1.5">
      <p className="mb-2 text-[10px] uppercase tracking-wider text-white/30">Identified items</p>
      {items.map((item, i) => (
        <div key={item.id} className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className={`h-2 w-2 flex-shrink-0 rounded-full ${CATEGORY_COLORS[item.category] ?? 'bg-gray-400'}`} />
            <input
              type="text"
              value={item.name}
              onChange={(e) => updateItem(i, { name: e.target.value })}
              className="min-w-0 flex-1 truncate border-none bg-transparent text-sm text-white outline-none"
            />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <input
              type="text"
              value={item.portionDescription}
              onChange={(e) => updateItem(i, { portionDescription: e.target.value })}
              className="w-16 border-none bg-transparent text-right text-xs text-white/60 outline-none"
            />
            <button onClick={() => removeItem(i)}>
              <X className="h-4 w-4 text-white/20 hover:text-red-400" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      ))}
      <button
        onClick={addItem}
        className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-white/10 py-2 text-xs text-white/30 hover:border-[#2DA5A0]/30 hover:text-[#2DA5A0]"
      >
        <Plus className="h-3 w-3" strokeWidth={1.5} />
        Add item AI missed
      </button>
    </div>
  );
}
