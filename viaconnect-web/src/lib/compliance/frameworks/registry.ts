// Prompt #127 P1: Framework registry loader.
//
// The registry is code (git-tracked) rather than DB rows. Every generated
// packet pins `registryVersion` so auditors reviewing a 2027 packet can
// identify exactly which rules were in effect when it was built.
//
// HIPAA + ISO definitions are stubs in P1 (no control points) so the
// registry loads cleanly but only SOC 2 drives live packet generation.
// P3 + P5 will replace the stub definitions with fully-populated ones.

import { SOC2_FRAMEWORK } from './definitions/soc2';
import { HIPAA_FRAMEWORK } from './definitions/hipaa';
import type { FrameworkDefinition, FrameworkId, FrameworkRegistry } from './types';
import { FRAMEWORK_IDS } from './types';

// ISO stub stays through P4 and is replaced with HIPAA-level population in P5.

const ISO_STUB: FrameworkDefinition = {
  id: 'iso_27001_2022',
  version: 'iso-27001-2022',
  displayName: 'ISO/IEC 27001:2022',
  registryVersion: 'v1.0.0-stub',
  attestationType: 'certification_audit',
  attestorRole: 'isms_manager',
  attestationLanguage:
    `I, the undersigned ISMS Manager of FarmCeutica Wellness LLC, attest that the foregoing descriptions accurately describe FarmCeutica's implementation and effectiveness of the identified ISO/IEC 27001:2022 controls during the period specified.`,
  controlPoints: [],
  specialArtifacts: [],
  scopeDeclaration: { shape: 'iso_isms_scope', label: 'ISMS scope statement' },
  categoryDirs: {
    clause_4:     'isms-clauses/clause-4-context',
    clause_5:     'isms-clauses/clause-5-leadership',
    clause_6:     'isms-clauses/clause-6-planning',
    clause_7:     'isms-clauses/clause-7-support',
    clause_8:     'isms-clauses/clause-8-operation',
    clause_9:     'isms-clauses/clause-9-performance-evaluation',
    clause_10:    'isms-clauses/clause-10-improvement',
    annex_a_5:    'annex-a-controls/A-5-organizational',
    annex_a_6:    'annex-a-controls/A-6-people',
    annex_a_7:    'annex-a-controls/A-7-physical',
    annex_a_8:    'annex-a-controls/A-8-technological',
  },
  narratorPromptAddendum:
    'ISO voice: cite Annex A controls as A.x.y and ISMS clauses as Clause N.N. For each control describe objective, implementation mechanism, and effectiveness separately. Respect SoA exclusions: excluded controls receive justification text, not implementation narrative.',
};

const REGISTRY: FrameworkRegistry = {
  frameworks: {
    soc2: SOC2_FRAMEWORK,
    hipaa_security: HIPAA_FRAMEWORK,
    iso_27001_2022: ISO_STUB,
  },
  registryVersion: 'v1.1.0', // bumped at P3: HIPAA now populated
};

/** Returns the registry loaded from code. Stable across a process lifetime. */
export function loadRegistry(): FrameworkRegistry {
  return REGISTRY;
}

/** Lookup a framework definition by ID; throws on unknown framework. */
export function getFramework(id: FrameworkId): FrameworkDefinition {
  const def = REGISTRY.frameworks[id];
  if (!def) throw new Error(`unknown framework id: ${id}`);
  return def;
}

/** Lookup a single control point by framework + native control id. */
export function getControlPoint(
  framework: FrameworkId,
  controlId: string,
): { framework: FrameworkId; control: ReturnType<typeof getFramework>['controlPoints'][number] } | null {
  const def = getFramework(framework);
  const match = def.controlPoints.find((c) => c.id === controlId);
  return match ? { framework, control: match } : null;
}

/** Returns every active framework id (regardless of stub status). */
export function activeFrameworkIds(): FrameworkId[] {
  return [...FRAMEWORK_IDS];
}

/** Returns only frameworks that have a populated control-point list. */
export function populatedFrameworkIds(): FrameworkId[] {
  return activeFrameworkIds().filter((id) => REGISTRY.frameworks[id].controlPoints.length > 0);
}
