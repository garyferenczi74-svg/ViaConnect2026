// Public surface of the FormaVision render-tier logic (Prompt 210b, P7-T1).
//
// Pure, framework-free pieces only: the capability probe, the step-down ladder, and
// the frame-budget sampler. The React context (RenderTierProvider / useRenderTier)
// lives with the avatar components and consumes these.

export {
  decideInitialTier,
  probeRenderTier,
  readCapabilitySignals,
  readRendererString,
  LOW_MEMORY_GB_STRONG,
  LOW_MEMORY_GB_COMBINED,
  LOW_CORE_COUNT_COMBINED,
  LOW_POWER_RENDERER_HINTS,
} from './capabilityProbe';
export { dprForTier, showParticlesForTier } from './tierCost';
export { stepTierDown, isFloorTier } from './tierLadder';
export {
  createFrameBudgetSampler,
  DEFAULT_FRAME_BUDGET_MS,
  DEFAULT_IDLE_GAP_MS,
  DEFAULT_OVER_BUDGET_WINDOW,
  type FrameBudgetSampler,
  type FrameBudgetSamplerOptions,
} from './frameBudgetMonitor';
export type { RenderTier, RenderTier3D, CapabilitySignals } from './types';
