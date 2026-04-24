// Prompt #127 P7: Cross-framework consistency types.

import type { FrameworkId } from '@/lib/compliance/frameworks/types';

export const FLAG_KINDS = [
  'registry_broken_reference',
  'soa_excludes_mandated_control',
  'evidence_source_missing_collector',
  'addressable_vs_implemented_drift',
  'cross_framework_coverage_gap',
] as const;
export type FlagKind = (typeof FLAG_KINDS)[number];

export const FLAG_SEVERITIES = ['info', 'warning', 'critical'] as const;
export type FlagSeverity = (typeof FLAG_SEVERITIES)[number];

export interface RegistryFlag {
  frameworkId: FrameworkId;
  controlRef: string;
  relatedFrameworkId: FrameworkId | null;
  relatedControlRef: string | null;
  flagKind: FlagKind;
  severity: FlagSeverity;
  description: string;
  registryVersion: string;
}

/** Input to the consistency checker. */
export interface CheckerInput {
  /**
   * All collector IDs known to the system. Usually the union of
   * DB_COLLECTORS + HIPAA_COLLECTORS + ISO_COLLECTORS. Needed to detect
   * evidenceSources that reference a non-registered collector.
   */
  knownCollectorIds: Set<string>;
  /**
   * Current effective SoA rows keyed by Annex A control_ref. Only the
   * highest-version, currently-effective row per control is passed in.
   * Empty map is acceptable (means "no SoA recorded yet").
   */
  soaByControlRef: Map<string, { applicability: 'applicable' | 'excluded'; implementationStatus: string }>;
}

export interface CheckerResult {
  flags: RegistryFlag[];
  registryVersion: string;
}
