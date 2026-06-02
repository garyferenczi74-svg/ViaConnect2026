// Prompt 172 Phase 0 (170c primitive): kill-switches default + env override.
//
// The compile-time-readable boolean flags in src/lib/compliance/kill-switches.ts
// must:
//   1. Default to the values 170c §3.9, §4.8, §6, §10.7 specify.
//   2. Honor process.env overrides through the standard parser (true/1/on, etc).
//   3. Be re-readable across calls (the resolver does not cache stale env).

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import {
  isKillSwitchEnabled,
  KILL_SWITCH_DEFAULTS,
  type KillSwitch,
} from '@/lib/compliance/kill-switches';

const SAFE_FLAGS: KillSwitch[] = [
  'EATING_DISORDER_SAFETY_MODE_ENABLED',
  'FDA_DISCLAIMER_RENDERING_ENABLED',
  'PROVIDER_DEGRADED_SERVICE_MESSAGING_ENABLED',
  'PHI_REDACTION_ENABLED',
  'DSAR_SELF_SERVE_ENABLED',
];

function clearFlagEnv(flag: KillSwitch) {
  delete process.env[flag];
  delete process.env[`NEXT_PUBLIC_${flag}`];
}

describe('kill switches: compile time defaults', () => {
  beforeEach(() => {
    SAFE_FLAGS.forEach(clearFlagEnv);
  });

  it('defaults EATING_DISORDER_SAFETY_MODE_ENABLED to true per 170c section 8.13', () => {
    expect(KILL_SWITCH_DEFAULTS.EATING_DISORDER_SAFETY_MODE_ENABLED).toBe(true);
    expect(isKillSwitchEnabled('EATING_DISORDER_SAFETY_MODE_ENABLED')).toBe(true);
  });

  it('defaults FDA_DISCLAIMER_RENDERING_ENABLED to true per 170c section 19.6', () => {
    expect(KILL_SWITCH_DEFAULTS.FDA_DISCLAIMER_RENDERING_ENABLED).toBe(true);
    expect(isKillSwitchEnabled('FDA_DISCLAIMER_RENDERING_ENABLED')).toBe(true);
  });

  it('defaults PROVIDER_DEGRADED_SERVICE_MESSAGING_ENABLED to true per 170c section 10.7', () => {
    expect(KILL_SWITCH_DEFAULTS.PROVIDER_DEGRADED_SERVICE_MESSAGING_ENABLED).toBe(true);
    expect(isKillSwitchEnabled('PROVIDER_DEGRADED_SERVICE_MESSAGING_ENABLED')).toBe(true);
  });

  it('defaults PHI_REDACTION_ENABLED to false until 170c section 3 lands', () => {
    expect(KILL_SWITCH_DEFAULTS.PHI_REDACTION_ENABLED).toBe(false);
    expect(isKillSwitchEnabled('PHI_REDACTION_ENABLED')).toBe(false);
  });

  it('defaults DSAR_SELF_SERVE_ENABLED to false until 170c section 4 lands', () => {
    expect(KILL_SWITCH_DEFAULTS.DSAR_SELF_SERVE_ENABLED).toBe(false);
    expect(isKillSwitchEnabled('DSAR_SELF_SERVE_ENABLED')).toBe(false);
  });
});

describe('kill switches: env overrides', () => {
  beforeEach(() => {
    SAFE_FLAGS.forEach(clearFlagEnv);
  });

  afterEach(() => {
    SAFE_FLAGS.forEach(clearFlagEnv);
  });

  it('honors a plain env var disabling a default true flag', () => {
    process.env.EATING_DISORDER_SAFETY_MODE_ENABLED = 'false';
    expect(isKillSwitchEnabled('EATING_DISORDER_SAFETY_MODE_ENABLED')).toBe(false);
  });

  it('honors the NEXT_PUBLIC prefix variant for client consumers', () => {
    process.env.NEXT_PUBLIC_FDA_DISCLAIMER_RENDERING_ENABLED = 'off';
    expect(isKillSwitchEnabled('FDA_DISCLAIMER_RENDERING_ENABLED')).toBe(false);
  });

  it('honors enabling a default false flag via env', () => {
    process.env.PHI_REDACTION_ENABLED = '1';
    expect(isKillSwitchEnabled('PHI_REDACTION_ENABLED')).toBe(true);
  });

  it('accepts common truthy strings: true, 1, on, yes', () => {
    process.env.PHI_REDACTION_ENABLED = 'on';
    expect(isKillSwitchEnabled('PHI_REDACTION_ENABLED')).toBe(true);
    process.env.PHI_REDACTION_ENABLED = 'yes';
    expect(isKillSwitchEnabled('PHI_REDACTION_ENABLED')).toBe(true);
  });

  it('accepts common falsy strings: false, 0, off, no', () => {
    process.env.EATING_DISORDER_SAFETY_MODE_ENABLED = 'no';
    expect(isKillSwitchEnabled('EATING_DISORDER_SAFETY_MODE_ENABLED')).toBe(false);
    process.env.EATING_DISORDER_SAFETY_MODE_ENABLED = '0';
    expect(isKillSwitchEnabled('EATING_DISORDER_SAFETY_MODE_ENABLED')).toBe(false);
  });

  it('falls back to the compile time default when the env value is garbage', () => {
    process.env.EATING_DISORDER_SAFETY_MODE_ENABLED = 'maybe';
    expect(isKillSwitchEnabled('EATING_DISORDER_SAFETY_MODE_ENABLED')).toBe(true);
  });
});
