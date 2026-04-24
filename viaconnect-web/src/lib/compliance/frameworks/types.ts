// Prompt #127 P1: Multi-framework registry types.
//
// Framework definitions live in code at
// src/lib/compliance/frameworks/definitions/*.ts. The DB table
// compliance_frameworks holds attestation-facing strings only; the
// structural data (controls, narrator conventions, cross-references)
// is the git-tracked registry module.
//
// The TypeScript definitions are intentionally permissive — they
// describe SOC 2 today (the only active definition in P1) and scale up
// to HIPAA + ISO in later phases without needing shape changes.

export const FRAMEWORK_IDS = ['soc2', 'hipaa_security', 'iso_27001_2022'] as const;
export type FrameworkId = (typeof FRAMEWORK_IDS)[number];

export const ATTESTOR_ROLES = ['compliance_officer', 'security_officer', 'isms_manager'] as const;
export type AttestorRole = (typeof ATTESTOR_ROLES)[number];

export type AttestationType =
  | 'type_i'
  | 'type_ii'
  | 'continuous_with_annual_risk_analysis'
  | 'certification_audit';

/**
 * Full framework definition. One per framework, stored as TypeScript
 * constants. The registry_version string is pinned into every generated
 * packet so historical audits can reproduce exactly what rules and
 * definitions were in effect when a packet was built.
 */
export interface FrameworkDefinition {
  id: FrameworkId;
  version: string; // framework standard version, e.g., 'soc2-2017' (TSC revision)
  displayName: string;
  registryVersion: string; // semver string for this registry module
  attestationType: AttestationType;
  attestorRole: AttestorRole;
  attestationLanguage: string;
  controlPoints: readonly ControlPoint[];
  specialArtifacts: readonly SpecialArtifactRequirement[];
  scopeDeclaration: ScopeDeclarationSchema;
  /** Top-level ZIP category directories this framework emits. */
  categoryDirs: Readonly<Record<string, string>>;
  /** Narrator system-prompt addendum (merged with the base #126 prompt when narrator lands). */
  narratorPromptAddendum: string;
}

/**
 * One control / safeguard / Annex-A entry.
 *
 *   - SOC 2 populates requiredOrAddressable = undefined and
 *     defaultApplicability = undefined.
 *   - HIPAA populates requiredOrAddressable.
 *   - ISO 27001 populates defaultApplicability (SoA default).
 */
export interface ControlPoint {
  id: string; // framework-native id: 'CC4.1' | '164.308(a)(1)(ii)(A)' | 'A.8.15'
  framework: FrameworkId;
  category: string; // 'Common Criteria' | 'Administrative Safeguards' | 'Organizational Controls'
  name: string;
  description: string;
  requiredOrAddressable?: 'required' | 'addressable';
  defaultApplicability?: 'applicable' | 'excluded';
  /** Collector IDs that satisfy this control. Used by the crosswalk + SOC 2 assembler. */
  evidenceSources: readonly string[];
  /** Narrator section kinds this control expects. */
  narratorSections: readonly NarratorSectionSpec[];
  /** Cross-framework equivalence references; populated as other frameworks land. */
  crossFrameworkReferences?: readonly CrossFrameworkReference[];
}

export interface CrossFrameworkReference {
  framework: FrameworkId;
  controlId: string;
  relationship: 'equivalent' | 'overlapping' | 'partial';
}

export interface NarratorSectionSpec {
  /** Framework-specific section kind. SOC 2 uses 'control_description' etc. */
  kind: string;
  required: boolean;
  carryoverAllowed: boolean;
  generatorTone: 'declarative' | 'procedural' | 'outcome_based';
}

export interface SpecialArtifactRequirement {
  id: string;
  displayName: string;
  required: boolean;
  evidenceSource: 'manual_vault' | 'automated_collector';
  maxAgeDays: number;
  attestationRequired: boolean;
}

export interface ScopeDeclarationSchema {
  /** Machine-readable JSON shape that gets serialized into the packet's scope.json. */
  shape: 'soc2_tsc_list' | 'hipaa_covered_entity' | 'iso_isms_scope';
  /** Human-readable label shown in admin UI. */
  label: string;
}

/** Aggregate registry — loads all defined frameworks. */
export interface FrameworkRegistry {
  frameworks: Readonly<Record<FrameworkId, FrameworkDefinition>>;
  registryVersion: string; // top-level version across all frameworks
}
