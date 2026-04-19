// Revised Prompt #91 Phase 7.2: credential-driven default view + tab.
//
// Pure helpers consumed by the onboarding wizard when it converts a
// waitlist row into a practitioners row. Sets:
//   * default_patient_view_mode = 'naturopathic' for nd/dc/lac, else 'standard'
//   * default_active_tab        = 'naturopath'   for nd/dc/lac, else 'practice'

import {
  isNaturopathLikeCredential,
  type CredentialType,
} from './taxonomy';

export type DefaultPatientViewMode = 'standard' | 'naturopathic';
export type DefaultActiveTab       = 'practice' | 'naturopath';

export interface OnboardingDefaults {
  default_patient_view_mode: DefaultPatientViewMode;
  default_active_tab:        DefaultActiveTab;
}

export function defaultsForCredential(
  credentialType: string | CredentialType,
): OnboardingDefaults {
  const isNaturopathLike = isNaturopathLikeCredential(String(credentialType));
  return {
    default_patient_view_mode: isNaturopathLike ? 'naturopathic' : 'standard',
    default_active_tab:        isNaturopathLike ? 'naturopath'   : 'practice',
  };
}
