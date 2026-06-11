'use client';

// Prompt #160: Large editable metric tile for the meal result card.
// Gary's five (Calories, Protein, Good Fat, Healthy Fat, Sugar) use the
// "prominent" variant; the rest use "secondary" in the expandable section.

import { useState } from 'react';
import { Pencil } from 'lucide-react';

interface MetricTileProps {
  readonly label: string;
  // Prompt 186: null means UNKNOWN (the engine could not determine this
  // nutrient). Rendered as "Unknown", never as 0. Tapping still opens the
  // editor so the user can supply a value.
  readonly value: number | null;
  readonly unit: string;
  readonly variant?: 'prominent' | 'secondary';
  readonly step?: number;
  // Prompt 186: true when this nutrient total is a partial sum (some items
  // unknown); the tile shows an "est." marker next to the value.
  readonly estimated?: boolean;
  readonly onChange?: (next: number) => void;
}

export function MetricTile({
  label,
  value,
  unit,
  variant = 'prominent',
  step = 0.1,
  estimated = false,
  onChange,
}: MetricTileProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(value === null ? '' : String(value));

  const numeralSize = variant === 'prominent' ? 'text-3xl' : 'text-xl';
  const padding = variant === 'prominent' ? 'p-4' : 'p-3';

  function commit() {
    const parsed = Number.parseFloat(draft);
    if (Number.isFinite(parsed) && parsed >= 0 && onChange) {
      onChange(parsed);
    }
    setEditing(false);
  }

  return (
    <div className={`relative rounded-xl border border-white/[0.08] bg-white/5 ${padding}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">{label}</p>
      {editing ? (
        <input
          type="number"
          inputMode="decimal"
          step={step}
          min="0"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') setEditing(false);
          }}
          className={`mt-1 w-full bg-transparent ${numeralSize} font-semibold tabular-nums text-white focus:outline-none`}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraft(value === null ? '' : String(value));
            setEditing(true);
          }}
          className="mt-1 flex w-full items-baseline gap-1 text-left"
        >
          {value === null ? (
            <span className={`${variant === 'prominent' ? 'text-xl' : 'text-base'} font-medium text-amber-300/80`}>
              Unknown
            </span>
          ) : (
            <>
              <span className={`${numeralSize} font-semibold tabular-nums text-white`}>
                {value.toFixed(unit === 'kcal' ? 0 : 1)}
              </span>
              <span className="text-xs text-white/40">{unit}</span>
              {estimated && (
                <span className="text-[10px] font-medium uppercase tracking-wide text-amber-300/80">est.</span>
              )}
            </>
          )}
          <Pencil className="ml-auto h-3 w-3 text-white/20" strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
}
