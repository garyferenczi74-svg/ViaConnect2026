// Prompt 179c: canonical circumference sites (Section 5) and the mappings that
// bind them to the existing body_tracker_circumference columns and to the
// FormaVision body_scan_measurements girth outputs. PURE, no IO.

export type CanonicalSite =
  | 'neck'
  | 'shoulders'
  | 'chest'
  | 'left_bicep'
  | 'right_bicep'
  | 'left_forearm'
  | 'right_forearm'
  | 'waist'
  | 'hips'
  | 'left_thigh'
  | 'right_thigh'
  | 'left_calf'
  | 'right_calf';

export type SiteRegion = 'upper' | 'core' | 'lower';

export const SITES_BY_REGION: Record<SiteRegion, CanonicalSite[]> = {
  upper: ['neck', 'shoulders', 'chest', 'left_bicep', 'right_bicep', 'left_forearm', 'right_forearm'],
  core: ['waist', 'hips'],
  lower: ['left_thigh', 'right_thigh', 'left_calf', 'right_calf'],
};

export const ALL_SITES: CanonicalSite[] = [
  ...SITES_BY_REGION.upper,
  ...SITES_BY_REGION.core,
  ...SITES_BY_REGION.lower,
];

export const REGION_LABEL: Record<SiteRegion, string> = {
  upper: 'Upper',
  core: 'Core',
  lower: 'Lower',
};

export const SITE_LABEL: Record<CanonicalSite, string> = {
  neck: 'Neck',
  shoulders: 'Shoulders',
  chest: 'Chest',
  left_bicep: 'Left bicep',
  right_bicep: 'Right bicep',
  left_forearm: 'Left forearm',
  right_forearm: 'Right forearm',
  waist: 'Waist',
  hips: 'Hips',
  left_thigh: 'Left thigh',
  right_thigh: 'Right thigh',
  left_calf: 'Left calf',
  right_calf: 'Right calf',
};

// Canonical site -> body_tracker_circumference column (verified against the live
// schema: shoulders=shoulder_width, bicep=upper_arm, hips=hip, thigh=upper_thigh).
export const SITE_TO_COLUMN: Record<CanonicalSite, string> = {
  neck: 'neck',
  shoulders: 'shoulder_width',
  chest: 'chest',
  left_bicep: 'left_upper_arm',
  right_bicep: 'right_upper_arm',
  left_forearm: 'left_forearm',
  right_forearm: 'right_forearm',
  waist: 'waist',
  hips: 'hip',
  left_thigh: 'left_upper_thigh',
  right_thigh: 'right_upper_thigh',
  left_calf: 'left_calf',
  right_calf: 'right_calf',
};

// body_tracker_circumference column -> canonical site (inverse, for reads).
export const COLUMN_TO_SITE: Record<string, CanonicalSite> = Object.fromEntries(
  (Object.entries(SITE_TO_COLUMN) as Array<[CanonicalSite, string]>).map(([site, col]) => [col, site]),
) as Record<string, CanonicalSite>;

// body_scan_measurements girth field (cm) -> canonical site. waist_natural is the
// canonical waist. Fields with no canonical key (under_bust_circ_cm,
// waist_navel_circ_cm) are intentionally omitted and therefore ignored (Section 5).
export const SCAN_GIRTH_TO_SITE: Record<string, CanonicalSite> = {
  neck_circ_cm: 'neck',
  shoulder_circ_cm: 'shoulders',
  chest_circ_cm: 'chest',
  left_bicep_circ_cm: 'left_bicep',
  right_bicep_circ_cm: 'right_bicep',
  left_forearm_circ_cm: 'left_forearm',
  right_forearm_circ_cm: 'right_forearm',
  waist_natural_circ_cm: 'waist',
  hip_circ_cm: 'hips',
  left_thigh_circ_cm: 'left_thigh',
  right_thigh_circ_cm: 'right_thigh',
  left_calf_circ_cm: 'left_calf',
  right_calf_circ_cm: 'right_calf',
};
