import { describe, it, expect } from 'vitest';
import { ARNOLD_DEFAULT_TRUST_SCORES } from '../arnold-reconciler';
import {
  ARNOLD_MAPS_ACTIVITY_TO_STRAIN,
  isAppleWatchNative,
  parseTrustOverrides,
  resolveArnoldTrust,
  vendorFromIngest,
} from '../arnold-trust';

describe('Arnold trust table for DISPLAY', () => {
  it('uses Arnold live defaults for the four vendors and Watch vs Health', () => {
    expect(ARNOLD_DEFAULT_TRUST_SCORES.manual).toBe(1);
    expect(ARNOLD_DEFAULT_TRUST_SCORES['wearable:whoop']).toBe(0.85);
    expect(ARNOLD_DEFAULT_TRUST_SCORES['wearable:oura']).toBe(0.85);
    expect(ARNOLD_DEFAULT_TRUST_SCORES['wearable:apple_watch']).toBe(0.85);
    expect(ARNOLD_DEFAULT_TRUST_SCORES['wearable:hume_body_pod']).toBe(0.8);
    expect(ARNOLD_DEFAULT_TRUST_SCORES['plugin:apple_health']).toBe(0.75);
    expect(resolveArnoldTrust('wearable:whoop')).toBe(0.85);
    expect(resolveArnoldTrust('plugin:apple_health')).toBe(0.75);
  });

  it('lets Arnold overrides win over the default table', () => {
    expect(resolveArnoldTrust('wearable:oura', { 'wearable:oura': 0.6 })).toBe(0.6);
  });

  it('does not invent an activity-to-strain map', () => {
    expect(ARNOLD_MAPS_ACTIVITY_TO_STRAIN).toBe(false);
  });

  it('splits Apple Watch native from Apple Health plugin', () => {
    expect(isAppleWatchNative('Apple Watch')).toBe(true);
    expect(isAppleWatchNative('iPhone')).toBe(false);
    expect(vendorFromIngest({ provider: 'health_kit', sourceApp: 'Apple Watch' }).arnoldSource).toBe(
      'wearable:apple_watch',
    );
    expect(vendorFromIngest({ provider: 'health_kit', sourceApp: 'Health' }).arnoldSource).toBe(
      'plugin:apple_health',
    );
    expect(parseTrustOverrides({ 'wearable:whoop': 0.9, skip: 'no' })).toEqual({
      'wearable:whoop': 0.9,
    });
  });
});
