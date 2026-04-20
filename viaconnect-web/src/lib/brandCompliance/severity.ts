// Prompt #103 Phase 3: Pure severity classifier.
//
// Combines a list of issues into:
//   - overall severity (highest wins)
//   - status: clean -> approved auto, critical -> rejected auto,
//     anything else -> pending_human_review

import {
  CRITICAL_ISSUE_CODES,
  MAJOR_ISSUE_CODES,
  type ComplianceIssue,
  type ComplianceSeverity,
  type ComplianceStatus,
} from './types';

export function classifyIssue(code: ComplianceIssue['code']): ComplianceSeverity {
  if (CRITICAL_ISSUE_CODES.has(code)) return 'critical';
  if (MAJOR_ISSUE_CODES.has(code)) return 'major';
  return 'minor';
}

export function classifyOverallSeverity(issues: ComplianceIssue[]): ComplianceSeverity {
  if (issues.length === 0) return 'clean';
  let worst: ComplianceSeverity = 'minor';
  for (const i of issues) {
    if (i.severity === 'critical') return 'critical';
    if (i.severity === 'major') worst = 'major';
  }
  return worst;
}

export function initialStatusForSeverity(severity: ComplianceSeverity): ComplianceStatus {
  if (severity === 'clean') return 'approved';
  if (severity === 'critical') return 'rejected';
  return 'pending_human_review';
}
