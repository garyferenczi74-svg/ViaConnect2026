"use client";

import { useState } from "react";
import { Search, GripVertical, Plus } from "lucide-react";

export interface Supplement {
  id: string;
  name: string;
  form: string;
  dosageRange: string;
  interactions: number;
  category: string;
}

const supplements: Supplement[] = [
  { id: "1", name: "MTHFR+", form: "Capsule", dosageRange: "5–15mg", interactions: 2, category: "Methylation" },
  { id: "2", name: "COMT+", form: "Capsule", dosageRange: "10–20mg", interactions: 1, category: "Methylation" },
  { id: "3", name: "NAD+", form: "Sublingual", dosageRange: "125–500mg", interactions: 0, category: "Energy" },
  { id: "4", name: "RELAX+", form: "Capsule", dosageRange: "200–600mg", interactions: 3, category: "Neuro" },
  { id: "5", name: "FOCUS+", form: "Capsule", dosageRange: "100–400mg", interactions: 1, category: "Neuro" },
  { id: "6", name: "FLEX+", form: "Powder", dosageRange: "3–6g", interactions: 0, category: "Joint" },
  { id: "7", name: "RISE+", form: "Capsule", dosageRange: "200–400mg", interactions: 1, category: "Energy" },
  { id: "8", name: "DESIRE+", form: "Tincture", dosageRange: "1–3ml", interactions: 2, category: "Hormonal" },
  { id: "9", name: "CREATINE HCL+", form: "Powder", dosageRange: "3–5g", interactions: 0, category: "Energy" },
  { id: "10", name: "BLAST+", form: "Capsule", dosageRange: "250–750mg", interactions: 1, category: "Performance" },
  { id: "11", name: "SHRED+", form: "Capsule", dosageRange: "200–600mg", interactions: 2, category: "Metabolic" },
  { id: "12", name: "BALANCE+", form: "Capsule", dosageRange: "150–450mg", interactions: 1, category: "Hormonal" },
];

const categories = ["All", "Methylation", "Energy", "Neuro", "Joint", "Hormonal", "Performance", "Metabolic"];

interface SupplementPickerProps {
  onAdd: (s: Supplement) => void;
  addedIds: Set<string>;
}

export default function SupplementPicker({ onAdd, addedIds }: SupplementPickerProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const filtered = supplements.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "All" || s.category === category;
    return matchSearch && matchCat;
  });

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl overflow-hidden h-full flex flex-col">
      <div className="p-4 border-b border-gray-700/50 space-y-3">
        <h3 className="text-sm font-semibold text-white">Supplement Database</h3>
        <div className="flex items-center gap-2 bg-gray-900/60 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search supplements..."
            className="bg-transparent text-sm text-white placeholder:text-white/30 outline-none flex-1"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full px-3 py-1 text-[10px] font-medium whitespace-nowrap transition-all ${
                category === c
                  ? "bg-green-400 text-gray-900"
                  : "text-white/40 bg-gray-700/50 hover:text-white/60"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-gray-700/30">
        {filtered.map((s) => {
          const added = addedIds.has(s.id);
          return (
            <div
              key={s.id}
              className="px-4 py-3 flex items-center gap-3 hover:bg-gray-700/20 transition-colors"
            >
              <GripVertical className="w-4 h-4 text-white/20 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{s.name}</p>
                <p className="text-[10px] text-white/40">
                  {s.form} &bull; {s.dosageRange}
                </p>
              </div>
              {s.interactions > 0 && (
                <span className="bg-yellow-400/20 text-yellow-400 text-[10px] font-bold px-1.5 py-0.5 rounded">
                  {s.interactions}
                </span>
              )}
              <button
                onClick={() => !added && onAdd(s)}
                disabled={added}
                className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-all ${
                  added
                    ? "bg-gray-700/50 text-white/30 cursor-default"
                    : "bg-green-400/10 text-green-400 hover:bg-green-400/20"
                }`}
              >
                {added ? "Added" : <><Plus className="w-3 h-3 inline -mt-0.5" /> Add</>}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
