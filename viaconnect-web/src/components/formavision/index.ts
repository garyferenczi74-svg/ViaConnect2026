// FormaVision avatar public surface (Prompt 210b, task P1-T4).

export { FormaVision3DAvatar, default } from './FormaVision3DAvatar';
export type { FormaVision3DAvatarProps } from './FormaVision3DAvatar';
export { BodyCompositionAvatar } from './BodyCompositionAvatar';
export type { BodyCompositionAvatarProps } from './BodyCompositionAvatar';
export {
  SelectBodyPartControl,
  SELECT_BODY_PART_REGIONS,
} from './SelectBodyPartControl';
export type {
  SelectBodyPartControlProps,
  SelectableRegion,
} from './SelectBodyPartControl';
export { hasWebGL } from './hasWebGL';
// Prompt 211a W3: doctor-ready scan report download / share control.
export { DownloadReportButton } from './DownloadReportButton';
export type { DownloadReportButtonProps } from './DownloadReportButton';
export {
  RenderTierProvider,
  useRenderTier,
  useReportBudgetMiss,
} from './RenderTierProvider';
export type { RenderTierProviderProps } from './RenderTierProvider';
