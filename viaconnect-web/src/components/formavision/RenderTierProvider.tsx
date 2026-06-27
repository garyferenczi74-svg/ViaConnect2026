'use client';

// RenderTierProvider: selects and exposes the active avatar render tier
// (Prompt 210b, P7-T1).
//
// One React context holds the active tier and a sticky step-down callback. The
// initial tier comes from the capability probe (SSR-safe: 'cinematic' on the server
// / unknown devices, 'lite' on clearly low-power ones; never '2d', which is the
// existing WebGL-unavailable / render-error floor). At runtime the frame-budget
// monitor inside the Canvas reports a sustained budget-miss, and the provider steps
// the tier down one rung (cinematic -> lite -> 2d) and keeps it there for the
// session (no auto step-up, so the user is never flipped back and forth).
//
// The avatar AND any layer can read the tier via useRenderTier to scale its own
// cost. The monitor lives inside the r3f Canvas, which does not see React context
// across the reconciler boundary, so its budget-miss signal is passed DOWN as a
// prop (useReportBudgetMiss -> onBudgetMissed) rather than read from context there.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { probeRenderTier } from '@/lib/formavision/tier/capabilityProbe';
import { stepTierDown } from '@/lib/formavision/tier/tierLadder';
import type { RenderTier } from '@/lib/formavision/tier/types';

interface RenderTierContextValue {
  tier: RenderTier;
  reportBudgetMiss: () => void;
}

// Default value so a consumer outside any provider degrades safely to the capable
// path (cinematic) with a no-op report, never throwing. This keeps the avatar
// byte-identical when used without the provider.
const RenderTierContext = createContext<RenderTierContextValue>({
  tier: 'cinematic',
  reportBudgetMiss: () => {},
});

export interface RenderTierProviderProps {
  children: ReactNode;
  // Optional override for the initial tier (tests, or a caller that already probed).
  // When omitted the capability probe runs once on mount.
  initialTier?: RenderTier;
}

export function RenderTierProvider({ children, initialTier }: RenderTierProviderProps) {
  // Probe once on mount. The lazy initializer runs the SSR-safe probe: the server
  // and a capable client both yield 'cinematic' (no hydration-visible difference,
  // since the tier only feeds the ssr:false 3D canvas), while a low-power client
  // resolves to 'lite' on its first client render.
  const [tier, setTier] = useState<RenderTier>(() => initialTier ?? probeRenderTier());

  // Sticky one-rung step-down per reported budget-miss. stepTierDown never steps up
  // and never advances past the 2d floor, so repeated reports cannot thrash.
  const reportBudgetMiss = useCallback(() => {
    setTier((current) => stepTierDown(current));
  }, []);

  const value = useMemo<RenderTierContextValue>(
    () => ({ tier, reportBudgetMiss }),
    [tier, reportBudgetMiss],
  );

  return <RenderTierContext.Provider value={value}>{children}</RenderTierContext.Provider>;
}

// The active tier, for the avatar and any cost-scaling layer.
export function useRenderTier(): RenderTier {
  return useContext(RenderTierContext).tier;
}

// The sticky step-down trigger, passed down as a prop into the Canvas monitor.
export function useReportBudgetMiss(): () => void {
  return useContext(RenderTierContext).reportBudgetMiss;
}
