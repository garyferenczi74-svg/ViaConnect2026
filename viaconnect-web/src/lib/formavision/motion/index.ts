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
export { assertSameTopology, lerpPositionsInto } from './morphPositions';
export {
  createMorphController,
  type MorphController,
  type MorphControllerOptions,
} from './morphController';
export {
  framingForRegion,
  FULL_BODY_FRAMING,
  type CameraFraming,
} from './regionFraming';
export {
  createCameraFramingController,
  type CameraFramingController,
  type CameraFramingControllerOptions,
} from './cameraFramingController';
export {
  createIdleTurntable,
  type IdleTurntable,
  type IdleTurntableOptions,
  type IdleTimer,
} from './idleTurntable';
export {
  circumferenceToUnit,
  formatRingValue,
  formatMeasurementValue,
  UNKNOWN_VALUE_MARKER,
} from './measurementValue';
export {
  calloutAnchors,
  calloutAnchorFor,
  labelSideFor,
  type CalloutAnchor,
  type CalloutSide,
} from './measurementCallouts';
export {
  createCalloutStaggerController,
  type CalloutStaggerController,
  type CalloutStaggerControllerOptions,
} from './calloutStaggerController';
export {
  createMeasurementRingController,
  type MeasurementRingController,
  type MeasurementRingControllerOptions,
} from './measurementRingController';
export {
  createHighlightController,
  type HighlightController,
  type HighlightControllerOptions,
} from './highlightController';
export {
  createEmphasisParticleController,
  type EmphasisParticleController,
  type EmphasisParticleControllerOptions,
} from './emphasisParticleController';
export {
  createOverlayController,
  type OverlayController,
  type OverlayControllerOptions,
} from './overlayController';
