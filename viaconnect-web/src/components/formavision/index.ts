// FormaVision avatar public surface (Prompt 210b, task P1-T4).

export { FormaVision3DAvatar, default } from './FormaVision3DAvatar';
export type { FormaVision3DAvatarProps } from './FormaVision3DAvatar';
export { BodyCompositionAvatar } from './BodyCompositionAvatar';
export type {
  BodyCompositionAvatarProps,
  FloorMotionFrame,
} from './BodyCompositionAvatar';
export { FormaVisionAnatomicalFloor } from './FormaVisionAnatomicalFloor';
export type { FormaVisionAnatomicalFloorProps } from './FormaVisionAnatomicalFloor';
export { FormaVisionLocalSilhouette } from './FormaVisionLocalSilhouette';
export type { FormaVisionLocalSilhouetteProps } from './FormaVisionLocalSilhouette';
export {
  FormaVisionPlateNotice,
  FORMAVISION_PLATE_LOADING_NOTICE,
  FORMAVISION_PLATE_UNAVAILABLE_NOTICE,
  FORMAVISION_PLATE_NOTICE_TESTID,
} from './FormaVisionPlateNotice';
export type {
  FormaVisionPlateNoticeProps,
  PlateNoticeKind,
} from './FormaVisionPlateNotice';
export {
  SelectBodyPartControl,
  SELECT_BODY_PART_REGIONS,
} from './SelectBodyPartControl';
export type {
  SelectBodyPartControlProps,
  SelectableRegion,
} from './SelectBodyPartControl';
export { hasWebGL, probeWebGL } from './hasWebGL';
export type { WebGLProbeResult } from './hasWebGL';
export {
  FormaVisionFallbackNotice,
  FORMAVISION_FALLBACK_FLOOR_STACK_CLASS,
  FORMAVISION_FALLBACK_NOTICE_STACK_CLASS,
  FORMAVISION_FALLBACK_NOTICE_HOST_TESTID,
} from './FormaVisionFallbackNotice';
export type { FormaVisionFallbackNoticeProps } from './FormaVisionFallbackNotice';
// Prompt 211a W3: doctor-ready scan report download / share control.
export { DownloadReportButton } from './DownloadReportButton';
export type { DownloadReportButtonProps } from './DownloadReportButton';
export {
  RenderTierProvider,
  useRenderTier,
  useReportBudgetMiss,
} from './RenderTierProvider';
export type { RenderTierProviderProps } from './RenderTierProvider';
// Prompt 211a W4-2: cadence UI surfaces. ScanStreakDisplay is deliberately NOT
// exported here: it is consumer-only and imported directly by the (consumer)
// composition route so the import graph stays explicit and the consumer-only
// structural test (invariants.test.ts 4.6) can prove no practitioner route
// pulls it in. The three surfaces below are presentational and safe to barrel.
export { FingerprintFlag } from './FingerprintFlag';
export type { FingerprintFlagProps } from './FingerprintFlag';
export { ConsistencyTip } from './ConsistencyTip';
export type { ConsistencyTipProps } from './ConsistencyTip';
export { CadenceReminderOptIn } from './CadenceReminderOptIn';
export type { CadenceReminderOptInProps } from './CadenceReminderOptIn';
