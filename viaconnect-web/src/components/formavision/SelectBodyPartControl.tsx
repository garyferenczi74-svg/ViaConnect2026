'use client';

// "Select Body Part" picker for the FormaVision avatar (Prompt 210b, P2-T4a).
//
// A compact, fully accessible control that drives the avatar's selectedBodyPart.
// Choosing a region emits its canonical ring key (the SAME keys the geometry
// rings and the P2-T3 camera-framing map use), which the persistent avatar
// frames the camera to; choosing "All" emits null and the camera eases back to
// the full body. The control is real DOM (a native labeled select), so it is
// keyboard and screen-reader operable on its own, never baked into the canvas.
// The measurement ring overlay is a separate task (P2-T4b); this is the control
// plus the selection plumbing only.

import { ChevronDown } from 'lucide-react';

// The canonical selectable region keys. These MUST match the geometry ring ids
// (scanToParamVector RING_TO_MEASUREMENT) and resolve through framingForRegion
// to a real per-region framing. SELECT_BODY_PART_REGIONS is the single source of
// the picker keys; a drift test pins each one to a non-full-body framing so the
// picker and the camera map can never diverge.
export interface SelectableRegion {
  key: string;
  label: string;
}

export const SELECT_BODY_PART_REGIONS: readonly SelectableRegion[] = [
  { key: 'neck', label: 'Neck' },
  { key: 'chest', label: 'Chest' },
  { key: 'waist', label: 'Waist' },
  { key: 'hip', label: 'Hips' },
  { key: 'rBicep', label: 'Right Bicep' },
  { key: 'lBicep', label: 'Left Bicep' },
  { key: 'rForearm', label: 'Right Forearm' },
  { key: 'lForearm', label: 'Left Forearm' },
  { key: 'rThigh', label: 'Right Thigh' },
  { key: 'lThigh', label: 'Left Thigh' },
  { key: 'rCalf', label: 'Right Calf' },
  { key: 'lCalf', label: 'Left Calf' },
] as const;

// The sentinel value for the full-body option. Kept distinct from any region key
// so the select can carry a non-null value while the public API stays null-based.
export const ALL_VALUE = 'all';

// Map a raw select value to the public selection: the "All" sentinel becomes null
// (full body), any other value is a region key passed through unchanged. Pure so
// the region -> key / All -> null contract is unit-testable without a DOM.
export function resolveSelection(rawValue: string): string | null {
  return rawValue === ALL_VALUE ? null : rawValue;
}

export interface SelectBodyPartControlProps {
  // The currently selected region key, or null for full body.
  value: string | null;
  // Emits the chosen region key, or null when "All" is chosen.
  onChange: (key: string | null) => void;
  className?: string;
}

export function SelectBodyPartControl({ value, onChange, className }: SelectBodyPartControlProps) {
  return (
    <label
      className={`pointer-events-auto inline-flex items-center gap-2 rounded-xl border border-[#2DA5A0]/30 bg-[#1A2744]/80 px-3 py-2 text-xs font-medium text-white backdrop-blur-md transition-colors hover:border-[#2DA5A0]/50 ${
        className ?? ''
      }`}
    >
      <span className="shrink-0 text-white/60">Select Body Part</span>
      <span className="relative inline-flex items-center">
        <select
          // E3b: the body-part picker control. The native select is the specific
          // stable interactive node (it is what the user and Playwright operate);
          // the testid lets the spec target it exactly instead of relying on the
          // aria-label alone. The aria-label is retained for accessibility.
          // Attribute-only; no behavior change.
          data-testid="select-body-part"
          aria-label="Select body part to frame"
          value={value ?? ALL_VALUE}
          onChange={(e) => onChange(resolveSelection(e.target.value))}
          className="min-h-[36px] cursor-pointer appearance-none rounded-lg border border-white/15 bg-[#1A2744] py-1.5 pl-3 pr-8 text-white outline-none transition-colors hover:border-[#2DA5A0]/50 active:border-[#2DA5A0]/80 focus-visible:border-[#2DA5A0]/70 focus-visible:ring-1 focus-visible:ring-[#2DA5A0]/50"
        >
          <option value={ALL_VALUE}>All (full body)</option>
          {SELECT_BODY_PART_REGIONS.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2 h-4 w-4 text-[#2DA5A0]"
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </span>
    </label>
  );
}

export default SelectBodyPartControl;
