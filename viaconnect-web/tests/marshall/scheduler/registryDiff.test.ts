import { describe, it, expect } from 'vitest';
import {
  registryMaterialChanges,
  isMaterialChange,
  type RegistrySnapshot,
  type RuleSnapshot,
} from '@/lib/marshall/scheduler/registryDiff';

function rule(over: Partial<RuleSnapshot>): RuleSnapshot {
  return {
    ruleId: 'R.DEFAULT',
    severity: 'P2',
    confidenceThreshold: 0.8,
    surfaces: ['instagram_post'],
    remediationWording: 'Add disclaimer.',
    displayName: 'Default',
    helpUrl: 'https://example.com/default',
    ...over,
  };
}

function snapshot(version: string, rules: RuleSnapshot[]): RegistrySnapshot {
  return { registryVersion: version, rules };
}

describe('registryMaterialChanges', () => {
  it('returns empty on identical snapshots', () => {
    const s = snapshot('v4.3.7', [rule({})]);
    expect(registryMaterialChanges(s, s)).toEqual([]);
    expect(isMaterialChange(s, s)).toBe(false);
  });

  it('detects a new rule added', () => {
    const from = snapshot('v4.3.7', [rule({ ruleId: 'R.A' })]);
    const to = snapshot('v4.3.8', [rule({ ruleId: 'R.A' }), rule({ ruleId: 'R.B' })]);
    const changes = registryMaterialChanges(from, to);
    expect(changes).toHaveLength(1);
    expect(changes[0].kind).toBe('rule_added');
    expect(changes[0].ruleId).toBe('R.B');
    expect(isMaterialChange(from, to)).toBe(true);
  });

  it('detects a rule removed', () => {
    const from = snapshot('v4.3.7', [rule({ ruleId: 'R.A' }), rule({ ruleId: 'R.B' })]);
    const to = snapshot('v4.3.8', [rule({ ruleId: 'R.A' })]);
    const changes = registryMaterialChanges(from, to);
    expect(changes.map((c) => c.kind)).toEqual(['rule_removed']);
    expect(changes[0].ruleId).toBe('R.B');
  });

  it('detects severity raised (P2 -> P1)', () => {
    const from = snapshot('v4.3.7', [rule({ ruleId: 'R.SEV', severity: 'P2' })]);
    const to = snapshot('v4.3.8', [rule({ ruleId: 'R.SEV', severity: 'P1' })]);
    const changes = registryMaterialChanges(from, to);
    expect(changes).toHaveLength(1);
    expect(changes[0].kind).toBe('severity_raised');
    expect(changes[0].detail).toBe('P2 -> P1');
  });

  it('does not flag severity lowered (P1 -> P2) as material', () => {
    const from = snapshot('v4.3.7', [rule({ ruleId: 'R.SEV', severity: 'P1' })]);
    const to = snapshot('v4.3.8', [rule({ ruleId: 'R.SEV', severity: 'P2' })]);
    expect(isMaterialChange(from, to)).toBe(false);
  });

  it('detects threshold lowered (0.8 -> 0.6)', () => {
    const from = snapshot('v4.3.7', [rule({ ruleId: 'R.THR', confidenceThreshold: 0.8 })]);
    const to = snapshot('v4.3.8', [rule({ ruleId: 'R.THR', confidenceThreshold: 0.6 })]);
    const changes = registryMaterialChanges(from, to);
    expect(changes).toHaveLength(1);
    expect(changes[0].kind).toBe('threshold_lowered');
  });

  it('does not flag threshold raised (0.6 -> 0.8) as material', () => {
    const from = snapshot('v4.3.7', [rule({ ruleId: 'R.THR', confidenceThreshold: 0.6 })]);
    const to = snapshot('v4.3.8', [rule({ ruleId: 'R.THR', confidenceThreshold: 0.8 })]);
    expect(isMaterialChange(from, to)).toBe(false);
  });

  it('detects a newly added surface (widening)', () => {
    const from = snapshot('v4.3.7', [rule({ ruleId: 'R.SUR', surfaces: ['instagram_post'] })]);
    const to = snapshot('v4.3.8', [rule({ ruleId: 'R.SUR', surfaces: ['instagram_post', 'facebook_page'] })]);
    const changes = registryMaterialChanges(from, to);
    expect(changes).toHaveLength(1);
    expect(changes[0].kind).toBe('surface_widened');
    expect(changes[0].detail).toContain('facebook_page');
  });

  it('does not flag dropped surface as material (narrowing)', () => {
    const from = snapshot('v4.3.7', [rule({ ruleId: 'R.SUR', surfaces: ['instagram_post', 'facebook_page'] })]);
    const to = snapshot('v4.3.8', [rule({ ruleId: 'R.SUR', surfaces: ['instagram_post'] })]);
    expect(isMaterialChange(from, to)).toBe(false);
  });

  it('ignores cosmetic changes: remediation wording, displayName, helpUrl', () => {
    const from = snapshot('v4.3.7', [
      rule({ ruleId: 'R.COS', remediationWording: 'Old text', displayName: 'Old Name', helpUrl: 'https://old.example.com' }),
    ]);
    const to = snapshot('v4.3.8', [
      rule({ ruleId: 'R.COS', remediationWording: 'Reworded', displayName: 'New Name', helpUrl: 'https://new.example.com' }),
    ]);
    expect(isMaterialChange(from, to)).toBe(false);
  });

  it('reports multiple material changes simultaneously', () => {
    const from = snapshot('v4.3.7', [
      rule({ ruleId: 'R.A', severity: 'P2' }),
      rule({ ruleId: 'R.B', confidenceThreshold: 0.9 }),
    ]);
    const to = snapshot('v4.3.8', [
      rule({ ruleId: 'R.A', severity: 'P1' }),
      rule({ ruleId: 'R.B', confidenceThreshold: 0.5 }),
      rule({ ruleId: 'R.C' }),
    ]);
    const kinds = registryMaterialChanges(from, to).map((c) => c.kind).sort();
    expect(kinds).toEqual(['rule_added', 'severity_raised', 'threshold_lowered']);
  });
});
