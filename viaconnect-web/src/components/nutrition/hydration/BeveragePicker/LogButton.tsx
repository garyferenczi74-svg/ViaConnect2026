// Prompt 172e Phase B: LogButton component.
//
// Confirms the log action and shows a transient loading state while the
// parent commits via the 170o write path. The button stays full width on
// mobile so the tap target is unmistakable.

'use client';

import {
  getHydrationMicrocopy,
  type HydrationMicrocopyVariant,
} from '@/lib/nutrition/microcopy/hydration';

export interface LogButtonProps {
  onClick: () => void;
  loading: boolean;
  variant: HydrationMicrocopyVariant;
}

export function LogButton({ onClick, loading, variant }: LogButtonProps): JSX.Element {
  const label = loading
    ? getHydrationMicrocopy('action.logging', variant)
    : getHydrationMicrocopy('action.log', variant);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-label={label}
      className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-[#2DA5A0]/40 bg-[#2DA5A0]/15 text-base font-semibold text-[#2DA5A0] transition-colors hover:bg-[#2DA5A0]/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2DA5A0] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {label}
    </button>
  );
}
