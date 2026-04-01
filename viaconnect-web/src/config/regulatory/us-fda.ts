// US FDA Regulatory Status — FarmCeutica Peptide Portfolio (March 2026)

export const US_FDA_STATUS = {

  generalStatus: {
    summary: 'No peptide in the 27-product lineup is FDA-approved as a drug for general wellness, longevity, adrenal support, mitochondrial optimization, or similar indications (one exception: SS-31 for Barth syndrome only)',
    classification: 'Positioned as precision wellness nutraceuticals, NOT drugs',
    legalBasis: 'Oral delivery via dual liposomal-micellar system in the wellness/supplement category',
  },

  compoundingStatus: {
    category2List: 'In late 2023, FDA placed ~19 popular peptides on Category 2 Bulk Drug Substances list (potential significant safety risks). This prohibited routine compounding for BPC-157, Epitalon, GHK-Cu injectable, Thymosin \u03b11/\u03b24 fragments, and others.',
    feb2026Update: 'February 2026: HHS Secretary Robert F. Kennedy Jr. announced ~14 peptides may shift back to Category 1, potentially restoring compounding pharmacy access under physician prescription.',
    currentStatus: 'As of late March 2026: formal FDA list update is STILL PENDING. No final reclassification confirmed in official guidance.',
    implication: 'Even if reclassified, these remain unapproved drugs \, NOT over-the-counter or supplement ingredients. Compounded versions require valid prescriptions.',
  },

  dsheaStatus: {
    summary: 'Peptides generally do not qualify as dietary ingredients under DSHEA unless they have a history of safe use in food or were marketed as supplements before 1994.',
    fdaPosition: 'FDA has stated BPC-157 and similar are not lawful dietary ingredients.',
    grayArea: 'Oral versions sold as supplements exist in a regulatory gray area but carry enforcement risk if claims cross into drug territory.',
    pending2026: 'Ongoing FDA discussions (2026 public meetings) explore expanding dietary substance definitions to include novel ingredients like peptides. No changes finalized.',
  },

  researchUseOnly: {
    summary: 'Many peptides are legally sold for Research Use Only (RUO). Marketing or implying human use violates FDA rules.',
    implication: 'ViaConnect must NEVER position products as RUO \, they are wellness nutraceuticals.',
  },

  ssException: {
    product: 'SS-31 / Elamipretide',
    brandName: 'Forzinity\u2122',
    approval: 'FDA accelerated approval September 2025 (injection) for improving muscle strength in Barth syndrome patients (\u226530 kg)',
    significance: 'First mitochondria-targeted therapy approved in the US',
    restriction: 'Use strictly limited to this rare indication. Off-label wellness/energy marketing is PROHIBITED and could attract scrutiny.',
    viaconnectImplication: 'EnergyCore\u2122 and MitoPeptide\u2122 are oral analogs \, they must NEVER reference the FDA approval as applying to FarmCeutica products. The approval applies ONLY to Forzinity\u2122 injection for Barth syndrome.',
  },

  wadaStatus: {
    summary: 'Many peptides (BPC-157, TB-500, etc.) are prohibited under WADA S0 (unapproved substances).',
    implication: 'If user indicates they are a competitive athlete, flag WADA prohibition in their profile.',
  },
};
