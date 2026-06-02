// =============================================================================
// FormaVision brand config: the single source of truth for the user-facing
// brand of the body-scan feature.
//
// REAL-PATH NOTE: Prompt #169c specified a brand-config at the path
//   src/modules/body-tracker/formavision/brand-config.ts
// but that `src/modules/...` tree never existed in this codebase (it is a
// phantom path). This file is the real-path replacement that the rest of the
// body-tracker code imports. Brand strings live HERE and nowhere else, so the
// mark, descriptor, tiers, and tagline can be changed in exactly one place.
//
// SCOPE: this is the BRAND LAYER (user-visible copy) only. It does NOT rename
// routes (/body-tracker), tables (body_photo_sessions, body_scan_*), component
// filenames (BodyScan*), or the BodyScanDepth plugin. "Body Tracker" (the Gold
// tier manual-tracking capability, Prompt #169f) is a DISTINCT term and is NOT
// represented here.
//
// `trademark` carries the TM mark today (pre USPTO registration). When
// FormaVision is registered with the USPTO, flip the trademark value from the
// TM mark to the registered mark in this one place; that is the only edit
// needed across the whole product.
// =============================================================================

export const FORMAVISION_BRAND = Object.freeze({
  // Primary mark shown to users (Gary's decision: "FormaVision" is the brand).
  name: 'FormaVision',
  // The plain-language descriptor that sits alongside the mark.
  descriptor: 'Body Tracking AI',
  // Mark + descriptor, for primary feature headers that benefit from both.
  fullName: 'FormaVision Body Tracking AI',
  // Trademark form: the mark plus the TM mark, used until USPTO registration.
  // After registration, switch the TM mark to the registered mark here (the
  // single place to flip). The TM mark renders correctly at runtime.
  trademark: 'FormaVision™',
  // Brand tagline.
  tagline: 'Built For Your Biology',
  // Parent brand and legal entity.
  parentBrand: 'Via Cura',
  entity: 'Farmceutica Wellness Ltd',
  // Membership tier labels. Pro and Genomic are Phase 2; Tier 1 (Essential) is
  // the only tier live today.
  tiers: Object.freeze({
    essential: 'FormaVision Essential',
    pro: 'FormaVision Pro',
    genomic: 'FormaVision Genomic',
  }),
} as const);

export type FormaVisionBrand = typeof FORMAVISION_BRAND;
