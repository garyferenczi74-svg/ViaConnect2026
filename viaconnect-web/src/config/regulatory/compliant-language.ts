// Compliant Language Rules — Peptide AI Engine Output
// Permitted, prohibited, and replacement patterns for regulatory safety

export const PERMITTED_LANGUAGE = {
  framing: [
    'supports natural patterns identified in your Ultrathink profile',
    'wellness optimization',
    'precision wellness nutraceutical',
    'SNP-targeted oral peptide support',
    'informed by clinical literature and functional medicine principles',
    'adrenal battery optimization',
    'mitochondrial efficiency support',
    'immune system wellness support',
    'cognitive wellness support',
    'hormonal balance optimization',
    'gut barrier wellness',
    'longevity wellness support',
    'informed by international studies',
    'bioregulatory support',
    'your body\'s natural processes',
  ],

  evidenceCitations: [
    'Research suggests...',
    'Clinical literature indicates...',
    'Studies have explored...',
    'International clinical experience supports...',
    'Peer-reviewed data shows potential for...',
    'Functional medicine frameworks suggest...',
  ],

  ssException: [
    'The SS-31 compound has received FDA approval for a specific rare condition (Barth syndrome)',
    'FarmCeutica\'s oral formulation is a wellness analog \, not the approved drug product',
  ],
};

export const PROHIBITED_LANGUAGE = {

  therapeuticClaims: [
    'treats',
    'cures',
    'heals',
    'prevents disease',
    'therapeutic',
    'medicinal',
    'clinical treatment',
    'prescribed for',
    'indicated for',
  ],

  diagnosticClaims: [
    'you have',
    'diagnosis',
    'diagnosed with',
    'your condition',
    'your disease',
    'disorder',
  ],

  fdaImplications: [
    'FDA-approved (when referring to FarmCeutica products)',
    'clinically proven',
    'medically proven',
    'scientifically proven to treat',
    'guaranteed results',
    'risk-free',
  ],

  drugPositioning: [
    'drug',
    'medication',
    'pharmaceutical',
    'prescription',
    'injectable',
  ],

  approvalImplications: [
    'approved by Health Canada',
    'approved in the US',
    'FDA cleared',
    'government approved',
    'regulated as safe',
  ],
};

export const LANGUAGE_REPLACEMENTS: Record<string, string> = {
  'treats fatigue': 'supports energy optimization patterns',
  'cures inflammation': 'supports your body\'s natural inflammatory balance',
  'heals gut lining': 'supports gut barrier wellness',
  'prevents cognitive decline': 'supports cognitive wellness optimization',
  'treats anxiety': 'supports mood balance and stress resilience',
  'FDA-approved formula': 'wellness formulation informed by clinical research',
  'clinically proven': 'supported by peer-reviewed clinical literature',
  'this drug': 'this wellness support product',
  'your condition': 'your identified pattern',
  'your disease': 'the pattern identified in your assessment',
  'disorder': 'pattern or imbalance',
};

export const COMPLIANT_MARKETING = {

  compliant: [
    'SNP-targeted oral peptide support informed by clinical literature and functional medicine principles',
    'Supports your body\'s natural mitochondrial energy production',
    'Precision wellness nutraceuticals designed around your unique genetic profile',
    'Informed by decades of international clinical research on bioregulatory peptides',
    'Dual liposomal-micellar delivery for enhanced oral bioavailability',
    'Your Ultrathink Symptom Profile identified patterns that may benefit from targeted nutritional support',
    'Wellness optimization grounded in genomics, functional medicine, and integrative science',
  ],

  nonCompliant: [
    'Treats chronic fatigue and adrenal insufficiency',
    'FDA-approved peptide therapy for energy',
    'Clinically proven to heal gut lining damage',
    'Cures brain fog and cognitive decline',
    'Medical-grade peptide treatment',
    'Prescription-strength peptide supplements',
    'This product replaces your medication',
  ],
};
