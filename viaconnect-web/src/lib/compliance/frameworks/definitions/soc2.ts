// Prompt #127 P1: SOC 2 framework definition (re-expression of #122).
//
// This module re-expresses the existing SOC 2 scope from #122 as a
// FrameworkDefinition. Pure data; no behavior change in P1. P2 plugs
// this into the assembler and a byte-diff test proves the pre- and
// post-refactor packets are byte-identical (modulo ES256 random k).
//
// Control points listed here mirror the `controls` arrays declared by
// every #122 collector. Adding or removing a control point requires
// updating both the collector registration AND this definition.

import { SOC2_CATEGORY_DIRS } from '@/lib/soc2/types';
import type { ControlPoint, FrameworkDefinition, NarratorSectionSpec } from '../types';

const LAST_REVIEWED_REGISTRY = 'v1.0.0';

const STANDARD_SECTIONS: readonly NarratorSectionSpec[] = [
  { kind: 'control_description',       required: true,  carryoverAllowed: true,  generatorTone: 'declarative' },
  { kind: 'control_operation_summary', required: true,  carryoverAllowed: false, generatorTone: 'outcome_based' },
  { kind: 'managements_response',      required: false, carryoverAllowed: false, generatorTone: 'declarative' },
];

function ctl(
  id: string,
  category: string,
  name: string,
  description: string,
  evidenceSources: readonly string[],
): ControlPoint {
  return {
    id,
    framework: 'soc2',
    category,
    name,
    description,
    evidenceSources,
    narratorSections: STANDARD_SECTIONS,
  };
}

// Common Criteria (CC) controls used by #122 collectors
const CC_CONTROLS: readonly ControlPoint[] = [
  ctl('CC4.1', 'Common Criteria — Monitoring',
      'Ongoing control monitoring',
      'The entity selects, develops, and performs ongoing evaluations to ascertain whether the components of internal control are present and functioning.',
      ['marshall-findings-collector', 'hounddog-signals-collector', 'supabase-advisor-collector', 'counterfeit-determinations-collector']),
  ctl('CC4.2', 'Common Criteria — Monitoring',
      'Evaluation and communication of deficiencies',
      'The entity evaluates and communicates internal control deficiencies in a timely manner to the parties responsible for taking corrective action.',
      ['marshall-findings-collector', 'marshall-incidents-collector', 'hounddog-findings-collector', 'hounddog-signals-collector', 'precheck-sessions-collector']),
  ctl('CC4.3', 'Common Criteria — Monitoring',
      'Tamper-evident audit trail',
      'The entity maintains a tamper-evident audit log of compliance actions that supports independent verification.',
      ['marshall-audit-chain-collector']),
  ctl('CC5.2', 'Common Criteria — Control Activities',
      'Technology-based control activities',
      'The entity deploys technology-based control activities over technology infrastructure.',
      ['precheck-receipts-collector']),
  ctl('CC6.1', 'Common Criteria — Logical Access',
      'Logical access security',
      'The entity implements logical access security software, infrastructure, and architectures to authenticate and authorize users.',
      ['rls-policies-collector', 'users-roles-collector', 'mfa-enforcement-collector', 'key-rotation-collector', 'npi-reverify-collector']),
  ctl('CC6.2', 'Common Criteria — Logical Access',
      'Access management',
      'Prior to issuing system credentials and granting system access, the entity registers and authorizes new internal and external users.',
      ['privileged-actions-collector']),
  ctl('CC6.6', 'Common Criteria — Logical Access',
      'Cryptographic key management',
      'The entity implements logical access security measures to protect against threats from sources outside its system boundaries.',
      ['key-rotation-collector']),
  ctl('CC6.7', 'Common Criteria — Logical Access',
      'Transmission integrity and confidentiality',
      'The entity restricts the transmission, movement, and removal of information to authorized internal and external users and processes.',
      ['cert-expiry-collector']),
  ctl('CC7.1', 'Common Criteria — System Operations',
      'Infrastructure and software management',
      'The entity uses detection and monitoring procedures to identify changes to configurations that result in the introduction of new vulnerabilities.',
      ['anthropic-usage-collector', 'dependabot-collector']),
  ctl('CC7.2', 'Common Criteria — System Operations',
      'Security event monitoring',
      'The entity monitors system components and the operation of those components for anomalies that are indicative of malicious acts, natural disasters, and errors.',
      ['marshall-findings-collector', 'counterfeit-determinations-collector']),
  ctl('CC7.3', 'Common Criteria — System Operations',
      'Security incident response',
      'The entity evaluates security events to determine whether they could or have resulted in a failure of the entity to meet its objectives and, if so, takes actions to prevent or address such failures.',
      ['marshall-incidents-collector']),
  ctl('CC7.5', 'Common Criteria — System Operations',
      'Incident recovery and learning',
      'The entity identifies, develops, and implements activities to recover from identified security incidents.',
      ['marshall-audit-chain-collector']),
  ctl('CC8.1', 'Common Criteria — Change Management',
      'Change management process',
      'The entity authorizes, designs, develops, configures, documents, tests, approves, and implements changes to infrastructure, data, software, and procedures.',
      ['migrations-collector', 'github-prs-collector', 'vercel-deployments-collector']),
  ctl('CC8.2', 'Common Criteria — Change Management',
      'Change approvals',
      'The entity authorizes changes to infrastructure and software through a documented change-approval process.',
      ['github-prs-collector']),
  ctl('CC9.1', 'Common Criteria — Risk Mitigation',
      'Risk mitigation activities',
      'The entity identifies, selects, and develops risk mitigation activities for risks arising from potential business disruptions.',
      ['dependabot-collector']),
  ctl('CC9.2', 'Common Criteria — Risk Mitigation',
      'Vendor and business partner risk',
      'The entity assesses and manages risks associated with vendors and business partners.',
      ['vendor-baas-collector']),
];

// Availability (A) controls
const A_CONTROLS: readonly ControlPoint[] = [
  ctl('A1.1', 'Availability',
      'Capacity monitoring',
      'The entity maintains, monitors, and evaluates current processing capacity and use of system components.',
      ['uptime-collector', 'cert-expiry-collector']),
  ctl('A1.2', 'Availability',
      'Environmental protections and recovery',
      'The entity authorizes, designs, develops, and implements environmental protections and business continuity capabilities.',
      ['uptime-collector']),
];

// Confidentiality (C) controls
const C_CONTROLS: readonly ControlPoint[] = [
  ctl('C1.1', 'Confidentiality',
      'Confidential information protection',
      `The entity identifies and maintains confidential information to meet the entity's objectives related to confidentiality.`,
      ['rls-policies-collector', 'counterfeit-determinations-collector']),
  ctl('C1.3', 'Confidentiality',
      'Destruction of confidential information',
      'The entity retains and destroys confidential information to meet retention and disposal commitments.',
      ['precheck-sessions-collector']),
];

// Privacy (P) controls — P1–P8 per TSC 2017 privacy criteria
const P_CONTROLS: readonly ControlPoint[] = [
  ctl('P1', 'Privacy',        'Notice and communication of privacy policies', 'The entity provides notice about its privacy practices.', ['consent-ledger-collector']),
  ctl('P2', 'Privacy',        'Choice and consent',                            'The entity communicates choices available and obtains consent.', ['consent-ledger-collector']),
  ctl('P3', 'Privacy',        'Collection',                                    'The entity collects personal information consistent with its objectives.', ['consent-ledger-collector', 'vendor-baas-collector']),
  ctl('P4', 'Privacy',        'Use, retention, and disposal',                  'The entity limits use, retains only what is needed, and disposes of personal information securely.', ['consent-ledger-collector']),
  ctl('P5', 'Privacy',        'Access',                                        'The entity grants data subjects access to their personal information for review and update.', ['consent-ledger-collector', 'dsar-collector']),
  ctl('P6', 'Privacy',        'Disclosure and notification',                   'The entity discloses personal information only with appropriate consent.', ['consent-ledger-collector', 'dsar-collector']),
  ctl('P7', 'Privacy',        'Quality',                                       'The entity collects and maintains accurate, up-to-date, complete, and relevant personal information.', ['consent-ledger-collector']),
  ctl('P8', 'Privacy',        'Monitoring and enforcement',                    'The entity monitors compliance with its privacy policies and procedures.', ['consent-ledger-collector']),
];

export const SOC2_CONTROL_POINTS: readonly ControlPoint[] = [
  ...CC_CONTROLS,
  ...A_CONTROLS,
  ...C_CONTROLS,
  ...P_CONTROLS,
];

export const SOC2_FRAMEWORK: FrameworkDefinition = {
  id: 'soc2',
  version: 'soc2-2017',
  displayName: 'SOC 2 Type II',
  registryVersion: LAST_REVIEWED_REGISTRY,
  attestationType: 'type_ii',
  attestorRole: 'compliance_officer',
  attestationLanguage:
    "I, the undersigned Compliance Officer of FarmCeutica Wellness LLC, attest that the foregoing descriptions accurately describe FarmCeutica's design and operation of the identified controls during the period specified, and that the supporting evidence has been collected using the documented methodology.",
  controlPoints: SOC2_CONTROL_POINTS,
  specialArtifacts: [
    {
      id: 'soc2_annual_risk_assessment',
      displayName: 'Annual Risk Assessment',
      required: true,
      evidenceSource: 'manual_vault',
      maxAgeDays: 365,
      attestationRequired: true,
    },
    {
      id: 'soc2_management_response',
      displayName: `Management's Response`,
      required: false,
      evidenceSource: 'manual_vault',
      maxAgeDays: 120,
      attestationRequired: true,
    },
  ],
  scopeDeclaration: {
    shape: 'soc2_tsc_list',
    label: 'Trust Services Criteria in scope',
  },
  categoryDirs: SOC2_CATEGORY_DIRS,
  narratorPromptAddendum:
    'SOC 2 voice: plain-English draft prose describing how a specific control operated during a specific attestation period, written in the voice of FarmCeutica management. Cite Trust Services Criteria in the form CCx.y / Ax.y / Cx.y / Px. Avoid legal conclusions; describe design, operation, and evidence.',
};
