'use client';

import {
  FRBL_SIDE_LABELS,
  FRBL_SIDE_ORDER,
  FRBL_SIDE_UNAVAILABLE_HELPER,
  frblSideToggleState,
} from '@/lib/formavision/viewer/frblReadySide';
import type { PoseId } from '@/lib/scan/poses';

export interface FrblSideToggleProps {
  active: PoseId;
  poses: Record<string, boolean>;
  onChange: (side: PoseId) => void;
}

const CELL_BASE =
  'inline-flex min-h-[44px] min-w-[44px] flex-1 items-center justify-center rounded-xl border px-2 py-2 text-xs font-semibold backdrop-blur-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/45 sm:text-sm';
const CELL_IDLE = `${CELL_BASE} border-white/15 bg-[rgba(30,48,84,0.92)] text-white/80`;
const CELL_ACTIVE = `${CELL_BASE} border-[rgba(45,165,160,0.8)] bg-[rgba(45,165,160,0.18)] text-white`;
const CELL_DISABLED = `${CELL_BASE} cursor-not-allowed border-white/10 bg-[rgba(30,48,84,0.45)] text-white/30`;

export function FrblSideToggle({ active, poses, onChange }: FrblSideToggleProps) {
  const state = frblSideToggleState(poses);
  const missingAny = FRBL_SIDE_ORDER.some((side) => state[side].disabled);

  return (
    <div className="pointer-events-auto absolute inset-x-2 bottom-2 z-20 sm:inset-x-3 sm:bottom-3">
      <div
        role="radiogroup"
        aria-label="Ready photo side"
        data-testid="formavision-frbl-side-toggle"
        className="grid grid-cols-4 gap-1.5 sm:gap-2"
      >
        {FRBL_SIDE_ORDER.map((side) => {
          const disabled = state[side].disabled;
          const isActive = active === side;
          return (
            <button
              key={side}
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-disabled={disabled}
              disabled={disabled}
              data-testid={`formavision-frbl-side-${side}`}
              data-active={isActive ? 'true' : 'false'}
              data-present={state[side].present ? 'true' : 'false'}
              aria-describedby={disabled ? 'formavision-frbl-side-missing' : undefined}
              onClick={() => {
                if (!disabled) onChange(side);
              }}
              className={disabled ? CELL_DISABLED : isActive ? CELL_ACTIVE : CELL_IDLE}
            >
              {FRBL_SIDE_LABELS[side]}
            </button>
          );
        })}
      </div>
      {missingAny ? (
        <p
          id="formavision-frbl-side-missing"
          data-testid="formavision-frbl-side-missing"
          className="mt-1.5 text-center text-[10px] leading-relaxed text-white/55 sm:text-xs"
        >
          {FRBL_SIDE_UNAVAILABLE_HELPER}
        </p>
      ) : null}
    </div>
  );
}
