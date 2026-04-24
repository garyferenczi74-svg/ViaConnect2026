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
import { ISO27001_FRAMEWORK } from './definitions/iso27001';
import type { FrameworkDefinition, FrameworkId, FrameworkRegistry } from './types';
import { FRAMEWORK_IDS } from './types';

const REGISTRY: FrameworkRegistry = {
  frameworks: {
    soc2: SOC2_FRAMEWORK,
    hipaa_security: HIPAA_FRAMEWORK,
    iso_27001_2022: ISO27001_FRAMEWORK,
  },
  registryVersion: 'v1.2.0', // P1 v1.0.0 (SOC2) -> P3 v1.1.0 (HIPAA) -> P5 v1.2.0 (ISO)
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
