/**
 * Prompt 227b G66: Lex-scoped public copy for Science curation transparency.
 * Single module for review. No advisory claims. No em/en dashes.
 */

export const CURATION_TRANSPARENCY_COPY_227B = {
  sectionTitle: 'Curation transparency',
  sectionLead:
    'How Collection 14 evidence changes are proposed, reviewed, and corrected. Discovery is automatic; promotion is reviewed.',

  reviewTitle: 'Review queue',
  reviewLead:
    'Items waiting for human review before they become assertions. A non-zero queue is a credibility signal, not a weakness.',
  reviewDepthLabel: 'Pending proposals',
  reviewMedianLabel: 'Median time to review',
  reviewMedianUnknown: 'UNKNOWN (no reviewed sample yet)',
  reviewEmpty: 'Review queue depth: 0',
  reviewByClass: 'By change class',

  additionsTitle: 'Recent additions',
  additionsLead:
    'Records that entered the corpus recently (auto-applied Class 0 freshness or approved additions). Aggregate view, not a raw log.',
  additionsEmpty: 'No recent additions recorded yet',

  correctionsTitle: 'Corrections log',
  correctionsLead:
    'When we downgraded a claim, reversed a status, or acted on a retracted citation. Marshall-approved public summaries only.',
  correctionsEmpty: 'No Marshall-approved corrections published yet',

  coverageTitle: 'Coverage and negative results',
  coverageLead:
    'Where gaps remain, and where searches confirmed nothing. Empty is a finding, not a failure.',
  coverageUnknown: 'Negative-result coverage UNKNOWN until a cycle completes',
  coverageEmptyNegatives: 'No negative results stored yet',
  censusLabel: 'Latest gap census',

  cycleTitle: 'Last curation cycle',
  cycleEmpty: 'No curation cycles recorded yet',
  cycleGapsClosed: 'Gaps closed',
  cycleNegatives: 'Negative results',
  cycleProposals: 'Proposals raised',

  signInRequired: 'Sign in to view curation transparency.',
  unavailable: 'Curation transparency unavailable',
  loading: 'Loading curation transparency...',

  classLabels: {
    '0': 'Class 0 additive',
    '1': 'Class 1 downgrade',
    '2': 'Class 2 review',
    '3': 'Class 3 regulatory',
    '4': 'Class 4 safety',
    '5': 'Class 5 escalation',
  } as Record<string, string>,

  censusKeys: {
    unknownFdaStatus: 'UNKNOWN FDA status',
    unknownWadaStatus: 'UNKNOWN WADA status',
    unknown503a: 'UNKNOWN 503A category',
    zeroEvidenceLinks: 'Zero evidence links',
    weakGoalLinks: 'Weak goal links',
    unknownBioavailabilityRoutes: 'UNKNOWN bioavailability routes',
    peptidesEducational: 'Educational compounds',
  } as Record<string, string>,
} as const;
