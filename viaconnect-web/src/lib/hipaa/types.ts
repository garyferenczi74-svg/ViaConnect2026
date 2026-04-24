// Prompt #127 P3: HIPAA shared types.

export type HipaaSanctionKind =
  | 'verbal_warning'
  | 'written_warning'
  | 'retraining'
  | 'suspension'
  | 'termination'
  | 'other';

export type HipaaContingencyTestKind =
  | 'data_backup_test'
  | 'disaster_recovery_test'
  | 'emergency_mode_test'
  | 'full_tabletop_exercise'
  | 'live_drill';

export type HipaaDeviceMediaEventKind =
  | 'received'
  | 'reissued'
  | 'disposed'
  | 'sanitized'
  | 'reused'
  | 'moved'
  | 'lost'
  | 'stolen';

export type HipaaBreachDetermination =
  | 'breach_confirmed'
  | 'low_probability_of_compromise'
  | 'not_applicable';

/**
 * The four-factor breach risk assessment required by 45 CFR 164.402 before
 * concluding that an impermissible acquisition / access / use / disclosure
 * of PHI does NOT constitute a reportable breach.
 */
export interface BreachFourFactorAssessment {
  nature_and_extent_of_phi: string;
  unauthorized_person_receiving: string;
  phi_actually_acquired_or_viewed: string;
  mitigation_taken: string;
}
