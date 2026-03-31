"use client";

import { Camera, Search, Plus, X } from "lucide-react";

interface SupplementEntry {
  name: string;
  brand?: string;
  formulation?: string;
  dosage?: string;
  source?: string;
  photoUrl?: string;
}

interface CurrentSupplementsListProps {
  supplements: SupplementEntry[];
  onRemove: (index: number) => void;
}

export function CurrentSupplementsList({ supplements, onRemove }: CurrentSupplementsListProps) {
  if (supplements.length === 0) {
    return (
      <p className="text-xs text-white/20 py-4 text-center">
        No supplements added yet. Search above or take a photo of your supplement label.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-white/25 uppercase tracking-wider font-semibold">
        What You Are Currently Taking ({supplements.length})
      </p>

      {supplements.map((supp, i) => (
        <div key={`${supp.name}-${i}`} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/8 group">
          {/* Source indicator */}
          {supp.source === "photo_ai" ? (
            <Camera className="w-4 h-4 text-teal-400/50 flex-shrink-0" strokeWidth={1.5} />
          ) : supp.source === "search" || supp.source === "ai_search" ? (
            <Search className="w-4 h-4 text-blue-400/50 flex-shrink-0" strokeWidth={1.5} />
          ) : (
            <Plus className="w-4 h-4 text-white/20 flex-shrink-0" strokeWidth={1.5} />
          )}

          <div className="flex-1 min-w-0">
            <p className="text-sm text-white/60 font-medium truncate">{supp.name}</p>
            {supp.formulation && (
              <p className="text-[10px] text-white/25 mt-0.5 truncate">{supp.formulation}</p>
            )}
            <div className="flex items-center gap-2 mt-1">
              {supp.dosage && <span className="text-[9px] text-white/15">{supp.dosage}</span>}
              {supp.source === "photo_ai" && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-teal-400/10 text-teal-400/50 border border-teal-400/10">
                  AI detected
                </span>
              )}
            </div>
          </div>

          {/* Photo thumbnail */}
          {supp.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={supp.photoUrl} alt="" className="w-8 h-8 rounded object-cover border border-white/10 flex-shrink-0" />
          )}

          {/* Remove button */}
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-white/15 hover:text-red-400/60 hover:bg-red-400/10 transition-all sm:opacity-0 sm:group-hover:opacity-100"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      ))}
    </div>
  );
}
