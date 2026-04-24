// Prompt #127 P7: Cross-framework consistency rules.
//
// Each rule is a pure function that produces zero or more RegistryFlag
// entries given the registry + DB state. The checker's runAll composes
// them into a single scan pass.
//
// Rules avoid overlapping: each captures a distinct failure mode so the
// UI can group by flag kind without deduplication.

import { loadRegistry } from '@/lib/compliance/frameworks/registry';
import type { FrameworkId, ControlPoint } from '@/lib/compliance/frameworks/types';
import type { CheckerInput, RegistryFlag } from './types';

/**
 * Rule 1:Every crossFrameworkReference resolves to an existing control in
 * the target framework. If not, the registry was edited incorrectly and the
 * packet assembler will end up with a dangling reference. Critical.
 */
export function checkBrokenCrossReferences(): RegistryFlag[] {
  const reg = loadRegistry();
  const flags: RegistryFlag[] = [];

  // Build an index: framework -> set of valid control ids
  const validIds: Partial<Record<FrameworkId, Set<string>>> = {};
  for (const fid of Object.keys(reg.frameworks) as FrameworkId[]) {
    validIds[fid] = new Set(reg.frameworks[fid].controlPoints.map((c) => c.id));
  }

  for (const fid of Object.keys(reg.frameworks) as FrameworkId[]) {
    const def = reg.frameworks[fid];
    for (const c of def.controlPoints) {
      for (const ref of c.crossFrameworkReferences ?? []) {
        const targetSet = validIds[ref.framework];
        if (!targetSet || !targetSet.has(ref.controlId)) {
          flags.push({
            frameworkId: fid,
            controlRef: c.id,
            relatedFrameworkId: ref.framework,
            relatedControlRef: ref.controlId,
            flagKind: 'registry_broken_reference',
            severity: 'critical',
            description: `Control ${c.id} in ${fid} references ${ref.framework}:${ref.controlId} which does not exist in the ${ref.framework} registry.`,
            registryVersion: reg.registryVersion,
          });
        }
      }
    }
  }
  return flags;
}

/**
 * Rule 2:Every evidenceSources entry references a collector id that is
 * known to the system. Critical; a dangling collector reference means the
 * packet assembler will silently skip the control's evidence.
 */
export function checkEvidenceSourceCollectors(input: CheckerInput): RegistryFlag[] {
  const reg = loadRegistry();
  const flags: RegistryFlag[] = [];
  for (const fid of Object.keys(reg.frameworks) as FrameworkId[]) {
    const def = reg.frameworks[fid];
    for (const c of def.controlPoints) {
      for (const src of c.evidenceSources) {
        if (!input.knownCollectorIds.has(src)) {
          flags.push({
            frameworkId: fid,
            controlRef: c.id,
            relatedFrameworkId: null,
            relatedControlRef: null,
            flagKind: 'evidence_source_missing_collector',
            severity: 'critical',
            description: `Control ${c.id} in ${fid} cites collector "${src}" which is not registered in DB_COLLECTORS, HIPAA_COLLECTORS, or ISO_COLLECTORS.`,
            registryVersion: reg.registryVersion,
          });
        }
      }
    }
  }
  return flags;
}

/**
 * Rule 3:An ISO Annex A control marked 'excluded' in the Statement of
 * Applicability cannot have an equivalent-relationship HIPAA Required
 * safeguard: HIPAA Required is not optional, so excluding the ISO
 * counterpart creates a cross-framework contradiction. Warning unless
 * the HIPAA framework itself is excluded from scope (currently in scope).
 */
export function checkSoaExcludesMandatedControl(input: CheckerInput): RegistryFlag[] {
  const reg = loadRegistry();
  const flags: RegistryFlag[] = [];
  const iso = reg.frameworks.iso_27001_2022;
  const hipaa = reg.frameworks.hipaa_security;
  const hipaaById = new Map<string, ControlPoint>();
  for (const h of hipaa.controlPoints) hipaaById.set(h.id, h);

  for (const c of iso.controlPoints) {
    if (!c.id.startsWith('A.')) continue;
    const soa = input.soaByControlRef.get(c.id);
    if (!soa || soa.applicability !== 'excluded') continue;

    for (const ref of c.crossFrameworkReferences ?? []) {
      if (ref.framework !== 'hipaa_security' || ref.relationship !== 'equivalent') continue;
      const hipaaControl = hipaaById.get(ref.controlId);
      if (!hipaaControl || hipaaControl.requiredOrAddressable !== 'required') continue;

      flags.push({
        frameworkId: 'iso_27001_2022',
        controlRef: c.id,
        relatedFrameworkId: 'hipaa_security',
        relatedControlRef: ref.controlId,
        flagKind: 'soa_excludes_mandated_control',
        severity: 'critical',
        description: `SoA excludes ${c.id} (${c.name}) but it is equivalent to HIPAA Required safeguard ${ref.controlId}. HIPAA Required cannot be excluded from scope.`,
        registryVersion: reg.registryVersion,
      });
    }
  }
  return flags;
}

/**
 * Rule 4:HIPAA Addressable safeguard has an equivalent-relationship ISO
 * Annex A control marked 'implemented' in the SoA. Addressable does not
 * require the specific control; the ISO "implemented" status should be
 * reviewed to confirm the equivalent measure aligns with the addressable
 * determination. Info-severity review prompt, not a blocker.
 */
export function checkAddressableImplementedDrift(input: CheckerInput): RegistryFlag[] {
  const reg = loadRegistry();
  const flags: RegistryFlag[] = [];
  const iso = reg.frameworks.iso_27001_2022;
  const hipaa = reg.frameworks.hipaa_security;
  const hipaaById = new Map<string, ControlPoint>();
  for (const h of hipaa.controlPoints) hipaaById.set(h.id, h);

  for (const c of iso.controlPoints) {
    if (!c.id.startsWith('A.')) continue;
    const soa = input.soaByControlRef.get(c.id);
    if (!soa || soa.implementationStatus !== 'implemented') continue;

    for (const ref of c.crossFrameworkReferences ?? []) {
      if (ref.framework !== 'hipaa_security' || ref.relationship !== 'equivalent') continue;
      const hipaaControl = hipaaById.get(ref.controlId);
      if (!hipaaControl || hipaaControl.requiredOrAddressable !== 'addressable') continue;

      flags.push({
        frameworkId: 'iso_27001_2022',
        controlRef: c.id,
        relatedFrameworkId: 'hipaa_security',
        relatedControlRef: ref.controlId,
        flagKind: 'addressable_vs_implemented_drift',
        severity: 'info',
        description: `ISO ${c.id} is implemented and equivalent to HIPAA Addressable safeguard ${ref.controlId}. Confirm the HIPAA Addressable determination aligns with the ISO implementation approach.`,
        registryVersion: reg.registryVersion,
      });
    }
  }
  return flags;
}

/**
 * Rule 5:A control in framework X has zero evidenceSources AND zero
 * crossFrameworkReferences whose target control has evidenceSources. Such a
 * control is unreachable for automated evidence and must be backed by
 * manual-vault artifacts. Warning: the packet will still sign but auditors
 * will ask how the control is demonstrated.
 *
 * Intentionally skipped for clauses the framework already lists under
 * specialArtifacts (they are known manual-vault controls).
 */
export function checkCoverageGap(): RegistryFlag[] {
  const reg = loadRegistry();
  const flags: RegistryFlag[] = [];

  function hasEvidenceViaReferences(c: ControlPoint): boolean {
    if (c.evidenceSources.length > 0) return true;
    for (const ref of c.crossFrameworkReferences ?? []) {
      const targetFramework = reg.frameworks[ref.framework];
      if (!targetFramework) continue;
      const targetControl = targetFramework.controlPoints.find((t) => t.id === ref.controlId);
      if (targetControl?.evidenceSources.length && targetControl.evidenceSources.length > 0) return true;
    }
    return false;
  }

  for (const fid of Object.keys(reg.frameworks) as FrameworkId[]) {
    const def = reg.frameworks[fid];
    const manualArtifactControls = new Set<string>(); // controls already declared manual-vault backed
    // Heuristic: clauses + HIPAA Addressable + any SpecialArtifact reference
    for (const a of def.specialArtifacts) {
      if (a.evidenceSource === 'manual_vault') manualArtifactControls.add(a.id);
    }

    for (const c of def.controlPoints) {
      if (manualArtifactControls.has(c.id)) continue;
      if (hasEvidenceViaReferences(c)) continue;

      flags.push({
        frameworkId: fid,
        controlRef: c.id,
        relatedFrameworkId: null,
        relatedControlRef: null,
        flagKind: 'cross_framework_coverage_gap',
        severity: 'warning',
        description: `Control ${c.id} (${c.name}) in ${fid} has no automated evidence source and no equivalent control in other frameworks with evidence. Auditors will ask how this control is demonstrated.`,
        registryVersion: reg.registryVersion,
      });
    }
  }
  return flags;
}
