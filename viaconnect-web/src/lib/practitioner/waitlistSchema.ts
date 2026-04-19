// Zod schema for the practitioner waitlist API payload.
// Single source of truth shared between the POST /api/waitlist/practitioner
// route and the public signup form's client-side validation.

import { z } from 'zod';

export const credentialTypeSchema = z.enum([
  'md', 'do', 'nd', 'dc', 'np', 'pa', 'rd', 'lac', 'other',
]);
export type CredentialType = z.infer<typeof credentialTypeSchema>;

export const primaryClinicalFocusSchema = z.enum([
  'functional_medicine', 'integrative_medicine', 'naturopathic',
  'chiropractic', 'nutrition', 'acupuncture_tcm',
  'ayurvedic', 'longevity', 'precision_wellness',
  'general_primary_care', 'other',
]);
export type PrimaryClinicalFocus = z.infer<typeof primaryClinicalFocusSchema>;

export const referralSourceSchema = z.enum([
  'forbes_article', 'carlyle_social', 'podcast',
  'direct_email', 'colleague_referral', 'conference',
  'search_engine', 'social_media', 'other',
]);
export type ReferralSource = z.infer<typeof referralSourceSchema>;

const optionalUrl = z
  .string()
  .url()
  .or(z.literal(''))
  .optional();

export const waitlistSubmissionSchema = z.object({
  email: z.string().email().max(254),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().max(40).optional(),

  practiceName: z.string().min(1).max(200),
  practiceUrl: optionalUrl,
  practiceStreetAddress: z.string().max(200).optional(),
  practiceCity: z.string().max(100).optional(),
  practiceState: z.string().max(100).optional(),
  practicePostalCode: z.string().max(20).optional(),

  credentialType: credentialTypeSchema,
  credentialTypeOther: z.string().max(100).optional(),
  licenseState: z.string().max(50).optional(),
  licenseNumber: z.string().max(100).optional(),
  npiNumber: z.string().max(20).optional(),
  yearsInPractice: z.number().int().min(0).max(80).optional(),

  approximatePatientPanelSize: z.number().int().min(0).optional(),
  primaryClinicalFocus: primaryClinicalFocusSchema,
  primaryClinicalFocusOther: z.string().max(200).optional(),
  specialties: z.array(z.string().max(100)).max(20).optional(),
  usesGeneticTesting: z.boolean().optional(),
  currentlyDispensingSupplements: z.boolean().optional(),
  estimatedMonthlySupplementVolumeCents: z.number().int().min(0).optional(),

  referralSource: referralSourceSchema,
  referralSourceOther: z.string().max(200).optional(),
  interestReason: z.string().min(20).max(2000),
  biggestClinicalChallenge: z.string().max(2000).optional(),
  desiredPlatformFeatures: z.array(z.string().max(100)).max(20).optional(),

  invitationToken: z.string().optional(),

  utmSource: z.string().max(100).optional(),
  utmMedium: z.string().max(100).optional(),
  utmCampaign: z.string().max(100).optional(),
});

export type WaitlistSubmission = z.infer<typeof waitlistSubmissionSchema>;
