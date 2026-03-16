// Role types
export type UserRole = 'patient' | 'naturopath' | 'practitioner' | 'clinic_admin' | 'super_admin';

// Risk levels
export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

// Status types
export type TreatmentStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';
export type ConsentStatus = 'pending' | 'granted' | 'revoked' | 'expired';
export type InteractionSeverity = 'none' | 'mild' | 'moderate' | 'severe' | 'contraindicated';

// Portal paths
export const PORTAL_PATHS = {
  wellness: '/wellness',
  practitioner: '/practitioner',
  naturopath: '/naturopath',
} as const;

export type PortalType = keyof typeof PORTAL_PATHS;

// Role to portal mapping
export const ROLE_PORTAL_MAP: Record<UserRole, PortalType | null> = {
  patient: 'wellness',
  naturopath: 'naturopath',
  practitioner: 'practitioner',
  clinic_admin: 'practitioner',
  super_admin: 'practitioner',
};
