'use client';

import { Box, ImageIcon } from 'lucide-react';
import {
  FRBL_READY_MODE_PHOTO,
  FRBL_READY_MODE_WIREFRAME,
} from '@/lib/formavision/twoProtocolCopy';

export type FrblReadyViewMode = 'photo' | 'wireframe';

export interface FrblReadyModeToggleProps {
  active: FrblReadyViewMode;
  onChange: (mode: FrblReadyViewMode) => void;
}

const CELL_BASE =
  'inline-flex min-h-[44px] min-w-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold backdrop-blur-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/45';
const CELL_IDLE = `${CELL_BASE} border-white/15 bg-[rgba(30,48,84,0.55)] text-white/80`;
const CELL_ACTIVE = `${CELL_BASE} border-[#2DA5A0] bg-[#2DA5A0] text-white`;

const MODES: ReadonlyArray<{
  id: FrblReadyViewMode;
  label: string;
  Icon: typeof ImageIcon;
}> = [
  { id: 'photo', label: FRBL_READY_MODE_PHOTO, Icon: ImageIcon },
  { id: 'wireframe', label: FRBL_READY_MODE_WIREFRAME, Icon: Box },
];

export function FrblReadyModeToggle({ active, onChange }: FrblReadyModeToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Ready view mode"
      data-testid="formavision-frbl-ready-mode-toggle"
      className="pointer-events-auto absolute inset-x-2 top-2 z-20 grid grid-cols-2 gap-1.5 sm:inset-x-3"
    >
      {MODES.map(({ id, label, Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={isActive}
            data-testid={`formavision-frbl-ready-mode-${id}`}
            data-active={isActive ? 'true' : 'false'}
            onClick={() => {
              if (!isActive) onChange(id);
            }}
            className={isActive ? CELL_ACTIVE : CELL_IDLE}
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
