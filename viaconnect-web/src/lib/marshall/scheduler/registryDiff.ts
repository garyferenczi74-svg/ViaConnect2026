// Prompt #125 P1: Rule registry material-change classifier.
//
// When a clearance receipt was issued against rule registry version A and
// the current version is B, the scheduler bridge asks: "is B materially
// newer than A, such that the receipt should be considered stale and a
// fresh scan must run?"
//
// Material changes:
//   - New rule added
//   - Rule severity raised (P2 -> P1, P1 -> P0)
//   - Rule confidence threshold lowered (detects more content)
//   - Rule trigger surface widened (new Surface enum value)
//   - Rule removed (auditors expect consistent rule-set; flag for re-scan)
//
// Cosmetic changes (not material):
//   - Remediation suggestion wording
//   - Example text
//   - Rule display name
//   - Help URL
//
// Implementation keeps this function pure over a registry snapshot. The
// actual loading of two registry snapshots (by version string) lives in
// the shared precheck engine (#121); this module only classifies the diff
// so the tests can exercise edge cases without DB.

export const SEVERITY_RANK: Record<string, number> = {
  P4: 4,
  P3: 3,
  P2: 2,
  P1: 1,
  P0: 0,
};

export interface RuleSnapshot {
  ruleId: string;
  severity: string; // 'P0' | 'P1' | 'P2' | 'P3' | 'P4'
  confidenceThreshold: number; // 0..1; LOWER threshold = more content flagged
  surfaces: string[]; // e.g., ['instagram_post', 'product_page']
  remediationWording?: string; // cosmetic
  displayName?: string; // cosmetic
  helpUrl?: string; // cosmetic
}

export interface RegistrySnapshot {
  registryVersion: string;
  rules: RuleSnapshot[];
}

export interface MaterialChangeReason {
  kind:
    | 'rule_added'
    | 'rule_removed'
    | 'severity_raised'
    | 'threshold_lowered'
    | 'surface_widened';
  ruleId: string;
  detail?: string;
}

/**
 * Returns the list of material changes between `from` and `to`. Empty list
 * means only cosmetic changes; receipt remains valid.
 */
export function registryMaterialChanges(
  from: RegistrySnapshot,
  to: RegistrySnapshot,
): MaterialChangeReason[] {
  const reasons: MaterialChangeReason[] = [];
  const fromIndex = new Map<string, RuleSnapshot>(from.rules.map((r) => [r.ruleId, r]));
  const toIndex = new Map<string, RuleSnapshot>(to.rules.map((r) => [r.ruleId, r]));

  for (const [id, next] of toIndex) {
    const prior = fromIndex.get(id);
    if (!prior) {
      reasons.push({ kind: 'rule_added', ruleId: id });
      continue;
    }
    const priorRank = SEVERITY_RANK[prior.severity] ?? Number.POSITIVE_INFINITY;
    const nextRank = SEVERITY_RANK[next.severity] ?? Number.POSITIVE_INFINITY;
    if (nextRank < priorRank) {
      reasons.push({
        kind: 'severity_raised',
        ruleId: id,
        detail: `${prior.severity} -> ${next.severity}`,
      });
    }
    if (next.confidenceThreshold < prior.confidenceThreshold - 1e-9) {
      reasons.push({
        kind: 'threshold_lowered',
        ruleId: id,
        detail: `${prior.confidenceThreshold} -> ${next.confidenceThreshold}`,
      });
    }
    const priorSurfaces = new Set(prior.surfaces);
    const added = next.surfaces.filter((s) => !priorSurfaces.has(s));
    if (added.length > 0) {
      reasons.push({
        kind: 'surface_widened',
        ruleId: id,
        detail: added.join(','),
      });
    }
  }

  for (const id of fromIndex.keys()) {
    if (!toIndex.has(id)) {
      reasons.push({ kind: 'rule_removed', ruleId: id });
    }
  }

  return reasons;
}

/**
 * Thin boolean wrapper: true when any material change is present.
 * Matches the test fixture naming in §16 of the spec.
 */
export function isMaterialChange(
  from: RegistrySnapshot,
  to: RegistrySnapshot,
): boolean {
  return registryMaterialChanges(from, to).length > 0;
}
