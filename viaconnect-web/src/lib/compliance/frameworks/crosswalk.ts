// Prompt #127 P1: Cross-framework crosswalk.
//
// Pure function. Given a collector ID, returns the control IDs in each
// framework that the collector's output satisfies. Used by:
//   - Packet assemblers to tag emitted files with the correct controls
//     per framework.
//   - Crosswalk viewer UI (P7) to answer "what does this evidence prove?"
//   - Auditor portal to show cross-framework references inline.
//
// The registry is the single source of truth; this module walks it.

import { loadRegistry } from './registry';
import type { FrameworkId } from './types';

export interface CrosswalkResult {
  soc2: string[];
  hipaa_security: string[];
  iso_27001_2022: string[];
}

/**
 * For a given collector, returns the control IDs in each framework that
 * its output satisfies. Unknown collectors return all-empty lists.
 */
export function crosswalk(collectorId: string): CrosswalkResult {
  const reg = loadRegistry();
  const result: CrosswalkResult = {
    soc2: [],
    hipaa_security: [],
    iso_27001_2022: [],
  };
  for (const fid of Object.keys(reg.frameworks) as FrameworkId[]) {
    const def = reg.frameworks[fid];
    for (const c of def.controlPoints) {
      if (c.evidenceSources.includes(collectorId)) {
        result[fid].push(c.id);
      }
    }
  }
  return result;
}

/**
 * Inverse lookup: given a framework + control id, return the collectors
 * that produce evidence for it.
 */
export function collectorsForControl(framework: FrameworkId, controlId: string): string[] {
  const def = loadRegistry().frameworks[framework];
  const c = def.controlPoints.find((cp) => cp.id === controlId);
  return c ? [...c.evidenceSources] : [];
}

/**
 * Given a collector ID, return the union of control IDs across all
 * frameworks flattened into a single list. Useful for UI summaries.
 */
export function allControlsForCollector(collectorId: string): Array<{ framework: FrameworkId; controlId: string }> {
  const cw = crosswalk(collectorId);
  const out: Array<{ framework: FrameworkId; controlId: string }> = [];
  for (const f of ['soc2', 'hipaa_security', 'iso_27001_2022'] as FrameworkId[]) {
    for (const c of cw[f]) {
      out.push({ framework: f, controlId: c });
    }
  }
  return out;
}
