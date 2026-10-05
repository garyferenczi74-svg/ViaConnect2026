import { describe, expect, it } from 'vitest';
import { FLAG_REGISTRY, isFeatureEnabled } from '@/lib/config/feature-flags';
import { LLM_FEATURE_IDS, LLM_WIRED_FEATURE_ID } from '../types';
import {
  LLM_XAI_FLAG_REGISTRY,
  LLM_XAI_KILL_FLAG,
  LLM_XAI_MEMBER_DATA_ALLOWED_FLAG,
  isCanarySelected,
  llmXaiEnabledFlag,
  llmXaiRouteIsActive,
  llmXaiShadowFlag,
  readLlmAllowlist,
  readLlmCanaryPercent,
  xaiAllowsDataClass,
} from '../flags';
import { planLlmRoute } from '../plan';

describe('LLM flag registry', () => {
  it('defaults every kill, shadow, enabled, and member-data flag to false', () => {
    expect(Object.keys(LLM_XAI_FLAG_REGISTRY).length).toBe(2 + LLM_FEATURE_IDS.length * 2);
    for (const [name, def] of Object.entries(LLM_XAI_FLAG_REGISTRY)) {
      expect(def.default).toBe(false);
      expect(FLAG_REGISTRY[name]?.default).toBe(false);
      expect(def.description.toLowerCase()).not.toContain('hipaa');
      expect(def.description.toLowerCase()).not.toContain('soc 2');
      expect(def.description.toLowerCase()).not.toContain('soc2');
    }
    expect(isFeatureEnabled(LLM_XAI_KILL_FLAG)).toBe(false);
    expect(isFeatureEnabled(LLM_XAI_MEMBER_DATA_ALLOWED_FLAG)).toBe(false);
    expect(isFeatureEnabled(llmXaiEnabledFlag(LLM_WIRED_FEATURE_ID))).toBe(false);
    expect(isFeatureEnabled(llmXaiShadowFlag(LLM_WIRED_FEATURE_ID))).toBe(false);
    expect(llmXaiRouteIsActive(LLM_WIRED_FEATURE_ID, () => false)).toBe(false);
  });

  it('keeps the wired feature inactive when the kill switch is on', () => {
    const enabled = new Set([llmXaiEnabledFlag(LLM_WIRED_FEATURE_ID), LLM_XAI_KILL_FLAG]);
    expect(llmXaiRouteIsActive(LLM_WIRED_FEATURE_ID, (flag) => enabled.has(flag))).toBe(false);
  });

  it('reads canary percent as 0 and ignores non-hash allowlist tokens', () => {
    expect(readLlmCanaryPercent('admin_marshall_remediate', {})).toBe(0);
    expect(readLlmCanaryPercent('admin_marshall_remediate', {
      LLM_XAI_ADMIN_MARSHALL_REMEDIATE_CANARY_PERCENT: 'nope',
    })).toBe(0);
    expect(readLlmCanaryPercent('admin_marshall_remediate', {
      LLM_XAI_ADMIN_MARSHALL_REMEDIATE_CANARY_PERCENT: '150',
    })).toBe(100);
    const hash = 'a'.repeat(64);
    const allowlist = readLlmAllowlist({
      LLM_XAI_ALLOWLIST: `person@example.com, ${hash.toUpperCase()}, short`,
    });
    expect(allowlist.has(hash)).toBe(true);
    expect(allowlist.size).toBe(1);
    expect(isCanarySelected(hash, 0)).toBe(false);
    expect(isCanarySelected(hash, 100)).toBe(true);
  });

  it('refuses P1, P2, and P3 unless member data is allowed', () => {
    expect(xaiAllowsDataClass('P0', false)).toBe(true);
    expect(xaiAllowsDataClass('P1', false)).toBe(false);
    expect(xaiAllowsDataClass('P2', false)).toBe(false);
    expect(xaiAllowsDataClass('P3', false)).toBe(false);
    expect(xaiAllowsDataClass('P2', true)).toBe(true);
  });
});

describe('planLlmRoute', () => {
  const base = {
    featureId: LLM_WIRED_FEATURE_ID,
    dataClass: 'P0' as const,
    kill: false,
    enabled: false,
    shadow: false,
    memberDataAllowed: false,
    canaryPercent: 0,
    userKeyHash: null,
    allowlisted: false,
  };

  it('stays on Claude when flags are off', () => {
    expect(planLlmRoute(base)).toEqual({ mode: 'anthropic_only', reason: 'flag_off' });
  });

  it('blocks member classes even when the feature flag is on', () => {
    for (const dataClass of ['P1', 'P2', 'P3'] as const) {
      expect(planLlmRoute({ ...base, dataClass, enabled: true }).reason).toBe('member_data_blocked');
    }
    expect(planLlmRoute({ ...base, dataClass: 'P2', enabled: true, memberDataAllowed: true }).mode).toBe('xai_primary');
  });

  it('prefers shadow over serving xAI, and the kill switch over both', () => {
    expect(planLlmRoute({ ...base, enabled: true, shadow: true }).mode).toBe('shadow');
    expect(planLlmRoute({ ...base, enabled: true, kill: true })).toEqual({ mode: 'anthropic_only', reason: 'kill' });
  });

  it('canaries a user key and lets an allowlisted hash through at 0 percent', () => {
    const hash = 'b'.repeat(64);
    expect(planLlmRoute({ ...base, enabled: true, userKeyHash: hash }).reason).toBe('canary_miss');
    expect(planLlmRoute({ ...base, enabled: true, userKeyHash: hash, allowlisted: true }).mode).toBe('xai_primary');
    expect(planLlmRoute({ ...base, enabled: true }).mode).toBe('xai_primary');
  });
});
