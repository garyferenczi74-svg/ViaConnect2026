"use client";

import { X, AlertTriangle } from "lucide-react";
import type { Supplement } from "./SupplementPicker";

interface CanvasItem {
  supplement: Supplement;
  dosage: string;
  frequency: string;
}

interface ProtocolCanvasProps {
  items: CanvasItem[];
  onRemove: (id: string) => void;
  onUpdateDosage: (id: string, dosage: string) => void;
  onUpdateFrequency: (id: string, frequency: string) => void;
}

const frequencies = ["Once daily", "Twice daily", "Three times daily", "With meals", "Before bed", "As needed"];

export default function ProtocolCanvas({
  items,
  onRemove,
  onUpdateDosage,
  onUpdateFrequency,
}: ProtocolCanvasProps) {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl overflow-hidden h-full flex flex-col">
      <div className="p-4 border-b border-gray-700/50 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Protocol Canvas</h3>
        <span className="text-[10px] text-white/40">
          {items.length} supplement{items.length !== 1 ? "s" : ""}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="border-2 border-dashed border-green-400/20 rounded-xl p-8 text-center w-full">
            <p className="text-sm text-white/30 mb-1">Drop zone</p>
            <p className="text-xs text-white/20">
              Add supplements from the database
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto divide-y divide-gray-700/30">
          {items.map((item, i) => (
            <div key={item.supplement.id} className="px-4 py-3 space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/30 font-mono w-5 text-center">
                  {i + 1}
                </span>
                <span className="text-sm font-medium text-white flex-1">
                  {item.supplement.name}
                </span>
                <button
                  onClick={() => onRemove(item.supplement.id)}
                  className="text-white/30 hover:text-red-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-2 ml-8">
                <input
                  type="text"
                  value={item.dosage}
                  onChange={(e) =>
                    onUpdateDosage(item.supplement.id, e.target.value)
                  }
                  placeholder="Dosage"
                  className="bg-gray-900/60 border border-gray-700/50 rounded-lg px-3 py-1.5 text-xs text-white w-28 outline-none focus:border-green-400/50"
                />
                <select
                  value={item.frequency}
                  onChange={(e) =>
                    onUpdateFrequency(item.supplement.id, e.target.value)
                  }
                  className="bg-gray-900/60 border border-gray-700/50 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-green-400/50 flex-1"
                >
                  {frequencies.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              {/* Genomic dosing badge for items with interactions */}
              {item.supplement.interactions > 0 && (
                <div className="ml-8 flex items-center gap-1.5 bg-yellow-400/10 border border-yellow-400/20 rounded-lg px-3 py-1.5">
                  <AlertTriangle className="w-3 h-3 text-yellow-400" />
                  <span className="text-[10px] text-yellow-400 font-medium">
                    CYP2D6: Reduce dose by 25%
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
