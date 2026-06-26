// Public surface of the FormaVision motion foundation (Prompt 210b, P2-T1).
// Phase 2 motion tasks import the runner, easings, the r3f scheduler binding, and
// the materialize intro controller from here.

export { easeInOutCubic, easeOutCubic, linear, type EasingFn } from './easing';
export {
  createDemandAnimation,
  type DemandAnimation,
  type DemandAnimationOptions,
  type FrameScheduler,
} from './demandAnimation';
export { makeRafScheduler, useDemandScheduler } from './useDemandAnimation';
export {
  createMaterializeIntro,
  type MaterializeIntro,
  type MaterializeIntroOptions,
  type IntroTarget,
} from './materializeIntro';
