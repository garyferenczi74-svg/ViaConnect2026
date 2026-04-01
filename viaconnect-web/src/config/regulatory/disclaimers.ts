// Mandatory Disclaimer Templates — FarmCeutica Peptide Portfolio
// 7 disclaimer types with triggers and display locations

export const DISCLAIMERS = {

  standardFDA: {
    text: 'These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease.',
    required: true as const,
    displayLocation: 'Below every peptide product recommendation, product card, and protocol section',
  },

  wellnessPositioning: {
    text: 'FarmCeutica\u2122 peptide products are precision wellness nutraceuticals designed to support your body\'s natural optimization processes. They are informed by international clinical literature and functional medicine principles. They are NOT pharmaceutical drugs, NOT FDA-approved medications, and NOT intended to replace medical treatment.',
    required: true as const,
    displayLocation: 'On the /supplements page, Recommended Supplements tab, and any product detail view',
  },

  consultPractitioner: {
    text: 'Always consult your physician, naturopath, or qualified healthcare practitioner before starting any new supplement regimen \, especially if you are taking medications, are pregnant or nursing, or have pre-existing health conditions.',
    required: true as const,
    displayLocation: 'Bottom of every AI-generated protocol, Symptom Profile, and recommendation section',
    ctaButtons: ['Find a Physician', 'Find a Naturopath'] as const,
  },

  ssException: {
    text: 'Note: The compound SS-31/Elamipretide has received FDA accelerated approval as Forzinity\u2122 (injection) for a specific rare condition (Barth syndrome). FarmCeutica\'s oral formulations are wellness analogs utilizing dual liposomal-micellar delivery \, they are NOT the FDA-approved drug product and are not marketed for the treatment of any disease.',
    required: true as const,
    displayLocation: 'On any page referencing EnergyCore\u2122 or MitoPeptide\u2122',
  },

  athleteWADA: {
    text: 'Important for competitive athletes: certain peptide compounds (including BPC-157, TB-500, and others) are prohibited under WADA anti-doping rules (Category S0: unapproved substances). If you are a competitive athlete subject to anti-doping testing, consult your sports medicine physician before using any peptide product.',
    required: false as const,
    trigger: 'User selects "competitive athlete" in lifestyle or profile',
  },

  canadaSpecific: {
    text: 'These products have not been authorized by Health Canada. Natural health product regulations apply. Consult a qualified healthcare practitioner.',
    required: true as const,
    trigger: 'User location is Canada or user signed up with Calgary address',
  },

  internationalResearch: {
    text: 'Some research cited in your wellness profile is based on international clinical studies (including Russian/CIS bioregulator research by Dr. Vladimir Khavinson and colleagues). While this research represents decades of clinical experience, it has not been replicated in US/Canadian Phase 3 RCTs by modern Western standards. Evidence levels vary by compound.',
    required: true as const,
    displayLocation: 'In the Evidence footnotes of any Symptom Profile or Protocol section citing Khavinson research',
  },
};

export type DisclaimerKey = keyof typeof DISCLAIMERS;
